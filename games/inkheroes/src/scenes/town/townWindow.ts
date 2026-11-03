import type Phaser from 'phaser';
import { drawRule } from '../battle/pixelFrames';
import { INK, PixelButton, PixelFrame, PixelImage, TextLabel } from '../battle/pixelUi';

/** What a cell drew: its objects, and the pieces that own textures. */
export interface Drawn {
  readonly parts: Phaser.GameObjects.GameObject[];
  readonly owned: { destroy(): void }[];
}

/** A window's content: a grid of same-size cells, a line under them, and an optional button. */
export interface GridSpec {
  readonly title: string;
  readonly cell: { readonly w: number; readonly h: number };
  readonly count: number;
  readonly maxCols: number;
  /** Draws cell `i` with its top-left at (x, y). */
  draw(i: number, x: number, y: number): Drawn;
  /** Shown when there are no cells. */
  readonly empty?: string;
  readonly note?: string;
  readonly button?: { readonly label: string; readonly onClick: () => void };
}

const PAD = 8;
const GAP = 6;
const LINE = 15;
const RULE_H = 5;
const HEAD = PAD + LINE + 3 + RULE_H + 6;
const NAV = { w: 30, h: 20 } as const;
const BTN_H = 22;
const CLOSE = { w: 50, h: 18 } as const;
const FILL = [34, 24, 17, 248] as const;

/**
 * A town screen (the hall's ledger, the fort's muster, the guild's spells)
 * as a framed window over the townscape: a gold title, a grid of cards,
 * a line and a button under them, and Close. Cards that don't fit go on
 * further pages, turned with arrows. Tapping outside closes it.
 */
export class TownWindow {
  private readonly owned: { destroy(): void }[] = [];
  private readonly page: { destroy(): void }[] = [];
  private readonly pageParts: Phaser.GameObjects.GameObject[] = [];
  private readonly objects: Phaser.GameObjects.GameObject[] = [];
  private at = 0;
  private readonly cols: number;
  private readonly perPage: number;
  private readonly pages: number;
  private readonly left: number;
  private readonly gridTop: number;
  private readonly innerW: number;
  private readonly pageLabel: TextLabel | null = null;

  constructor(private readonly scene: Phaser.Scene, private readonly spec: GridSpec, area: { w: number; h: number }, onClose: () => void, private readonly depth: number) {
    const shade = scene.add.rectangle(0, 0, area.w, area.h, 0x0a0604, 0.5).setOrigin(0).setDepth(depth).setInteractive();
    shade.on('pointerup', () => onClose());
    this.objects.push(shade);
    const maxW = area.w - 8;
    const cols = Math.max(1, Math.min(spec.maxCols, spec.count || 1, Math.floor((maxW - PAD * 2 + GAP) / (spec.cell.w + GAP))));
    const gridW = cols * (spec.cell.w + GAP) - GAP;
    const note = spec.note ? new TextLabel(scene, { wrap: Math.max(gridW, 200), anchor: { x: 0.5, y: 0 }, ink: INK.dim }).setText(spec.note) : null;
    const footH = (note ? note.height + 4 : 0) + (spec.button ? BTN_H + 4 : 0);
    const roomRows = Math.max(1, Math.floor((area.h - 8 - HEAD - PAD - footH - NAV.h - 4 + GAP) / (spec.cell.h + GAP)));
    const rows = Math.min(roomRows, Math.max(1, Math.ceil(spec.count / cols)));
    this.cols = cols;
    this.perPage = cols * rows;
    this.pages = Math.max(1, Math.ceil(spec.count / this.perPage));
    const navH = this.pages > 1 ? NAV.h + 4 : 0;
    const emptyLabel = spec.count === 0 && spec.empty ? new TextLabel(scene, { wrap: 220, anchor: { x: 0.5, y: 0 } }).setText(spec.empty) : null;
    const gridH = spec.count ? rows * (spec.cell.h + GAP) - GAP : (emptyLabel?.height ?? 0) + 8;
    const w = Math.min(maxW, Math.max(gridW, 220, (note?.width ?? 0)) + PAD * 2);
    const h = HEAD + gridH + 6 + navH + footH + PAD;
    this.left = Math.floor((area.w - w) / 2);
    const top = Math.max(4, Math.floor((area.h - h) / 2));
    this.innerW = w - PAD * 2;
    const frame = new PixelFrame(scene, w, h, { rim: 'bronze', thick: 2, fill: FILL, studs: true }).setPosition(this.left, top);
    // The card swallows taps so only the shade round it closes the window.
    frame.img.setInteractive();
    const title = new TextLabel(scene, { kind: 'title', anchor: { x: 0.5, y: 0 } }).setText(spec.title).setPosition(this.left + Math.floor(w / 2), top + PAD);
    const rule = new PixelImage(scene, drawRule(Math.min(this.innerW, title.width + 40)), { x: 0.5, y: 0 }).setPosition(this.left + Math.floor(w / 2), top + PAD + LINE + 3);
    const close = new PixelButton(scene, { w: CLOSE.w, h: CLOSE.h, label: 'Close', onClick: onClose });
    close.setPosition(this.left + w - CLOSE.w - 6, top + 6);
    this.owned.push(frame, title, rule, close);
    this.objects.push(frame.img, title.img, rule.img, close.root);
    this.gridTop = top + HEAD;
    this.left += PAD + Math.floor((this.innerW - gridW) / 2);
    let y = this.gridTop + gridH + 6;
    if (emptyLabel) {
      emptyLabel.setPosition(this.left + Math.floor(gridW / 2), this.gridTop + 4);
      this.owned.push(emptyLabel);
      this.objects.push(emptyLabel.img);
    }
    if (this.pages > 1) {
      const cx = this.left + Math.floor(gridW / 2);
      const prev = new PixelButton(scene, { w: NAV.w, h: NAV.h, label: '<', onClick: () => this.turn(-1) });
      const next = new PixelButton(scene, { w: NAV.w, h: NAV.h, label: '>', onClick: () => this.turn(1) });
      prev.setPosition(cx - 60 - NAV.w, y);
      next.setPosition(cx + 60, y);
      this.pageLabel = new TextLabel(scene, { anchor: { x: 0.5, y: 0 } }).setPosition(cx, y + 3);
      this.owned.push(prev, next, this.pageLabel);
      this.objects.push(prev.root, next.root, this.pageLabel.img);
      y += navH;
    }
    if (note) {
      note.setPosition(this.left + Math.floor(gridW / 2), y);
      this.owned.push(note);
      this.objects.push(note.img);
      y += note.height + 4;
    }
    if (spec.button) {
      const bw = Math.min(this.innerW, 240);
      const btn = new PixelButton(scene, { w: bw, h: BTN_H, label: spec.button.label, rim: 'gold', onClick: spec.button.onClick });
      btn.setPosition(this.left + Math.floor((gridW - bw) / 2), y);
      this.owned.push(btn);
      this.objects.push(btn.root);
    }
    // Same depth, so the list's order decides: the frame first, everything on it after.
    for (const o of this.objects) {
      (o as unknown as Phaser.GameObjects.Components.Depth).setDepth(depth + 1);
      scene.children.bringToTop(o);
    }
    shade.setDepth(depth);
    this.show(0);
  }

  private turn(by: number): void {
    this.show((this.at + by + this.pages) % this.pages);
  }

  private show(p: number): void {
    this.at = p;
    for (const o of this.page) o.destroy();
    for (const o of this.pageParts) o.destroy();
    this.page.length = 0;
    this.pageParts.length = 0;
    const { cell } = this.spec;
    for (let k = 0; k < this.perPage; k++) {
      const i = p * this.perPage + k;
      if (i >= this.spec.count) break;
      const x = this.left + (k % this.cols) * (cell.w + GAP);
      const y = this.gridTop + Math.floor(k / this.cols) * (cell.h + GAP);
      const d = this.spec.draw(i, x, y);
      for (const o of d.parts) {
        (o as unknown as Phaser.GameObjects.Components.Depth).setDepth(this.depth + 2);
        this.scene.children.bringToTop(o);
      }
      this.page.push(...d.owned);
      this.pageParts.push(...d.parts);
    }
    this.pageLabel?.setText(`${p + 1} / ${this.pages}`);
  }

  destroy(): void {
    for (const o of this.page) o.destroy();
    for (const o of this.pageParts) o.destroy();
    for (const o of this.owned) o.destroy();
    for (const o of this.objects) o.destroy();
  }
}
