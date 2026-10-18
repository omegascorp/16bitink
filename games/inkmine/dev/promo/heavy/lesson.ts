import { clamp01, lerp, ramp, smooth, window01 } from '../short';
import {
  DOUBLE_AT, EIGHT_AT, FOUR_AT, GALILEO_AT, HEAVIER_AT, LEGS_AT, ONLY_AT, RULE_AT, SIZE_AT, STRONGER_AT, THIN_AT, wrap, YEAR_AT,
} from './story';

/**
 * The lesson in the middle (story.ts has the clock): Galileo's notebook
 * page, written and drawn by quill, then the block deer that doubles in size
 * and fills with eight blocks while its legs' cross-section holds only four.
 * Pure functions of time.
 */

// ---------------------------------------------------------------- Galileo's page

/** The page on screen, before its slide and tilt. */
export const PAGE = { x: 70, y: 300, w: 940, h: 790, tilt: -0.022 } as const;

/** The page slides up on "Galileo" and drops away on "double". */
export function pageSlide(t: number): number {
  const w = wrap(t);
  const inn = 1 - smooth(ramp(w, GALILEO_AT - 0.3, GALILEO_AT + 0.08));
  const out = ramp(w, DOUBLE_AT - 0.28, DOUBLE_AT + 0.02);
  return 1400 * inn * inn + 1400 * out * out;
}

export type Writing = 'name' | 'small' | 'big' | 'year' | 'book';
/** What the quill writes, in order: where (page px, from its top left, along a baseline) and when. */
export interface Stroke {
  readonly id: Writing;
  readonly from: number;
  readonly to: number;
  readonly x0: number;
  readonly x1: number;
  readonly y: number;
  /** How far the nib rides up and down the shape as it goes (bones), px. */
  readonly wave: number;
}
export const STROKES: readonly Stroke[] = [
  { id: 'name', from: GALILEO_AT - 0.04, to: GALILEO_AT + 0.48, x0: 92, x1: 430, y: 150, wave: 14 },
  { id: 'small', from: GALILEO_AT + 0.52, to: RULE_AT + 0.05, x0: 200, x1: 450, y: 335, wave: 20 },
  { id: 'big', from: RULE_AT + 0.08, to: YEAR_AT - 0.04, x0: 110, x1: 830, y: 565, wave: 80 },
  { id: 'year', from: YEAR_AT, to: YEAR_AT + 0.42, x0: 452, x1: 700, y: 150, wave: 12 },
  { id: 'book', from: YEAR_AT + 0.45, to: YEAR_AT + 0.8, x0: 470, x1: 860, y: 222, wave: 6 },
];
/** How much of a stroke is written, 0 .. 1 (linear: a hand at a steady pace). */
export function writtenAt(id: Writing, t: number): number {
  const s = STROKES.find((x) => x.id === id)!;
  return clamp01((wrap(t) - s.from) / (s.to - s.from));
}

/** The quill's nib on the page (page px), riding the stroke it's writing and hopping between them; null when it's away. */
export function quillAt(t: number): { readonly x: number; readonly y: number; readonly lift: number } | null {
  const w = wrap(t);
  const first = STROKES[0]!;
  const last = STROKES[STROKES.length - 1]!;
  if (w < first.from - 0.35 || w > last.to + 0.35) return null;
  const nib = (s: Stroke, u: number): { x: number; y: number } => ({ x: lerp(s.x0, s.x1, u), y: s.y + s.wave * 0.5 * Math.sin(u * Math.PI * 2 * Math.max(2, (s.x1 - s.x0) / 45)) });
  const active = STROKES.find((s) => w >= s.from && w <= s.to);
  if (active) return { ...nib(active, (w - active.from) / (active.to - active.from)), lift: 0 };
  // In from the right before the first stroke, off again after the last, hopping in between.
  if (w < first.from) return { ...nib(first, 0), lift: (first.from - w) / 0.35 };
  if (w > last.to) return { ...nib(last, 1), lift: (w - last.to) / 0.35 };
  const i = STROKES.findIndex((s) => s.from > w);
  const a = STROKES[i - 1]!;
  const b = STROKES[i]!;
  const u = smooth((w - a.to) / (b.from - a.to));
  const p = nib(a, 1);
  const q = nib(b, 0);
  return { x: lerp(p.x, q.x, u), y: lerp(p.y, q.y, u), lift: Math.sin(u * Math.PI) * 0.6 };
}

// ---------------------------------------------------------------- the block deer

/** The small block deer, the big one it doubles into, the ground, and a block's side on screen. */
export const BLOCKS = { small: 175, big: 765, ground: 1030, side: 92 } as const;

/** Doubling on "double … size": the copy grows out of the small one and steps right. */
export function growAt(t: number): number {
  return smooth(ramp(wrap(t), DOUBLE_AT, SIZE_AT + 0.05));
}
export function bigAt(t: number): { readonly x: number; readonly k: number } {
  const g = growAt(t);
  return { x: lerp(BLOCKS.small, BLOCKS.big, g), k: 1 + g };
}

/** The eight blocks that fill its body, bottom layer first, back before front: (col, row, depth) and when each lands. */
export const DROPS: readonly { readonly i: number; readonly j: number; readonly d: number; readonly at: number }[] = [
  [0, 0, 1], [1, 0, 1], [0, 0, 0], [1, 0, 0], [0, 1, 1], [1, 1, 1], [0, 1, 0], [1, 1, 0],
].map(([i, j, d], n) => ({ i: i!, j: j!, d: d!, at: EIGHT_AT - 0.14 + n * 0.1 }));
const DROP_S = 0.26;
/** How high above its place a block still is (px), or null before it starts to fall. */
export function dropAt(t: number, n: number): number | null {
  const w = wrap(t);
  const at = DROPS[n]!.at;
  if (w < at - DROP_S) return null;
  const u = clamp01((at - w) / DROP_S);
  return 900 * u * u;
}
/** The big deer's legs squashing a little as each block lands. */
export function squashAt(t: number): number {
  const w = wrap(t);
  return DROPS.reduce((s, d) => {
    const dt = w - d.at;
    return dt < 0 || dt > 0.35 ? s : s + 0.05 * Math.sin((dt / 0.35) * Math.PI) * Math.exp(-dt / 0.12);
  }, 0);
}

const END = THIN_AT - 0.12;
export const twoMark = (t: number): number => window01(wrap(t), SIZE_AT - 0.12, EIGHT_AT - 0.15, 0.15);
export const eightPop = (t: number): number => (wrap(t) - (HEAVIER_AT - 0.06)) / 0.3;
export const eightMark = (t: number): number => window01(wrap(t), HEAVIER_AT - 0.06, END, 0.12);
/** The legs lit with the highlighter on "legs", and their cross-sections drawn out beside them. */
export const legsLit = (t: number): number => window01(wrap(t), LEGS_AT - 0.06, END, 0.15);
export const tilesAt = (t: number): number => window01(wrap(t), LEGS_AT + 0.02, END, 0.25);
/** Each square of the cross-sections filled in: the small leg's one, then the big leg's four, counted on "only FOUR". */
export const SMALL_CELL_AT = LEGS_AT + 0.3;
export const CELLS_AT: readonly number[] = [0, 1, 2, 3].map((k) => ONLY_AT - 0.02 + k * 0.1);
export const cellAt = (t: number, k: number): number => ramp(wrap(t), CELLS_AT[k]!, CELLS_AT[k]! + 0.08);
export const smallCellAt = (t: number): number => ramp(wrap(t), SMALL_CELL_AT, SMALL_CELL_AT + 0.08);
export const fourPop = (t: number): number => (wrap(t) - (FOUR_AT + 0.1)) / 0.3;
export const fourMark = (t: number): number => window01(wrap(t), FOUR_AT + 0.1, END, 0.12);
/** Its legs tremble under eight times the weight from "stronger", and a "?!" pops over it. */
export const trembleAt = (t: number): number => window01(wrap(t), STRONGER_AT - 0.25, END, 0.25);
export const puzzledPop = (t: number): number => (wrap(t) - (STRONGER_AT + 0.05)) / 0.3;
export const puzzledMark = (t: number): number => window01(wrap(t), STRONGER_AT + 0.05, END, 0.12);
