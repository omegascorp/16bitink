import Phaser from 'phaser';
import { BLUE, BLUE_HEX, PAPER_HEX, RED } from '../art/palette';
import { TEX } from '../art/textures';
import { getFullError, getHost } from '../host';
import { guidePages, guideProgress, type GuidePage } from '../guide';
import { BIOMES } from '../level/biomes';
import { loadedBeaches } from '../level/levels';
import { loadProgress } from '../logic/save';
import { loadPaidBeaches } from './BootScene';
import { CARD, guideCard, guideDetail, seenId, type GuideItem } from './guide/cards';
import { screenScene, toView, viewSize } from './hidpi';
import { HAND_FONT, inkButton, inkText } from './ui';

const SOFT_INK = '#4a463e';
const PENCIL = '#a69c8a';
const PENCIL_HEX = 0xa69c8a;
const GAP = 12;
/** Where the scrolling cards start, and the band kept clear for the beach tabs. */
const TOP = 132;
const BOTTOM = 76;
/** Room for a section's heading above its cards. */
const HEADING = 40;
/** A press that moves this far is a scroll, not a tap on a card. */
const DRAG = 8;
/** The header and tabs sit over the scrolling cards; the open card over everything. */
const PAPER_DEPTH = 10;
const HEADER_DEPTH = 11;

/**
 * The field guide: a naturalist's notebook with a page per beach, listing
 * every creature you can meet there and every shell you can find. What
 * you've seen shows its drawing and opens a real-life fact card; the rest
 * are question marks until you come across them (see game/sightings.ts).
 */
export class GuideScene extends Phaser.Scene {
  private pages: GuidePage[] = [];
  private seen = new Set<string>();
  private beach = 1;
  private grid: Phaser.GameObjects.Container | null = null;
  private detail: Phaser.GameObjects.Container | null = null;
  private scrollY = 0;
  private maxScroll = 0;
  private drag: { y: number; scroll: number } | null = null;

  constructor() {
    super('Guide');
  }

  init(data: { beach?: number }): void {
    this.beach = Phaser.Math.Clamp(data?.beach ?? 1, 1, BIOMES.length);
    this.scrollY = 0;
  }

  create(): void {
    screenScene(this);
    this.pages = guidePages(loadedBeaches());
    this.seen = new Set(loadProgress(getHost(this).storage).seen);
    this.render();
    this.scale.on('resize', this.render, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', this.render, this));
    const kb = this.input.keyboard;
    kb?.on('keydown-ESC', () => (this.detail ? this.closeDetail() : this.scene.start('Menu')));
    kb?.on('keydown-LEFT', () => this.turn(this.beach - 1));
    kb?.on('keydown-RIGHT', () => this.turn(this.beach + 1));
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => this.scrollTo(this.scrollY + dy));
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => (this.drag = { y: toView(p.x, p.y).y, scroll: this.scrollY }));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (this.drag && p.isDown) this.scrollTo(this.drag.scroll - (toView(p.x, p.y).y - this.drag.y));
    });
    this.input.on('pointerup', () => (this.drag = null));
  }

  /** Scales the page down on small screens, never up. */
  private scaleOf(): number {
    const { width, height } = viewSize(this);
    return Phaser.Math.Clamp(Math.min(width / 900, height / 620), 0.62, 1);
  }

  private turn(beach: number): void {
    if (this.detail) return;
    this.beach = Phaser.Math.Clamp(beach, 1, BIOMES.length);
    this.scrollY = 0;
    this.render();
  }

  private render(): void {
    this.children.removeAll(true);
    this.detail = null;
    this.grid = null;
    const { width, height } = viewSize(this);
    const s = this.scaleOf();
    this.add.tileSprite(0, 0, width, height, TEX.paper).setOrigin(0);
    // Paper over the cards above and below the band they scroll in, so the header and tabs stay clear.
    this.add.tileSprite(0, 0, width, TOP * s, TEX.paper).setOrigin(0).setDepth(PAPER_DEPTH).setInteractive();
    this.add.tileSprite(0, height - BOTTOM * s, width, BOTTOM * s, TEX.paper).setOrigin(0).setDepth(PAPER_DEPTH).setInteractive();
    const all = this.pages.flatMap((p) => this.pageIds(p));
    const met = all.filter((id) => this.seen.has(id)).length;
    const biome = BIOMES[this.beach - 1]!;
    const header = [
      inkText(this, 24 + 100 * s, 34 * s, 'Field guide', 44 * s),
      this.add.text(24, 62 * s, `${met} of ${all.length} met`, { fontFamily: HAND_FONT, fontSize: `${20 * s}px`, color: SOFT_INK }),
      inkButton(this, width - 84 * s, 36 * s, '← Map', () => this.scene.start('Menu'), { width: 136 * s, height: 44 * s, size: 24 * s }),
      inkText(this, width / 2, 96 * s, `${biome.beach}. ${biome.name}`, 30 * s),
    ];
    for (const h of header) h.setDepth(HEADER_DEPTH);
    this.buildTabs(s);
    const page = this.pages.find((p) => p.beach === this.beach);
    if (page) this.buildGrid(page, s);
    else this.lockedPage(s);
  }

  /** A beach of the full game the player doesn't have: offer it, or, for an owner whose download failed, try again. */
  private lockedPage(s: number): void {
    const host = getHost(this);
    const { width, height } = viewSize(this);
    const error = host.unlocked ? getFullError(this) : null;
    inkText(this, width / 2, height / 2 - 24 * s, error ?? 'Unlock the full game to explore this beach.', 26 * s, error ? RED : SOFT_INK);
    if (!host.unlocked) {
      const label = host.price ? `Unlock the full game · ${host.price}` : 'Unlock the full game';
      inkButton(this, width / 2, height / 2 + 36 * s, label, () => host.onBuy(), { width: 340 * s, height: 50 * s, size: 26 * s });
    } else if (error) {
      inkButton(this, width / 2, height / 2 + 36 * s, 'Retry', () => void loadPaidBeaches(this).then(() => this.scene.restart({ beach: this.beach })), { width: 140 * s, height: 46 * s, size: 24 * s });
    }
  }

  private buildTabs(s: number): void {
    const { width, height } = viewSize(this);
    const n = BIOMES.length;
    const gap = Math.min(52 * s, (width - 40) / n);
    for (const biome of BIOMES) {
      const active = biome.beach === this.beach;
      const page = this.pages.find((p) => p.beach === biome.beach);
      const g = this.add.graphics();
      g.fillStyle(active ? BLUE_HEX : PAPER_HEX, active ? 1 : 0.92).fillCircle(0, 0, 17 * s);
      g.lineStyle(active ? 2.4 : 1.4, page ? BLUE_HEX : PENCIL_HEX, 1).strokeCircle(0, 0, 17 * s);
      if (page) {
        // A ring round the tab fills as the page does.
        const p = guideProgress(this.pageIds(page), this.seen);
        if (p.met > 0) g.lineStyle(3 * s, BLUE_HEX, 0.8).beginPath().arc(0, 0, 22 * s, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * p.met) / p.total).strokePath();
      }
      const t = this.add.text(0, 0, String(biome.beach), { fontFamily: HAND_FONT, fontSize: `${22 * s}px`, color: active ? '#fbf6ea' : page ? '#1b1a1f' : PENCIL }).setOrigin(0.5);
      const tab = this.add.container(width / 2 + (biome.beach - 1 - (n - 1) / 2) * gap, height - 34 * s, [g, t]).setSize(40 * s, 40 * s).setInteractive({ useHandCursor: true }).setDepth(HEADER_DEPTH);
      tab.on('pointerup', () => this.turn(biome.beach));
    }
  }

  private pageIds(page: GuidePage): string[] {
    return [...page.creatures, ...page.shells.map((k) => seenId({ type: 'shell', id: k }))];
  }

  /** The page's two sections, creatures then shells, each a heading over a grid of cards; scrolls when it runs long. */
  private buildGrid(page: GuidePage, s: number): void {
    const { width, height } = viewSize(this);
    const cw = (CARD.w + GAP) * s;
    const ch = (CARD.h + GAP) * s;
    const cols = Math.max(1, Math.floor((width - 32) / cw));
    const parts: Phaser.GameObjects.GameObject[] = [];
    let y = 0;
    const section = (title: string, items: readonly GuideItem[]): void => {
      const p = guideProgress(items.map(seenId), this.seen);
      parts.push(inkText(this, width / 2, y + 18 * s, `${title} · ${p.met} of ${p.total}`, 26 * s, BLUE));
      y += HEADING * s;
      const x0 = width / 2 - ((Math.min(cols, items.length) - 1) * cw) / 2;
      items.forEach((item, i) => {
        const met = this.seen.has(seenId(item));
        parts.push(guideCard(this, item, met, x0 + (i % cols) * cw, y + Math.floor(i / cols) * ch + ch / 2, s, () => this.openDetail(item, s)));
      });
      y += Math.ceil(items.length / cols) * ch + 10 * s;
    };
    section('Creatures', page.creatures.map((id) => ({ type: 'creature', id })));
    section('Shells', page.shells.map((id) => ({ type: 'shell', id })));
    const top = TOP * s;
    const visible = height - top - BOTTOM * s;
    this.maxScroll = Math.max(0, y - visible);
    this.grid = this.add.container(0, top, parts);
    this.scrollTo(this.scrollY);
  }

  private scrollTo(y: number): void {
    if (!this.grid || this.detail) return;
    this.scrollY = Phaser.Math.Clamp(y, 0, this.maxScroll);
    this.grid.y = TOP * this.scaleOf() - this.scrollY;
  }

  private openDetail(item: GuideItem, s: number): void {
    if (this.detail || (this.drag && Math.abs(this.drag.scroll - this.scrollY) > DRAG)) return;
    this.detail = guideDetail(this, item, s, () => this.closeDetail());
  }

  private closeDetail(): void {
    this.detail?.destroy();
    this.detail = null;
  }
}
