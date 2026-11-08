import { clamp01, smooth } from '../short';
import type { PyramidState } from './hud';
import { T } from './timeline';

/** The food pyramid in the top right corner during the climb, and the puffs of smoke as each band draws in. */

/** The food pyramid in the corner during the climb: a band per step, each drawn in on the line that names it. */
export function cornerPyramid(t: number): PyramidState {
  const at = [T.hundred, T.downToTen, T.onePercent, T.tenthPercent, T.hundredth, T.orcaName + 1.2];
  const bands = at.reduce((n, a) => n + clamp01((t - a) / 0.6), 0);
  return { bands, x: 1920 - 250, baseY: 380, base: 330, alpha: smooth((t - T.hundred + 0.3) / 0.4), ghost: 0, arrows: 0, names: 0 };
}

/** When each band past the first draws in: the 90% that's lost curls off the band under it. */
export const SMOKE_AT = [T.burns, T.onePercent, T.tenthPercent, T.hundredth, T.orcaName + 1.2];

