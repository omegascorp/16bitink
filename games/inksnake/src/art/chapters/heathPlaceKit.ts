import { createRng, type Rng } from '../../logic/rng';
import { BOARD, type LevelDef } from '../../level/types';
import { SHADOW } from '../groundKit';
import { type Draw, pt, TAU } from '../kit';
import type { Pt } from '../pen';
import { mix, rgba } from '../wash';

/**
 * What the Heath's painters share: the place's colours (pale podzol sand,
 * black peat, ling heather in its greens, bronzes and purples, gorse,
 * bracken, birch, granite), a steady rng for a thing, how each level's
 * heath looks (the season and where its sandy path runs), and marks laid in
 * thousands as batched strokes with their little shadows.
 */
export const SAND = '#d9ceb2';
export const SAND_PALE = '#efe8d6';
export const SAND_GREY = '#b9b2a2';
export const SAND_BUFF = '#cdb48c';
export const SAND_DEEP = '#9a8566';
export const PEAT = '#5b4636';
export const PEAT_DARK = '#33261e';
export const LING = '#5d6a3e';
export const LING_DEEP = '#33402a';
export const LING_LIT = '#9aa665';
export const LING_BRONZE = '#8d6a46';
export const LING_RUST = '#a5754e';
export const BLOOM = '#a55a93';
export const BLOOM_LIT = '#d58fc0';
export const BLOOM_DEEP = '#6f3466';
export const GORSE = '#4a6232';
export const GORSE_DEEP = '#23331f';
export const GORSE_LIT = '#8aa458';
export const GORSE_FLOWER = '#f2c230';
export const GORSE_FLOWER_DEEP = '#d48a1e';
export const GORSE_FLOWER_LIT = '#fbe58a';
export const BRACKEN = '#7f9a48';
export const BRACKEN_DEEP = '#46602e';
export const BRACKEN_LIT = '#bccb7e';
export const BRACKEN_DEAD = '#a8693a';
export const BRACKEN_DEAD_LIT = '#d09a62';
export const GRASS = '#a7a46a';
export const GRASS_DEEP = '#6e7044';
export const GRASS_LIT = '#d5d095';
export const LICHEN = '#b8c0a4';
export const LICHEN_DEEP = '#7c8770';
export const LICHEN_YELLOW = '#d3b85a';
export const MOSS = '#6f8a3c';
export const MOSS_LIT = '#a8bc62';
export const SPHAGNUM = '#9cab4c';
export const SPHAGNUM_RED = '#a8503e';
export const BIRCH_LEAF = '#7d9c46';
export const BIRCH_LEAF_LIT = '#c1cf6e';
export const BIRCH_YELLOW = '#d6b24c';
export const GRANITE = '#aaa69d';
export const GRANITE_LIT = '#dad6cb';
export const GRANITE_DEEP = '#6d6a65';
export const FELDSPAR = '#c9a296';
export const STONE = '#a29d90';
export const STONE_LIT = '#d4cfc2';
export const STONE_DEEP = '#625d55';
export const WATER = '#2c261f';
export const WATER_SKY = '#9fadb5';
export const SPOIL = '#c59a68';
export const SPOIL_DEEP = '#8c6440';
/** Shadow thrown on the ground: a warm dark, so it reads as shade rather than blue light. */
export const SHADE = '#33282e';

export const W = BOARD.w;
export const H = BOARD.h;

/** A steady rng for a thing at x, y (the k-th painter of it). */
export const rngAt = (x: number, y: number, k = 0): Rng => createRng(Math.round(x * 137 + y * 67 + k * 991) + 8117);

/** How a level's heath looks. */
export interface Look {
  /** Ling in flower (late summer): purple through it; else last year's rusty flower heads. */
  readonly bloom: number;
  /** Where its sandy path runs: control points across the board, or none. */
  readonly path?: readonly Pt[];
  /** New green bracken (summer) or last year's dead brown fronds (spring). */
  readonly green: number;
  /** Birch scrub at these corners of the board (0: top left, clockwise). */
  readonly birch: readonly number[];
}

const P = (...xy: number[]): Pt[] => Array.from({ length: xy.length / 2 }, (_, i) => pt(xy[i * 2]!, xy[i * 2 + 1]!));

const LOOKS: Readonly<Record<string, Look>> = {
  'heath-1': { bloom: 0, green: 0.1, birch: [1], path: P(-20, 200, 260, 200, 520, 300, 980, 260) },
  'heath-2': { bloom: 0, green: 0.3, birch: [3], path: P(300, -20, 380, 280, 300, 560) },
  'heath-3': { bloom: 0.1, green: 0.5, birch: [1, 3], path: P(-20, 330, 380, 300, 640, 220, 980, 300) },
  'heath-4': { bloom: 0.2, green: 0.7, birch: [0], path: P(-20, 200, 300, 220, 460, 380, 620, 560) },
  'heath-5': { bloom: 0.9, green: 0.9, birch: [2] },
  'heath-6': { bloom: 1, green: 1, birch: [1], path: P(-20, 300, 360, 320, 640, 200, 980, 230) },
  'heath-7': { bloom: 1, green: 0.9, birch: [3], path: P(-20, 300, 240, 330, 420, 280, 680, 330, 980, 380) },
  'heath-8': { bloom: 0.8, green: 0.8, birch: [0, 2], path: P(-20, 270, 300, 300, 420, 230, 520, -20) },
  'heath-9': { bloom: 0.6, green: 0.6, birch: [1], path: P(-20, 300, 360, 280, 620, 320, 980, 280) },
  'heath-10': { bloom: 0.4, green: 0.4, birch: [3], path: P(-20, 240, 260, 260, 480, 330, 980, 300) },
};

export const lookOf = (level: LevelDef): Look => LOOKS[level.id] ?? { bloom: 0.5, green: 0.5, birch: [1] };

/** A short mark: from x, y towards angle a, `l` long, bent by `bend`. */
export type Mark = readonly [x: number, y: number, a: number, l: number, bend: number];

function markPath(ctx: CanvasRenderingContext2D, marks: readonly Mark[], dx: number, dy: number): void {
  ctx.beginPath();
  for (const [x, y, a, l, bend] of marks) {
    const c = Math.cos(a);
    const s = Math.sin(a);
    ctx.moveTo(x + dx, y + dy);
    ctx.quadraticCurveTo(x + dx + c * l * 0.5 - s * bend, y + dy + s * l * 0.5 + c * bend, x + dx + c * l, y + dy + s * l);
  }
}

/** Marks laid as one stroked path in one colour. */
export function strokeMarks(d: Draw, marks: readonly Mark[], colour: string, alpha: number, width: number): void {
  if (!marks.length) return;
  const { ctx } = d.pen;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = rgba(colour, alpha);
  ctx.lineWidth = width;
  markPath(ctx, marks, 0, 0);
  ctx.stroke();
  ctx.restore();
}

/** The little shadows marks throw down-right, all in one pass. */
export function markShadows(d: Draw, marks: readonly Mark[], alpha: number, width: number, lift = 0.9): void {
  if (!marks.length) return;
  const { ctx } = d.pen;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = rgba(d.ink, alpha);
  ctx.lineWidth = width;
  markPath(ctx, marks, SHADOW.x * lift, SHADOW.y * lift);
  ctx.stroke();
  ctx.restore();
}

/** Dots laid as one filled path in one colour: [x, y, r]. */
export function dots(d: Draw, at: readonly (readonly [number, number, number])[], colour: string, alpha: number): void {
  if (!at.length) return;
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
 * A ling sprig from above, as marks: a short woody stem with its tiny
 * scale leaves packed along it in little strokes either side, and (in
 * flower) a spike of florets at its tip. Pushes into `stems`, `leaves`
 * and `flowers`.
 */
export function sprig(x: number, y: number, a: number, l: number, rng: Rng, stems: Mark[], leaves: Mark[], flowers: Mark[] | null): void {
  stems.push([x, y, a, l, (rng() - 0.5) * l * 0.3]);
  const n = Math.max(2, Math.round(l / 1.6));
  for (let i = 1; i <= n; i++) {
    const t = i / (n + 1);
    const px = x + Math.cos(a) * l * t;
    const py = y + Math.sin(a) * l * t;
    for (const s of [-1, 1]) leaves.push([px, py, a + s * (0.7 + rng() * 0.5), 1 + rng() * 1.1, 0]);
  }
  if (flowers) {
    const tx = x + Math.cos(a) * l;
    const ty = y + Math.sin(a) * l;
    for (let i = 0; i < 3; i++) flowers.push([tx + Math.cos(a) * i * 0.9, ty + Math.sin(a) * i * 0.9, a + (rng() - 0.5) * 2, 0.9 + rng() * 0.6, 0]);
  }
}

/** A colour picked between two by t, nudged a little at random. */
export const between = (a: string, b: string, t: number, rng: Rng, spread = 0.2): string => mix(a, b, Math.max(0, Math.min(1, t + (rng() - 0.5) * spread)));

/**
 * The bloom of the board being painted. A board's ground is painted before
 * its cover (textures.ts), so the ground leaves its season here for the
 * heather bushes to flower with it.
 */
let bloomNow = 0.5;
export const setPaintingBloom = (b: number): void => {
  bloomNow = b;
};
export const paintingBloom = (): number => bloomNow;
