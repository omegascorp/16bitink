import { smooth } from '../short';
import { drawBars, drawCounter, drawNameCard, drawStamp, fadeIn, window01 } from './hud';
import { planOf } from './layout';
import type { SwallowPlan } from './scene';
import { STEPS, STEP_ORDER, type StepId } from './species';
import { sectionStart as s, T } from './timeline';

/**
 * The four swallows on the narration's clock: when each fish arrives, when
 * the meal goes in, when its bars and numbers land; and the counter that
 * climbs from step to step (50%+ → 66% → 100%+ → 450%).
 */

interface StepTimes {
  readonly plan: SwallowPlan;
  /** Name card and bars on, the bars compared (the number is said), the stamp, everything off. */
  readonly card: number;
  readonly bars: number;
  readonly compare: number;
  readonly stamp: number;
  readonly off: number;
  /** The counter climbs from the last step's figure to this one's over [climb, climb + climbS]. */
  readonly climb: number;
  readonly climbS: number;
  readonly eaterLabel: string;
  readonly mealLabel: string;
}

export const TIMES: Readonly<Record<StepId, StepTimes>> = {
  grouper: {
    plan: planOf('grouper', { enter: T.first - 0.5, mealEnter: T.reeling - 0.5, gulp: T.grouperSwallowed - 0.05, gulpS: 1.1, until: T.quick }),
    card: T.goliath, bars: T.reeling + 0.6, compare: T.half, stamp: T.atLeast, off: T.quick - 0.3, climb: T.grouperSwallowed, climbS: 1.2,
    eaterLabel: 'goliath grouper: up to 8 ft · 2.5 m', mealLabel: 'blacktip shark: about 4 ft · 1.2 m',
  },
  pike: {
    plan: planOf('pike', { enter: s(2) - 0.6, mealEnter: T.anotherPike - 1.3, gulp: T.pond, gulpS: 1.3, until: T.lionfish }),
    card: T.pike, bars: T.anotherPike, compare: T.twoThirds, stamp: T.twoThirds + 0.5, off: T.lionfish - 0.3, climb: T.twoThirds, climbS: 0.8,
    eaterLabel: 'young pike: 100%', mealLabel: 'its meal, another pike: 66% (on average)',
  },
  frogfish: {
    plan: planOf('frogfish', { enter: s(3) - 0.6, mealEnter: T.sits - 0.9, gulp: T.bam, gulpS: 0.3, until: T.soTheFish }),
    card: T.frogfish, bars: T.sits, compare: T.itself, stamp: T.bigger, off: T.soTheFish - 0.3, climb: T.itself, climbS: 0.8,
    eaterLabel: 'frogfish: 100%', mealLabel: 'its prey: as big as itself, even bigger',
  },
  swallower: {
    plan: planOf('swallower', { enter: s(4) - 0.5, mealEnter: T.mackerel - 0.4, gulp: T.fourHalf, gulpS: 2.4, until: T.fromJuly }),
    card: T.swallower, bars: T.mackerel, compare: T.fourHalf, stamp: T.folded, off: T.folded + 1.2, climb: T.fourHalf, climbS: 2.4,
    eaterLabel: 'black swallower: 7.5 in · 19 cm', mealLabel: 'snake mackerel: 34 in · 86 cm',
  },
};

/** The step on stage at t, or null (the cold open, the game card, the stops). */
export function stepAt(t: number): StepId | null {
  for (const id of [...STEP_ORDER].reverse()) {
    const p = TIMES[id].plan;
    if (t >= p.enter && t < p.until) return id;
  }
  return null;
}

/** The counter's value at t: each step's figure reached over its climb. */
export function counterAt(t: number): { readonly value: number; readonly suffix: string; readonly shake: number } {
  let value = 0;
  let suffix = '';
  let shake = 0;
  for (const id of STEP_ORDER) {
    const time = TIMES[id];
    if (t < time.climb) break;
    const k = smooth((t - time.climb) / time.climbS);
    value += (STEPS[id].pct - value) * k;
    suffix = STEPS[id].suffix;
    const land = t - time.climb - time.climbS;
    shake = land >= 0 && land < 0.4 ? 1 - land / 0.4 : 0;
  }
  return { value, suffix, shake };
}

/** How done each step is on the ladder strip (0 .. 1): on from its stamp. */
export const ladderDone = (id: StepId, t: number): number => fadeIn(t, TIMES[id].stamp, 0.4);

/** A step's readouts: the name card, the bars and the stamp. */
export function drawStepHud(ctx: CanvasRenderingContext2D, id: StepId, t: number, hud: number): void {
  const time = TIMES[id];
  const step = STEPS[id];
  const p = time.plan;
  const on = window01(t, time.card, time.off) * hud;
  drawNameCard(ctx, step.name, step.us, step.metric, on);
  const eater = { x0: p.at.x - p.eaterLen / 2, x1: p.at.x + p.eaterLen / 2 };
  const meal = { x0: eater.x1 + 50, x1: eater.x1 + 50 + p.mealLen };
  const bars = window01(t, time.bars, time.off) * hud;
  drawBars(ctx, { eater, meal, compare: smooth((t - time.compare) / 0.6), grow: smooth((t - time.bars) / 0.6) }, time.eaterLabel, time.mealLabel, bars);
  drawStamp(ctx, step.stamp, 1660, 360, 56, t, time.stamp, window01(t, time.stamp, time.off) * hud);
}

export function drawCounterAt(ctx: CanvasRenderingContext2D, t: number, alpha: number): void {
  const c = counterAt(t);
  drawCounter(ctx, c.value, c.suffix, alpha, c.shake);
}
