import { ellipse, Pen, type Pt } from './pen';
import { INK, PAPER_FILL } from './palette';

/**
 * Drawing kit for creatures and objects, ported from InkFish's critter art:
 * shapes get paper, a slightly misregistered watercolour wash, shadow-side
 * hatching, mottling and a pen contour. Coordinates are local px with the
 * origin at the frame centre.
 */
export const TAU = Math.PI * 2;

export const pt = (x: number, y: number): Pt => ({ x, y });
export const lerp = (a: Pt, b: Pt, t: number): Pt => pt(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
export const add = (a: Pt, b: Pt): Pt => pt(a.x + b.x, a.y + b.y);
export const closed = (pts: readonly Pt[]): Pt[] => [...pts, pts[0]!];
export const oval = (x: number, y: number, rx: number, ry: number, n = 20): Pt[] => ellipse(x, y, rx, ry, n);

export function bezier(p0: Pt, c: Pt, p1: Pt, n = 12): Pt[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const u = 1 - t;
    return pt(u * u * p0.x + 2 * u * t * c.x + t * t * p1.x, u * u * p0.y + 2 * u * t * c.y + t * t * p1.y);
  });
}

export function cub(p0: Pt, c0: Pt, c1: Pt, p1: Pt, n = 16): Pt[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const u = 1 - t;
    return pt(u * u * u * p0.x + 3 * u * u * t * c0.x + 3 * u * t * t * c1.x + t * t * t * p1.x, u * u * u * p0.y + 3 * u * u * t * c0.y + 3 * u * t * t * c1.y + t * t * t * p1.y);
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

export const tube = (pts: readonly Pt[], w0: number, w1: number): Pt[] => ribbon(pts, (u) => w0 + (w1 - w0) * u).shape;

/** A tapered segment with rounded ends: one piece of a jointed leg. */
export function capsule(a: Pt, b: Pt, w0: number, w1: number): Pt[] {
  const ang = Math.atan2(b.y - a.y, b.x - a.x);
  const arc = (c: Pt, r: number, from: number): Pt[] =>
    Array.from({ length: 7 }, (_, i) => pt(c.x + Math.cos(from + (i / 6) * Math.PI) * r, c.y + Math.sin(from + (i / 6) * Math.PI) * r));
  return [...arc(b, w1 / 2, ang - Math.PI / 2), ...arc(a, w0 / 2, ang + Math.PI / 2)];
}

/** One drawing pass. `ink` is the line colour (red for the naked crab). */
export interface Draw {
  readonly pen: Pen;
  readonly ink: string;
  /** Leg pose / boil frame 0..2. */
  readonly f: number;
  /** Ground line (local y). */
  readonly g: number;
}

export function makeDraw(ctx: CanvasRenderingContext2D, seed: number, f: number, g: number, ink = INK): Draw {
  return { pen: new Pen(ctx, seed, 0.5), ink, f: ((f % 3) + 3) % 3, g };
}

/** Paper, then a wash printed a little off-register. */
export function skin(d: Draw, shape: readonly Pt[], wash: string, alpha = 0.4): void {
  const { pen } = d;
  pen.fill(shape, PAPER_FILL, 1);
  pen.clipped(shape, () => {
    pen.ctx.translate(1.5, 1);
    pen.fill(shape, wash, Math.min(0.95, alpha));
    pen.ctx.translate(-1.5, -1);
  });
}

/** A flat tint with no paper under it (glazes, shadows, highlights). */
export function tint(d: Draw, shape: readonly Pt[], color: string, alpha: number): void {
  d.pen.fill(shape, color, alpha);
}

/** Shadow-side hatching under `below`, optionally cross-hatched. */
export function shade(d: Draw, shape: readonly Pt[], below: number, alpha = 0.5, cross = false): void {
  d.pen.hatch(shape, 2.6, 0.06, 0.5, { onlyBelow: below, color: d.ink, alpha });
  if (cross) d.pen.hatch(shape, 3, -0.9, 0.45, { onlyBelow: below + 8, color: d.ink, alpha: alpha * 0.7 });
}

export function edge(d: Draw, shape: readonly Pt[], w = 1.7, alpha = 1): void {
  d.pen.stroke(closed(shape), w, d.ink, alpha);
}

/** Mottling: dots denser towards the top of a shape. */
export function mottle(d: Draw, shape: readonly Pt[], count: number, top: number, bottom: number, color: string, r = 0.55): void {
  d.pen.stipple(shape, count, (_, y) => Math.max(0, (bottom - y) / (bottom - top)) * 0.8, r, color);
}

/** A glossy eye with a glint. */
export function eyeDot(d: Draw, x: number, y: number, r: number): void {
  d.pen.dot(x, y, r, d.ink);
  d.pen.dot(x + r * 0.3, y - r * 0.35, Math.max(0.6, r * 0.28), PAPER_FILL);
}

/** A soft contact shadow where something meets the ground. */
export function contact(d: Draw, cx: number, rx: number): void {
  d.pen.fill(oval(cx, d.g - 1, rx, 3.2, 24), d.ink, 0.12);
}

/** A highlight glint on a glossy surface. */
export function glint(d: Draw, pts: readonly Pt[], w = 1.6, alpha = 0.85): void {
  d.pen.stroke(pts, w, PAPER_FILL, alpha, false);
}
