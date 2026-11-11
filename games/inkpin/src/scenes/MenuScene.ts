import Phaser from 'phaser';
import { INK } from '../art/palette';
import { PENCIL } from '../art/atlas';
import type { SoundBoard } from '../audio/sfx';
import { getFullError, getHost, trackOffer } from '../host';
import { BUILT_CHAPTERS, CHAPTER_NAMES, CHAPTERS, FREE_CHAPTERS, LEVELS, LEVELS_PER_CHAPTER } from '../level';
import { loadPaidChapters } from './BootScene';
import { DPR, screenSize } from './hidpi';
import { computeMapLayout, MAP, regionAt, type MapLayout, type MapNode } from './map/layout';
import { ChapterCard } from './map/chapterCard';
import { LevelCard } from './map/levelCard';
import { isDesktop } from './controls';
import { MapView } from './map/mapView';
import { buildNodes, mapStates, type NodeHit, type NodeState } from './map/nodes';
import { NibWalker } from './map/walker';
import { readProgress, type Progress } from './progress';
import { bakeTextures } from './textures';
import { bakeUi, paintedButton, paperCard, UI_RES, UI_TEX } from './uiPaint';

/** playable: installed; locked: the full game's, not installed here; draft: not built yet. */
type ChapterKind = 'playable' | 'locked' | 'draft';

const FONT = 'Caveat';
const SOFT_INK = '#4a463e';
/** A press that moves further than this (CSS px) is a drag, not a tap. */
const DRAG_THRESHOLD = 8;
/** Arrow keys scroll this far, world px. */
const KEY_STEP = 300;
/** How fast the view glides to where it's sent (per second). */
const GLIDE = 9;
/** The page's width that should fit on screen (its middle, on a phone), and how much of its height. */
const FIT = { w: 760, h: 760 } as const;
/** A touch screen fits less of the map, so the levels' circles and Nib draw big enough to tap and see. */
const TOUCH_FIT = { w: 700, h: 420 } as const;
const MAX_ZOOM = { desk: 1, touch: 1.2 } as const;
/** The table the Atlas lies open on. */
const TABLE_HEX = 0x5b3e29;
const TOP_BAR = 64;
/** Where Nib last waited on the map, so a win can be walked. */
const NIB_AT = 'mapNibAt';

/**
 * Level select as the Ink Atlas: one long page Nib climbs from the Jungle
 * Temple to the Dragon's Hoard, a stop on the trail for every level and a
 * ruin for every chapter. Drag, scroll or use the arrow keys to move along
 * it; tap a level for its card. Chapters not built yet are pencil drafts.
 * After a win Nib walks up to the next level.
 */
export class MenuScene extends Phaser.Scene {
  private layout!: MapLayout;
  private view!: MapView;
  private walker!: NibWalker;
  private zoom = 1;
  private focusY = 0;
  private targetY = 0;
  private drag: { y: number; target: number; moved: boolean; lastY: number; lastT: number; vel: number } | null = null;
  private card: LevelCard | ChapterCard | null = null;
  /** Per chapter: what the player can do with it. */
  private kinds: ChapterKind[] = [];
  private caption!: Phaser.GameObjects.Text;
  private tally!: Phaser.GameObjects.Text;
  private nibButton!: Phaser.GameObjects.Container;
  private nibLabel!: Phaser.GameObjects.Text;
  private region = -1;
  private progress!: Progress;
  private currentNode!: MapNode;
  private uiLayer!: Phaser.GameObjects.Layer;
  private ui = { width: 0, height: 0 };
  private following = false;

  constructor() {
    super('menu');
  }

  private get sfx(): SoundBoard {
    return this.registry.get('sfx') as SoundBoard;
  }

  create(): void {
    // The dev page can open straight into a level.
    const start = this.registry.get('startLevel') as number | undefined;
    if (start !== undefined) {
      this.registry.remove('startLevel');
      this.registry.set('level', start);
      this.scene.start('game');
      return;
    }
    this.card = null;
    this.drag = null;
    this.region = -1;
    this.following = false;
    this.progress = readProgress();
    bakeTextures(this);
    const order = LEVELS.map((l) => l.id);
    // Installed levels are playable; the full game's chapters are locked until installed; the rest remain pencil drafts.
    this.kinds = CHAPTER_NAMES.map((_, c) => ((CHAPTERS[c]?.length ?? 0) > 0 ? 'playable' : c >= FREE_CHAPTERS && c < BUILT_CHAPTERS ? 'locked' : 'draft'));
    const lockedIds = (c: number): string[] => Array.from({ length: LEVELS_PER_CHAPTER }, (_, i) => `locked-${c + 1}-${i + 1}`);
    // The page grows to the screen's width, so no table shows either side of it.
    const screen = screenSize(this.scale);
    const touch = !isDesktop();
    const fit = touch ? TOUCH_FIT : FIT;
    this.zoom = Phaser.Math.Clamp(Math.min(screen.width / fit.w, screen.height / fit.h), 0.45, touch ? MAX_ZOOM.touch : MAX_ZOOM.desk);
    this.layout = computeMapLayout(CHAPTER_NAMES.map((name, c) => {
      const levels = CHAPTERS[c] ?? [];
      const locked = this.kinds[c] === 'locked';
      return {
        name,
        built: levels.length > 0 || locked,
        levelIds: locked ? lockedIds(c) : [
          ...levels.map((l) => l.id),
          ...Array.from({ length: Math.max(0, LEVELS_PER_CHAPTER - levels.length) }, (_, i) => `draft-${c + 1}-${levels.length + i + 1}`),
        ],
      };
    }), screen.width / this.zoom + 2);
    const { states: playStates, current } = mapStates(order, this.progress, this.registry.get('unlockAll') === true);
    const states = new Map<string, NodeState>(playStates);
    this.kinds.forEach((kind, c) => {
      if (kind === 'locked') for (const id of lockedIds(c)) states.set(id, 'locked');
    });
    this.currentNode = this.layout.nodes.find((n) => n.levelId === current) ?? this.layout.nodes[0]!;

    const cam = this.cameras.main.setZoom(this.zoom * DPR).setBackgroundColor(TABLE_HEX);
    const textRes = DPR * Math.max(1, this.zoom) * 1.5;
    const table = this.add.layer();
    // The page's shadow on the table, and a darker grain of wood either side.
    const desk = this.add.graphics();
    const L = this.layout.left;
    const W = this.layout.width;
    const H = this.layout.height;
    desk.fillStyle(0x4a3220, 1).fillRect(L - 3000, -2000, 3000, H + 4000).fillRect(L + W, -2000, 3000, H + 4000);
    for (let x = L - 1400; x < L + W + 1400; x += 46) desk.lineStyle(2, 0x3f2a1a, 0.35).lineBetween(x, -2000, x + 30, H + 2000);
    desk.fillStyle(0x000000, 0.35).fillRect(L + 10, 14, W, H);
    table.add(desk);
    const paint = this.add.layer();
    const world = this.add.layer();
    this.uiLayer = this.add.layer();
    this.view = new MapView(this, this.layout, paint, Math.min(2, this.zoom * DPR));

    const names = new Map(LEVELS.map((l) => [l.id, l.name]));
    const nodes = buildNodes(this, this.layout, world, states, names, this.progress, textRes);
    for (const hit of nodes.hits) {
      hit.zone.on('pointerup', (p: Phaser.Input.Pointer) => {
        if (p.y / DPR < TOP_BAR) return;
        this.tapNode(hit);
      });
    }
    if (nodes.current) this.tweens.add({ targets: nodes.current, scale: 1.12, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.chapterNames(world, textRes);

    // Nib walks up from where it last waited, if it has moved on since.
    const before = this.registry.get(NIB_AT) as string | undefined;
    const from = this.layout.nodes.find((n) => n.levelId === before);
    const walkFrom = from && from.index < this.currentNode.index ? from : null;
    const at = walkFrom ?? this.currentNode;
    this.walker = new NibWalker(this, this.layout, this.layout.nodeS[at.index]!, world);
    this.registry.set(NIB_AT, this.currentNode.levelId);

    this.buildUi(screen);
    cam.ignore(this.uiLayer);
    this.cameras.add(0, 0, this.scale.width, this.scale.height).setZoom(DPR).setOrigin(0).ignore([table, paint, world]);

    this.focusY = this.clampY(at.y - 40);
    this.targetY = this.focusY;
    cam.centerOn(MAP.mid, this.focusY);
    this.view.update(this.focusY - this.halfView(), this.focusY + this.halfView(), true);
    if (walkFrom) this.time.delayedCall(450, () => this.walkOn());
    this.bindInput();
    const onResize = (): void => {
      this.scene.restart();
    };
    this.scale.once('resize', onResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', onResize);
      this.card?.close();
    });
  }

  update(_t: number, delta: number): void {
    if (!this.walker) return;
    const dt = Math.min(0.05, delta / 1000);
    if (this.following) this.targetY = this.clampY(this.walker.position.y - 40);
    if (!this.drag?.moved) this.focusY += (this.targetY - this.focusY) * Math.min(1, dt * GLIDE);
    this.cameras.main.centerOn(MAP.mid, this.focusY);
    const half = this.halfView();
    this.view.update(this.focusY - half, this.focusY + half);
    this.walker.update(dt);
    this.updateUi(half);
  }

  /** Half the world height the view shows. */
  private halfView(): number {
    return screenSize(this.scale).height / this.zoom / 2;
  }

  private clampY(y: number): number {
    const half = this.halfView();
    return Phaser.Math.Clamp(y, half - TOP_BAR / this.zoom, this.layout.height - half);
  }

  private walkOn(): void {
    this.following = true;
    this.walker.walkTo(this.layout.nodeS[this.currentNode.index]!, () => {
      this.following = false;
      this.sfx.play('coin');
    });
  }

  /** Each chapter's name under its ruin. */
  private chapterNames(world: Phaser.GameObjects.Layer, textRes: number): void {
    for (const r of this.layout.regions) {
      const built = r.chapter.built;
      const add = (y: number, s: string, size: number, color: string): void => {
        world.add(this.add.text(r.ruin.x, y, s, { fontFamily: FONT, fontSize: `${size}px`, fontStyle: '700', color, stroke: '#f6eedb', strokeThickness: 6, padding: { x: 6, y: 4 } }).setOrigin(0.5).setResolution(textRes));
      };
      add(r.ruin.y + 96, r.chapter.name, 32, built ? INK : PENCIL);
      const note = this.kinds[r.index] === 'locked' ? ' · full game' : built ? '' : ' · still being drawn';
      add(r.ruin.y + 126, `Chapter ${r.index + 1}${note}`, 19, built ? SOFT_INK : PENCIL);
    }
  }

  private tapNode(hit: NodeHit): void {
    if (this.drag?.moved || this.card || this.walker.walking) return;
    if (hit.state === 'locked') {
      this.chapterCard(hit.node.region);
      return;
    }
    if (hit.state === 'closed') {
      this.sfx.play('blocked');
      this.cameras.main.shake(120, 0.002);
      return;
    }
    const index = LEVELS.findIndex((l) => l.id === hit.node.levelId);
    const level = LEVELS[index];
    if (!level) return;
    this.sfx.unlock();
    this.sfx.play('tap');
    this.card = new LevelCard(this, this.uiLayer, this.ui, {
      level, chapter: hit.node.region + 1, number: hit.node.index + 1, record: this.progress.levels[level.id],
      onPlay: () => this.play(index),
      compact: !isDesktop(),
    }, () => {
      this.card = null;
    });
  }

  /** The note on a chapter this player can't play: the full game's offer, a retry, or "on the way". */
  private chapterCard(c: number): void {
    const host = getHost();
    const title = CHAPTER_NAMES[c] ?? `Chapter ${c + 1}`;
    const close = (): void => {
      this.card = null;
    };
    const locked = this.kinds[c] === 'locked';
    this.sfx.play('tap');
    if (locked && host?.unlocked) {
      // An owner whose chapters failed to load: try again.
      this.card = new ChapterCard(this, this.uiLayer, this.ui, {
        title, lines: [getFullError() ?? 'Your full game is still on its way.'],
        // The player may have gone into a level while it loads: only redraw a map that is still showing.
        action: { label: 'Try again', run: () => void loadPaidChapters().then(() => this.scene.isActive() && this.scene.restart()) },
      }, close);
    } else if (locked && host?.price) {
      this.card = new ChapterCard(this, this.uiLayer, this.ui, {
        title, lines: [`Chapters 2–${BUILT_CHAPTERS} are the full game:`, 'the Volcano Shrine and the Desert Tomb,', 'and more ruins as free updates.'],
        action: { label: `Unlock · ${host.price}`, run: () => host.onBuy('locked'), offer: true },
      }, close);
      trackOffer('locked');
    } else {
      this.card = new ChapterCard(this, this.uiLayer, this.ui, { title, lines: ['Still being drawn.', 'New chapters arrive as free updates.'] }, close);
    }
  }

  private play(index: number): void {
    this.card = null;
    this.registry.set('level', index);
    this.scene.start('game');
  }

  private buildUi(screen: { width: number; height: number }): void {
    const w = screen.width;
    const h = screen.height;
    this.ui = { width: w, height: h };
    bakeUi(this);
    // The bar: a strip of old map paper torn along its bottom, running off both sides and the top.
    const barW = Math.ceil((w + 40) / 64) * 64;
    this.uiLayer.add(paperCard(this, w / 2, TOP_BAR / 2 - 8, barW, TOP_BAR + 16, 31, { radius: 2, rough: 1.8, shadow: 0.6, tint: 'parchment' }));
    const text = (x: number, y: number, s: string, size: number, color = INK): Phaser.GameObjects.Text =>
      this.add.text(x, y, s, { fontFamily: FONT, fontSize: `${size}px`, fontStyle: '700', color, padding: { x: 6, y: 3 } }).setOrigin(0.5).setResolution(DPR * 1.5);
    const narrow = w < 640;
    if (!narrow) this.uiLayer.add(text(104, TOP_BAR / 2, 'The Ink Atlas', 32));
    // Back to 16bit.ink: top right on a computer, top left on a phone (where the title is hidden).
    const exit = paintedButton(this, narrow ? 50 : w - 62, TOP_BAR / 2, 'Exit', () => getHost()?.onExit(), { width: 84, height: 42, size: 25 });
    // On a phone the caption centres in the room right of Exit.
    const cx = narrow ? (w + 96) / 2 : w / 2;
    this.caption = text(cx, TOP_BAR / 2 - 11, '', narrow ? 22 : 26);
    this.tally = text(cx, TOP_BAR / 2 + 15, '', narrow ? 15 : 17, SOFT_INK);
    const nib = paintedButton(this, w - 66, h - 40, 'Nib ↓', () => {
      this.targetY = this.clampY(this.walker.position.y - 40);
    }, { width: 100, height: 44, size: 25 });
    this.nibButton = nib.root;
    this.nibLabel = nib.label;
    // The blots won so far, on a tag in the corner.
    const blots = Object.values(this.progress.levels).reduce((n, r) => n + r.blots, 0);
    const tally = text(58, h - 38, `${blots} / ${LEVELS.length * 3}`, 25).setOrigin(0, 0.5);
    const tagW = Math.ceil((tally.width + 70) / 16) * 16;
    const tag = paperCard(this, 12 + tagW / 2, h - 38, tagW, 44, 33, { radius: 6, rough: 1, shadow: 0.45 });
    const blot = this.add.image(36, h - 38, UI_TEX.blot(0)).setScale(0.62 / UI_RES);
    this.uiLayer.add([this.caption, this.tally, exit.root, this.nibButton, tag, blot, tally]);
  }

  /** The caption follows the chapter in view; the Nib button shows when Nib is off screen. */
  private updateUi(half: number): void {
    const r = regionAt(this.layout, this.focusY);
    if (r !== this.region) {
      this.region = r;
      this.caption.setText(`Chapter ${r + 1} · ${CHAPTER_NAMES[r] ?? ''}`);
      const levels = CHAPTERS[r] ?? [];
      if (this.kinds[r] === 'locked') this.tally.setText('Full game');
      else if (levels.length > 0) {
        const won = levels.filter((l) => this.progress.levels[l.id]).length;
        this.tally.setText(`${won} / ${Math.max(levels.length, LEVELS_PER_CHAPTER)} won${levels.length < LEVELS_PER_CHAPTER ? ` · ${LEVELS_PER_CHAPTER - levels.length} being drawn` : ''}`);
      } else this.tally.setText('Still being drawn');
    }
    const ny = this.walker.position.y;
    this.nibButton.setVisible(Math.abs(ny - this.focusY) > half * 0.8 && !this.following);
    this.nibLabel.setText(ny > this.focusY ? 'Nib ↓' : 'Nib ↑');
  }

  private bindInput(): void {
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.sfx.unlock();
      if (this.card) return;
      this.drag = { y: p.y, target: this.targetY, moved: false, lastY: p.y, lastT: p.event.timeStamp, vel: 0 };
      this.following = false;
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      const d = this.drag;
      if (!d || !p.isDown || this.card) return;
      if (Math.abs(p.y - d.y) > DRAG_THRESHOLD * DPR) d.moved = true;
      if (!d.moved) return;
      const scale = this.cameras.main.zoom;
      this.targetY = this.clampY(d.target - (p.y - d.y) / scale);
      this.focusY = this.targetY;
      const dt = Math.max(1, p.event.timeStamp - d.lastT);
      d.vel = d.vel * 0.6 + ((-(p.y - d.lastY) / scale) / dt) * 1000 * 0.4;
      d.lastY = p.y;
      d.lastT = p.event.timeStamp;
    });
    const release = (): void => {
      const d = this.drag;
      if (d?.moved) this.targetY = this.clampY(this.targetY + d.vel * 0.3);
      // Let the node's own pointerup see the drag first.
      this.time.delayedCall(0, () => {
        this.drag = null;
      });
    };
    this.input.on('pointerup', release);
    this.input.on('pointerupoutside', release);
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      if (this.card) return;
      this.following = false;
      this.targetY = this.clampY(this.targetY + dy / this.zoom);
    });
    const kb = this.input.keyboard;
    const go = (dy: number): void => {
      if (this.card) return;
      this.following = false;
      this.targetY = this.clampY(this.targetY + dy);
    };
    kb?.on('keydown-UP', () => go(-KEY_STEP));
    kb?.on('keydown-DOWN', () => go(KEY_STEP));
    kb?.on('keydown-ENTER', () => {
      if (this.card || this.walker.walking) return;
      const index = LEVELS.findIndex((l) => l.id === this.currentNode.levelId);
      if (index >= 0) this.play(index);
    });
  }
}
