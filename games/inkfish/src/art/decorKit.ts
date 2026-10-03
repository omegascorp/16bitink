import { createRng, type Rng } from '../logic/rng';
import { INK, Pen, type Pt } from './pen';
import { ART_RES } from './propArt';

/**
 * Shared drawing kit for the deep-sea and lost-object seabed decor: palette,
 * a local frame of in-game px (origin at the bottom centre, y up is negative)
 * mapped to canvas px, and small geometry and pen helpers.
 */
export const S = ART_RES;
export const TAU = Math.PI * 2;
export const PAPER_FILL = '#fffaf0';
export const BONE = '#cdb98c';
export const MUD = '#8c8170';
export const IRON = '#5a4c43';
export const RUST = '#9a5530';
export const TERRACOTTA = '#c4693d';
export const PLUME_RED = '#b8332b';
export const WOOD = '#7a5a3a';

export type RGB = readonly [number, number, number];
export const SHADOW: RGB = [38, 32, 28];
export const SMOKE: RGB = [26, 22, 24];
export const rgba = (c: RGB, a: number): string => `rgba(${c[0]},${c[1]},${c[2]},${a.toFixed(3)})`;

/** Drawing context for one piece: a pen plus the local frame. */
export interface Draw {
  readonly pen: Pen;
  readonly rng: Rng;
  /** Maps a local point to canvas pixels. */
  readonly P: (x: number, y: number) => Pt;
  readonly L: (pts: readonly Pt[]) => Pt[];
  /** Canvas pixels back to local units (for stipple densities). */
  readonly U: (x: number, y: number) => Pt;
}

export function frame(ctx: CanvasRenderingContext2D, seed: number, mirror: boolean): Draw {
  const w = ctx.canvas.width / S;
  const h = ctx.canvas.height / S;
  const f = mirror ? -1 : 1;
  const P = (x: number, y: number): Pt => pt((w / 2 + x * f) * S, (h + y) * S);
  return {
    pen: new Pen(ctx, seed, 0.6),
    rng: createRng(seed * 7 + 3),
    P,
    L: (pts) => pts.map((p) => P(p.x, p.y)),
    U: (x, y) => pt((x / S - w / 2) * f, y / S - h),
  };
}

// ---------------------------------------------------------------- geometry helpers

export const pt = (x: number, y: number): Pt => ({ x, y });
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const along = (p: Pt, v: Pt, k: number): Pt => pt(p.x + v.x * k, p.y + v.y * k);
export const unit = (x: number, y: number): Pt => {
  const l = Math.hypot(x, y) || 1;
  return pt(x / l, y / l);
};
export const closed = (pts: readonly Pt[]): Pt[] => [...pts, pts[0]!];

/** Points on an elliptical arc; a full turn repeats the first point. */
export function oval(cx: number, cy: number, rx: number, ry: number, n = 20, a0 = 0, a1 = TAU): Pt[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / n;
    return pt(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry);
  });
}

export function rotOval(cx: number, cy: number, rx: number, ry: number, ang: number, n = 14): Pt[] {
  const [c, s] = [Math.cos(ang), Math.sin(ang)];
  return oval(0, 0, rx, ry, n).map((p) => pt(cx + p.x * c - p.y * s, cy + p.x * s + p.y * c));
}

export function qb(p0: Pt, c: Pt, p1: Pt, n = 12): Pt[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const u = 1 - t;
    return pt(u * u * p0.x + 2 * u * t * c.x + t * t * p1.x, u * u * p0.y + 2 * u * t * c.y + t * t * p1.y);
  });
}

/** Offsets a centreline both ways by `width(u)` to make a ribbon polygon. */
export function ribbon(center: readonly Pt[], width: (u: number) => number): { left: Pt[]; right: Pt[]; shape: Pt[] } {
  const left: Pt[] = [];
  const right: Pt[] = [];
  center.forEach((p, i) => {
    const a = center[Math.max(0, i - 1)]!;
    const b = center[Math.min(center.length - 1, i + 1)]!;
    const n = unit(b.x - a.x, b.y - a.y);
    const w = width(i / (center.length - 1));
    left.push(pt(p.x - n.y * w, p.y + n.x * w));
    right.push(pt(p.x + n.y * w, p.y - n.x * w));
  });
  return { left, right, shape: [...left, ...[...right].reverse()] };
}

export function bounds(pts: readonly Pt[]): { x0: number; x1: number; y0: number; y1: number } {
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
}

/** Evenly spaced points along a polyline. */
export function resample(line: readonly Pt[], step: number): Pt[] {
  const out = [line[0]!];
  let carry = 0;
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1]!;
    const b = line[i]!;
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    let t = step - carry;
    for (; t <= len; t += step) out.push(pt(lerp(a.x, b.x, t / len), lerp(a.y, b.y, t / len)));
    carry = len - (t - step);
  }
  return out;
}

/** Convex hull (monotone chain), used for the creel's silhouette. */
export function hull(points: readonly Pt[]): Pt[] {
  const p = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (o: Pt, a: Pt, b: Pt): number => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const half = (list: Pt[]): Pt[] => {
    const out: Pt[] = [];
    for (const q of list) {
      while (out.length >= 2 && cross(out[out.length - 2]!, out[out.length - 1]!, q) <= 0) out.pop();
      out.push(q);
    }
    return out.slice(0, -1);
  };
  return [...half(p), ...half([...p].reverse())];
}

// ---------------------------------------------------------------- pen helpers (local units)

/** Paper underneath, then a watercolour wash. */
export function paint(d: Draw, pts: readonly Pt[], wash: string, alpha: number): void {
  d.pen.fill(d.L(pts), PAPER_FILL, 1);
  d.pen.fill(d.L(pts), wash, alpha);
}

export function ink(d: Draw, pts: readonly Pt[], width = 1.1, alpha = 1): void {
  d.pen.stroke(d.L(pts), width * S, INK, alpha);
}

export function ring(d: Draw, pts: readonly Pt[], width = 1.1): void {
  ink(d, closed(pts), width);
}

export function hair(d: Draw, pts: readonly Pt[], width = 0.45, alpha = 0.7, color = INK): void {
  d.pen.hair(d.L(pts), width * S, color, alpha);
}

export function dots(d: Draw, pts: readonly Pt[], count: number, dens: (x: number, y: number) => number, r = 0.42): void {
  d.pen.stipple(d.L(pts), Math.round(count), (x, y) => {
    const p = d.U(x, y);
    return dens(p.x, p.y);
  }, r * S);
}

export function clip(d: Draw, pts: readonly Pt[], draw: () => void): void {
  d.pen.clipped(d.L(pts), draw);
}

/** A soft radial-gradient blot: shadows on the mud, smoke in the water. */
export function puff(d: Draw, x: number, y: number, rx: number, ry: number, color: RGB, alpha: number): void {
  const { ctx } = d.pen;
  const c = d.P(x, y);
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx * S);
  g.addColorStop(0, rgba(color, alpha));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, rx * S, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/** A low lumpy dome sitting on `g` (half-sunk stones, nodules, rubble). */
export function lump(d: Draw, x: number, g: number, rx: number, ry: number, wash: string, alpha: number): Pt[] {
  const [p1, p2] = [d.rng() * TAU, d.rng() * TAU];
  const top = Array.from({ length: 23 }, (_, i) => {
    const a = Math.PI + (i / 22) * Math.PI;
    const k = 1 + 0.12 * Math.sin(5 * a + p1) + 0.07 * Math.sin(11 * a + p2);
    return pt(x + Math.cos(a) * rx * k, g + Math.sin(a) * ry * k);
  });
  const body = [...top, pt(x + rx * 0.95, g + 1.2), pt(x - rx * 0.95, g + 1.2)];
  puff(d, x + rx * 0.3, g + 0.5, rx * 1.4, 2.4, SHADOW, 0.4);
  paint(d, body, wash, alpha);
  dots(d, body, rx * ry * 5, (px, py) => 0.2 + 0.6 * Math.max(0, (px - x) / rx) + 0.3 * ((py - g + ry) / ry), 0.4);
  ink(d, top, 0.9);
  return top;
}

/** Sand or mud banked against an object, from x0 to x1 on ground line `g`. */
export function drift(d: Draw, x0: number, x1: number, g: number, height: number): void {
  const p = d.rng() * TAU;
  const top = Array.from({ length: 25 }, (_, i) => {
    const u = i / 24;
    return pt(lerp(x0, x1, u), g - height * Math.pow(Math.sin(Math.PI * u), 0.6) * (1 + 0.18 * Math.sin(u * 13 + p)));
  });
  const body = [...top, pt(x1, g + 0.6), pt(x0, g + 0.6)];
  paint(d, body, MUD, 0.5);
  dots(d, body, (x1 - x0) * height * 1.6, (_x, y) => 0.25 + 0.5 * ((y - g + height) / height), 0.4);
  hair(d, top, 0.6, 0.85);
}

/** A little volcano-shaped barnacle: pale cone with a dark slot. */
export function barnacle(d: Draw, x: number, y: number, r: number): void {
  const cone = oval(x, y, r, r * 0.75, 10);
  paint(d, cone, '#e6dcc4', 0.5);
  ring(d, cone, 0.5);
  hair(d, [pt(x - r * 0.35, y - r * 0.1), pt(x + r * 0.35, y - r * 0.1)], 0.6, 0.9);
}

/** Dark iron with rust blotches and pitting stipple. */
export function iron(d: Draw, shape: readonly Pt[], outline = 1.1): void {
  const { rng } = d;
  const b = bounds(shape);
  const area = (b.x1 - b.x0) * (b.y1 - b.y0);
  paint(d, shape, IRON, 0.72);
  clip(d, shape, () => {
    for (let i = 0; i < 2 + area / 250; i++) {
      const blot = rotOval(lerp(b.x0, b.x1, rng()), lerp(b.y0, b.y1, rng()), 2 + rng() * 5, 1.4 + rng() * 2.5, rng() * 3, 12);
      d.pen.fill(d.L(blot), RUST, 0.35 + rng() * 0.3);
    }
  });
  dots(d, shape, area * 0.9, () => 0.55, 0.42);
  ring(d, shape, outline);
}
