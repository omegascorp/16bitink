import Phaser from 'phaser';
import { INK, PAPER_HEX } from '../art/palette';
import { PENCIL } from '../art/atlas';
import type { SoundBoard } from '../audio/sfx';
import { CHAPTER_NAMES, LEVELS, LEVELS_PER_CHAPTER } from '../level';
import { DPR, screenSize } from './hidpi';
import { computeMapLayout, MAP, regionAt, type MapLayout, type MapNode } from './map/layout';
import { LevelCard } from './map/levelCard';
import { MapView } from './map/mapView';
import { buildNodes, mapStates, type NodeHit } from './map/nodes';
import { NibWalker } from './map/walker';
import { readProgress, type Progress } from './progress';
import { bakeTextures } from './textures';

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
  private card: LevelCard | null = null;
  private caption!: Phaser.GameObjects.Text;
  private tally!: Phaser.GameObjects.Text;
  private nibButton!: Phaser.GameObjects.Text;
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
    this.layout = computeMapLayout(CHAPTER_NAMES.map((name, c) => ({
      name,
      built: c === 0,
      levelIds: c === 0 ? order : Array.from({ length: LEVELS_PER_CHAPTER }, (_, i) => `draft-${c + 1}-${i + 1}`),
    })));
    const { states, current } = mapStates(order, this.progress, this.registry.get('unlockAll') === true);
    this.currentNode = this.layout.nodes.find((n) => n.levelId === current) ?? this.layout.nodes[0]!;

    const screen = screenSize(this.scale);
    this.zoom = Phaser.Math.Clamp(Math.min(screen.width / FIT.w, screen.height / FIT.h), 0.45, 1);
    const cam = this.cameras.main.setZoom(this.zoom * DPR).setBackgroundColor(TABLE_HEX);
    const textRes = DPR * Math.max(1, this.zoom) * 1.5;
    const table = this.add.layer();
    // The page's shadow on the table, and a darker grain of wood either side.
    const desk = this.add.graphics();
    const W = this.layout.width;
    const H = this.layout.height;
    desk.fillStyle(0x4a3220, 1).fillRect(-3000, -2000, 3000, H + 4000).fillRect(W, -2000, 3000, H + 4000);
    for (let x = -1400; x < W + 1400; x += 46) desk.lineStyle(2, 0x3f2a1a, 0.35).lineBetween(x, -2000, x + 30, H + 2000);
    desk.fillStyle(0x000000, 0.35).fillRect(10, 14, W, H);
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
      add(r.ruin.y + 126, built ? `Chapter ${r.index + 1}` : `Chapter ${r.index + 1} · still being drawn`, 19, built ? SOFT_INK : PENCIL);
    }
  }

  private tapNode(hit: NodeHit): void {
    if (this.drag?.moved || this.card || this.walker.walking) return;
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
      level, chapter: hit.node.region + 1, number: hit.node.local + 1, record: this.progress.levels[level.id],
      onPlay: () => this.play(index),
    }, () => {
      this.card = null;
    });
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
    const bar = this.add.graphics();
    bar.fillStyle(PAPER_HEX, 0.9).fillRect(0, 0, w, TOP_BAR);
    bar.lineStyle(1.5, 0x26316a, 0.5).lineBetween(0, TOP_BAR, w, TOP_BAR);
    this.uiLayer.add(bar);
    const text = (x: number, y: number, s: string, size: number, color = INK): Phaser.GameObjects.Text =>
      this.add.text(x, y, s, { fontFamily: FONT, fontSize: `${size}px`, fontStyle: '700', color, padding: { x: 6, y: 3 } }).setOrigin(0.5).setResolution(DPR * 1.5);
    if (w >= 640) this.uiLayer.add(text(96, TOP_BAR / 2, 'The Ink Atlas', 30));
    this.caption = text(w / 2, TOP_BAR / 2 - 11, '', 26);
    this.tally = text(w / 2, TOP_BAR / 2 + 15, '', 17, SOFT_INK);
    this.nibButton = text(w - 70, h - 40, 'Nib ↓', 24).setBackgroundColor('#fffaf0').setPadding(14, 4, 14, 4).setInteractive({ useHandCursor: true });
    this.nibButton.on('pointerup', () => {
      this.targetY = this.clampY(this.walker.position.y - 40);
    });
    const blots = Object.values(this.progress.levels).reduce((n, r) => n + r.blots, 0);
    const g = this.add.graphics();
    g.fillStyle(0x26316a, 0.85).fillCircle(30, h - 34, 11).fillCircle(39, h - 43, 4).fillCircle(21, h - 25, 3);
    this.uiLayer.add([this.caption, this.tally, this.nibButton, g, text(48, h - 34, `${blots} / ${LEVELS.length * 3}`, 24).setOrigin(0, 0.5).setStroke('#fffaf0', 5)]);
  }

  /** The caption follows the chapter in view; the Nib button shows when Nib is off screen. */
  private updateUi(half: number): void {
    const r = regionAt(this.layout, this.focusY);
    if (r !== this.region) {
      this.region = r;
      this.caption.setText(`Chapter ${r + 1} · ${CHAPTER_NAMES[r] ?? ''}`);
      if (r === 0) {
        const won = LEVELS.filter((l) => this.progress.levels[l.id]).length;
        this.tally.setText(`${won} / ${LEVELS.length} won`);
      } else this.tally.setText('Still being drawn');
    }
    const ny = this.walker.position.y;
    this.nibButton.setVisible(Math.abs(ny - this.focusY) > half * 0.8 && !this.following);
    this.nibButton.setText(ny > this.focusY ? 'Nib ↓' : 'Nib ↑');
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
