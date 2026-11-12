import type { SwallowPlan } from './scene';
import { STEPS, type StepId } from './species';

/**
 * Where each swallow sits on the 1920x1080 frame: eater and meal side by
 * side across ~1560 px, so the bigger of the two always fills the stage
 * (a 4.5x meal makes the swallower small, as it is).
 */

export const W = 1920;
export const H = 1080;
/** The fish's middle line, and where the length bars run under it. */
export const STAGE_Y = 580;
export const BARS_Y = 870;

const SPAN = 1560;
const LEFT = 150;

/** How much each belly swells (the game's drawing is one depth; these are by eye). */
const BELLY: Readonly<Record<StepId, SwallowPlan['belly']>> = {
  grouper: { size: 0.45, at: 0.5, width: 0.62 },
  pike: { size: 0.55, at: 0.45, width: 0.55 },
  frogfish: { size: 0.75, at: 0.5, width: 0.7 },
  swallower: { size: 1.9, at: 0.52, width: 0.6, round: 0.45 },
};

/** The longest each eater is drawn, px: the deep-bodied ones are capped so they clear the name card and the bars. */
const CAP: Readonly<Record<StepId, number>> = { grouper: 560, pike: 820, frogfish: 520, swallower: 400 };

/** The meal's drawn length over the eater's: the counter's figure (the frogfish's is "more than 100%"). */
const drawnRatio = (id: StepId): number => (id === 'frogfish' ? 1.12 : STEPS[id].pct / 100);

export interface Timing {
  readonly enter: number;
  readonly mealEnter?: number;
  readonly gulp: number;
  readonly gulpS: number;
  readonly until: number;
}

export function planOf(id: StepId, time: Timing): SwallowPlan {
  const step = STEPS[id];
  const r = drawnRatio(id);
  const eaterLen = Math.min(CAP[id], SPAN / (1.18 * (1 + r)));
  return {
    eater: step.eater,
    meal: step.meal,
    eaterLen,
    mealLen: eaterLen * r,
    at: { x: LEFT + eaterLen * 0.62, y: STAGE_Y },
    belly: BELLY[id],
    ...time,
  };
}
