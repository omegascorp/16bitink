import type { Pt } from '../../../../src/art/pen';

/** Small geometry and colour helpers shared by the hagfish short's painted animals and slime. */

export const clamp = (v: number, lo = 0, hi = 1): number => Math.max(lo, Math.min(hi, v));
export const mixN = (a: number, b: number, u: number): number => a + (b - a) * u;

type Rgb = readonly [number, number, number];
const cache = new Map<string, Rgb>();
function rgb(hex: string): Rgb {
  const have = cache.get(hex);
  if (have) return have;
  const n = parseInt(hex.slice(1), 16);
  const out: Rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  cache.set(hex, out);
  return out;
}

/** A colour between two hex colours. */
export function mix(a: string, b: string, u: number, alpha = 1): string {
  const [p, q] = [rgb(a), rgb(b)];
  const k = clamp(u);
  const c = (i: number): number => Math.round(p[i]! + (q[i]! - p[i]!) * k);
  return alpha >= 1 ? `rgb(${c(0)},${c(1)},${c(2)})` : `rgba(${c(0)},${c(1)},${c(2)},${alpha.toFixed(3)})`;
}

/** A colour along a list of [position, hex] stops. */
export function ramp3(stops: readonly (readonly [number, string])[], u: number, alpha = 1): string {
  const k = clamp(u);
  for (let i = 1; i < stops.length; i++) {
    const [u0, c0] = stops[i - 1]!;
    const [u1, c1] = stops[i]!;
    if (k <= u1) return mix(c0, c1, (k - u0) / ((u1 - u0) || 1), alpha);
  }
  return mix(stops[stops.length - 1]![1], stops[stops.length - 1]![1], 0, alpha);
}

export function polyPath(ctx: CanvasRenderingContext2D, pts: readonly Pt[]): void {
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
}

export function linePath(ctx: CanvasRenderingContext2D, pts: readonly Pt[]): void {
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
}

/** Piecewise-linear y at x along a line whose points run in x order (either way). */
export function lookup(line: readonly Pt[]): (x: number) => number {
  const pts = [...line].sort((a, b) => a.x - b.x);
  return (x) => {
    if (x <= pts[0]!.x) return pts[0]!.y;
    for (let i = 1; i < pts.length; i++) {
      const [a, b] = [pts[i - 1]!, pts[i]!];
      if (x <= b.x) return a.y + ((b.y - a.y) * (x - a.x)) / ((b.x - a.x) || 1);
    }
    return pts[pts.length - 1]!.y;
  };
}

/** Points evenly spaced along arclength; also returns the source index fraction of each, to carry per-point data along. */
export function evenly(path: readonly Pt[], n: number): { readonly pts: Pt[]; readonly at: number[] } {
  const len = [0];
  for (let i = 1; i < path.length; i++) len.push(len[i - 1]! + Math.hypot(path[i]!.x - path[i - 1]!.x, path[i]!.y - path[i - 1]!.y));
  const total = len[len.length - 1]! || 1;
  const pts: Pt[] = [];
  const at: number[] = [];
  let j = 1;
  for (let i = 0; i < n; i++) {
    const d = (total * i) / (n - 1);
    while (j < path.length - 1 && len[j]! < d) j++;
    const seg = (len[j]! - len[j - 1]!) || 1;
    const u = clamp((d - len[j - 1]!) / seg);
    pts.push({ x: path[j - 1]!.x + (path[j]!.x - path[j - 1]!.x) * u, y: path[j - 1]!.y + (path[j]!.y - path[j - 1]!.y) * u });
    at.push(j - 1 + u);
  }
  return { pts, at };
}

export const arcLength = (path: readonly Pt[]): number => path.reduce((s, p, i) => (i ? s + Math.hypot(p.x - path[i - 1]!.x, p.y - path[i - 1]!.y) : 0), 0);

/** A curve leaving `from` at angle `a0`, its heading turning smoothly to `a1` over `turnLen`, with an optional slow ripple. */
export function arm(from: Pt, a0: number, a1: number, len: number, turnLen: number, ripple = 0, phase = 0, step = 8): Pt[] {
  const out: Pt[] = [from];
  let { x, y } = from;
  const n = Math.max(1, Math.round(len / step));
  for (let i = 1; i <= n; i++) {
    const s = (i * len) / n;
    const u = clamp(s / turnLen);
    const a = a0 + (a1 - a0) * (u * u * (3 - 2 * u)) + ripple * Math.sin(s / 95 + phase) * clamp(s / 120);
    x += Math.cos(a) * (len / n);
    y += Math.sin(a) * (len / n);
    out.push({ x, y });
  }
  return out;
}
