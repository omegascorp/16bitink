import { createRng, type Rng } from '../logic/rng';
import { bezier, closed, normals, pt, TAU } from './kit';
import { INK, PAPER_FILL } from './palette';
import { Pen, pathOf, type Pt } from './pen';
import { rgba } from './wash';

/**
 * The interface's paper: cards, notes and tags painted like a page torn
 * from the garden notebook. Deckled edges, a cast shadow, a watercolour
 * wash that pools at its rims, paper grain, washi tape and a pressed leaf.
 * Coordinates are units (layout px); `res` is texture px per unit, needed
 * only for canvas shadows, which ignore the transform.
 */

/** Room round a card for its cast shadow, tape and leaf, units. */
export const CARD_PAD = 26;

export type TapeAt = 'tl' | 'tr' | 'top';

export interface PaperStyle {
  /** Corner radius (default 7). */
  readonly radius?: number;
  /** How torn the edge is (default 1.5). */
  readonly rough?: number;
  /** Cast shadow strength (default 1). */
  readonly shadow?: number;
  readonly tapes?: readonly TapeAt[];
  /** Tape length; widths follow (default 80). */
  readonly tapeLen?: number;
  /** A pressed sprig over the bottom-left corner. */
  readonly leaf?: boolean;
  /** A fine ruled frame inside the edge, as on a book plate. */
  readonly rule?: boolean;
  /** The wash's hue: warm cream, or a faint sage or sky. */
  readonly tint?: PaperTint;
}

export type PaperTint = 'cream' | 'sage' | 'sky';

const WASH: Readonly<Record<PaperTint, { top: string; bottom: string; blooms: readonly string[]; rim: string }>> = {
  cream: { top: '#fdf8ea', bottom: '#f1e5c8', blooms: ['#ead6a8', '#d9e3c0', '#d6e0ea', '#f0dcc0'], rim: '#bfa274' },
  sage: { top: '#f7f8ea', bottom: '#e3ebcd', blooms: ['#cfe0b0', '#e9dcb4', '#c9dccf'], rim: '#8fa66e' },
  sky: { top: '#f6f8f6', bottom: '#e0e8ee', blooms: ['#cbdcea', '#e6dcc0', '#d3e3d6'], rim: '#8ea4bd' },
};
const TAPES = ['#9fc27c', '#e5a99b', '#9ec0dc', '#e8c86e'] as const;
const LEAF = { light: '#9cc173', deep: '#5a8a43', vein: '#33572a' } as const;

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

/**
 * A torn edge: each point of a clockwise outline nudged along its outward
 * normal by a slow wave plus fibre-fine noise, with the odd small nick.
 */
export function deckle(rng: Rng, outline: readonly Pt[], rough: number, nicks = 0.03): Pt[] {
  const n = normals(closed(outline));
  const [p1, p2] = [rng() * TAU, rng() * TAU];
  let dent = 0;
  return outline.map((p, i) => {
    if (dent <= 0 && rng() < nicks) dent = 2 + Math.floor(rng() * 2);
    const nick = dent-- > 0 ? -rough * 1.4 : 0;
    const u = i / outline.length;
    const d = rough * (0.45 * Math.sin(TAU * 7 * u + p1) + 0.25 * Math.sin(TAU * 19 * u + p2) + 0.6 * (rng() - 0.5)) + nick;
    return pt(p.x + n[i]!.x * d, p.y + n[i]!.y * d);
  });
}

/** Moves every point by (dx, dy). */
export const shift = (pts: readonly Pt[], dx: number, dy: number): Pt[] => pts.map((p) => pt(p.x + dx, p.y + dy));

/** A soft shadow of `shape`, cast down and right: the shape itself is drawn off canvas so only its shadow lands. */
export function castShadow(ctx: CanvasRenderingContext2D, shape: readonly Pt[], res: number, o: { blur: number; dx: number; dy: number; alpha: number }): void {
  const far = 10000;
  ctx.save();
  ctx.shadowColor = rgba(INK, o.alpha);
  ctx.shadowBlur = o.blur * res;
  ctx.shadowOffsetX = (o.dx + far) * res;
  ctx.shadowOffsetY = o.dy * res;
  ctx.fillStyle = '#000';
  pathOf(ctx, shift(shape, -far, 0));
  ctx.fill();
  ctx.restore();
}

/** A shadow inside `shape`'s top edge, as if it were pressed into the page. */
export function innerShadow(ctx: CanvasRenderingContext2D, shape: readonly Pt[], res: number, blur: number, alpha: number): void {
  ctx.save();
  pathOf(ctx, shape);
  ctx.clip();
  ctx.shadowColor = rgba(INK, alpha);
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

/** A soft round stain of `color`, strongest at its heart: one bloom of a wash. */
export function bloom(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, alpha: number): void {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(color, alpha));
  g.addColorStop(0.65, rgba(color, alpha * 0.55));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

/**
 * Watercolour inside `shape` over the box (x, y, w, h): a graded wash,
 * a few blooms, a tide line where a second, smaller wash dried, rims
 * where the pigment pooled, and the paper's grain.
 */
export function washInside(pen: Pen, shape: readonly Pt[], box: { x: number; y: number; w: number; h: number }, tint: PaperTint): void {
  const { ctx, rng } = pen;
  const c = WASH[tint];
  const { x, y, w, h } = box;
  pen.clipped(shape, () => {
    const g = ctx.createLinearGradient(x, y, x + w * 0.4, y + h);
    g.addColorStop(0, c.top);
    g.addColorStop(1, c.bottom);
    ctx.fillStyle = g;
    ctx.fillRect(x - 4, y - 4, w + 8, h + 8);
    const big = Math.max(w, h);
    for (let i = 0; i < 7; i++) {
      // Blooms gather towards the edges, where a wash runs and settles.
      const edgeX = rng() < 0.5 ? rng() * 0.3 : 0.7 + rng() * 0.3;
      bloom(ctx, x + w * (i % 2 ? edgeX : rng()), y + h * (i % 2 ? rng() : edgeX), big * (0.2 + rng() * 0.3), c.blooms[i % c.blooms.length]!, 0.22 + rng() * 0.18);
    }
    const tide = deckle(rng, roundRect(x + 10 + rng() * 6, y + 12 + rng() * 6, w - 24 - rng() * 8, h - 26 - rng() * 8, 18, 6), 3.5, 0);
    pen.fill(tide, c.bottom, 0.32);
    pen.hair(closed(tide), 0.7, c.rim, 0.22);
    ctx.lineJoin = 'round';
    ctx.strokeStyle = rgba(c.rim, 0.2);
    ctx.lineWidth = 10;
    pathOf(ctx, shape);
    ctx.stroke();
    ctx.strokeStyle = rgba(c.rim, 0.28);
    ctx.lineWidth = 2.6;
    ctx.stroke();
    pen.stipple(shape, Math.round((w * h) / 34), () => 0.6, 0.42, rgba(c.rim, 0.32));
  });
}

/** A strip of washi tape across (cx, cy) at `angle`, its ends torn in teeth. */
export function paintTape(pen: Pen, cx: number, cy: number, angle: number, len: number, color: string, res: number): void {
  const { ctx, rng } = pen;
  const wid = len * 0.3;
  const teeth = (x: number, dir: number): Pt[] => Array.from({ length: 6 }, (_, i) => pt(x + dir * (i % 2 ? -1.6 : 1.2) * (0.6 + rng()), -wid / 2 + (wid * i) / 5));
  const local = [...teeth(len / 2, 1), ...teeth(-len / 2, -1).reverse()];
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const shape = local.map((p) => pt(cx + p.x * cos - p.y * sin, cy + p.x * sin + p.y * cos));
  castShadow(ctx, shape, res, { blur: 2.5, dx: 0.5, dy: 1.2, alpha: 0.16 });
  pen.fill(shape, color, 0.62);
  pen.clipped(shape, () => {
    // Its printed pattern: pale diagonal stripes.
    for (let s = -len; s < len; s += 7) {
      const a = pt(cx + (s - wid) * cos - (-wid) * sin, cy + (s - wid) * sin + (-wid) * cos);
      const b = pt(cx + (s + wid) * cos - wid * sin, cy + (s + wid) * sin + wid * cos);
      pen.hair([a, b], 2.2, PAPER_FILL, 0.28);
    }
  });
  pen.hair(closed(shape), 0.6, color, 0.5);
}

/** One pressed leaf from `base` towards `angle`, `len` long: washed, veined and inked. */
export function paintLeaf(pen: Pen, base: Pt, angle: number, len: number): void {
  const dir = pt(Math.cos(angle), Math.sin(angle));
  const nrm = pt(-dir.y, dir.x);
  const at = (u: number, v: number): Pt => pt(base.x + dir.x * len * u + nrm.x * len * v, base.y + dir.y * len * u + nrm.y * len * v);
  const tip = at(1, 0);
  const shape = [...bezier(base, at(0.45, 0.42), tip, 14), ...bezier(tip, at(0.5, -0.38), base, 14).slice(1)];
  pen.fill(shape, PAPER_FILL, 1);
  pen.clipped(shape, () => {
    const g = pen.ctx.createLinearGradient(base.x, base.y, tip.x, tip.y);
    g.addColorStop(0, LEAF.deep);
    g.addColorStop(1, LEAF.light);
    pen.ctx.globalAlpha = 0.82;
    pen.ctx.fillStyle = g;
    pathOf(pen.ctx, shape);
    pen.ctx.fill();
    pen.ctx.globalAlpha = 1;
    bloom(pen.ctx, at(0.55, 0.12).x, at(0.55, 0.12).y, len * 0.3, '#d7e6a6', 0.35);
  });
  pen.hair(bezier(base, at(0.5, 0.04), tip, 10), 0.9, LEAF.vein, 0.8);
  for (let i = 1; i <= 4; i++) {
    const u = i * 0.18;
    for (const side of [1, -1]) pen.hair([at(u, 0.02 * side), at(u + 0.14, side * 0.2 * (1 - u * 0.6))], 0.55, LEAF.vein, 0.55);
  }
  pen.stroke(closed(shape), 1.1, INK, 0.8);
  pen.stroke([at(0, 0), at(-0.22, 0.05)], 1.2, INK, 0.85, false);
}

/**
 * A paper card w × h at (CARD_PAD, CARD_PAD) on a canvas CARD_PAD bigger
 * all round: shadow, torn edge, wash, optional ruled frame, contour,
 * then tape and a leaf.
 */
export function paintPaper(ctx: CanvasRenderingContext2D, w: number, h: number, seed: number, res: number, style: PaperStyle = {}): void {
  const rng = createRng(seed);
  const pen = new Pen(ctx, seed + 1, 0.5);
  const x = CARD_PAD;
  const y = CARD_PAD;
  const s = style.shadow ?? 1;
  const shape = deckle(rng, roundRect(x, y, w, h, style.radius ?? 7, 3), style.rough ?? 1.5);
  castShadow(ctx, shape, res, { blur: 16 * s, dx: 3 * s, dy: 8 * s, alpha: 0.3 });
  castShadow(ctx, shape, res, { blur: 3 * s, dx: 0.6 * s, dy: 1.8 * s, alpha: 0.22 });
  pen.fill(shape, PAPER_FILL, 1);
  washInside(pen, shape, { x, y, w, h }, style.tint ?? 'cream');
  if (style.rule) {
    pen.hair(closed(roundRect(x + 12, y + 12, w - 24, h - 24, 5, 6)), 0.9, INK, 0.26);
    pen.hair(closed(roundRect(x + 16, y + 16, w - 32, h - 32, 3, 6)), 0.55, INK, 0.16);
  }
  pen.stroke(closed(shape), 1.25, INK, 0.5);
  const len = style.tapeLen ?? 80;
  (style.tapes ?? []).forEach((at, i) => {
    const color = TAPES[(seed + i) % TAPES.length]!;
    const wobble = (rng() - 0.5) * 0.12;
    if (at === 'tl') paintTape(pen, x + len * 0.2, y + len * 0.08, -0.72 + wobble, len, color, res);
    else if (at === 'tr') paintTape(pen, x + w - len * 0.2, y + len * 0.08, 0.72 + wobble, len, color, res);
    else paintTape(pen, x + w / 2 + (rng() - 0.5) * w * 0.1, y + 1, wobble * 0.6, len, color, res);
  });
  if (style.leaf) {
    const base = pt(x + 8, y + h + 2);
    paintLeaf(pen, base, -0.42, 54);
    paintLeaf(pen, base, -1.0, 70);
    paintLeaf(pen, base, -1.55, 50);
  }
}
