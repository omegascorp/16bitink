import Phaser from 'phaser';
import { screenScene, toView, viewSize } from './hidpi';
import { getChapters, getHost } from '../host';
import { guidePages, guideProgress, type GuideId, type GuidePage } from '../guide';
import { ZONE_INFO } from '../levels/zones';
import { loadSave } from '../logic/save';
import { CARD, guideCard, guideDetail } from './guide/cards';
import { drawProgressRing, progressBar } from './guide/progress';
import { depthLabel } from './map/mapWorld';
import { BLUE_INK, HAND_FONT, INK_HEX, inkButton, inkText, paperBackdrop, RED_INK, uiScale } from './ui';

const GAP = 14;
const TOP = 168;
const BOTTOM = 90;

/**
 * The fish guide: one page per chapter listing every creature you can meet
 * there. Ones you've met show their drawing and open a real-life fact card;
 * the rest are question marks until you swim past them.
 */
export class GuideScene extends Phaser.Scene {
  private pages: GuidePage[] = [];
  private seen = new Set<string>();
  private chapter = 1;
  private grid: Phaser.GameObjects.Container | null = null;
  private header: Phaser.GameObjects.GameObject[] = [];
  private detail: Phaser.GameObjects.Container | null = null;
  private scrollY = 0;
  private maxScroll = 0;
  private drag: { y: number; scroll: number } | null = null;

  constructor() {
    super('Guide');
  }

  init(data: { chapter?: number }): void {
    this.chapter = data.chapter ?? 1;
  }

  create(): void {
    screenScene(this);
    const host = getHost(this);
    this.pages = guidePages(getChapters(this));
    this.seen = new Set(loadSave(host.storage).seen);
    this.render();
    this.scale.on('resize', this.render, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', this.render, this));
    this.input.keyboard?.on('keydown-ESC', () => (this.detail ? this.closeDetail() : this.scene.start('Menu')));
    this.input.keyboard?.on('keydown-LEFT', () => this.turn(-1));
    this.input.keyboard?.on('keydown-RIGHT', () => this.turn(1));
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => this.scrollTo(this.scrollY + dy));
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => (this.drag = { y: toView(p.x, p.y).y, scroll: this.scrollY }));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (this.drag && p.isDown) this.scrollTo(this.drag.scroll - (toView(p.x, p.y).y - this.drag.y));
    });
    this.input.on('pointerup', () => (this.drag = null));
  }

  private turn(step: number): void {
    if (this.detail) return;
    this.chapter = Phaser.Math.Clamp(this.chapter + step, 1, ZONE_INFO.length);
    this.scrollY = 0;
    this.render();
  }

  private render(): void {
    this.children.removeAll(true);
    this.detail = null;
    const host = getHost(this);
    const { width, height } = viewSize(this);
    const s = uiScale(this, 900, 600);
    paperBackdrop(this);
    const all = this.pages.flatMap((p) => p.ids);
    const met = all.filter((id) => this.seen.has(id)).length;
    const info = ZONE_INFO[this.chapter - 1]!;
    this.header = [
      inkText(this, 20 + 110 * s, 36 * s, 'Fish guide', 46 * s, BLUE_INK),
      this.add.text(24, 64 * s, `${met} of ${all.length} creatures met`, { fontFamily: HAND_FONT, fontSize: `${22 * s}px`, color: '#4a463e' }),
      inkButton(this, width - 90 * s, 36 * s, '← Map', () => this.scene.start('Menu'), { width: 140 * s, height: 46 * s, size: 24 * s }),
      inkText(this, width / 2, 104 * s, `${info.id}. ${info.name}, ${depthLabel(info.depth)}`, 28 * s),
    ];
    this.buildTabs(s);
    const page = this.pages.find((p) => p.chapter === this.chapter);
    if (!page) {
      this.add.existing(inkText(this, width / 2, height / 2 - 20 * s, 'Unlock the full game to meet the creatures down here.', 26 * s, '#5b5446'));
      if (!host.unlocked) inkButton(this, width / 2, height / 2 + 40 * s, 'Unlock all levels', () => host.onBuy(), { width: 260 * s, height: 50 * s, size: 26 * s, color: RED_INK });
      return;
    }
    // How much of this chapter's page is filled in, right under its name.
    progressBar(this, width / 2 - 70 * s, 140 * s, 240 * s, 16 * s, guideProgress(page.ids, this.seen), s);
    this.buildGrid(page.ids, s);
  }

  private buildTabs(s: number): void {
    const { width, height } = viewSize(this);
    const n = ZONE_INFO.length;
    const gap = Math.min(52 * s, (width - 40) / n);
    for (const z of ZONE_INFO) {
      const active = z.id === this.chapter;
      const page = this.pages.find((p) => p.chapter === z.id);
      const owned = Boolean(page);
      const g = this.add.graphics();
      g.fillStyle(active ? 0x1f3f8a : 0xfffaf0, active ? 1 : 0.92).fillCircle(0, 0, 17 * s);
      g.lineStyle(active ? 2.4 : 1.4, owned ? INK_HEX : 0xa69c8a, 1).strokeCircle(0, 0, 17 * s);
      if (page) drawProgressRing(g, 21 * s, guideProgress(page.ids, this.seen));
      const t = this.add.text(0, 0, String(z.id), { fontFamily: HAND_FONT, fontSize: `${22 * s}px`, color: active ? '#fbf6ea' : owned ? '#1b1a1f' : '#a69c8a' }).setOrigin(0.5);
      const tab = this.add.container(width / 2 + (z.id - 1 - (n - 1) / 2) * gap, height - 34 * s, [g, t]).setSize(40 * s, 40 * s).setInteractive({ useHandCursor: true });
      tab.on('pointerup', () => {
        if (this.detail) return;
        this.chapter = z.id;
        this.scrollY = 0;
        this.render();
      });
    }
  }

  private buildGrid(ids: readonly GuideId[], s: number): void {
    const { width, height } = viewSize(this);
    const cw = (CARD.w + GAP) * s;
    const ch = (CARD.h + GAP) * s;
    const cols = Math.max(1, Math.floor((width - 32) / cw));
    const top = TOP * s;
    const visible = height - top - BOTTOM * s;
    const rows = Math.ceil(ids.length / cols);
    this.maxScroll = Math.max(0, rows * ch - visible);
    const x0 = width / 2 - ((Math.min(cols, ids.length) - 1) * cw) / 2;
    const cards = ids.map((id, i) =>
      guideCard(this, id, this.seen.has(id), x0 + (i % cols) * cw, Math.floor(i / cols) * ch + ch / 2, s, () => this.openDetail(id, s)));
    this.grid = this.add.container(0, top, cards);
    // Only the band between the header and the tabs shows cards.
    const shape = this.make.graphics({}, false).fillRect(0, top, width, visible);
    this.grid.setMask(shape.createGeometryMask());
    this.scrollTo(this.scrollY);
  }

  private scrollTo(y: number): void {
    if (!this.grid || this.detail) return;
    this.scrollY = Phaser.Math.Clamp(y, 0, this.maxScroll);
    this.grid.y = TOP * uiScale(this, 900, 600) - this.scrollY;
  }

  private openDetail(id: GuideId, s: number): void {
    if (this.detail || (this.drag && Math.abs(this.drag.scroll - this.scrollY) > 8)) return;
    this.detail = guideDetail(this, id, s, () => this.closeDetail());
  }

  private closeDetail(): void {
    this.detail?.destroy();
    this.detail = null;
  }
}
