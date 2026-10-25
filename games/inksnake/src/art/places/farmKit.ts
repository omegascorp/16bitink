import type { Rng } from '../../logic/rng';
import { BOARD, type LevelDef, type SolidDef } from '../../level/types';
import { type Draw, pt, TAU } from '../kit';
import type { Pt } from '../pen';
import { rgba } from '../wash';

/**
 * What the farm's painters share: the farm's colours, a steady seed from a
 * level id, where a level's things stand (so the ground keeps its busy
 * detail off them), smooth noise, and batched short strokes for grass and
 * straw (thousands of marks laid as one path).
 */
export const SWARD = '#b8c87e';
export const SWARD_DEEP = '#7f9f55';
export const SWARD_LIT = '#dfe3a8';
export const GRASS = '#6f9446';
export const GRASS_DEEP = '#4a6c38';
export const GRASS_LIT = '#b5c978';
export const HAY = '#d6c47e';
export const EARTH = '#b89a70';
export const EARTH_DEEP = '#7a5c40';
export const EARTH_LIT = '#dcc8a2';
export const SOIL = '#6a4a35';
export const SOIL_DARK = '#3e2b20';
export const SOIL_LIT = '#9c7a58';
export const STRAW = '#d9b862';
export const STRAW_DEEP = '#a5823a';
export const STRAW_LIT = '#f2e2a4';
export const OAK = '#8a6440';
export const OAK_DARK = '#5a3d26';
export const WEATHERED = '#a89c86';
export const WEATHERED_DARK = '#5e5546';
export const END_GRAIN = '#c49a6a';
export const IRON = '#45464e';
export const LICHEN = '#c9c47e';

/** The board's area against the 1280 × 720 the counts of marks were tuned on: board-wide counts scale by it, so marks keep their density. */
export const AREA = (BOARD.w * BOARD.h) / (1280 * 720);
/** Scales a board-wide count of marks to the board's area. */
export const perArea = (n: number): number => Math.round(n * AREA);

/** A steady number from a level id, so each level's ground lies differently. */
export function seedOf(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return h >>> 0;
}

export const smoothstep = (t: number): number => {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
};

/** A rect's corners, clockwise from the top left. */
export const rectPts = (x: number, y: number, w: number, h: number): Pt[] => [pt(x, y), pt(x + w, y), pt(x + w, y + h), pt(x, y + h)];

/** Something the ground keeps clear of: a circle, or a rect (x0..x1, y0..y1). */
export type Keep =
  | { readonly kind: 'circle'; readonly x: number; readonly y: number; readonly r: number }
  | { readonly kind: 'rect'; readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number };

const keepSolid = (s: SolidDef): Keep => (s.kind === 'circle' ? { kind: 'circle', x: s.x, y: s.y, r: s.r } : { kind: 'rect', x0: s.x, y0: s.y, x1: s.x + s.w, y1: s.y + s.h });

/** Every thing on a level the ground keeps its busy detail off: solids, cover, nests, and the snake's start (head and body behind it). */
export function keepsOf(level: LevelDef): Keep[] {
  const back = pt(-Math.cos(level.heading), -Math.sin(level.heading));
  return [
    ...(level.solids ?? []).map(keepSolid),
    ...(level.cover ?? []).map((c): Keep => ({ kind: 'circle', x: c.x, y: c.y, r: c.r * 1.1 })),
    ...(level.nests ?? []).map((n): Keep => ({ kind: 'circle', x: n.x, y: n.y, r: 24 })),
    { kind: 'circle', x: level.start.x, y: level.start.y, r: 70 },
    { kind: 'circle', x: level.start.x + back.x * level.length * 0.5, y: level.start.y + back.y * level.length * 0.5, r: level.length * 0.5 + 30 },
  ];
}

/** How far a point is outside a keep (negative inside). */
export function distTo(k: Keep, x: number, y: number): number {
  if (k.kind === 'circle') return Math.hypot(x - k.x, y - k.y) - k.r;
  const dx = Math.max(k.x0 - x, 0, x - k.x1);
  const dy = Math.max(k.y0 - y, 0, y - k.y1);
  if (dx === 0 && dy === 0) return -Math.min(x - k.x0, k.x1 - x, y - k.y0, k.y1 - y);
  return Math.hypot(dx, dy);
}

/** 0..1 at a spot: how much busy detail it takes. Low in the middle of the board and near the level's things, 1 at the edges away from them. */
export type Busy = (x: number, y: number) => number;

export function busyOf(keeps: readonly Keep[], margin = 70): Busy {
  const { w, h } = BOARD;
  return (x, y) => {
    const e = Math.max(Math.abs(x - w / 2) / (w / 2), Math.abs(y - h / 2) / (h / 2));
    const edge = 0.18 + 0.82 * smoothstep((e - 0.45) / 0.5);
    let near = 1;
    for (const k of keeps) near = Math.min(near, smoothstep(distTo(k, x, y) / margin));
    return edge * near;
  };
}

/** A smooth wandering field in -1..1. */
export function noiseOf(rng: Rng, scale: number): (x: number, y: number) => number {
  const waves = Array.from({ length: 4 }, (_, k) => ({ a: rng() * TAU, f: (1 + k * 0.7) / scale, p: rng() * TAU, w: 1 / (1 + k) }));
  const sum = waves.reduce((s, v) => s + v.w, 0);
  return (x, y) => waves.reduce((s, v) => s + v.w * Math.sin((x * Math.cos(v.a) + y * Math.sin(v.a)) * v.f + v.p), 0) / sum;
}

/** Short curved marks laid as one path: `mark` returns a start, angle, length and bend, or null to skip. */
export function strokes(d: Draw, colour: string, alpha: number, width: number, n: number, mark: () => readonly [number, number, number, number, number] | null): void {
  const { ctx } = d.pen;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = rgba(colour, alpha);
  ctx.lineWidth = width;
  ctx.beginPath();
  for (let k = 0; k < n; k++) {
    const m = mark();
    if (!m) continue;
    const [x, y, a, l, bend] = m;
    const mx = x + Math.cos(a) * l * 0.5 - Math.sin(a) * bend;
    const my = y + Math.sin(a) * l * 0.5 + Math.cos(a) * bend;
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(mx, my, x + Math.cos(a) * l, y + Math.sin(a) * l);
  }
  ctx.stroke();
  ctx.restore();
}

/** A closed ragged ring round c: radius r(a) at angle a, `n` points. */
export function ring(c: Pt, n: number, r: (a: number) => number): Pt[] {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * TAU;
    const rr = r(a);
    return pt(c.x + Math.cos(a) * rr, c.y + Math.sin(a) * rr);
  });
}

/** Points along a polyline every `step` px. */
export function resample(pts: readonly Pt[], step: number): Pt[] {
  const out: Pt[] = [pts[0]!];
  let carry = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    const l = Math.hypot(b.x - a.x, b.y - a.y);
    let s = step - carry;
    while (s <= l) {
      out.push(pt(a.x + ((b.x - a.x) * s) / l, a.y + ((b.y - a.y) * s) / l));
      s += step;
    }
    carry = l - (s - step);
  }
  return out;
}
