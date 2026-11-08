import type { Rng } from '../../logic/rng';
import { BOARD } from '../../level/types';
import { SHADOW } from '../groundKit';
import { type Draw, pt, TAU } from '../kit';
import type { Pt } from '../pen';
import { rgba } from '../wash';

/**
 * What the Savanna's painters share: its colours (red laterite earth, the
 * straw of dry grass, rusty red oat grass, grey-green acacia leaves, the
 * orange clay of termite mounds, pink-grey granite), and batched marks for
 * grass tufts, so thousands of blades are laid as a few paths.
 */
export const W = BOARD.w;
export const H = BOARD.h;

export const EARTH = '#d6ae76';
export const EARTH_PALE = '#ead3a9';
export const EARTH_DEEP = '#a46c45';
export const EARTH_RED = '#bf7a48';
export const DUST = '#e2c899';
export const STRAW = '#d9bf7c';
export const STRAW_PALE = '#f1e3b0';
export const STRAW_DEEP = '#a5874a';
export const STRAW_DARK = '#6f5a32';
export const OAT = '#b9743e';
export const OAT_DEEP = '#86502c';
export const OLIVE = '#9b9a5c';
export const SHADE = '#4a3426';
export const BARK = '#6b5c4d';
export const BARK_DARK = '#3a2f27';
export const BARK_LIT = '#a99a86';
export const LEAF = '#7d8d55';
export const LEAF_DEEP = '#4c5b35';
export const LEAF_LIT = '#b9c48a';
export const THORN = '#f2ecdc';
export const POD = '#8f6a43';
export const CLAY = '#c47d4b';
export const CLAY_DEEP = '#8c4b2d';
export const CLAY_LIT = '#e6ae7c';
export const GRANITE = '#c6b3a1';
export const GRANITE_DEEP = '#86705e';
export const GRANITE_LIT = '#ede2d2';
export const LICHEN_ORANGE = '#d28c3c';
export const LICHEN_PALE = '#c3c896';
export const NEST = '#c9b168';
export const NEST_DEEP = '#86733f';
export const NEST_GREEN = '#a6a660';

/** One blade of a tuft: where it starts, which way it points, its length and its bend. */
export type Blade = readonly [x: number, y: number, a: number, l: number, bend: number];

/**
 * A grass tuft from above: blades springing from its crown at c and
 * arching out every way (a little more towards `lean`), `r` its reach.
 */
export function tuft(c: Pt, r: number, n: number, rng: Rng, lean = rng() * TAU, leanK = 0.35): Blade[] {
  return Array.from({ length: n }, () => {
    const a = rng() < leanK ? lean + (rng() - 0.5) * 1.4 : rng() * TAU;
    const from = pt(c.x + Math.cos(a) * r * 0.12 * rng(), c.y + Math.sin(a) * r * 0.12 * rng());
    return [from.x, from.y, a, r * (0.45 + rng() * 0.6), (rng() < 0.5 ? -1 : 1) * r * (0.12 + rng() * 0.3)] as const;
  });
}

function bladePath(ctx: CanvasRenderingContext2D, blades: readonly Blade[], dx: number, dy: number): void {
  ctx.beginPath();
  for (const [x, y, a, l, bend] of blades) {
    const c = Math.cos(a);
    const s = Math.sin(a);
    ctx.moveTo(x + dx, y + dy);
    ctx.quadraticCurveTo(x + dx + c * l * 0.5 - s * bend, y + dy + s * l * 0.5 + c * bend, x + dx + c * l, y + dy + s * l);
  }
}

/** Blades in one colour, as one path. */
export function strokeBlades(d: Draw, blades: readonly Blade[], colour: string, alpha: number, width: number): void {
  if (!blades.length) return;
  const { ctx } = d.pen;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = rgba(colour, alpha);
  ctx.lineWidth = width;
  bladePath(ctx, blades, 0, 0);
  ctx.stroke();
  ctx.restore();
}

/** The shadows blades throw down-right on the ground, `lift` their height. */
export function bladeShadows(d: Draw, blades: readonly Blade[], alpha: number, width: number, lift: number, colour = SHADE): void {
  if (!blades.length) return;
  const { ctx } = d.pen;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = rgba(colour, alpha);
  ctx.lineWidth = width;
  bladePath(ctx, blades, SHADOW.x * lift, SHADOW.y * lift);
  ctx.stroke();
  ctx.restore();
}

/** How lit a blade pointing at angle a is (1 towards the light at the upper left). */
export const litOf = (a: number): number => (1 - Math.cos(a - 3.99)) / 2;

/** Blades sorted into dark, mid and lit by which way they point, then stroked, with their shadows first. */
export function paintBlades(d: Draw, blades: readonly Blade[], tones: readonly [string, string, string], width: number, lift: number, shadow = 0.16): void {
  bladeShadows(d, blades, shadow, width * 1.1, lift);
  const [dark, mid, lit] = tones;
  strokeBlades(d, blades.filter((b) => litOf(b[2]) < 0.35), dark, 0.85, width);
  strokeBlades(d, blades.filter((b) => litOf(b[2]) >= 0.35 && litOf(b[2]) < 0.72), mid, 0.85, width);
  strokeBlades(d, blades.filter((b) => litOf(b[2]) >= 0.72), lit, 0.9, width * 0.9);
}

/** Pebbles or grit as one fill: [x, y, r] each. */
export function dots(d: Draw, colour: string, alpha: number, at: readonly (readonly [number, number, number])[]): void {
  const { ctx } = d.pen;
  ctx.save();
  ctx.fillStyle = rgba(colour, alpha);
  ctx.beginPath();
  for (const [x, y, r] of at) {
    ctx.moveTo(x + r, y);
    ctx.arc(x, y, r, 0, TAU);
  }
  ctx.fill();
  ctx.restore();
}

/**
 * The nests of the level being painted (the ground is painted first, so it
 * sets them): an acacia reaches its branches out to the nests hanging from it.
 */
let paintingNests: readonly Pt[] = [];
let paintingTrees: readonly Pt[] = [];
export function setPaintingNests(nests: readonly Pt[], trees: readonly Pt[]): void {
  paintingNests = nests;
  paintingTrees = trees;
}
/** The acacia a nest at p hangs from, if one is near. */
export function treeOf(p: Pt): Pt | undefined {
  let best: Pt | undefined;
  for (const t of paintingTrees) if (Math.hypot(t.x - p.x, t.y - p.y) < 110 && (!best || Math.hypot(t.x - p.x, t.y - p.y) < Math.hypot(best.x - p.x, best.y - p.y))) best = t;
  return best;
}
/** The nests within `reach` of an acacia at c. */
export function nestsNear(c: Pt, reach: number): Pt[] {
  return paintingNests.filter((n) => Math.hypot(n.x - c.x, n.y - c.y) < reach);
}
