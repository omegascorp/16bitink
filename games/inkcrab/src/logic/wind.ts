import type { Box } from './body';
import { FOG } from './fog';
import { surfaceRow, type Terrain } from './terrain';

/**
 * Wind gusts (Frost Shingle, beach 9): a steady rhythm of calm spells and
 * gusts, never a deadline. Each cycle is calm, then a gust gets up (the
 * warning: spindrift starts to stream), blows for `gust` seconds and dies
 * away at the end. A gust shoves a crab out in the open along the way it
 * blows: a light shell most, a heavy one hardly at all, and further in
 * the air (a jump with the wind behind it carries a long way) and on ice.
 * In the lee of a bank or a boulder, or down in the sand, there's no wind.
 * Hidden in its shell a crab clamps down, except on ice. In a gust no bird
 * can hold a hover, food blown along the beach comes to rest in the lee,
 * and what hunts by smell smells you from far downwind, but not upwind.
 */
export interface WindSpec {
  /** Seconds from the start of one gust to the start of the next. */
  readonly period: number;
  /** Seconds each gust blows, at the end of its cycle. */
  readonly gust: number;
  /** The way the (first) gust blows: 1 towards the right, -1 towards the left (default 1). */
  readonly dir?: 1 | -1;
  /** Each gust blows the other way from the last (a storm's wind going round). */
  readonly turns?: boolean;
  /** Seconds into the rhythm at the start (default 0: a whole calm spell first). */
  readonly offset?: number;
}

export const WIND = {
  /** Seconds a gust gets up before it blows: the warning. */
  build: 2,
  /** Seconds at the end of a gust over which it dies away (it still blows). */
  ease: 1.5,
  /** px/s a full gust shoves a crab in the lightest shell along the ground. */
  push: 50,
  /** In the air it's shoved this much more: nothing to hold on to. */
  air: 1.6,
  /** On ice, this much more again: nothing to grip. */
  ice: 1.8,
  /** Out of a shell, a crab is shoved this much. */
  naked: 1.2,
  /** Tiles upwind a bank, a boulder or a step that stands over the crab's middle keeps the wind off it. */
  lee: 4,
  /** From this strong a gust counts as blowing (birds can't hover, scent carries). */
  strong: 0.5,
  /** Food the beach restocks comes this much more often in a gust (it's blown in), and settles in the lee. */
  foodEvery: 0.4,
  /** Downwind, a hunter by smell notices a crab this much further than it would in still air. */
  scent: 1.5,
} as const;

/** How hard a gust shoves each weight of shell (1 light … 3 heavy). */
const BY_WEIGHT = { 1: 1, 2: 0.6, 3: 0.35 } as const;

/** Seconds into the current cycle, and which cycle it is. */
function cycle(spec: WindSpec, time: number): { t: number; n: number } {
  const at = time + (spec.offset ?? 0);
  const n = Math.floor(at / spec.period);
  return { t: at - n * spec.period, n };
}

/** The way the gust of cycle `n` blows. */
function dirOf(spec: WindSpec, n: number): 1 | -1 {
  const first = spec.dir ?? 1;
  return spec.turns && n % 2 !== 0 ? (first === 1 ? -1 : 1) : first;
}

/**
 * The wind now, signed by the way it blows: 0 calm … ±1 a full gust,
 * getting up before it blows and dying away at the end.
 */
export function windAt(spec: WindSpec | undefined, time: number): number {
  if (!spec) return 0;
  const { t, n } = cycle(spec, time);
  const calm = spec.period - spec.gust;
  let strength: number;
  if (t >= spec.period - WIND.ease) strength = (spec.period - t) / WIND.ease;
  else if (t >= calm) strength = 1;
  else {
    const u = (t - (calm - WIND.build)) / WIND.build;
    strength = u <= 0 ? 0 : u * u * (3 - 2 * u);
  }
  // The gust getting up already blows the way the coming one will.
  const coming = t >= calm - WIND.build ? n : n - 1;
  return strength * dirOf(spec, coming);
}

/** Whether a gust is blowing hard now. */
export function isGusting(spec: WindSpec | undefined, time: number): boolean {
  return Math.abs(windAt(spec, time)) >= WIND.strong;
}

/** Gusting or calm, the way the (next) gust blows, and seconds until that changes: for the wind clock. */
export function windTurn(spec: WindSpec, time: number): { readonly gusting: boolean; readonly dir: 1 | -1; readonly seconds: number } {
  const { t, n } = cycle(spec, time);
  const gusting = t >= spec.period - spec.gust;
  return { gusting, dir: dirOf(spec, n), seconds: (gusting ? spec.period : spec.period - spec.gust) - t };
}

/**
 * Whether something upwind keeps the wind off a body: within WIND.lee
 * tiles the way the wind comes from, ground (a bank, a boulder, a step,
 * the end of the beach) stands up past the body's middle.
 */
export function inLee(t: Terrain, b: Box, from: 1 | -1, tile: number): boolean {
  const mid = b.y + b.h / 2;
  const edge = from > 0 ? b.x + b.w : b.x;
  const first = Math.floor((edge + (from > 0 ? 0.001 : -0.001)) / tile);
  for (let k = 0; k < WIND.lee; k++) {
    const x = first + from * k;
    if (x < 0 || x >= t.width) return true;
    if (surfaceRow(t, x) * tile <= mid) return true;
  }
  return false;
}

/** How hard a gust shoves a crab in a shell of this weight (or none), as a share of WIND.push. */
export function windShare(weight: 1 | 2 | 3 | null): number {
  return weight === null ? WIND.naked : BY_WEIGHT[weight];
}

/**
 * How far (tiles) a hunter by smell with `sight` notices a crab in wind
 * `wind` (signed, see windAt): in a gust, far further downwind of it, and
 * only right up close (as in thick fog) upwind of it.
 */
export function scentRange(sight: number, wind: number, hunterX: number, crabX: number): number {
  if (Math.abs(wind) < WIND.strong || hunterX === crabX) return sight;
  const downwind = Math.sign(hunterX - crabX) === Math.sign(wind);
  return downwind ? sight * WIND.scent : Math.min(sight, FOG.near);
}
