import { createRng } from '../../../src/logic/rng';
import { mouthOf } from '../chain';
import { lerp, ramp, window01 } from '../short';
import { type Fish, screenPoseOf } from './fish';
import {
  EIGHTY_AT, FIVE_AT, LAST_GULP, lionfishAt, type LionfishMeals, SMALL_AT, SWEEP_FROM, TURN1_AT, TURN_S, WEEKS_AT, YOUNG_AT, ONE_AT,
} from './story';

/**
 * The experiment, as the narrator tells it: "On a small reef, one lionfish
 * cut the young fish by nearly EIGHTY percent in five weeks." A school of
 * young chromis gathers over the reef; the lionfish sweeps through it,
 * gulping eleven of the fourteen (79%) while a calendar flips through five
 * weeks; the three left hide in the coral.
 *
 * Each eaten fish waits exactly where the lionfish's mouth will be when it
 * gulps it, so the sweep (story.ts) decides where the school is.
 */

export const SCHOOL_SIZE = 14;
/** Four on the way left, seven on the way back right; the last just before "EIGHTY". */
export const GULPS: readonly number[] = [
  ...Array.from({ length: 4 }, (_, i) => lerp(SWEEP_FROM + 0.32, TURN1_AT - 0.08, i / 3)),
  ...Array.from({ length: 7 }, (_, i) => lerp(TURN1_AT + TURN_S + 0.12, LAST_GULP, i / 6)),
];
export const EATEN = GULPS.length;
export const MEALS: LionfishMeals = { gulps: GULPS };

/** Each is dragged into the mouth over this long before its gulp. */
export const SUCK_S = 0.13;
export const YOUNG_LEN = 84;

/** The school drifts up out of the coral as the narrator says "small reef". */
const ARRIVE_AT = SMALL_AT - 0.3;
/** The survivors duck into the coral after the last gulp, and are gone before "Its spines". */
const HIDE_AT = LAST_GULP + 0.25;
const GONE_AT = WEEKS_AT + 0.55;

const SURVIVORS: readonly { readonly x: number; readonly y: number; readonly face: number }[] = [
  { x: 430, y: 975, face: 1 },
  { x: 575, y: 940, face: -1 },
  { x: 700, y: 985, face: -1 },
];

interface Young {
  readonly x: number;
  readonly y: number;
  readonly face: number;
  /** When it's gulped (null: it survives). */
  readonly gulp: number | null;
  readonly phase: number;
}

export const YOUNG: readonly Young[] = (() => {
  const rng = createRng(1985);
  const eaten = GULPS.map((g): Young => {
    const lion = lionfishAt(g, MEALS);
    const m = mouthOf(screenPoseOf('lionfish', lion));
    const dir = lion.face < 0 ? -1 : 1;
    return { x: m.x + dir * 40, y: m.y + (rng() - 0.5) * 70, face: rng() < 0.6 ? -dir : dir, gulp: g, phase: rng() * Math.PI * 2 };
  });
  const safe = SURVIVORS.map((s): Young => ({ ...s, gulp: null, phase: rng() * Math.PI * 2 }));
  return [...eaten, ...safe];
})();

/** Young fish i before it's eaten or hidden (null when it isn't there); while it's being sucked in it's held where it was. */
export function youngAt(i: number, t: number): Fish | null {
  const y = YOUNG[i]!;
  if (t < ARRIVE_AT || t >= GONE_AT || (y.gulp !== null && t >= y.gulp)) return null;
  const at = y.gulp !== null ? Math.min(t, y.gulp - SUCK_S) : t;
  const rise = 1 - ramp(at, ARRIVE_AT + i * 0.025, ARRIVE_AT + 0.5 + i * 0.025);
  const hide = y.gulp === null ? ramp(at, HIDE_AT, HIDE_AT + 0.5) : 0;
  return {
    x: y.x + 8 * Math.sin(at * 2.4 + y.phase),
    y: y.y + 90 * rise + 6 * Math.sin(at * 3.1 + y.phase) + 45 * hide,
    len: YOUNG_LEN,
    face: y.face,
    tilt: 0.06 * Math.sin(at * 2 + y.phase),
    beat: at * 13 + y.phase,
    effort: 0.35 + 0.4 * (rise + hide),
    jaw: 0,
    lump: 0,
    alpha: (1 - rise) * (1 - 0.55 * hide) * (1 - ramp(t, GONE_AT - 0.4, GONE_AT)),
  };
}

/** How far young fish i has been dragged into the lionfish's mouth, 0 .. 1 (null when it isn't). */
export function youngEatenAt(i: number, t: number): number | null {
  const g = YOUNG[i]!.gulp;
  if (g === null) return null;
  const u = (t - (g - SUCK_S)) / SUCK_S;
  return u >= 0 && u < 1 ? u : null;
}

/** How many have been eaten by t. */
export const eatenBy = (t: number): number => GULPS.filter((g) => t >= g).length;

// ---------------------------------------------------------------- the readouts

/** The counter and calendar are up from the sweep until the survivors are gone. */
export const readoutAt = (t: number): number => window01(t, SWEEP_FROM + 0.15, GONE_AT, 0.25);

/** "−36%": how much of the school is gone. */
export const percentAt = (t: number): number => Math.round((100 * eatenBy(t)) / SCHOOL_SIZE);

/** The final number stamped on "EIGHTY", 0 .. 1 over its pop (then held). */
export const stampAt = (t: number): number => ramp(t, EIGHTY_AT - 0.03, EIGHTY_AT + 0.22);

/** The week on the calendar: one through five over the sweep. */
export function weekAt(t: number): number {
  const u = (t - SWEEP_FROM - 0.15) / (LAST_GULP - SWEEP_FROM - 0.15);
  return Math.max(1, Math.min(5, 1 + Math.floor(u * 5)));
}

/** "5 weeks", circled on "five weeks". */
export const fiveWeeksAt = (t: number): number => ramp(t, FIVE_AT - 0.05, FIVE_AT + 0.35);

/** "1 lionfish" over it as the narrator says "one lionfish". */
export const oneLabel = (t: number): number => window01(t, ONE_AT - 0.05, TURN1_AT, 0.2);
/** "small reef, Bahamas" and a dashed ring round the patch reef, from "small reef". */
export const reefLabel = (t: number): number => window01(t, SMALL_AT - 0.05, GONE_AT, 0.25);

/** A jolt of the picture as the number hits −79%, px. */
export function shakeAt(t: number): { readonly x: number; readonly y: number } {
  const u = t - EIGHTY_AT;
  if (u < 0 || u > 0.35) return { x: 0, y: 0 };
  const fade = (1 - u / 0.35) ** 2;
  return { x: 14 * fade * Math.sin(u * 90), y: 9 * fade * Math.cos(u * 73) };
}
