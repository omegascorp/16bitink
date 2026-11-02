import { makeCanvas, Pen, type Pt } from '../../../../src/art/pen';
import { BOIL_FRAMES } from '../../../../src/art/textures';

/**
 * Shared brushwork for the seal short's painted animals (the Cape fur seal and
 * the blue shark), in the manner of ../../foodchain/art/greatWhite.ts: parts
 * baked once per line-boil frame into sprites at a few sizes, washes laid in
 * column by column so the colour follows the body round (dark back to pale
 * belly), soft airbrushed light and shade, and ink whose weight is set in
 * screen pixels so it holds up at every size.
 */

export interface Brush {
  readonly ctx: CanvasRenderingContext2D;
  readonly pen: Pen;
  /** Sprite px per local unit. */
  readonly res: number;
  /** Line weight factor: a touch heavier in the small sprites. */
  readonly w: number;
}

export interface Box { readonly x0: number; readonly x1: number; readonly y0: number; readonly y1: number }
export interface Bucket { readonly res: number; readonly w: number }

/** Sprite sizes, px per local unit (the animals are 310 units long). */
export const BUCKETS: readonly Bucket[] = [
  { res: 0.8, w: 1.3 },
  { res: 1.6, w: 1.1 },
  { res: 2.4, w: 1 },
  { res: 3.5, w: 1 },
];

/** `n` screen px as local units, at this brush's size. */
export const px = (k: Brush, n: number): number => (n * k.w) / k.res;

/** Screen px per local unit under the current transform. */
export function screenScale(ctx: CanvasRenderingContext2D): number {
  const m = ctx.getTransform();
  return Math.hypot(m.a, m.b);
}

export function bucketFor(pxPerUnit: number): Bucket {
  return BUCKETS.find((b) => b.res >= pxPerUnit * 0.92) ?? BUCKETS[BUCKETS.length - 1]!;
}

/** One sprite: `paint` in local units into a canvas covering `box` at the bucket's size. */
export function sheet(box: Box, b: Bucket, seed: number, paint: (k: Brush) => void): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(Math.ceil((box.x1 - box.x0) * b.res), Math.ceil((box.y1 - box.y0) * b.res));
  ctx.scale(b.res, b.res);
  ctx.translate(-box.x0, -box.y0);
  paint({ ctx, pen: new Pen(ctx, seed, 0.55 / b.res), w: b.w, res: b.res });
  return canvas;
}

/** One sprite per line-boil frame. */
export const frames = (box: Box, b: Bucket, seed: number, paint: (k: Brush) => void): HTMLCanvasElement[] =>
  Array.from({ length: BOIL_FRAMES }, (_, f) => sheet(box, b, seed + f * 977, paint));

/** A sprite set baked the first time its size is needed. */
export function lazily<T>(bake: (b: Bucket) => T): (b: Bucket) => T {
  const made = new Map<Bucket, T>();
  return (b) => {
    const have = made.get(b);
    if (have) return have;
    const fresh = bake(b);
    made.set(b, fresh);
    return fresh;
  };
}

/** Draws a sprite over its box, in local units. */
export function blit(ctx: CanvasRenderingContext2D, c: HTMLCanvasElement, box: Box, res: number): void {
  ctx.drawImage(c, box.x0, box.y0, c.width / res, c.height / res);
}

export function path(ctx: CanvasRenderingContext2D, shape: readonly Pt[]): void {
  ctx.beginPath();
  shape.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
}

/** The y of a line (running either way in x) at x. */
export function edgeAt(line: readonly Pt[], x: number): number {
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1]!;
    const b = line[i]!;
    if ((a.x - x) * (b.x - x) <= 0) return a.y + ((b.y - a.y) * (x - a.x)) / ((b.x - a.x) || 1);
  }
  const first = line[0]!;
  const last = line[line.length - 1]!;
  return Math.abs(first.x - x) < Math.abs(last.x - x) ? first.y : last.y;
}

export type Edge = (x: number) => number;

/** A line along a body at `v` of the way down from `top` to `bottom`, from x0 to x1. */
export function contour(top: Edge, bottom: Edge, v: number, x0: number, x1: number, step = 4): Pt[] {
  const n = Math.max(1, Math.round(Math.abs(x1 - x0) / step));
  return Array.from({ length: n + 1 }, (_, i) => {
    const x = x0 + ((x1 - x0) * i) / n;
    return { x, y: top(x) + (bottom(x) - top(x)) * v };
  });
}

export type Stops = readonly (readonly [number, string])[];

/**
 * The body's colour laid in column by column, each a gradient from its top
 * edge to its bottom edge, so the shading follows the body round. Clip first.
 */
export function columnWash(ctx: CanvasRenderingContext2D, x0: number, x1: number, step: number, top: Edge, bottom: Edge, stops: (x: number) => Stops, reach = 60): void {
  for (let x = x0; x <= x1; x += step) {
    const t = top(x);
    const b = Math.max(t + 1, bottom(x));
    const g = ctx.createLinearGradient(0, t, 0, b);
    for (const [at, colour] of stops(x)) g.addColorStop(Math.max(0, Math.min(1, at)), colour);
    ctx.fillStyle = g;
    ctx.fillRect(x - step / 2 - 0.35, t - reach, step + 0.7, b - t + 2 * reach);
  }
}

/** A soft airbrushed line: stacked strokes, widest and faintest first. */
export function softLine(ctx: CanvasRenderingContext2D, pts: readonly Pt[], width: number, colour: string, alpha: number, layers = 6): void {
  if (pts.length < 2) return;
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  for (let i = 0; i < layers; i++) {
    ctx.globalAlpha = alpha / layers * 1.4;
    ctx.lineWidth = width * (1 - i / layers);
    ctx.stroke();
  }
  ctx.restore();
}

/** A soft round dab of colour (`rgb` as "r,g,b"). */
export function dab(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rgb: string, alpha: number): void {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${rgb},${alpha})`);
  g.addColorStop(0.55, `rgba(${rgb},${alpha * 0.45})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
}

/** A vertical gradient filling a clipped shape. */
export function shade(ctx: CanvasRenderingContext2D, shape: readonly Pt[], y0: number, y1: number, stops: Stops, x0 = y0, x1 = y0): void {
  ctx.save();
  path(ctx, shape);
  ctx.clip();
  const g = x0 === x1 ? ctx.createLinearGradient(0, y0, 0, y1) : ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [at, colour] of stops) g.addColorStop(at, colour);
  ctx.fillStyle = g;
  ctx.fillRect(-400, -400, 800, 800);
  ctx.restore();
}

const hex = (c: string): readonly number[] => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));

/** Mixes two #rrggbb colours. */
export function mix(a: string, b: string, u: number): string {
  const [p, q] = [hex(a), hex(b)];
  const c = p.map((v, i) => Math.round(v + (q[i]! - v) * u));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

/** Mixes palettes stop by stop (all sharing the same stop positions). */
export function mixStops(at: readonly number[], palettes: readonly (readonly [readonly string[], number])[]): Stops {
  return at.map((v, i) => {
    let total = 0;
    const rgb = [0, 0, 0];
    for (const [pal, weight] of palettes) {
      if (weight <= 0) continue;
      const c = hex(pal[i]!);
      for (let j = 0; j < 3; j++) rgb[j]! += c[j]! * weight;
      total += weight;
    }
    return [v, `rgb(${rgb.map((c) => Math.round(c / (total || 1))).join(',')})`] as const;
  });
}

/** Smoothstep of (x - a) / (b - a). */
export const step01 = (x: number, a: number, b: number): number => {
  const u = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return u * u * (3 - 2 * u);
};

/** A tapered filled stroke (a hair, a whisker): `w0` wide at the start, `w1` at the end. */
export function taper(ctx: CanvasRenderingContext2D, pts: readonly Pt[], w0: number, w1: number, colour: string, alpha: number): void {
  if (pts.length < 2) return;
  const left: Pt[] = [];
  const right: Pt[] = [];
  pts.forEach((p, i) => {
    const a = pts[Math.max(0, i - 1)]!;
    const b = pts[Math.min(pts.length - 1, i + 1)]!;
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const n = { x: -(b.y - a.y) / len, y: (b.x - a.x) / len };
    const w = (w0 + (w1 - w0) * (i / (pts.length - 1))) / 2;
    left.push({ x: p.x + n.x * w, y: p.y + n.y * w });
    right.push({ x: p.x - n.x * w, y: p.y - n.y * w });
  });
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = colour;
  path(ctx, [...left, ...right.reverse()]);
  ctx.fill();
  ctx.restore();
}

/** A quadratic curve as points. */
export function curve(a: Pt, c: Pt, b: Pt, n = 10): Pt[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const u = i / n;
    const v = 1 - u;
    return { x: v * v * a.x + 2 * u * v * c.x + u * u * b.x, y: v * v * a.y + 2 * u * v * c.y + u * u * b.y };
  });
}

/** Points along a closed loop through `pts`, smoothed (Catmull-Rom), `n` per span. */
export function smoothLoop(pts: readonly Pt[], n = 6): Pt[] {
  const out: Pt[] = [];
  const at = (i: number): Pt => pts[(i + pts.length) % pts.length]!;
  for (let i = 0; i < pts.length; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    for (let k = 0; k < n; k++) {
      const s = k / n;
      const s2 = s * s;
      const s3 = s2 * s;
      const f = (a: number, b: number, c: number, d: number): number =>
        0.5 * (2 * b + (-a + c) * s + (2 * a - 5 * b + 4 * c - d) * s2 + (-a + 3 * b - 3 * c + d) * s3);
      out.push({ x: f(p0.x, p1.x, p2.x, p3.x), y: f(p0.y, p1.y, p2.y, p3.y) });
    }
  }
  return out;
}

/** Rotates a point about another. */
export function turn(p: Pt, about: Pt, a: number): Pt {
  const [c, s] = [Math.cos(a), Math.sin(a)];
  const [dx, dy] = [p.x - about.x, p.y - about.y];
  return { x: about.x + dx * c - dy * s, y: about.y + dx * s + dy * c };
}

/** Fades the end of a sprite at local x below `to` (from transparent at `from`), so a limb's root melts into the body. */
export function fadeRoot(ctx: CanvasRenderingContext2D, from: number, to: number): void {
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  const g = ctx.createLinearGradient(from, 0, to, 0);
  g.addColorStop(0, 'rgba(0,0,0,1)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(from - 40, -200, to - from + 40, 400);
  ctx.restore();
}
