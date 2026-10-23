import Phaser from 'phaser';
import { SIGN_BOARD } from '../art/map/paintMap';
import { BLUE, PAPER_HEX } from '../art/palette';
import { dropBoards } from '../art/textures';
import { getFullError, getHost, getSound, trackOffer } from '../host';
import { BUILT_CHAPTERS, CHAPTER_NAMES, CHAPTER_PLACES, levelById, levelOrder, loadedChapters, loadedLevels, placeOf, PLANNED_CHAPTERS } from '../level/levels';
import { colourHex, COLOURS } from '../logic/colours';
import { chapterTally, loadProgress, type Progress } from '../logic/save';
import { loadPaidChapters } from './BootScene';
import { crispText, DPR, screenSize, uiCamera, uiScaleFor } from './hidpi';
import { GeckoWalker } from './map/geckoWalker';
import { computeMapLayout, MAP, regionAt, type MapLayout, type MapNode } from './map/layout';
import { MapCard } from './map/levelCard';
import { whatsNew } from './map/levelInfo';
import { MapView } from './map/mapView';
import { buildNodes, type NodeHit } from './map/nodesView';
import { mapStates, standInIds, type ChapterSlot } from './map/states';
import { drawBlots, HAND_FONT, inkButton, inkText } from './ui';

const SOFT_INK = '#4a463e';
const PENCIL = '#8a8578';
/** A press that moves further than this (CSS px) is a drag, not a tap. */
const DRAG_THRESHOLD = 8;
/** Arrow keys scroll this far, world px. */
const KEY_STEP = 300;
/** How fast the view glides to where it's sent (per second). */
const GLIDE = 9;
/** The plan's width that should fit on screen, and the height of it that should, world px. */
const FIT = { w: 760, h: 560 } as const;
/** Where the gecko last waited on the map this session, so a win can be walked. */
const GECKO_AT = 'mapGeckoAt';
const TOP_BAR = 64;
/** A resize lays the map out again only once the screen has settled this long. */
const RESIZE_SETTLE_MS = 220;

export interface MenuData {
  /** Keep the view here (a resize lays the map out again). */
  readonly focusY?: number;
}

/**
 * Level select as the estate's garden plan: one long scroll the gecko climbs
 * from the garden by the house to the night garden, a pocket in a worn
 * groove for every level, a gate and a name board for every chapter.
 * Drag, scroll or use the arrow keys to move along it; tap a level for its
 * card. Chapters not built yet are pencil drafts; the full game's chapters
 * are painted but locked until bought. After a win the gecko walks up to
 * the next level.
 */
export class MenuScene extends Phaser.Scene {
  private layout!: MapLayout;
  private view!: MapView;
  private walker!: GeckoWalker;
  private zoom = 1;
  private focusY = 0;
  private targetY = 0;
  private drag: { y: number; target: number; moved: boolean; lastY: number; lastT: number; vel: number } | null = null;
  private card: MapCard | null = null;
  private caption!: Phaser.GameObjects.Text;
  private tally!: Phaser.GameObjects.Text;
  private homeButton!: Phaser.GameObjects.Container;
  private region = -1;
  private slots: ChapterSlot[] = [];
  private progress!: Progress;
  private currentNode!: MapNode;
  private uiLayer!: Phaser.GameObjects.Layer;
  private ui = { width: 0, height: 0 };
  private following = false;

  constructor() {
    super('Menu');
  }

  create(data: MenuData = {}): void {
    crispText(this);
    this.card = null;
    this.drag = null;
    this.region = -1;
    const host = getHost(this);
    this.progress = loadProgress(host.storage);
    const chapters = loadedChapters();
    this.slots = Array.from({ length: PLANNED_CHAPTERS }, (_, c): ChapterSlot => {
      const loaded = chapters[c];
      if (loaded) return { kind: 'playable', levelIds: loaded.map((l) => l.id) };
      const kind = c < BUILT_CHAPTERS ? 'locked' : 'draft';
      return { kind, levelIds: standInIds(kind, c) };
    });
    this.layout = computeMapLayout(this.slots.map((s, c) => ({
      name: CHAPTER_NAMES[c] ?? `Chapter ${c + 1}`, place: s.kind === 'draft' ? 'draft' : CHAPTER_PLACES[c] ?? 'draft', levelIds: s.levelIds,
    })));
    const { states, current } = mapStates(this.slots, this.progress, levelOrder(), host.allLevelsOpen === true);
    this.currentNode = this.layout.nodes.find((n) => n.levelId === current) ?? this.layout.nodes[0]!;

    const screen = screenSize(this);
    this.zoom = Phaser.Math.Clamp(Math.min(screen.width / FIT.w, screen.height / FIT.h), 0.5, 1.5);
    const cam = this.cameras.main.setZoom(this.zoom * DPR).setBackgroundColor('#f5f0e1');
    const textRes = DPR * Math.max(1, this.zoom);
    const paint = this.add.layer();
    const world = this.add.layer();
    this.uiLayer = this.add.layer();
    // The level left behind lets its painting go (~15 MB): the map needs the room.
    dropBoards(this);
    // Map bands are baked a little softer on touch screens, which have the tightest canvas budget.
    this.view = new MapView(this, this.layout, paint, Math.min(this.sys.game.device.input.touch ? 1.5 : 2, this.zoom * DPR));

    const names = new Map(loadedLevels().map((l) => [l.id, l.name]));
    const blots = new Map(Object.entries(this.progress.levels).map(([id, r]) => [id, r.blots]));
    const nodes = buildNodes(this, this.layout, world, states, names, blots, textRes);
    for (const hit of nodes.hits) {
      hit.zone.on('pointerup', (p: Phaser.Input.Pointer) => {
        // The top bar covers the plan: a press on it isn't on the level under it.
        if (p.y / DPR < TOP_BAR * uiScaleFor(screen.width, screen.height)) return;
        this.tapNode(hit);
      });
    }
    if (nodes.current) this.tweens.add({ targets: nodes.current, scale: nodes.current.scale * 1.1, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.signs(world, textRes);

    // The gecko: walking up from where it last waited, if it has moved on since.
    const before = this.registry.get(GECKO_AT) as string | undefined;
    const from = this.layout.nodes.find((n) => n.levelId === before);
    const walkFrom = from && from.index < this.currentNode.index && data.focusY === undefined ? from : null;
    const start = walkFrom ?? this.currentNode;
    this.walker = new GeckoWalker(this, this.layout, this.layout.nodeS[start.index]!, this.tintFor(start), world);
    this.registry.set(GECKO_AT, this.currentNode.levelId);

    this.buildUi(screen);
    cam.ignore(this.uiLayer);
    uiCamera(this.cameras.add(0, 0, this.scale.width, this.scale.height)).setZoom(DPR * uiScaleFor(screen.width, screen.height)).ignore([paint, world]);

    this.focusY = this.clampY(data.focusY ?? start.y - 40);
    this.targetY = this.focusY;
    cam.centerOn(MAP.mid, this.focusY);
    this.view.update(this.focusY - this.halfView(), this.focusY + this.halfView(), true);
    if (walkFrom) this.time.delayedCall(450, () => this.walkOn());
    this.bindInput();
    getSound(this)?.setBed('garden');
    this.watchResize(screen);
    // A card closing with the scene (not by Play) frees its baked board.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.card?.close());
  }

  /**
   * Lays the map out again once the screen settles at a new size (a phone
   * turning): not on every resize event (a phone's address bar sliding
   * fires them mid-scroll), and not while the gecko walks.
   */
  private watchResize(laidOut: { width: number; height: number }): void {
    let timer: Phaser.Time.TimerEvent | null = null;
    const check = (): void => {
      timer = null;
      const now = screenSize(this);
      if (Math.abs(now.width - laidOut.width) < 2 && Math.abs(now.height - laidOut.height) < 40) return;
      if (this.walker.walking) {
        timer = this.time.delayedCall(RESIZE_SETTLE_MS, check);
        return;
      }
      this.scene.restart({ focusY: this.focusY });
    };
    const onResize = (): void => {
      timer?.remove();
      timer = this.time.delayedCall(RESIZE_SETTLE_MS, check);
    };
    this.scale.on('resize', onResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', onResize));
  }

  update(_t: number, delta: number): void {
    const dt = Math.min(0.05, delta / 1000);
    if (this.following) this.targetY = this.clampY(this.walker.position.y - 40);
    if (!this.drag?.moved) this.focusY += (this.targetY - this.focusY) * Math.min(1, dt * GLIDE);
    this.cameras.main.centerOn(MAP.mid, this.focusY);
    const half = this.halfView();
    this.view.update(this.focusY - half, this.focusY + half);
    this.walker.update(_t, dt);
    this.updateUi(half);
  }

  /** Half the world height the view shows. */
  private halfView(): number {
    return screenSize(this).height / this.zoom / 2;
  }

  private clampY(y: number): number {
    const half = this.halfView();
    return Phaser.Math.Clamp(y, half - TOP_BAR / this.zoom, this.layout.height - half);
  }

  private tintFor(n: MapNode): number {
    return colourHex(COLOURS[n.index % COLOURS.length]!);
  }

  /** The gecko walks up to the level it's now up to, the view following it. */
  private walkOn(): void {
    this.following = true;
    this.walker.walkTo(this.layout.nodeS[this.currentNode.index]!, this.tintFor(this.currentNode), () => {
      this.following = false;
      getSound(this)?.play('card');
    });
  }

  /** A name board for each chapter at its gate, and a tap on a locked or draft one explains it. */
  private signs(world: Phaser.GameObjects.Layer, textRes: number): void {
    this.layout.regions.forEach((r, c) => {
      const slot = this.slots[c]!;
      const draft = slot.kind === 'draft';
      const add = (y: number, s: string, size: number, color: string): void => {
        world.add(this.add.text(r.sign.x, y, s, { fontFamily: HAND_FONT, fontSize: `${size}px`, color, padding: { x: 6, y: 4 } }).setOrigin(0.5).setResolution(textRes));
      };
      add(r.sign.y - 8, r.chapter.name, 30, draft ? PENCIL : BLUE);
      const note = slot.kind === 'playable' ? `Chapter ${c + 1}` : slot.kind === 'locked' ? `Chapter ${c + 1} · full game` : `Chapter ${c + 1} · being drawn`;
      add(r.sign.y + 18, note, 18, draft ? PENCIL : SOFT_INK);
      if (slot.kind === 'playable') return;
      const zone = this.add.zone(r.sign.x, r.sign.y, SIGN_BOARD.w, SIGN_BOARD.h + 20).setInteractive({ useHandCursor: true });
      zone.on('pointerup', () => {
        if (!this.drag?.moved && !this.card) this.chapterCard(c);
      });
      world.add(zone);
    });
  }

  private tapNode(hit: NodeHit): void {
    if (this.drag?.moved || this.card || this.walker.walking) return;
    if (hit.state === 'locked') {
      this.chapterCard(hit.node.region);
      return;
    }
    if (hit.state === 'closed') {
      getSound(this)?.play('click');
      this.cameras.main.shake(120, 0.002);
      return;
    }
    const level = levelById(hit.node.levelId);
    if (!level) return;
    getSound(this)?.play('card');
    const order = loadedLevels();
    const i = order.findIndex((l) => l.id === level.id);
    this.card = MapCard.level(this, this.uiLayer, this.ui, {
      level, number: hit.node.index + 1, place: placeOf(level.id), record: this.progress.levels[level.id], news: whatsNew(level, order.slice(0, Math.max(0, i))),
      onPlay: () => {
        // The level starts on the board its card baked: don't let the card free it.
        this.card = null;
        this.scene.start('Game', { levelId: level.id });
      },
    }, () => {
      this.card = null;
    });
  }

  /** The note on a chapter this player can't play: the full game's offer, a retry, or "on the way". */
  private chapterCard(c: number): void {
    const host = getHost(this);
    const title = CHAPTER_NAMES[c] ?? `Chapter ${c + 1}`;
    const error = getFullError(this);
    const close = (): void => {
      this.card = null;
    };
    const locked = this.slots[c]?.kind === 'locked';
    getSound(this)?.play('card');
    if (locked && host.unlocked) {
      // An owner whose chapters failed to load (or haven't yet): try again.
      this.card = MapCard.chapter(this, this.uiLayer, this.ui, {
        title, lines: [error ?? 'Your full game is still on its way.'],
        // The player may have gone into a level while it loads: only redraw a map that is still showing.
        action: { label: 'Try again', run: () => void loadPaidChapters(this).then(() => this.scene.isActive() && this.scene.restart({ focusY: this.focusY })) },
      }, close);
    } else if (locked && host.price) {
      this.card = MapCard.chapter(this, this.uiLayer, this.ui, {
        title, lines: [`Chapters 2–${PLANNED_CHAPTERS} are the full game:`, 'lily pads, tunnels, the Dragonfly and more.'],
        action: { label: `Unlock · ${host.price}`, run: () => host.onBuy('locked') },
      }, close);
      trackOffer(this, 'locked');
    } else {
      this.card = MapCard.chapter(this, this.uiLayer, this.ui, { title, lines: ['Still being drawn: on the way soon!', 'New chapters arrive as free updates.'] }, close);
    }
  }

  private buildUi(screen: { width: number; height: number }): void {
    const s = uiScaleFor(screen.width, screen.height);
    const w = screen.width / s;
    const h = screen.height / s;
    this.ui = { width: w, height: h };
    const bar = this.add.graphics();
    bar.fillStyle(PAPER_HEX, 0.88).fillRect(0, 0, w, TOP_BAR);
    bar.lineStyle(1.5, 0x27408b, 0.5).lineBetween(0, TOP_BAR, w, TOP_BAR);
    this.uiLayer.add(bar);
    const narrow = w < 640;
    if (!narrow) this.uiLayer.add(inkText(this, 90, TOP_BAR / 2, 'InkGecko', 36));
    this.caption = inkText(this, w / 2, TOP_BAR / 2 - 10, '', 26);
    this.tally = inkText(this, w / 2, TOP_BAR / 2 + 16, '', 18, SOFT_INK);
    this.uiLayer.add([this.caption, this.tally]);
    const host = getHost(this);
    const sound = inkButton(this, w - 34, TOP_BAR / 2, getSound(this)?.muted ? '♪̸' : '♪', () => {
      const sb = getSound(this);
      if (!sb) return;
      sb.setMuted(!sb.muted);
      (sound.list[1] as Phaser.GameObjects.Text).setText(sb.muted ? '♪̸' : '♪');
    }, { width: 46, height: 44, size: 24 });
    const exit = inkButton(this, narrow ? 50 : w - 112, TOP_BAR / 2, 'Exit', () => host.onExit(), { width: 84, height: 44, size: 24 });
    this.homeButton = inkButton(this, w - 70, h - 40, 'Gecko', () => {
      this.targetY = this.clampY(this.walker.position.y - 40);
    }, { width: 110, height: 46, size: 24 });
    this.uiLayer.add([sound, exit, this.homeButton]);
    const total = chapterTally(this.progress, loadedLevels().map((l) => l.id));
    const g = this.add.graphics();
    drawBlots(g, 26, h - 30, 1, 9, 1);
    this.uiLayer.add([g, this.add.text(44, h - 30, `${total.blots} / ${total.maxBlots}`, { fontFamily: HAND_FONT, fontSize: '24px', color: BLUE, stroke: '#fffaf0', strokeThickness: 5, padding: { x: 4, y: 4 } }).setOrigin(0, 0.5)]);
  }

  /** The caption follows the chapter in view; the Gecko button shows when the gecko is off screen. */
  private updateUi(half: number): void {
    const r = regionAt(this.layout, this.focusY);
    if (r !== this.region) {
      this.region = r;
      const slot = this.slots[r]!;
      this.caption.setText(`Chapter ${r + 1} · ${CHAPTER_NAMES[r] ?? ''}`);
      const tally = chapterTally(this.progress, slot.levelIds);
      this.tally.setText(slot.kind === 'playable' ? `${tally.finished} / ${slot.levelIds.length} cleared · ${tally.blots} / ${tally.maxBlots} blots` : slot.kind === 'locked' ? 'Full game' : 'Still being drawn');
    }
    const gy = this.walker.position.y;
    const off = Math.abs(gy - this.focusY) > half * 0.8;
    this.homeButton.setVisible(off && !this.following);
    (this.homeButton.list[1] as Phaser.GameObjects.Text).setText(gy > this.focusY ? 'Gecko ↓' : 'Gecko ↑');
  }

  private bindInput(): void {
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
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
    const page = (): number => this.halfView() * 1.6;
    const go = (dy: number): void => {
      if (this.card) return;
      this.following = false;
      this.targetY = this.clampY(this.targetY + dy);
    };
    kb?.on('keydown-UP', () => go(-KEY_STEP));
    kb?.on('keydown-DOWN', () => go(KEY_STEP));
    kb?.on('keydown-PAGE_UP', () => go(-page()));
    kb?.on('keydown-PAGE_DOWN', () => go(page()));
    kb?.on('keydown-HOME', () => go(this.walker.position.y - 40 - this.targetY));
    kb?.on('keydown-ENTER', () => {
      if (this.card || this.walker.walking) return;
      const level = levelById(this.currentNode.levelId);
      if (level) this.scene.start('Game', { levelId: level.id });
    });
  }
}
