import { createRng, type Rng } from '../../logic/rng';
import { BOARD, type LevelDef } from '../../level/types';
import { SHADOW } from '../groundKit';
import { cub, type Draw, pt, TAU } from '../kit';
import type { Pt } from '../pen';
import { noiseOf, resample, seedOf } from '../places/farmKit';
import { stripShape } from '../places/farmGroundParts';
import { mix, rgba } from '../wash';

/**
 * What the Pine Barrens' painters share: the place's colours (white-grey
 * sugar sand, rusty pitch-pine needles, reindeer lichen, plated bark, char
 * and ash), needles laid in thousands as batched strokes with their little
 * shadows, and where a fire level's burn lies (so the ground chars it and
 * the solid things standing in it are painted burnt).
 */
export const SAND = '#d9d0bb';
export const SAND_PALE = '#f1ece0';
export const SAND_BUFF = '#cdb894';
export const SAND_GREY = '#b9b4a8';
export const SAND_DEEP = '#9c8a6c';
export const DUFF = '#9a7656';
export const NEEDLE = '#a0603e';
export const NEEDLE_OLD = '#9a8874';
export const NEEDLE_DARK = '#6a3c24';
export const NEEDLE_LIT = '#c99c6e';
export const NEEDLE_GREEN = '#5d8640';
export const NEEDLE_GREEN_DEEP = '#2f5130';
export const NEEDLE_GREEN_LIT = '#a9c46c';
export const LICHEN = '#b3bf9f';
export const LICHEN_SHADE = '#8d9a80';
export const LICHEN_DEEP = '#66735f';
export const WINTERGREEN = '#335a3a';
export const WINTERGREEN_LIT = '#6f9a5e';
export const BERRY_RED = '#c3342a';
export const BRACKEN = '#7d9446';
export const BRACKEN_DEEP = '#455f2e';
export const BRACKEN_LIT = '#b9c77c';
export const BRACKEN_BRONZE = '#b5874a';
export const BLUESTEM = '#c08a4e';
export const BLUESTEM_DEEP = '#8a5a34';
export const BLUESTEM_LIT = '#e2bf86';
export const BARK = '#5e4233';
export const BARK_PLATE = '#8f6a52';
export const BARK_RED = '#a65f3c';
export const BARK_DARK = '#2f211b';
export const BARK_GREY = '#8d8580';
export const WOOD = '#dcc7a3';
export const WOOD_DEEP = '#a98b63';
export const WOOD_GREY = '#b7ae9e';
export const CONE = '#8c5a36';
export const CONE_DEEP = '#4a2e1e';
export const CONE_LIT = '#c99462';
export const CHAR = '#262220';
export const CHAR_SHEEN = '#55504b';
export const ASH = '#bab5ad';
export const ASH_PALE = '#e4e0d8';
export const MOSS = '#5d7f3a';
export const MOSS_LIT = '#9fb860';
/** Shadow thrown on the sand: a warm dark, so it reads as shade rather than blue light. */
export const SHADE = '#3a2c34';

export const W = BOARD.w;
export const H = BOARD.h;

/** A steady rng for a thing at x, y (the k-th painter of it). */
export const rngAt = (x: number, y: number, k = 0): Rng => createRng(Math.round(x * 131 + y * 71 + k * 977) + 5113);

/** One needle lying on the ground: where it starts, which way it points, its length and its bend. */
export type Needle = readonly [x: number, y: number, a: number, l: number, bend: number];

/** A pitch pine's fascicle as it falls: one to three needles from the same sheath, splayed a little. */
export function fascicle(x: number, y: number, a: number, l: number, rng: Rng): Needle[] {
  const n = rng() < 0.45 ? 1 : rng() < 0.5 ? 2 : 3;
  return Array.from({ length: n }, (_, i) => [x, y, a + (i - (n - 1) / 2) * (0.12 + rng() * 0.25), l * (0.85 + rng() * 0.25), (rng() - 0.5) * l * 0.18] as const);
}

function needlePath(ctx: CanvasRenderingContext2D, needles: readonly Needle[], dx: number, dy: number): void {
  ctx.beginPath();
  for (const [x, y, a, l, bend] of needles) {
    const c = Math.cos(a);
    const s = Math.sin(a);
    ctx.moveTo(x + dx, y + dy);
    ctx.quadraticCurveTo(x + dx + c * l * 0.5 - s * bend, y + dy + s * l * 0.5 + c * bend, x + dx + c * l, y + dy + s * l);
  }
}

/** Needles laid as one stroked path in one colour. */
export function strokeNeedles(d: Draw, needles: readonly Needle[], colour: string, alpha: number, width: number): void {
  if (!needles.length) return;
  const { ctx } = d.pen;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = rgba(colour, alpha);
  ctx.lineWidth = width;
  needlePath(ctx, needles, 0, 0);
  ctx.stroke();
  ctx.restore();
}

/** The little shadows the needles throw down-right onto the sand, all in one pass. */
export function needleShadows(d: Draw, needles: readonly Needle[], alpha: number, width: number, lift = 0.9): void {
  if (!needles.length) return;
  const { ctx } = d.pen;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = rgba(d.ink, alpha);
  ctx.lineWidth = width;
  needlePath(ctx, needles, SHADOW.x * lift, SHADOW.y * lift);
  ctx.stroke();
  ctx.restore();
}

/** A closed tapered blade (a needle, a grass blade) from a towards angle `ang`, `len` long, `w` wide at its root. */
export function blade(a: Pt, ang: number, len: number, w: number, bend = 0): Pt[] {
  const u = pt(Math.cos(ang), Math.sin(ang));
  const n = pt(-u.y, u.x);
  const at = (t: number, side: number): Pt => {
    const off = bend * Math.sin(Math.PI * t) + side * (w / 2) * (1 - t) ** 0.8;
    return pt(a.x + u.x * len * t + n.x * off, a.y + u.y * len * t + n.y * off);
  };
  const ts = [0, 0.2, 0.4, 0.6, 0.8, 1];
  return [...ts.map((t) => at(t, 1)), ...[...ts].reverse().slice(1).map((t) => at(t, -1))];
}

/** A colour picked between two by t, nudged a little at random. */
export const between = (a: string, b: string, t: number, rng: Rng, spread = 0.2): string => mix(a, b, Math.max(0, Math.min(1, t + (rng() - 0.5) * spread)));

// ---------------------------------------------------------------- the burn

/** A fire level's burnt ground: the charred area and, for a controlled burn, the raked firebreak that stopped it. */
export interface Burn {
  readonly shape: readonly Pt[];
  readonly firebreak?: readonly Pt[];
}

/** Whether x, y is inside a closed polygon (even-odd). */
export function inPoly(poly: readonly Pt[], x: number, y: number): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]!;
    const b = poly[j]!;
    if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/** The distance from x, y to a polyline. */
export function distToLine(line: readonly Pt[], x: number, y: number): number {
  let best = Infinity;
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1]!;
    const b = line[i]!;
    const ex = b.x - a.x;
    const ey = b.y - a.y;
    const l2 = ex * ex + ey * ey || 1;
    const t = Math.max(0, Math.min(1, ((x - a.x) * ex + (y - a.y) * ey) / l2));
    best = Math.min(best, Math.hypot(x - a.x - ex * t, y - a.y - ey * t));
  }
  return best;
}

/** How deep x, y lies in the burn, px: positive inside, negative outside (its distance from the edge). */
export function burnDepth(b: Burn | null, x: number, y: number): number {
  if (!b) return -Infinity;
  const dist = distToLine(b.shape, x, y);
  return inPoly(b.shape, x, y) ? dist : -dist;
}

/** A wildfire's track (barrens-6): a ragged band of char run diagonally across the right of the board. */
function wildfireBand(rng: Rng): Burn {
  const spine = resample(cub(pt(590, 620), pt(700, 400), pt(790, 230), pt(1010, 40), 60), 7);
  const n = noiseOf(rng, 50);
  const f = noiseOf(rng, 17);
  const width = (p: Pt, k: number): number => 64 + 22 * n(p.x + k, p.y) + 6 * f(p.x + k, p.y);
  const strip = stripShape(spine, (i) => width(spine[i]!, 0), (i) => width(spine[i]!, 400));
  return { shape: [...strip.shape, strip.shape[0]!] };
}

/** A controlled burn (barrens-8): everything right of a disked firebreak burnt, its edge licking up to the break. */
function controlledBurn(rng: Rng): Burn {
  const firebreak = resample(cub(pt(716, -30), pt(684, 150), pt(738, 380), pt(696, 580)), 6);
  const n = noiseOf(rng, 26);
  const edge = firebreak.map((p) => pt(p.x + 24 + 9 * Math.max(0, n(p.x, p.y)) + 3 * Math.sin(p.y * 0.21), p.y));
  const shape = [...edge, pt(W + 40, H + 40), pt(W + 40, -40)];
  return { shape: [...shape, shape[0]!], firebreak };
}

/** Where a level's burn lies, if it was burnt. */
export function burnOf(level: LevelDef): Burn | null {
  const rng = createRng(seedOf(level.id) ^ 0x5bd1e995);
  if (level.id === 'barrens-6') return wildfireBand(rng);
  if (level.id === 'barrens-8') return controlledBurn(rng);
  return null;
}

/**
 * The burn of the board being painted. A board is painted ground first, then
 * its solid things (textures.ts), so the ground leaves its burn here for the
 * solid things standing in it to char their bark.
 */
let painting: Burn | null = null;
export const setPaintingBurn = (b: Burn | null): void => {
  painting = b;
};
/** How deep x, y lies in the burn of the board being painted (see burnDepth). */
export const burntAt = (x: number, y: number): number => burnDepth(painting, x, y);

/** A soft irregular ring of radius r(a) round c, n points, closed. */
export function ringOf(c: Pt, n: number, r: (a: number) => number): Pt[] {
  const pts = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * TAU;
    const rr = r(a);
    return pt(c.x + Math.cos(a) * rr, c.y + Math.sin(a) * rr);
  });
  return pts;
}
