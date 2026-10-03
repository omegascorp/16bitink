import Phaser from 'phaser';
import { BOIL_FPS, BOIL_FRAMES, ensureFishTextures, fishKey } from '../art/textures';
import { getChapters, getFullError, getHost } from '../host';
import { guidePages, guideProgress, type GuidePage } from '../guide';
import { allLevels } from '../levels/chapters';
import { LEVELS_PER_CHAPTER, ZONE_INFO, ZONE_NIGHT } from '../levels/zones';
import { isLevelOpen, loadSave } from '../logic/save';
import { loadPaidChapters } from './BootScene';
import { computeMapLayout, zoneIndexAt, type MapChapter, type MapLayout, type MapNode } from './map/layout';
import { buildMapWorld, depthLabel, mapFauna, type Boiler, type NodeState } from './map/mapWorld';
import { drawProgressBar } from './guide/progress';
import { BLUE_INK, HAND_FONT, INK_HEX, inkButton, inkText, RED_INK, uiScale } from './ui';

const DRAG_THRESHOLD = 8;
/** Captions on the map: soft ink on sunlit water, pale ink on the deep chapters' night. */
const SOFT_INK = '#4a463e';
const PALE_INK = '#e4dccb';
const PALE_BLUE = '#a9c4ff';

/**
 * Level select as a side-view sea chart: the seabed slopes from the shore
 * into the trench, one zone per chapter. Drag, scroll or use the arrow keys
 * to swim along it; the chapter tabs at the bottom jump between zones.
 */
export class MenuScene extends Phaser.Scene {
  private layout!: MapLayout;
  private uiLayer!: Phaser.GameObjects.Layer;
  private targetX = 0;
  private dragStart: { x: number; target: number } | null = null;
  private dragged = false;
  private boilers: Boiler[] = [];
  private tabs: Phaser.GameObjects.Container[] = [];
  private depthText!: Phaser.GameObjects.Text;
  private activeZone = -1;
  private countText: Phaser.GameObjects.Text | null = null;
  private titleText: Phaser.GameObjects.Text | null = null;
  private guide: { pages: GuidePage[]; seen: Set<string>; bar: Phaser.GameObjects.Graphics; text: Phaser.GameObjects.Text } | null = null;

  constructor() {
    super('Menu');
  }

  create(): void {
    const host = getHost(this);
    const owned = getChapters(this);
    const levels = allLevels(owned);
    const ids = levels.map((l) => l.id);
    const save = loadSave(host.storage);

    const chapters: MapChapter[] = ZONE_INFO.map((info) => {
      const ch = owned.find((c) => c.id === info.id);
      return ch
        ? { info: ch, levelIds: ch.levels.map((l) => l.id), locked: false }
        : { info, locked: true, levelIds: Array.from({ length: LEVELS_PER_CHAPTER }, (_, i) => `c${info.id}-l${i + 1}`) };
    });
    this.layout = computeMapLayout(chapters);

    const states = new Map<string, NodeState>();
    const blots = new Map<string, number>();
    let current: MapNode | undefined;
    for (const n of this.layout.nodes) {
      const zone = this.layout.zones[n.zone]!;
      const rec = save.levels[n.levelId];
      if (rec) blots.set(n.levelId, rec.blots);
      let state: NodeState;
      if (zone.chapter.locked) state = 'locked';
      else if (rec) state = 'done';
      else if (isLevelOpen(save, ids, n.levelId, host.allLevelsOpen === true)) state = current ? 'open' : 'current';
      else state = 'closed';
      if (state === 'current') current = n;
      states.set(n.levelId, state);
    }
    // Everything played: rest on the last level you finished.
    current ??= [...this.layout.nodes].reverse().find((n) => states.get(n.levelId) === 'done') ?? this.layout.nodes[0]!;

    ensureFishTextures(this, mapFauna(), ['light']);
    const world = buildMapWorld(this, this.layout, states, blots);
    const worldLayer = this.add.layer(world.objects);
    this.boilers = [...world.boilers];
    for (const { node, zone } of world.hits) {
      zone.on('pointerup', () => {
        if (this.dragged) return;
        const index = levels.findIndex((l) => l.id === node.levelId);
        if (index >= 0) this.scene.start('Game', { levelIndex: index });
      });
    }

    // "You are here": the chapter's player fish bobbing above the current level.
    const zoneOfCurrent = this.layout.zones[current.zone]!;
    const marker = this.add.image(current.x, current.y - 62, fishKey(zoneOfCurrent.chapter.info.player, 'light', 0)).setScale(0.36);
    worldLayer.add(marker);
    this.boilers.push({ sprite: marker, key: (f) => fishKey(zoneOfCurrent.chapter.info.player, 'light', f) });
    this.tweens.add({ targets: marker, y: marker.y - 10, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.InOut' });

    // Cameras: the main one swims along the map, a second one draws the fixed UI.
    const cam = this.cameras.main;
    cam.setBackgroundColor('#f4eddc').setBounds(0, 0, this.layout.width, this.layout.height);
    cam.setZoom(Phaser.Math.Clamp(this.scale.height / 760, 0.5, 1.25));
    this.uiLayer = this.add.layer();
    this.buildUi(levels.length, save);
    cam.ignore(this.uiLayer);
    this.cameras.add(0, 0, this.scale.width, this.scale.height).ignore(worldLayer);

    this.targetX = current.x;
    this.centerCamera(1);
    this.bindInput();
    this.time.addEvent({ delay: 1000 / BOIL_FPS, loop: true, callback: this.boil, callbackScope: this });

    const relayout = (): void => {
      this.scene.restart();
    };
    this.scale.once('resize', relayout);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', relayout));
  }

  update(_t: number, delta: number): void {
    this.centerCamera(Math.min(1, (delta / 1000) * 8));
  }

  private boilFrame = 0;

  private boil(): void {
    this.boilFrame = (this.boilFrame + 1) % BOIL_FRAMES;
    for (const b of this.boilers) b.sprite.setTexture(b.key(this.boilFrame));
  }

  /** Eases the camera towards targetX, following the seabed so the route stays in view. */
  private centerCamera(k: number): void {
    const cam = this.cameras.main;
    const halfW = cam.width / cam.zoom / 2;
    this.targetX = Phaser.Math.Clamp(this.targetX, halfW, Math.max(halfW, this.layout.width - halfW));
    const x = Phaser.Math.Linear(cam.midPoint.x, this.targetX, k);
    // Keep the seabed in the lower quarter: the route gets the middle of the screen.
    const y = this.layout.floorAt(x) - (cam.height / cam.zoom) * 0.27;
    cam.centerOn(x, Phaser.Math.Linear(cam.midPoint.y, y, k));
    const zone = zoneIndexAt(this.layout, x);
    if (zone !== this.activeZone) this.setActiveZone(zone);
  }

  private bindInput(): void {
    const zoom = (): number => this.cameras.main.zoom;
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.dragStart = { x: p.x, target: this.targetX };
      this.dragged = false;
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!p.isDown || !this.dragStart) return;
      const dx = p.x - this.dragStart.x;
      if (Math.abs(dx) > DRAG_THRESHOLD) this.dragged = true;
      if (this.dragged) this.targetX = this.dragStart.target - dx / zoom();
    });
    this.input.on('pointerup', () => {
      this.dragStart = null;
    });
    this.input.on('wheel', (_p: unknown, _o: unknown, dx: number, dy: number) => {
      this.targetX += (dx + dy) / zoom();
    });
    const kb = this.input.keyboard;
    kb?.on('keydown-RIGHT', () => (this.targetX += 400));
    kb?.on('keydown-LEFT', () => (this.targetX -= 400));
  }

  private buildUi(playable: number, save: ReturnType<typeof loadSave>): void {
    const host = getHost(this);
    const { width, height } = this.scale;
    const s = uiScale(this, 900, 600);
    const ui = (o: Phaser.GameObjects.GameObject): void => {
      this.uiLayer.add(o);
    };
    const done = Object.keys(save.levels).length;
    this.titleText = inkText(this, 20 + 90 * s, 34 * s, 'InkFish', 46 * s, BLUE_INK);
    ui(this.titleText);
    this.countText = this.add.text(24, 64 * s, `${done} of ${this.layout.nodes.length} levels`, { fontFamily: HAND_FONT, fontSize: `${22 * s}px`, color: SOFT_INK });
    ui(this.countText);
    ui(inkButton(this, width - 110 * s, 36 * s, '← 16bit.ink', () => host.onExit(), { width: 180 * s, height: 46 * s, size: 24 * s }));
    ui(inkButton(this, width - 310 * s, 36 * s, 'Fish guide', () => this.scene.start('Guide', { chapter: (this.activeZone >= 0 ? this.activeZone : 0) + 1 }), { width: 160 * s, height: 46 * s, size: 24 * s }));
    // Under the button: how much of this chapter's guide page you've filled in.
    const bar = this.add.graphics().setPosition(width - 310 * s, 72 * s);
    const text = this.add.text(width - 310 * s, 90 * s, '', { fontFamily: HAND_FONT, fontSize: `${18 * s}px`, color: SOFT_INK }).setOrigin(0.5);
    ui(bar);
    ui(text);
    this.guide = { pages: guidePages(getChapters(this)), seen: new Set(save.seen), bar, text };

    // Chapter tabs: jump straight to any zone, 100 levels is a long swim.
    const n = this.layout.zones.length;
    const gap = Math.min(52 * s, (width - 40) / n);
    const y = height - 34 * s;
    this.tabs = this.layout.zones.map((z, i) => {
      const g = this.add.graphics();
      const t = this.add.text(0, 0, String(z.chapter.info.id), { fontFamily: HAND_FONT, fontSize: `${22 * s}px`, color: z.chapter.locked ? '#a69c8a' : '#1b1a1f' }).setOrigin(0.5);
      const c = this.add.container(width / 2 + (i - (n - 1) / 2) * gap, y, [g, t]).setSize(40 * s, 40 * s).setInteractive({ useHandCursor: true });
      c.setData('locked', z.chapter.locked);
      c.on('pointerup', () => {
        this.targetX = (z.x0 + z.x1) / 2;
      });
      ui(c);
      return c;
    });
    this.depthText = this.add.text(width / 2, y - 34 * s, '', { fontFamily: HAND_FONT, fontSize: `${22 * s}px`, color: SOFT_INK }).setOrigin(0.5);
    ui(this.depthText);

    if (!host.unlocked) {
      const locked = this.layout.nodes.length - playable;
      ui(inkButton(this, width - 170 * s, height - 90 * s, `Unlock ${locked} more levels`, () => host.onBuy(), { width: 300 * s, height: 52 * s, size: 26 * s, color: RED_INK }));
    }
    const error = getFullError(this);
    if (error) {
      ui(inkText(this, width / 2, 100 * s, error, 20 * s, RED_INK));
      ui(inkButton(this, width / 2, 140 * s, 'Retry', () => void loadPaidChapters(this).then(() => this.scene.restart()), { width: 140 * s, height: 42 * s, size: 22 * s }));
    }
  }

  private setActiveZone(index: number): void {
    this.activeZone = index;
    const z = this.layout.zones[index]!;
    this.depthText.setText(`${z.chapter.info.name}, ${depthLabel(z.chapter.info.depth)}`);
    this.showGuideProgress(z.chapter.info.id);
    // Over the deep chapters' night, the fixed captions switch to pale ink.
    const night = ZONE_NIGHT[z.chapter.info.zone].alpha > 0;
    const caption = night ? PALE_INK : SOFT_INK;
    this.titleText?.setColor(night ? PALE_BLUE : BLUE_INK);
    for (const t of [this.depthText, this.countText, this.guide?.text]) t?.setColor(caption);
    this.tabs.forEach((tab, i) => {
      const g = tab.list[0] as Phaser.GameObjects.Graphics;
      const r = 17 * uiScale(this, 900, 600);
      g.clear();
      const active = i === index;
      g.fillStyle(active ? 0x1f3f8a : 0xfffaf0, active ? 1 : 0.92).fillCircle(0, 0, r);
      g.lineStyle(active ? 2.4 : 1.4, tab.getData('locked') ? 0xa69c8a : INK_HEX, 1).strokeCircle(0, 0, r);
      (tab.list[1] as Phaser.GameObjects.Text).setColor(active ? '#fbf6ea' : tab.getData('locked') ? '#a69c8a' : '#1b1a1f');
    });
  }

  private showGuideProgress(chapter: number): void {
    if (!this.guide) return;
    const { pages, seen, bar, text } = this.guide;
    const page = pages.find((p) => p.chapter === chapter);
    bar.setVisible(Boolean(page));
    text.setVisible(Boolean(page));
    if (!page) return;
    const s = uiScale(this, 900, 600);
    const p = guideProgress(page.ids, seen);
    drawProgressBar(bar, 150 * s, 10 * s, p, 23);
    text.setText(p.percent >= 100 ? `Chapter ${chapter} complete!` : `Chapter ${chapter}: ${p.percent}% met`);
  }
}
