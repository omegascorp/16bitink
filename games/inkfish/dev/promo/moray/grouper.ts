import { lerp, ramp, window01 } from '../short';
import { type Fish, FISH_AT, GULP_AT, MOST_AT, NARROW_AT, type Pt, PREY_AT, SO_AT, SUCK_AT, SUCK_S } from './story';

/** "…like most fish": a grouper, the classic suction feeder, sucks a chromis straight in, as functions of time. */

export const GROUPER_LEN = 330;
const GROUPER_HOME: Pt = { x: 810, y: 505 };
const GROUPER_IN = { from: SUCK_AT - 0.1, to: MOST_AT - 0.25 } as const;
const GROUPER_TURN = GULP_AT + 0.55;
const GROUPER_OUT = SO_AT + 1.5;

export function grouperAt(t: number): Fish & { readonly jaw: number; readonly lump: number } | null {
  if (t < GROUPER_IN.from || t > GROUPER_OUT) return null;
  const x = t < GROUPER_TURN ? lerp(1330, GROUPER_HOME.x, ramp(t, GROUPER_IN.from, GROUPER_IN.to)) : lerp(GROUPER_HOME.x, 1350, ramp(t, GROUPER_TURN + 0.2, GROUPER_OUT) ** 1.4);
  const face = -1 + 2 * ramp(t, GROUPER_TURN, GROUPER_TURN + 0.4);
  const jaw = t < GULP_AT ? ramp(t, GULP_AT - SUCK_S - 0.15, GULP_AT - SUCK_S) : 1 - ramp(t, GULP_AT, GULP_AT + 0.05);
  return {
    x,
    y: GROUPER_HOME.y + 6 * Math.sin(t * 1.9),
    len: GROUPER_LEN,
    face,
    tilt: 0,
    beat: t * 7,
    effort: 0.3 + 0.5 * (1 - window01(t, GROUPER_IN.to, GROUPER_TURN, 0.3)),
    ghost: 0,
    jaw,
    lump: t > GULP_AT ? 0.6 * (1 - ramp(t, GULP_AT + 0.3, GROUPER_OUT)) : 0,
  };
}

/** The grouper's chromis: it swims in under it and is sucked straight in on "most fish". */
export function snackAt(t: number): Fish | null {
  if (t < NARROW_AT || t >= GULP_AT) return null;
  const swim = ramp(t, NARROW_AT, SUCK_AT + 0.55);
  return { x: lerp(-90, 575, swim), y: 517 + 5 * Math.sin(t * 2.4), len: 115, face: 1, tilt: 0, beat: t * 12, effort: 0.4, ghost: 0 };
}

/** How far the snack has been dragged in, 0 .. 1 (null when it isn't being). */
export function snackEatenAt(t: number): number | null {
  const u = (t - (GULP_AT - SUCK_S)) / SUCK_S;
  return u >= 0 && u < 1 ? u : null;
}

/** Water rushing into the grouper's mouth, and the moray's feeble try. */
export const grouperPull = (t: number): number => window01(t, GULP_AT - SUCK_S - 0.25, GULP_AT, 0.12);
export const morayPull = (t: number): number => 0.9 * window01(t, SUCK_AT - 0.05, PREY_AT + 0.55, 0.15);

