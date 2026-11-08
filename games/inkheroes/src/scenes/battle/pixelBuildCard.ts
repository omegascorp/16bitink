import Phaser from 'phaser';
import { getSound } from '../../host';
import { creature, type CreatureId } from '../../logic/creatures';
import type { CardSpec } from '../CardScene';
import { PX_TEX, unitArt } from './pixelAssets';
import { cardButtonLook, drawFrame, drawPicture, drawRule, inkBox, pictureOffset } from './pixelFrames';
import { PixelBuffer, type Rgba } from './pixelRaster';
import { composeScenery, HORIZON_Y } from './pixelScenery';
import { INK, PixelButton, PixelFrame, PixelImage, putBuffer, TextLabel, texturePixels, UI_TEX } from './pixelUi';
import { townScenery } from '../town/pixelTownView';
import type { DwellingPreview, UpgradeRow } from './unitCard';

const PAD = 9;
const GAP = 6;
const RULE_H = 5;
const BTN_H = 30;
const BTN_NOTE_H = 42;
const FRAME_MS = 170;
/** Where a picture's scene is taken from, as the unit card's. */
const SCENE_AT = { x: -200, horizon: 58 } as const;
const ARROW_W = 13;
const ARROW_H = 11;
const GOLD: Rgba = [248, 210, 110, 255];
const EDGE: Rgba = [20, 13, 8, 255];

/** How big to draw: the picture's side, a stat row's height, and whether the card spreads over two columns. */
interface Tier {
  readonly pic: number;
  readonly row: number;
  readonly wide: boolean;
}

/** From roomy to tight; the first that fits the screen is used. */
const TIERS: readonly Tier[] = [
  { pic: 96, row: 16, wide: false },
  { pic: 64, row: 15, wide: false },
  { pic: 96, row: 16, wide: true },
  { pic: 64, row: 15, wide: true },
  { pic: 48, row: 15, wide: true },
];
const NARROW_W = 300;
const WIDE_W = 520;

/** A gold arrow pointing right, outlined, for "from this to that". */
export function arrowBuffer(): PixelBuffer {
  const b = new PixelBuffer(ARROW_W, ARROW_H);
  const cells: [number, number][] = [];
  for (let x = 0; x <= 6; x++) for (let y = 3; y <= 5; y++) cells.push([x, y]);
  for (let c = 0; c <= 4; c++) for (let y = 4 - (4 - c); y <= 4 + (4 - c); y++) cells.push([6 + c, y]);
  const at = (x: number, y: number): [number, number] => [x + 1, y + 1];
  for (const [x, y] of cells) for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) b.put(at(x, y)[0] + dx, at(x, y)[1] + dy + 1, EDGE);
  for (const [x, y] of cells) b.put(at(x, y)[0], at(x, y)[1] + 1, GOLD);
  return b;
}

/** A picture to paint once the layout is chosen. */
interface Slot {
  readonly image: Phaser.GameObjects.Image;
  readonly id: CreatureId;
  readonly size: number;
  readonly seed: number;
}

/** A card that can be taken down. */
export interface CardView {
  close(): void;
  dispose(): void;
}

/** Whether the pictures a preview needs are loaded. */
export function previewReady(scene: Phaser.Scene, p: DwellingPreview): boolean {
  return [p.from, p.to].every((id) => !id || scene.textures.exists(PX_TEX.unit(id, 'idle'))) && scene.textures.exists(PX_TEX.scenery('grass'));
}

/**
 * A building's card with a picture of what it hires: the unit, animated,
 * with its stats (a base dwelling), or the old and the new unit side by
 * side with each stat before and after, the better ones green (an
 * upgrade). Under it the building's own text and buttons. The layout drops
 * to smaller pictures and then to two columns until it fits the screen.
 */
export class PixelBuildCard implements CardView {
  private root: Phaser.GameObjects.Container | null = null;
  private readonly shade: Phaser.GameObjects.Rectangle;
  private owned: { destroy(): void }[] = [];
  private keys: string[] = [];
  private slots: Slot[] = [];
  private timer: Phaser.Time.TimerEvent | null = null;
  private closed = false;

  constructor(private readonly scene: Phaser.Scene, private readonly parent: Phaser.GameObjects.Container, private readonly spec: CardSpec, private readonly preview: DwellingPreview, private readonly screen: { w: number; h: number }, private readonly onClose: () => void, quiet = false) {
    if (!quiet) getSound(scene)?.play('card');
    this.shade = scene.add.rectangle(0, 0, screen.w, screen.h, 0x0a0604, 0.55).setOrigin(0).setInteractive();
    parent.add(this.shade);
    for (let i = 0; i < TIERS.length; i++) {
      const tier = TIERS[i]!;
      if (tier.wide && screen.w < 420 && i < TIERS.length - 1) continue;
      const h = this.compose(tier);
      if (h <= screen.h - 4 || i === TIERS.length - 1) break;
      this.teardown();
    }
    this.paintPictures();
  }

  /** Builds the card at `tier` and returns its height. */
  private compose(tier: Tier): number {
    const scene = this.scene;
    const { spec, preview } = this;
    const w = Math.min(tier.wide ? WIDE_W : NARROW_W, this.screen.w - 8);
    const inner = w - PAD * 2;
    const parts: Phaser.GameObjects.GameObject[] = [];
    const arrowKey = putBuffer(scene, arrowBuffer());
    this.keys.push(arrowKey);
    const own = <T extends { destroy(): void }>(o: T): T => {
      this.owned.push(o);
      return o;
    };
    const cx = Math.floor(w / 2);
    const title = own(new TextLabel(scene, { kind: 'title', wrap: inner, anchor: { x: 0.5, y: 0 } }).setText(spec.title));
    const rule = own(new PixelImage(scene, drawRule(Math.min(inner, title.width + 40)), { x: 0.5, y: 0 }));
    title.setPosition(cx, PAD);
    let y = PAD + title.height + GAP;
    rule.setPosition(cx, y);
    y += RULE_H + GAP;
    parts.push(title.img, rule.img);

    const upgrade = preview.kind === 'upgrade' && preview.from !== null;
    const pic = tier.pic;
    const frameW = pic + 4;
    const nameLabel = (id: CreatureId, x: number, top: number, width: number): number => {
      const l = own(new TextLabel(scene, { ink: INK.title, wrap: width, anchor: { x: 0.5, y: 0 } }).setText(creature(id).name));
      l.setPosition(x, top);
      parts.push(l.img);
      return l.height;
    };
    const picture = (id: CreatureId, x: number, top: number, seed: number): void => {
      const frame = own(new PixelFrame(scene, frameW, frameW, { rim: 'bronze', fill: null })).setPosition(x, top);
      const image = scene.add.image(x + 2, top + 2, '__DEFAULT').setOrigin(0);
      this.slots.push({ image, id, size: pic, seed });
      parts.push(image, frame.img);
    };
    const table = (rows: readonly UpgradeRow[], x: number, top: number, width: number, compare: boolean): number => {
      const h = rows.length * tier.row + 4;
      const well = drawFrame(width, h, { rim: 'dim', fill: [22, 15, 10, 255] });
      for (let i = 1; i < rows.length; i++) for (let px = 2; px < width - 2; px++) well.put(px, 2 + i * tier.row - 1, [62, 46, 30, 255]);
      const img = own(new PixelImage(scene, well)).setPosition(x, top);
      parts.push(img.img);
      const afterR = x + width - 6;
      const arrowX = afterR - 40 - ARROW_W - 4;
      const beforeR = arrowX - 4;
      rows.forEach((r, i) => {
        const ry = top + 2 + i * tier.row + Math.floor((tier.row - 15) / 2);
        if (r.stat !== 'cost') parts.push(scene.add.image(x + 3, ry, UI_TEX.stat(r.stat)).setOrigin(0));
        const label = own(new TextLabel(scene, { align: 'left', anchor: { x: 0, y: 0 } }).setText(r.label)).setPosition(x + 22, ry);
        parts.push(label.img);
        if (compare) {
          const before = own(new TextLabel(scene, { align: 'right', ink: INK.dim, anchor: { x: 1, y: 0 } }).setText(r.before)).setPosition(beforeR, ry);
          const after = own(new TextLabel(scene, { align: 'right', ink: r.better ? INK.good : INK.text, anchor: { x: 1, y: 0 } }).setText(r.after)).setPosition(afterR, ry);
          const arrow = scene.add.image(arrowX, ry + 2, arrowKey).setOrigin(0);
          parts.push(before.img, after.img, arrow);
        } else {
          const value = own(new TextLabel(scene, { align: 'right', ink: INK.title, anchor: { x: 1, y: 0 } }).setText(r.after)).setPosition(x + width - 5, ry);
          parts.push(value.img);
        }
      });
      return h;
    };

    const stat = preview.rows.filter((r) => r.stat !== 'cost');
    // The unit area.
    let areaH: number;
    if (!upgrade) {
      const colW = inner - frameW - GAP;
      const nameH = nameLabel(preview.to, PAD + Math.floor(frameW / 2), y + frameW + 2, frameW + 8);
      picture(preview.to, PAD, y, 1);
      const tableH = table(stat, PAD + frameW + GAP, y, colW, false);
      areaH = Math.max(frameW + 2 + nameH, tableH);
    } else {
      const from = preview.from!;
      const pairW = frameW * 2 + ARROW_W + GAP * 2;
      const labelW = frameW + 8;
      const x1 = tier.wide ? PAD : PAD + Math.floor((inner - pairW) / 2);
      const x2 = x1 + frameW + GAP * 2 + ARROW_W;
      picture(from, x1, y, 1);
      picture(preview.to, x2, y, 2);
      parts.push(scene.add.image(x1 + frameW + GAP, y + Math.floor((frameW - ARROW_H) / 2), arrowKey).setOrigin(0));
      const n1 = nameLabel(from, x1 + Math.floor(frameW / 2), y + frameW + 2, labelW);
      const n2 = nameLabel(preview.to, x2 + Math.floor(frameW / 2), y + frameW + 2, labelW);
      const picsH = frameW + 2 + Math.max(n1, n2);
      if (tier.wide) {
        const tx = PAD + pairW + GAP;
        const tableH = table(stat, tx, y, inner - pairW - GAP + PAD, true);
        areaH = Math.max(picsH, tableH);
      } else {
        y += picsH + GAP;
        areaH = table(stat, PAD, y, inner, true);
      }
    }
    y += areaH + GAP;

    // Weekly stock, cost and what the new unit gains, in a well.
    const lines: { text: string; ink: Rgba }[] = [{ text: `${preview.growth} a week`, ink: INK.text }];
    const cost = preview.rows.find((r) => r.stat === 'cost');
    lines.push(cost ? { text: cost.changed ? `Cost each: ${cost.before} → ${cost.after}` : `Cost each: ${cost.after}`, ink: cost.better ? INK.good : INK.text } : { text: `Cost each: ${preview.cost}`, ink: INK.text });
    if (upgrade) for (const t of preview.notes) lines.push({ text: `New: ${t}`, ink: INK.good });
    else lines.push({ text: preview.notes.length ? preview.notes.join(' · ') : 'No special abilities', ink: INK.dim });
    const noteLabels = lines.map((l) => own(new TextLabel(scene, { ink: l.ink, wrap: inner - 12, anchor: { x: 0.5, y: 0 } }).setText(l.text)));
    const notesH = noteLabels.reduce((a, l) => a + l.height + 2, 0) + 6;
    const notesWell = own(new PixelFrame(scene, inner, notesH, { rim: 'dim', fill: [22, 15, 10, 255] })).setPosition(PAD, y);
    parts.push(notesWell.img);
    let ny = y + 4;
    for (const l of noteLabels) {
      l.setPosition(cx, ny);
      parts.push(l.img);
      ny += l.height + 2;
    }
    y += notesH + GAP;

    // The building's own text, then its buttons.
    const body = own(new TextLabel(scene, { wrap: inner, anchor: { x: 0.5, y: 0 } }).setText(spec.body));
    body.setPosition(cx, y);
    parts.push(body.img);
    y += body.height + GAP;
    const n = spec.buttons.length;
    const side = tier.wide && n > 1;
    const bw = side ? Math.floor((inner - GAP * (n - 1)) / n) : inner;
    const bh = Math.max(...spec.buttons.map((b) => (b.note ? BTN_NOTE_H : BTN_H)));
    const buttons = spec.buttons.map((b, i) => own(new PixelButton(scene, {
      w: bw, h: side ? bh : b.note ? BTN_NOTE_H : BTN_H, label: b.label, note: b.note,
      ...cardButtonLook(b.kind, i),
      onClick: () => {
        if (this.closed) return;
        this.close();
        b.onClick();
      },
    })));
    buttons.forEach((b, i) => {
      b.setPosition(PAD + (side ? i * (bw + GAP) : 0), y);
      parts.push(b.root);
      if (!side) y += b.height + GAP;
    });
    if (side) y += bh + GAP;
    const h = y - GAP + PAD;
    const left = Math.floor((this.screen.w - w) / 2);
    const top = Math.max(2, Math.floor((this.screen.h - h) / 2));
    const panel = own(new PixelFrame(scene, w, h, { rim: 'bronze', thick: 2, fill: [34, 24, 17, 246], studs: true }));
    this.root = scene.add.container(left, top, [panel.img, ...parts]);
    this.parent.add(this.root);
    return h;
  }

  /** Paints each picture: the unit's idle frames over a scene, animated together. */
  private paintPictures(): void {
    const scene = this.scene;
    const atlas = texturePixels(scene, PX_TEX.scenery('grass'));
    const art = townScenery();
    const strips = new Map<CreatureId, ReturnType<typeof texturePixels>>();
    const animated: { image: Phaser.GameObjects.Image; frames: string[] }[] = [];
    for (const s of this.slots) {
      const ua = unitArt(s.id);
      const sheet = strips.get(s.id) ?? texturePixels(scene, PX_TEX.unit(s.id, 'idle'));
      strips.set(s.id, sheet);
      const back = composeScenery(atlas, art, { x: SCENE_AT.x, y: HORIZON_Y - Math.round(SCENE_AT.horizon * s.size / 112), w: s.size, h: s.size }, s.seed);
      const box = inkBox(sheet, 0, ua.w, ua.h) ?? { l: 0, t: 0, r: ua.w, b: ua.h };
      const at = pictureOffset(box, ua.footY, s.size, s.size);
      const frames: string[] = [];
      for (let f = 0; f < ua.frames.idle; f++) {
        const key = putBuffer(scene, drawPicture(back, sheet, f * ua.w, ua.w, ua.h, at, s.size, s.size));
        this.keys.push(key);
        frames.push(key);
      }
      s.image.setTexture(frames[0]!);
      if (frames.length > 1) animated.push({ image: s.image, frames });
    }
    if (animated.length) {
      let f = 0;
      this.timer = scene.time.addEvent({ delay: FRAME_MS, loop: true, callback: () => {
        f += 1;
        for (const a of animated) a.image.setTexture(a.frames[f % a.frames.length]!);
      } });
    }
  }

  private teardown(): void {
    this.timer?.remove();
    this.timer = null;
    for (const o of this.owned) o.destroy();
    this.owned = [];
    this.root?.destroy();
    this.root = null;
    this.slots = [];
    for (const k of this.keys) if (this.scene.textures.exists(k)) this.scene.textures.remove(k);
    this.keys = [];
  }

  close(): void {
    if (this.closed) return;
    this.dispose();
    this.onClose();
  }

  /** Takes the card down without answering it (to draw it again at a new screen size). */
  dispose(): void {
    if (this.closed) return;
    this.closed = true;
    this.teardown();
    this.shade.destroy();
  }
}
