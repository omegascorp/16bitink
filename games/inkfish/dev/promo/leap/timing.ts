import { CATCH_AT, LOOP_S, MISS_AT } from './story';

/**
 * Hit-stop: the game-style slow motion on the snatch (and a lighter one on
 * the near miss). The beats in story.ts are written in story time; the video
 * plays real time. Real time spent per second of story is
 *
 *   dr/ds = 1 + sum_k b_k exp(-((s - at_k) / w_k)^2) - C,
 *
 * a narrow bump at each slowed moment, with C taking back exactly their
 * total over the loop, so the rest plays a touch faster than real time and
 * the loop keeps its length. Story time 0 is real time 0 and the warp
 * repeats every loop, so the first frame and the seam are unchanged.
 * (dev/promo/timing.ts does the same for the chain short.)
 */

interface Slow {
  /** Story time at the middle of the slowed stretch. */
  readonly at: number;
  /** Story speed there, as a fraction of real time. */
  readonly speed: number;
  /** Half-width of the slowed stretch, story seconds. */
  readonly width: number;
}

/** The snatch at ~0.35x for about half a second of real time; the miss a little slowed. */
export const SLOWS: readonly Slow[] = [
  { at: MISS_AT, speed: 0.6, width: 0.06 },
  { at: CATCH_AT + 0.03, speed: 0.35, width: 0.1 },
];

const SQRT_PI = Math.sqrt(Math.PI);
/** Each bump's area per unit height, story seconds. */
const areaOf = (s: Slow): number => s.width * SQRT_PI;
/** What the bumps take back everywhere, so the loop keeps its length: C = sum (1/speed - 1) area / (LOOP - sum area). */
const TAKE_BACK = SLOWS.reduce((sum, s) => sum + (1 / s.speed - 1) * areaOf(s), 0) / (LOOP_S - SLOWS.reduce((sum, s) => sum + areaOf(s), 0));
/** Bump heights: the peak of dr/ds is 1 / speed. */
const HEIGHTS = SLOWS.map((s) => 1 / s.speed - 1 + TAKE_BACK);

/** Abramowitz & Stegun 7.1.26: |error| < 1.5e-7, plenty for timing. */
function erf(x: number): number {
  const sign = Math.sign(x);
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const poly = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  return sign * (1 - poly * Math.exp(-x * x));
}

/** A bump's integral up to story time s, counting its copy in every loop. */
function bumpSum(slow: Slow, s: number): number {
  const n = Math.floor((s - slow.at) / LOOP_S + 0.5);
  const phase = s - slow.at - n * LOOP_S;
  return areaOf(slow) * (n + 0.5 * (1 + erf(phase / slow.width)));
}

const warp = (s: number): number => SLOWS.reduce((sum, slow, i) => sum + HEIGHTS[i]! * bumpSum(slow, s), 0) - TAKE_BACK * s;
const WARP_AT_0 = warp(0);

/** Real time at which story time reaches `story`. */
export function realAt(story: number): number {
  return story + warp(story) - WARP_AT_0;
}

/** Story time at real time `real` (the warp only ever moves forwards, so this is unique). */
export function storyAt(real: number): number {
  let lo = real - 1;
  let hi = real + 1;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (realAt(mid) < real) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}
