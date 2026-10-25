import { INK, Pen, type Pt } from '../../../src/art/pen';
import { clamp01 } from '../short';

/** Small painting helpers shared by the leatherback's drawings: colour mixing, washes and shapes. */

/** A colour's red, green and blue: from "#rrggbb" or "rgb(r,g,b)"/"rgba(…)". */
export const rgb = (colour: string): readonly [number, number, number] => {
  if (colour.startsWith('rgb')) {
    const m = colour.match(/[\d.]+/g) ?? [];
    return [Number(m[0] ?? 0), Number(m[1] ?? 0), Number(m[2] ?? 0)];
  }
  const n = parseInt(colour.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/** `a` mixed towards `b` by u (0 .. 1), as a CSS colour. */
export function mix(a: string, b: string, u: number, alpha = 1): string {
  const k = clamp01(u);
  const ca = rgb(a);
  const cb = rgb(b);
  const c = ca.map((v, i) => Math.round(v + (cb[i]! - v) * k));
  return alpha >= 1 ? `rgb(${c[0]},${c[1]},${c[2]})` : `rgba(${c[0]},${c[1]},${c[2]},${alpha.toFixed(3)})`;
}

export function pathOf(ctx: CanvasRenderingContext2D, pts: readonly Pt[], close = true): void {
  ctx.beginPath();
  addPath(ctx, pts, close);
}

/** Adds a sub-path to the current path (for shapes with holes). */
export function addPath(ctx: CanvasRenderingContext2D, pts: readonly Pt[], close = true): void {
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  if (close) ctx.closePath();
}

/** Fills a shape with a fill style (colour or gradient). */
export function fillShape(ctx: CanvasRenderingContext2D, pts: readonly Pt[], style: string | CanvasGradient, alpha = 1): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = style;
  pathOf(ctx, pts);
  ctx.fill();
  ctx.restore();
}

/** A smooth closed curve through points (Catmull-Rom), sampled `per` points a span. */
export function smoothClosed(pts: readonly Pt[], per = 6): Pt[] {
  const n = pts.length;
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n]!;
    const p1 = pts[i]!;
    const p2 = pts[(i + 1) % n]!;
    const p3 = pts[(i + 2) % n]!;
    for (let k = 0; k < per; k++) out.push(catmull(p0, p1, p2, p3, k / per));
  }
  return out;
}

/** A smooth open curve through points (Catmull-Rom). */
export function smoothOpen(pts: readonly Pt[], per = 6): Pt[] {
  const n = pts.length;
  const out: Pt[] = [];
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]!;
    const p1 = pts[i]!;
    const p2 = pts[i + 1]!;
    const p3 = pts[Math.min(n - 1, i + 2)]!;
    for (let k = 0; k < per; k++) out.push(catmull(p0, p1, p2, p3, k / per));
  }
  out.push(pts[n - 1]!);
  return out;
}

function catmull(p0: Pt, p1: Pt, p2: Pt, p3: Pt, u: number): Pt {
  const u2 = u * u;
  const u3 = u2 * u;
  const f = (a: number, b: number, c: number, d: number): number => 0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u2 + (-a + 3 * b - 3 * c + d) * u3);
  return { x: f(p0.x, p1.x, p2.x, p3.x), y: f(p0.y, p1.y, p2.y, p3.y) };
}

/** Maps points through a transform. */
export const mapPts = (pts: readonly Pt[], f: (p: Pt) => Pt): Pt[] => pts.map(f);

/** An ink outline with the pen, width scaled but never thinner than `min`. */
export function ink(pen: Pen, pts: readonly Pt[], width: number, closed = true, color = INK, alpha = 1): void {
  if (closed) pen.stroke([...pts, pts[0]!], width, color, alpha);
  else pen.stroke(pts, width, color, alpha);
}

/** A soft round glow (additive). */
export function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, colour: string, alpha: number): void {
  if (alpha <= 0.005 || r <= 0) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, mix(colour, colour, 0, alpha));
  g.addColorStop(1, mix(colour, colour, 0, 0));
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.restore();
}

/** Deterministic noise 0 .. 1 for an integer. */
export const hash = (i: number): number => {
  const s = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
};
