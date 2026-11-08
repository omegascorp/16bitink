import { closed, pt } from './kit';
import { INK, UI } from './palette';
import { Pen, pathOf, type Pt } from './pen';
import { rgba } from './wash';

/**
 * The interface's panels: tooled leather in a gilt frame, as on the
 * campaign book's binding. A cast shadow, leather lit from the upper left
 * and darkening to its edges, its grain, a burnished gilt band with a
 * fine fillet inside it and studs at the corners.
 * Coordinates are units (layout px); `res` is texture px per unit, needed
 * only for canvas shadows, which ignore the transform.
 */

/** Room round a panel for its cast shadow, units. */
export const CARD_PAD = 22;

export type PanelTint = 'oxblood' | 'forest' | 'night' | 'umber';

export interface PanelStyle {
  /** Corner radius (default 6). */
  readonly radius?: number;
  /** Cast shadow strength (default 1). */
  readonly shadow?: number;
  /** The leather's dye (default oxblood). */
  readonly tint?: PanelTint;
  /** A full gilt frame with corner studs, or just a thin gilt edge (tiles inside a panel). */
  readonly frame?: 'gilt' | 'thin';
}

const LEATHER: Readonly<Record<PanelTint, { light: string; mid: string; deep: string }>> = {
  oxblood: { light: UI.leafLight, mid: UI.leaf, deep: UI.leafDeep },
  forest: { light: '#3a4a2a', mid: '#222e19', deep: '#11180c' },
  night: { light: '#2e3a5c', mid: '#1b233b', deep: '#0d1221' },
  umber: { light: '#54402a', mid: '#32241a', deep: '#1a120c' },
};

/** A rounded rectangle's outline, clockwise from its top-left, sampled about every `step` units. */
export function roundRect(x: number, y: number, w: number, h: number, r: number, step = 4): Pt[] {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  const line = (a: Pt, b: Pt): Pt[] => {
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / step));
    return Array.from({ length: n }, (_, i) => pt(a.x + ((b.x - a.x) * i) / n, a.y + ((b.y - a.y) * i) / n));
  };
  const arc = (cx: number, cy: number, a0: number): Pt[] => {
    const n = Math.max(1, Math.ceil((rr * Math.PI) / 2 / step));
    return Array.from({ length: n }, (_, i) => pt(cx + Math.cos(a0 + ((i / n) * Math.PI) / 2) * rr, cy + Math.sin(a0 + ((i / n) * Math.PI) / 2) * rr));
  };
  return [
    ...line(pt(x + rr, y), pt(x + w - rr, y)), ...arc(x + w - rr, y + rr, -Math.PI / 2),
    ...line(pt(x + w, y + rr), pt(x + w, y + h - rr)), ...arc(x + w - rr, y + h - rr, 0),
    ...line(pt(x + w - rr, y + h), pt(x + rr, y + h)), ...arc(x + rr, y + h - rr, Math.PI / 2),
    ...line(pt(x, y + h - rr), pt(x, y + rr)), ...arc(x + rr, y + rr, Math.PI),
  ];
}

/** Moves every point by (dx, dy). */
export const shift = (pts: readonly Pt[], dx: number, dy: number): Pt[] => pts.map((p) => pt(p.x + dx, p.y + dy));

/** A soft shadow of `shape`, cast down and right: the shape itself is drawn off canvas so only its shadow lands. */
export function castShadow(ctx: CanvasRenderingContext2D, shape: readonly Pt[], res: number, o: { blur: number; dx: number; dy: number; alpha: number }): void {
  const far = 10000;
  ctx.save();
  ctx.shadowColor = rgba('#000000', o.alpha);
  ctx.shadowBlur = o.blur * res;
  ctx.shadowOffsetX = (o.dx + far) * res;
  ctx.shadowOffsetY = o.dy * res;
  ctx.fillStyle = '#000';
  pathOf(ctx, shift(shape, -far, 0));
  ctx.fill();
  ctx.restore();
}

/** A shadow inside `shape`'s top edge, as if it were sunk into the surface. */
export function innerShadow(ctx: CanvasRenderingContext2D, shape: readonly Pt[], res: number, blur: number, alpha: number): void {
  ctx.save();
  pathOf(ctx, shape);
  ctx.clip();
  ctx.shadowColor = rgba('#000000', alpha);
  ctx.shadowBlur = blur * res;
  ctx.shadowOffsetY = blur * 0.5 * res;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.rect(-5000, -5000, 10000, 10000);
  shape.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill('evenodd');
  ctx.restore();
}

/** A soft round stain of `color`, strongest at its heart. */
export function bloom(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, alpha: number): void {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(color, alpha));
  g.addColorStop(0.65, rgba(color, alpha * 0.55));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

/** Burnished gilt along the box's diagonal: bright where it faces the light, deep where it turns away. */
export function giltGradient(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): CanvasGradient {
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, UI.giltLight);
  g.addColorStop(0.18, UI.gilt);
  g.addColorStop(0.42, UI.giltDeep);
  g.addColorStop(0.6, UI.gilt);
  g.addColorStop(0.8, UI.giltLight);
  g.addColorStop(1, UI.giltDeep);
  return g;
}

/** Strokes `shape` as a band of gilt `width` wide, with a dark fillet each side. */
export function giltBand(ctx: CanvasRenderingContext2D, shape: readonly Pt[], box: { x: number; y: number; w: number; h: number }, width: number): void {
  ctx.save();
  ctx.lineJoin = 'round';
  pathOf(ctx, shape);
  ctx.strokeStyle = rgba(INK, 0.95);
  ctx.lineWidth = width + 1.6;
  ctx.stroke();
  ctx.strokeStyle = giltGradient(ctx, box.x, box.y, box.w, box.h);
  ctx.lineWidth = width;
  ctx.stroke();
  // A bright bead along the band's crest.
  ctx.strokeStyle = rgba(UI.giltLight, 0.35);
  ctx.lineWidth = Math.max(0.5, width * 0.22);
  ctx.stroke();
  ctx.restore();
}

/** A gilt stud at (x, y): a lozenge with a lit facet, `r` across. */
function stud(pen: Pen, x: number, y: number, r: number): void {
  const { ctx } = pen;
  const d: Pt[] = [pt(x, y - r), pt(x + r, y), pt(x, y + r), pt(x - r, y)];
  pen.fill(d, UI.giltDeep, 1);
  pen.fill([pt(x, y - r), pt(x, y), pt(x - r, y)], UI.giltLight, 0.95);
  pen.fill([pt(x, y - r), pt(x + r, y), pt(x, y)], UI.gilt, 0.95);
  ctx.save();
  ctx.strokeStyle = rgba(INK, 0.9);
  ctx.lineWidth = 0.8;
  pathOf(ctx, d);
  ctx.stroke();
  ctx.restore();
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) pen.hair([pt(x + dx * r * 1.3, y + dy * r * 1.3), pt(x + dx * r * 2.3, y + dy * r * 2.3)], 0.7, UI.gilt, 0.7);
}

/** Leather inside `shape` over the box: lit from the upper left, darkening to its edges, mottled and grained. */
export function leather(pen: Pen, shape: readonly Pt[], box: { x: number; y: number; w: number; h: number }, tint: PanelTint, res: number): void {
  const { ctx, rng } = pen;
  const c = LEATHER[tint];
  const { x, y, w, h } = box;
  pen.clipped(shape, () => {
    const big = Math.max(w, h);
    const g = ctx.createRadialGradient(x + w * 0.32, y + h * 0.22, 0, x + w * 0.45, y + h * 0.45, big * 0.85);
    g.addColorStop(0, c.light);
    g.addColorStop(0.45, c.mid);
    g.addColorStop(1, c.deep);
    ctx.fillStyle = g;
    ctx.fillRect(x - 4, y - 4, w + 8, h + 8);
    // The hide's mottle: soft patches a shade lighter and darker.
    for (let i = 0; i < 9; i++) bloom(ctx, x + w * rng(), y + h * rng(), big * (0.08 + rng() * 0.16), i % 2 ? c.light : c.deep, 0.18 + rng() * 0.14);
    pen.stipple(shape, Math.round((w * h) / 26), () => 0.7, 0.32, rgba(c.deep, 0.55));
    pen.stipple(shape, Math.round((w * h) / 90), () => 0.6, 0.28, rgba(c.light, 0.35));
  });
  innerShadow(ctx, shape, res, 10, 0.55);
}

/**
 * A leather panel w × h at (CARD_PAD, CARD_PAD) on a canvas CARD_PAD bigger
 * all round: its shadow, the leather, and its gilt frame.
 */
export function paintPanel(ctx: CanvasRenderingContext2D, w: number, h: number, seed: number, res: number, style: PanelStyle = {}): void {
  const pen = new Pen(ctx, seed, 0.3);
  const x = CARD_PAD;
  const y = CARD_PAD;
  const s = style.shadow ?? 1;
  const r = style.radius ?? 6;
  const shape = roundRect(x, y, w, h, r, 3);
  const box = { x, y, w, h };
  castShadow(ctx, shape, res, { blur: 16 * s, dx: 2 * s, dy: 7 * s, alpha: 0.6 });
  castShadow(ctx, shape, res, { blur: 3 * s, dx: 0.5 * s, dy: 1.5 * s, alpha: 0.5 });
  leather(pen, shape, box, style.tint ?? 'oxblood', res);
  const full = (style.frame ?? 'gilt') === 'gilt';
  const band = full ? Math.min(5, Math.max(3, Math.min(w, h) * 0.03)) : 2;
  giltBand(ctx, roundRect(x + band / 2, y + band / 2, w - band, h - band, Math.max(0, r - band / 2), 3), box, band);
  if (!full) return;
  // A fine gilt fillet inside the band, and a stud at each of its corners.
  const inset = band + 6;
  const fillet = roundRect(x + inset, y + inset, w - inset * 2, h - inset * 2, Math.max(0, r - inset / 2), 6);
  pen.hair(closed(fillet), 0.9, UI.gilt, 0.55);
  pen.hair(closed(roundRect(x + inset + 2.5, y + inset + 2.5, w - inset * 2 - 5, h - inset * 2 - 5, Math.max(0, r - inset / 2 - 2), 6)), 0.5, '#000000', 0.4);
  if (w > 120 && h > 70) for (const [cx, cy] of [[x + inset, y + inset], [x + w - inset, y + inset], [x + w - inset, y + h - inset], [x + inset, y + h - inset]] as const) stud(pen, cx, cy, 3.4);
}
