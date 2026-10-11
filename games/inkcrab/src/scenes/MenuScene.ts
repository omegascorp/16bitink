import { missionOf } from '../level/missions';
import { shortGoal } from '../logic/mission';
import Phaser from 'phaser';
import { BLUE, BLUE_HEX, PAPER_HEX, RED } from '../art/palette';
import { TEX } from '../art/textures';
import { FOOT, FRAME } from '../art/frame';
import { getHost } from '../host';
import { BIOMES, LEVELS_PER_BEACH } from '../level/biomes';
import { levelGoal } from '../level/build';
import { BEACHES, isPaid, LEVEL_ORDER, LEVELS } from '../level/levels';
import { isUnlocked, loadProgress, type Progress } from '../logic/save';
import { BANNER_TEXT } from '../art/map/banner';
import { ChartView } from './map/chartView';
import { islandPlans } from './map/plan';
import { computeMapLayout, MAP, regionIndexAt, type MapBeach, type MapLayout, type MapNode } from './map/layout';
import { buildRoute, type NodeState } from './map/routeView';
import { crispText, DPR, screenZoom, toView, uiCamera, viewSize } from './hidpi';
import { HAND_FONT, inkButton, inkText } from './ui';

const DRAG_THRESHOLD = 8;
const SOFT_INK = '#4a463e';
const PENCIL = '#8a8578';
/** Arrow keys move the chart this far. */
const KEY_STEP = 420;

/**
 * Level select as a beachcomber's chart: one island per beach, ten levels
 * each along its sand, joined by sea routes. Drag, scroll or use the arrow
 * keys to travel along it; the tabs at the bottom jump between beaches.
 * Beaches not built yet are pencil drafts.
 */
export class MenuScene extends Phaser.Scene {
  private layout!: MapLayout;
  private chart!: ChartView;
  private targetX = 0;
  private dragStart: { x: number; target: number } | null = null;
  private dragged = false;
  private activeRegion = -1;
  private caption!: Phaser.GameObjects.Text;
  private tagline!: Phaser.GameObjects.Text;
  private tabs: Phaser.GameObjects.Container[] = [];

  constructor() {
    super('Menu');
  }

  create(): void {
    crispText(this);
    const host = getHost(this);
    const progress = loadProgress(host.storage);
    const beaches: MapBeach[] = BIOMES.map((biome, i) => {
      const built = BEACHES[i];
      return built
        ? { biome, built: true, levelIds: built.map((l) => l.id) }
        : { biome, built: false, levelIds: Array.from({ length: LEVELS_PER_BEACH }, (_, k) => `draft-${biome.id}-${k + 1}`) };
    });
    this.layout = computeMapLayout(beaches);
    const { states, blots, current } = this.nodeStates(progress);
    const names = new Map(LEVELS.map((l) => [l.id, l.name]));

    const chartLayer = this.add.layer();
    const worldLayer = this.add.layer();
    const uiLayer = this.add.layer();
    const cam = this.cameras.main;
    const zoom = Phaser.Math.Clamp(viewSize(this).height / MAP.height, 0.55, 1.4);
    cam.setBackgroundColor('#f5f0e1').setBounds(0, 0, this.layout.width, this.layout.height).setZoom(zoom * DPR);
    this.chart = new ChartView(this, this.layout, chartLayer, Math.min(2, zoom * DPR));

    const missions = new Map(LEVELS.map((l) => [l.id, missionOf(l)]));
    const route = buildRoute(this, this.layout, states, blots, names, missions);
    worldLayer.add(route.objects);
    for (const { node, zone } of route.hits) {
      zone.on('pointerup', () => {
        if (!this.dragged) this.play(node.levelId);
      });
    }
    this.islandLabels(worldLayer);
    this.marker(worldLayer, current, states.get(current.levelId) === 'done', Object.keys(progress.levels).length === 0);

    this.buildUi(uiLayer, progress);
    cam.ignore(uiLayer);
    uiCamera(this.cameras.add(0, 0, this.scale.width, this.scale.height)).ignore([chartLayer, worldLayer]);

    this.targetX = current.x;
    this.centerCamera(1);
    this.chart.update(cam.worldView.x, cam.worldView.right, true);
    this.bindInput();
    const relayout = (): void => {
      this.scene.restart();
    };
    this.scale.once('resize', relayout);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', relayout));
  }

  update(_t: number, delta: number): void {
    this.centerCamera(Math.min(1, (delta / 1000) * 8));
    const view = this.cameras.main.worldView;
    this.chart.update(view.x, view.right);
  }

  /** Each level's state, its blots, and where "you are here" goes: the first open level, or the last played. */
  private nodeStates(progress: Progress): { states: Map<string, NodeState>; blots: Map<string, number>; current: MapNode } {
    const states = new Map<string, NodeState>();
    const blots = new Map<string, number>();
    let current: MapNode | undefined;
    for (const n of this.layout.nodes) {
      const region = this.layout.regions[n.region]!;
      const rec = progress.levels[n.levelId];
      if (rec) blots.set(n.levelId, rec.blots);
      let s: NodeState;
      if (!region.beach.built) s = 'draft';
      else if (rec) s = 'done';
      else if (getHost(this).allLevelsOpen === true || isUnlocked(progress, LEVEL_ORDER, n.levelId)) s = current ? 'open' : 'current';
      else s = 'closed';
      if (s === 'current') current = n;
      states.set(n.levelId, s);
    }
    current ??= [...this.layout.nodes].reverse().find((n) => states.get(n.levelId) === 'done') ?? this.layout.nodes[0]!;
    return { states, blots, current };
  }

  /** Plays a level; one of the full game's beaches, without it, offers it instead. */
  private play(levelId: string): void {
    const host = getHost(this);
    if (isPaid(levelId) && !host.unlocked) host.onBuy();
    else this.scene.start('Game', { levelId });
  }

  /** Each island's name and tagline, lettered into its cartouche on the chart; unbuilt ones are marked uncharted. */
  private islandLabels(layer: Phaser.GameObjects.Layer): void {
    const plans = islandPlans(this.layout);
    this.layout.regions.forEach((r, i) => {
      const { x, y } = plans[i]!.label;
      const color = r.beach.built ? BLUE : PENCIL;
      layer.add(inkText(this, x, y + BANNER_TEXT.nameDy, `${r.beach.biome.beach}. ${r.beach.biome.name}`, BANNER_TEXT.nameSize, color));
      layer.add(inkText(this, x, y + BANNER_TEXT.taglineDy, r.beach.built ? r.beach.biome.tagline : 'uncharted · coming soon', BANNER_TEXT.taglineSize, r.beach.built ? SOFT_INK : PENCIL));
    });
  }

  /** "You are here": the hermit crab in its periwinkle, bobbing over the current level, with a Play button under it. */
  private marker(layer: Phaser.GameObjects.Layer, node: MapNode, done: boolean, fresh: boolean): void {
    const ox = FOOT.x / FRAME;
    const oy = FOOT.y / FRAME;
    const crab = this.add.container(node.x, node.y - MAP.nodeRadius - 4, [
      this.add.image(0, 0, TEX.crabBack(0)).setOrigin(ox, oy),
      this.add.image(0, 0, TEX.shell('periwinkle', 0)).setOrigin(ox, oy),
      this.add.image(0, 0, TEX.crabFront(0)).setOrigin(ox, oy),
    ]).setScale(0.4);
    this.tweens.add({ targets: crab, y: crab.y - 8, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    layer.add(crab);
    const def = LEVELS.find((l) => l.id === node.levelId);
    if (!def) return;
    const y = node.y + MAP.nodeRadius + (done ? 48 : 34);
    const title = inkText(this, node.x, y, def.name, 22);
    const goal = inkText(this, node.x, y + 24, shortGoal(missionOf(def), levelGoal(def)), 17, SOFT_INK);
    // A scrap of paper under the words, so they read over reefs and ice.
    const w = Math.max(title.width, goal.width) + 16;
    const card = this.add.graphics();
    card.fillStyle(PAPER_HEX, 0.82).fillRoundedRect(node.x - w / 2, y - 16, w, 54, 8);
    layer.add([card, title, goal]);
    const host = getHost(this);
    const locked = isPaid(def.id) && !host.unlocked;
    const label = locked ? (host.price ? `Unlock · ${host.price}` : 'Unlock') : done ? 'Play again' : 'Play';
    const button = inkButton(this, node.x, y + 64, label, () => this.play(def.id), { width: locked ? 190 : 132, height: 44, size: 26 });
    // A slow breath on the first visit, so the eye finds it.
    if (fresh) this.tweens.add({ targets: button, scale: 1.08, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    layer.add(button);
  }

  /** Eases the camera towards targetX along the chart. */
  private centerCamera(k: number): void {
    const cam = this.cameras.main;
    const halfW = cam.width / cam.zoom / 2;
    this.targetX = Phaser.Math.Clamp(this.targetX, halfW, Math.max(halfW, this.layout.width - halfW));
    const x = Phaser.Math.Linear(cam.midPoint.x, this.targetX, k);
    cam.centerOn(x, this.layout.height / 2);
    const region = regionIndexAt(this.layout, x);
    if (region !== this.activeRegion) this.setActiveRegion(region);
  }

  private bindInput(): void {
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.dragStart = { x: toView(p.x, p.y).x, target: this.targetX };
      this.dragged = false;
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!p.isDown || !this.dragStart) return;
      const dx = toView(p.x, p.y).x - this.dragStart.x;
      if (Math.abs(dx) > DRAG_THRESHOLD) this.dragged = true;
      if (this.dragged) this.targetX = this.dragStart.target - dx / screenZoom(this.cameras.main);
    });
    this.input.on('pointerup', () => {
      this.dragStart = null;
    });
    this.input.on('wheel', (_p: unknown, _o: unknown, dx: number, dy: number) => {
      this.targetX += (dx + dy) / screenZoom(this.cameras.main);
    });
    const kb = this.input.keyboard;
    kb?.on('keydown-RIGHT', () => (this.targetX += KEY_STEP));
    kb?.on('keydown-LEFT', () => (this.targetX -= KEY_STEP));
  }

  private buildUi(layer: Phaser.GameObjects.Layer, progress: Progress): void {
    const host = getHost(this);
    const { width, height } = viewSize(this);
    const done = Object.keys(progress.levels).length;
    const panel = this.add.graphics();
    panel.fillStyle(PAPER_HEX, 0.85).fillRect(0, height - 92, width, 92);
    panel.lineStyle(1.4, BLUE_HEX, 0.7).lineBetween(0, height - 92, width, height - 92);
    layer.add(panel);
    const head = this.add.graphics();
    head.fillStyle(PAPER_HEX, 0.82).fillRoundedRect(12, 8, 196, 82, 10);
    head.lineStyle(1.2, BLUE_HEX, 0.5).strokeRoundedRect(12, 8, 196, 82, 10);
    layer.add(head);
    layer.add(inkText(this, 110, 36, 'InkCrab', 44));
    layer.add(this.add.text(30, 64, `${done} of ${this.layout.nodes.length} levels`, { fontFamily: HAND_FONT, fontSize: '20px', color: SOFT_INK }));
    layer.add(inkButton(this, width - 100, 38, '← 16bit.ink', () => host.onExit(), { width: 170, height: 44, size: 24 }));

    // Beach tabs: jump straight to any island.
    const n = this.layout.regions.length;
    const gap = Math.min(52, (width - 40) / n);
    const y = height - 26;
    this.tabs = this.layout.regions.map((r, i) => {
      const g = this.add.graphics();
      const t = this.add.text(0, 0, String(r.beach.biome.beach), { fontFamily: HAND_FONT, fontSize: '22px', color: r.beach.built ? '#1b1a1f' : '#a69c8a' }).setOrigin(0.5);
      const c = this.add.container(width / 2 + (i - (n - 1) / 2) * gap, y, [g, t]).setSize(Math.max(40, gap), 40).setInteractive({ useHandCursor: true });
      c.on('pointerup', () => {
        const first = this.layout.nodes.find((node) => node.region === i);
        this.targetX = first ? first.x + MAP.nodeGap * 4.5 : (r.x0 + r.x1) / 2;
      });
      layer.add(c);
      return c;
    });
    this.caption = inkText(this, width / 2, height - 72, '', 24);
    this.tagline = this.add.text(width / 2, height - 52, '', { fontFamily: HAND_FONT, fontSize: '17px', color: SOFT_INK }).setOrigin(0.5);
    layer.add([this.caption, this.tagline]);
  }

  private setActiveRegion(index: number): void {
    this.activeRegion = index;
    const r = this.layout.regions[index]!;
    const { biome } = r.beach;
    this.caption.setText(`Beach ${biome.beach} · ${biome.name}`).setColor(r.beach.built ? BLUE : PENCIL);
    this.tagline.setText(r.beach.built ? biome.tagline : 'uncharted · coming soon');
    this.tabs.forEach((tab, i) => {
      const g = tab.list[0] as Phaser.GameObjects.Graphics;
      g.clear();
      if (i !== index) return;
      g.lineStyle(2, Phaser.Display.Color.HexStringToColor(RED).color, 0.9).strokeCircle(0, 0, 15);
    });
  }
}
