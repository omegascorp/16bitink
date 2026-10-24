import { PAPER_FILL } from '../../../../../src/art/fish/kit';
import { pathOf, Pen, type Pt } from '../../../../../src/art/pen';

/**
 * Shared ink for the plankton plates: unit geometry (a body length is LEN
 * units), the Plate that maps units to px with line weights for one size, and
 * the painted-finish helpers (paper and off-register wash, form shading,
 * glows, plumose setae).
 */

export const TAU = Math.PI * 2;
/** Setae and other fine bristles: a warm brown-black, lighter than the contour ink. */
export const SETA = '#45352f';
/** Highlights: glass glints, sheen on a shell. */
export const SHINE = '#ffffff';
/** Units across a body length (a diatom's diameter). */
export const LEN = 100;

/** A drawing's extent in units, centred on the origin. */
export interface Box {
  readonly x0: number;
  readonly x1: number;
  readonly y0: number;
  readonly y1: number;
}

// ---------------------------------------------------------------- geometry

export const pt = (x: number, y: number): Pt => ({ x, y });
export const lerp = (a: Pt, b: Pt, t: number): Pt => pt(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
export const polar = (p: Pt, a: number, r: number): Pt => pt(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r);
export const closed = (pts: readonly Pt[]): Pt[] => [...pts, pts[0]!];
export const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));
export const smooth = (v: number): number => {
  const c = clamp01(v);
  return c * c * (3 - 2 * c);
};
export const frac = (v: number): number => v - Math.floor(v);

export function cub(p0: Pt, c0: Pt, c1: Pt, p1: Pt, n = 16): Pt[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const u = 1 - t;
    const a = u * u * u;
    const b = 3 * u * u * t;
    const c = 3 * u * t * t;
    const d = t * t * t;
    return pt(a * p0.x + b * c0.x + c * c1.x + d * p1.x, a * p0.y + b * c0.y + c * c1.y + d * p1.y);
  });
}

export function line(a: Pt, b: Pt, n: number): Pt[] {
  return Array.from({ length: n + 1 }, (_, i) => lerp(a, b, i / n));
}

export function arc(c: Pt, r: number, a0: number, a1: number, n: number): Pt[] {
  return Array.from({ length: n + 1 }, (_, i) => polar(c, a0 + ((a1 - a0) * i) / n, r));
}

export function oval(c: Pt, rx: number, ry: number, rot = 0, n = 24): Pt[] {
  const [cs, sn] = [Math.cos(rot), Math.sin(rot)];
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * TAU;
    const x = Math.cos(a) * rx;
    const y = Math.sin(a) * ry;
    return pt(c.x + x * cs - y * sn, c.y + x * sn + y * cs);
  });
}

/** Unit normal (to the left of travel) at each point of a polyline. */
export function normals(pts: readonly Pt[]): Pt[] {
  return pts.map((_, i) => {
    const a = pts[Math.max(0, i - 1)]!;
    const b = pts[Math.min(pts.length - 1, i + 1)]!;
    const d = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    return pt((b.y - a.y) / d, -(b.x - a.x) / d);
  });
}

/** A polyline thickened into a closed shape; `w(u)` is the full width at u in 0..1. */
export function ribbon(spine: readonly Pt[], w: (u: number) => number): { top: Pt[]; bot: Pt[]; shape: Pt[] } {
  const n = normals(spine);
  const half = (i: number): number => w(i / (spine.length - 1)) / 2;
  const top = spine.map((p, i) => pt(p.x + n[i]!.x * half(i), p.y + n[i]!.y * half(i)));
  const bot = spine.map((p, i) => pt(p.x - n[i]!.x * half(i), p.y - n[i]!.y * half(i)));
  return { top, bot, shape: [...top, ...[...bot].reverse()] };
}

/** A tapered limb segment with rounded ends. */
export function capsule(a: Pt, b: Pt, w0: number, w1: number): Pt[] {
  const ang = Math.atan2(b.y - a.y, b.x - a.x);
  const cap = (c: Pt, r: number, from: number): Pt[] => Array.from({ length: 7 }, (_, i) => polar(c, from + (i / 6) * Math.PI, r));
  return [...cap(b, w1 / 2, ang - Math.PI / 2), ...cap(a, w0 / 2, ang + Math.PI / 2)];
}

export function boundsOf(pts: readonly Pt[]): Box {
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
}

/** y on a left-to-right or right-to-left polyline at x. */
export function yAt(line: readonly Pt[], x: number): number {
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1]!;
    const b = line[i]!;
    if ((a.x - x) * (b.x - x) <= 0) return a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x || 1);
  }
  return line[line.length - 1]!.y;
}

// ---------------------------------------------------------------- the plate: one painting at one size

/** One painting pass at `size` px a body length: unit-to-px mapping, line weights and seeded pens. */
export class Plate {
  readonly k: number;
  /** Contour and hairline widths in px. */
  readonly line: number;
  readonly fine: number;
  private readonly wob: number;

  constructor(readonly ctx: CanvasRenderingContext2D, readonly size: number, private readonly seed: number) {
    this.k = size / LEN;
    this.line = Math.min(4.6, 0.55 + size * 0.0024);
    this.fine = Math.min(1.6, 0.3 + size * 0.00085);
    this.wob = Math.min(1.7, Math.max(0.12, size * 0.0011));
  }

  /** A pen for one part: parts keep their own random stream, so a pose change in one never shifts the boil of another. */
  pen(part: number, wobble = 1): Pen {
    return new Pen(this.ctx, this.seed + part * 7919, this.wob * wobble);
  }

  p(x: number, y: number): Pt {
    return pt(x * this.k, y * this.k);
  }

  at(q: Pt): Pt {
    return pt(q.x * this.k, q.y * this.k);
  }

  m(pts: readonly Pt[]): Pt[] {
    return pts.map((q) => this.at(q));
  }

  has(min: number): boolean {
    return this.size >= min;
  }
}

/** Thin paper, then a wash laid a little off the outline (shapes in px). */
export function skin(pl: Plate, pen: Pen, shape: readonly Pt[], wash: string, body: number, tint: number): void {
  pen.fill(shape, PAPER_FILL, body);
  const off = pl.k * 0.8;
  pen.clipped(shape, () => {
    pl.ctx.translate(off, off * 0.7);
    pen.fill(shape, wash, tint);
    pl.ctx.translate(-off, -off * 0.7);
  });
}

/** A vertical gradient clipped to a shape (light from above). */
export function shadeY(ctx: CanvasRenderingContext2D, shape: readonly Pt[], y0: number, y1: number, stops: readonly (readonly [number, string])[]): void {
  const b = boundsOf(shape);
  ctx.save();
  pathOf(ctx, shape);
  ctx.clip();
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  for (const [at, colour] of stops) g.addColorStop(at, colour);
  ctx.fillStyle = g;
  ctx.fillRect(b.x0 - 2, b.y0 - 2, b.x1 - b.x0 + 4, b.y1 - b.y0 + 4);
  ctx.restore();
}

/** A soft round glow (px). */
export function glow(ctx: CanvasRenderingContext2D, c: Pt, r: number, inner: string, outer: string): void {
  const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, r);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(c.x, c.y, r, 0, TAU);
  ctx.fill();
}

/** A hair with fine barbs along it, a plumose seta (px). */
export function seta(pl: Plate, pen: Pen, from: Pt, a: number, len: number, alpha: number, bend = 0.12): void {
  const mid = polar(polar(from, a, len * 0.5), a + Math.PI / 2, len * bend * 0.4);
  const tip = polar(from, a + bend, len);
  pen.hair([from, mid, tip], pl.fine * 0.55, SETA, alpha);
  if (!pl.has(420) || len < 18) return;
  for (let i = 1; i < 6; i++) {
    const b = lerp(from, tip, i / 6.5);
    for (const s of [-1, 1]) pen.hair([b, polar(b, a + s * 0.7, len * 0.09)], pl.fine * 0.35, SETA, alpha * 0.55);
  }
}
