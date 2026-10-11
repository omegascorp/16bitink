import { GULP_AGE } from './chain';

/**
 * Slow motion for the bites. Story time (the stage-time the chain and the
 * bite beats are written in) runs at about 0.4x around each gulp and a touch
 * faster than real time in between, averaging out to exactly one stage per
 * stage: the loop keeps its length, every gulp stays at the same moment,
 * and the warp repeats each stage, so the seam stays invisible.
 *
 * story(tau) = tau - SLOW * (B(tau) - MEAN * (tau - GULP_AGE + 0.5)),
 * where B integrates a narrow bump centred on each gulp.
 */

/** Half-width of the slowed stretch, in stages. */
const WIDTH = 0.07;
/** How much slower than real time the gulp itself plays (story speed there is about 1 - SLOW). */
const SLOW = 0.62;
/** The bump's area per stage. */
const MEAN = WIDTH * Math.sqrt(Math.PI);

/** Abramowitz & Stegun 7.1.26: |error| < 1.5e-7, plenty for timing. */
function erf(x: number): number {
  const sign = Math.sign(x);
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const poly = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  return sign * (1 - poly * Math.exp(-x * x));
}

/** Story time at real stage-time `tau`. */
export function storyTime(tau: number): number {
  const n = Math.floor(tau - GULP_AGE + 0.5);
  const phase = tau - GULP_AGE - n;
  const bumps = n * MEAN + (MEAN / 2) * (1 + erf(phase / WIDTH));
  return tau - SLOW * (bumps - MEAN * (tau - GULP_AGE + 0.5));
}

/** Real stage-time at which story time reaches `story` (the warp only ever moves forwards, so this is unique). */
export function realTime(story: number): number {
  let lo = story - 0.5;
  let hi = story + 0.5;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    if (storyTime(mid) < story) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}
