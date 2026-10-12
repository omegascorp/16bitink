import { createRng } from '../../../src/logic/rng';

/**
 * Chalky pen lines that boil, for the vector shark: each stroke wanders
 * along its length by a smooth noise redrawn every boil frame, and the pen
 * goes over it a second time, faintly, slightly off. Points are in screen px.
 */
export interface Pt { readonly x: number; readonly y: number }

/** A smooth curve through points (Catmull-Rom), `per` samples per span. */
export function spline(points: readonly Pt[], closed: boolean, per = 8): Pt[] {
  const n = points.length;
  const at = (i: number): Pt => (closed ? points[((i % n) + n) % n]! : points[Math.max(0, Math.min(n - 1, i))]!);
  const spans = closed ? n : n - 1;
  const out: Pt[] = [];
  for (let i = 0; i < spans; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    for (let k = 0; k < per; k++) {
      const s = k / per;
      const [s2, s3] = [s * s, s * s * s];
      out.push({
        x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * s + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * s2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * s3),
        y: 0.5 * (2 * p1.y + (-p0.y + p2.y) * s + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * s2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * s3),
      });
    }
  }
  if (!closed) out.push(points[n - 1]!);
  return out;
}

export function pathThrough(ctx: CanvasRenderingContext2D, pts: readonly Pt[], close = false): void {
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  if (close) ctx.closePath();
}

/** One stroke's wobble on one boil frame: a smooth offset by distance along it. */
function wobble(seed: number, boil: number, amount: number): (s: number) => Pt {
  const rng = createRng(seed * 7919 + (boil % 3) * 104729 + 13);
  const ph = Array.from({ length: 4 }, () => rng() * Math.PI * 2);
  const [k1, k2] = [0.018 + rng() * 0.01, 0.05 + rng() * 0.02];
  return (s) => ({
    x: amount * (Math.sin(s * k1 + ph[0]!) + 0.45 * Math.sin(s * k2 + ph[1]!)),
    y: amount * (Math.sin(s * k1 + ph[2]!) + 0.45 * Math.sin(s * k2 + ph[3]!)),
  });
}

function wobbled(pts: readonly Pt[], w: (s: number) => Pt): Pt[] {
  let s = 0;
  return pts.map((p, i) => {
    if (i > 0) s += Math.hypot(p.x - pts[i - 1]!.x, p.y - pts[i - 1]!.y);
    const d = w(s);
    return { x: p.x + d.x, y: p.y + d.y };
  });
}

export interface Stroke {
  readonly width: number;
  readonly color: string;
  readonly alpha?: number;
  /** How far the line wanders, px. */
  readonly wander?: number;
  readonly close?: boolean;
  /** Go over it a second time, faintly (contours); off for hairlines. */
  readonly retrace?: boolean;
}

/** A chalk stroke through points; `seed` keeps each stroke's wobble its own. */
export function chalk(ctx: CanvasRenderingContext2D, pts: readonly Pt[], seed: number, boil: number, s: Stroke): void {
  if (pts.length < 2) return;
  const wander = s.wander ?? 1.6;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = s.color;
  ctx.globalAlpha *= s.alpha ?? 1;
  ctx.lineWidth = s.width;
  pathThrough(ctx, wobbled(pts, wobble(seed, boil, wander)), s.close);
  ctx.stroke();
  if (s.retrace ?? true) {
    ctx.globalAlpha *= 0.3;
    ctx.lineWidth = s.width * 0.45;
    pathThrough(ctx, wobbled(pts, wobble(seed + 5003, boil, wander * 1.3)), s.close);
    ctx.stroke();
  }
  ctx.restore();
}
