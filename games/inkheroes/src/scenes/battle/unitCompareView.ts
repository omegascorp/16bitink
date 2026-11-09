import Phaser from 'phaser';
import { getSound } from '../../host';
import { creature, lineOf, type CreatureId } from '../../logic/creatures';
import { faceOf, PX_TEX, unitArt } from './pixelAssets';
import { drawPicture, drawRule, inkBox, pictureOffset, RIMS } from './pixelFrames';
import { PixelBuffer } from './pixelRaster';
import { wrapLines } from './pixelFont';
import { HORIZON_Y, composeScenery } from './pixelScenery';
import { INK, PixelButton, PixelFrame, PixelImage, putBuffer, TextLabel, texturePixels, UI_TEX } from './pixelUi';
import type { PictureScenery } from './unitInfoCard';
import { BTN_H, FACE_PIC, GAP, PAD, PIC_RIM, ROW_H, compareColumns, compareLayout, columnsThatFit, columnWidth, textWidth, type CompareColumn, type CompareText } from './unitCompare';
import { RANK_RIM, rankTint } from './rankLook';

const FRAME_MS = 170;
const GOLD = INK.title;
const NEW_TAG = 'new: ';

/** The green ▲ that marks a number gone up (drawn in code: the pixel font has no such glyph). */
function upArrow(): PixelBuffer {
  const b = new PixelBuffer(7, 5);
  for (let y = 0; y < 4; y++) for (let x = 3 - y; x <= 3 + y; x++) b.put(x, y + 1, INK.good);
  for (let x = 0; x < 7; x++) if (x === 3) b.put(x, 0, INK.good);
  return b;
}

/** Lines a text takes wrapped to `w`, in the pixel font. */
const linesOf = (text: string, w: number): number => wrapLines(text, w).length;

/** What the layout needs to know about the text of `cols` at column width `colW`. */
export function measureText(cols: readonly CompareColumn[], colW: number): CompareText {
  const w = textWidth(colW);
  const traitText = (t: { text: string; isNew: boolean }): string => (t.isNew ? NEW_TAG : '') + t.text;
  const per = cols.map((c) => ({ n: c.traits.length || 1, lines: c.traits.length ? c.traits.reduce((a, t) => a + linesOf(traitText(t), w), 0) : 1 }));
  const tallest = per.reduce((a, b) => (b.lines + b.n > a.lines + a.n ? b : a));
  return {
    nameLines: Math.max(...cols.map((c) => linesOf(c.name, w))),
    costLines: Math.max(...cols.map((c) => linesOf(c.cost, w))),
    traitLines: tallest.lines,
    traitCount: tallest.n,
  };
}

/**
 * The comparison panel: a column for each level of a unit's line up to the
 * one tapped, its figure (or face on a narrow screen), name, numbers, price
 * and abilities, what rose above the column to its left marked green with
 * an arrow, an ability new at that level marked "new", and the tapped
 * column framed in gold.
 */
export class UnitCompareView {
  private readonly root: Phaser.GameObjects.Container;
  private readonly owned: { destroy(): void }[] = [];
  private readonly keys: string[] = [];
  private readonly timers: Phaser.Time.TimerEvent[] = [];
  private closed = false;

  constructor(private readonly scene: Phaser.Scene, parent: Phaser.GameObjects.Container, tapped: CreatureId, scenery: PictureScenery | null, screen: { w: number; h: number }, private readonly onClose: () => void) {
    getSound(scene)?.play('card');
    const cols = compareColumns(tapped, columnsThatFit(screen));
    const n = cols.length;
    const lay = compareLayout(screen, n, measureText(cols, columnWidth(screen, n)), cols[0]!.cells.length);
    const shade = scene.add.rectangle(0, 0, screen.w, screen.h, 0x0a0604, 0.55).setOrigin(0).setInteractive();
    const panel = new PixelFrame(scene, lay.w, lay.h, { rim: 'bronze', thick: 2, fill: [34, 24, 17, 246], studs: true }).setPosition(lay.left, lay.top);
    const title = new TextLabel(scene, { kind: 'title', anchor: { x: 0.5, y: 0 } }).setText(`Compare ${creature(lineOf(tapped)).name} levels`);
    title.setPosition(lay.left + Math.floor(lay.w / 2), lay.top + PAD);
    const rule = new PixelImage(scene, drawRule(Math.min(lay.w - PAD * 2, title.width + 40)), { x: 0.5, y: 0 }).setPosition(lay.left + Math.floor(lay.w / 2), lay.top + PAD + 15 + 3);
    const parts: Phaser.GameObjects.GameObject[] = [shade, panel.img, title.img, rule.img];
    this.owned.push(panel, title, rule);
    cols.forEach((c, i) => this.column(parts, c, lay, lay.colX[i]!, scenery));
    const close = new PixelButton(scene, { w: lay.w - PAD * 2, h: BTN_H, label: 'Close', rim: 'gold', onClick: () => this.close() });
    close.setPosition(lay.left + PAD, lay.top + lay.closeY);
    parts.push(close.root);
    this.owned.push(close);
    this.root = scene.add.container(0, 0, parts);
    parent.add(this.root);
  }

  private label(parts: Phaser.GameObjects.GameObject[], text: string, x: number, y: number, opts: ConstructorParameters<typeof TextLabel>[1] = {}): TextLabel {
    const l = new TextLabel(this.scene, opts).setText(text).setPosition(x, y);
    parts.push(l.img);
    this.owned.push(l);
    return l;
  }

  private column(parts: Phaser.GameObjects.GameObject[], c: CompareColumn, lay: ReturnType<typeof compareLayout>, x: number, scenery: PictureScenery | null): void {
    const { scene } = this;
    const top = lay.top;
    const mid = x + Math.floor(lay.colW / 2);
    // The tapped column sits in a gold frame, the others in a dim well.
    const bodyTop = top + lay.picY - 3;
    const well = new PixelFrame(scene, lay.colW, lay.closeY - lay.picY + 3 - GAP, { rim: c.tapped ? 'gold' : 'dim', thick: c.tapped ? 2 : 1, fill: rankTint(c.rank, [22, 15, 10, 255]) }).setPosition(x, bodyTop);
    parts.push(well.img);
    this.owned.push(well);
    // The picture: its idle animation in the town's scene, or just the face on a narrow screen.
    const px = x + Math.floor((lay.colW - lay.pic - PIC_RIM * 2) / 2);
    // The picture in its rank's colour (the tapped column's gold is on its well).
    const picFrame = new PixelFrame(scene, lay.pic + PIC_RIM * 2, lay.pic + PIC_RIM * 2, { rim: c.rank ? RANK_RIM[c.rank] : 'bronze', fill: null }).setPosition(px, top + lay.picY);
    const frames = this.pictureFrames(c.id, lay.pic, lay.mode, scenery);
    const pic = scene.add.image(px + PIC_RIM, top + lay.picY + PIC_RIM, frames[0]!).setOrigin(0);
    parts.push(pic, picFrame.img);
    this.owned.push(picFrame);
    if (frames.length > 1) {
      let f = 0;
      this.timers.push(scene.time.addEvent({ delay: FRAME_MS, loop: true, callback: () => pic.setTexture(frames[(f = (f + 1) % frames.length)]!) }));
    }
    // The name in its rank's colour, the level under it.
    this.label(parts, c.name, mid, top + lay.nameY, { kind: 'title', wrap: lay.textW, anchor: { x: 0.5, y: 0 }, ...(c.rank ? { ink: RIMS[RANK_RIM[c.rank]].light } : {}) });
    this.label(parts, `Level ${c.level}`, mid, top + lay.levelY, { ink: INK.dim, anchor: { x: 0.5, y: 0 } });
    c.cells.forEach((cell, i) => {
      const ry = top + lay.rowsY + i * ROW_H;
      parts.push(scene.add.image(x + 5, ry, UI_TEX.stat(cell.stat)).setOrigin(0));
      this.label(parts, cell.text, x + lay.colW - 18, ry, { align: 'right', ink: cell.up ? INK.good : INK.title, anchor: { x: 1, y: 0 } });
      if (cell.up) this.mark(parts, x + lay.colW - 14, ry + 6);
    });
    const gy = top + lay.growthY;
    this.label(parts, 'Growth', x + 6, gy, { ink: INK.dim, align: 'left', anchor: { x: 0, y: 0 } });
    this.label(parts, `${c.growth}/wk`, x + lay.colW - 18, gy, { align: 'right', ink: c.growthUp ? INK.good : INK.title, anchor: { x: 1, y: 0 } });
    if (c.growthUp) this.mark(parts, x + lay.colW - 14, gy + 6);
    this.label(parts, c.cost, mid, top + lay.costY, { wrap: lay.textW, ink: GOLD, anchor: { x: 0.5, y: 0 } });
    let ty = top + lay.traitsY + 4;
    const traits = c.traits.length ? c.traits : [{ text: 'No special abilities', isNew: false }];
    for (const t of traits) {
      const l = this.label(parts, (t.isNew ? NEW_TAG : '') + t.text, x + 5, ty, { wrap: lay.textW, align: 'left', ink: t.isNew ? INK.good : INK.text, anchor: { x: 0, y: 0 } });
      ty += l.height + 2;
    }
  }

  private mark(parts: Phaser.GameObjects.GameObject[], x: number, y: number): void {
    const a = new PixelImage(this.scene, upArrow()).setPosition(x, y);
    parts.push(a.img);
    this.owned.push(a);
  }

  /** The unit's idle frames over a scene (a figure), or its face cut from the first frame. */
  private pictureFrames(id: CreatureId, size: number, mode: 'figure' | 'face', scenery: PictureScenery | null): string[] {
    const { scene } = this;
    const art = unitArt(id);
    const key = PX_TEX.unit(id, 'idle');
    if (mode === 'face') {
      const faces = faceOf(scene, key, art, FACE_PIC);
      this.keys.push(putBuffer(scene, faces));
      return this.keys.slice(-1);
    }
    const sheet = texturePixels(scene, key);
    const horizon = Math.round((58 * size) / 112);
    const back = scenery ? composeScenery(scenery.atlas, scenery.art, { x: -200, y: HORIZON_Y - horizon, w: size, h: size }, scenery.seed) : null;
    const box = inkBox(sheet, 0, art.w, art.h) ?? { l: 0, t: 0, r: art.w, b: art.h };
    const at = pictureOffset(box, art.footY, size, size);
    const out: string[] = [];
    for (let f = 0; f < art.frames.idle; f++) out.push(putBuffer(scene, drawPicture(back, sheet, f * art.w, art.w, art.h, at, size, size)));
    this.keys.push(...out);
    return out;
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    for (const t of this.timers) t.remove();
    for (const o of this.owned) o.destroy();
    this.root.destroy();
    for (const k of this.keys) if (this.scene.textures.exists(k)) this.scene.textures.remove(k);
    this.onClose();
  }
}
