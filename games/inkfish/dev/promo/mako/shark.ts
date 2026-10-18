import { curveAt, type Key, ramp } from '../short';
import {
  BOAT2_AT, CRASH_HOOK, CRASH_2013, CUT_AT, FASTEST_AT, HOOKED_AT, LEAP_AT, LOOP_S, ONE_AT, REMEMBER_AT, take, WATER_AT,
} from './beats';

/**
 * The mako's path through the one long take (beats.ts): keys in take time,
 * world px with the sea's surface at y 0 (up is negative) and the boat's
 * middle at x 0, bow to the left. Its body is SHARK_LEN long.
 *
 *   7.7   under the 2013 boat, the line from the rod in its mouth; jerked on
 *         "hooked", diving on "one…"
 *  11.0   out of the water left of the bow, up, over, and down on the bow on "boat!"
 *  12.1   flopping on the foredeck ("Great fishing trip.")
 *  13.5   flips round, slides head first off the bow, splash
 *  14.2   U-turns under the splash and leaps out again on "remember:"
 *  15.0   = 0, the opening frame: hanging high over the boat, jaws wide,
 *         tipping down at the bow; it drops on "INTO your boat!" and crashes on "boat!"
 *  16.7   flips, slides off the bow, dives, and streaks away left under the
 *         sea ("the fastest shark"), bursting forwards on "fastest"
 *  20.2   bursts out of the water on "leap", up 6 m, falls back on "water."
 */
export const SHARK_LEN = 560;
/** World px per metre: the shark is a 2.4 m mako. */
export const PX_PER_M = SHARK_LEN / 2.4;
/** The leap on "SIX metres": the top of its arc, 6 m above the sea. */
export const SIX_M_Y = -6 * PX_PER_M;

/** When it leaves the water and lands, take time. */
export const EXIT_2013 = 10.98;
export const EXIT_HOOK = REMEMBER_AT;
/** When it slides off the bow and hits the water. */
export const SLIDE_1 = { turn: 13.38, off: 13.68, splash: 13.94 } as const;
export const SLIDE_2 = { turn: CRASH_HOOK + 0.2, off: CRASH_HOOK + 0.48, splash: CRASH_HOOK + 0.74 } as const;
/** The 6 m leap: out on "leap", top of the arc, back in on "water.". */
export const BURST = LEAP_AT + LOOP_S;
export const APEX_6M = BURST + 0.84;
export const FALLBACK = WATER_AT + LOOP_S;
/** Where it lies on the foredeck, in the boat's own frame. */
export const ON_DECK = { x: -150, y: -118 } as const;

const END = CUT_AT + LOOP_S;
const FAST = FASTEST_AT + LOOP_S;

const X_KEYS: readonly Key[] = [
  { t: CUT_AT, at: -390, rate: 0 },
  { t: 9.3, at: -370 },
  { t: HOOKED_AT, at: -350, rate: 0 },
  { t: ONE_AT + 0.1, at: -380 },
  { t: 10.75, at: -430, rate: 0 },
  { t: EXIT_2013, at: -470, rate: 120 },
  { t: 11.5, at: -380 },
  { t: 11.8, at: -290 },
  { t: CRASH_2013, at: ON_DECK.x, rate: 260 },
  { t: CRASH_2013 + 0.12, at: ON_DECK.x, rate: 0 },
  { t: SLIDE_1.off, at: ON_DECK.x - 10, rate: 0 },
  { t: SLIDE_1.splash, at: -600, rate: -1000 },
  { t: 14.06, at: -680, rate: 0 },
  { t: EXIT_HOOK, at: -600, rate: 300 },
  { t: 14.7, at: -340 },
  { t: LOOP_S, at: -235, rate: 130 },
  { t: LOOP_S + 0.8, at: -185 },
  { t: CRASH_HOOK, at: ON_DECK.x, rate: 230 },
  { t: CRASH_HOOK + 0.12, at: ON_DECK.x, rate: 0 },
  { t: SLIDE_2.off, at: ON_DECK.x - 10, rate: 0 },
  { t: SLIDE_2.splash, at: -600, rate: -1000 },
  { t: 18.0, at: -850 },
  { t: FAST, at: -1120 },
  { t: FAST + 0.6, at: -1700 },
  { t: 19.6, at: -2000 },
  { t: BURST, at: -2140, rate: -260 },
  { t: APEX_6M, at: -2330, rate: -160 },
  { t: FALLBACK, at: -2500, rate: -150 },
  { t: END, at: -2580, rate: -100 },
];

const Y_KEYS: readonly Key[] = [
  { t: CUT_AT, at: 250, rate: 0 },
  { t: 9.3, at: 235 },
  { t: HOOKED_AT, at: 225, rate: 0 },
  { t: ONE_AT + 0.1, at: 270, rate: 0 },
  { t: 10.75, at: 220, rate: -900 },
  { t: EXIT_2013, at: 0, rate: -1500 },
  { t: 11.5, at: -420, rate: 0 },
  { t: 11.8, at: -360 },
  { t: CRASH_2013, at: ON_DECK.y, rate: 900 },
  { t: CRASH_2013 + 0.12, at: ON_DECK.y, rate: 0 },
  { t: SLIDE_1.off, at: ON_DECK.y - 20, rate: 0 },
  { t: SLIDE_1.splash, at: 10, rate: 900 },
  { t: 14.06, at: 130, rate: 0 },
  { t: EXIT_HOOK, at: 0, rate: -1700 },
  { t: 14.7, at: -480 },
  { t: LOOP_S, at: -540, rate: -20 },
  { t: LOOP_S + 0.8, at: -480 },
  { t: CRASH_HOOK, at: ON_DECK.y, rate: 950 },
  { t: CRASH_HOOK + 0.12, at: ON_DECK.y, rate: 0 },
  { t: SLIDE_2.off, at: ON_DECK.y - 20, rate: 0 },
  { t: SLIDE_2.splash, at: 10, rate: 900 },
  { t: 18.0, at: 300, rate: 0 },
  { t: FAST, at: 330, rate: 0 },
  { t: 19.6, at: 300, rate: -300 },
  { t: BURST, at: 0, rate: -2500 },
  { t: APEX_6M, at: SIX_M_Y, rate: 0 },
  { t: FALLBACK, at: 0, rate: 1900 },
  { t: END, at: 280, rate: 150 },
];

/** Nose up, radians, whichever way it faces. */
const TILT_KEYS: readonly Key[] = [
  { t: CUT_AT, at: 0.05, rate: 0 },
  { t: HOOKED_AT, at: 0, rate: 0 },
  { t: ONE_AT + 0.1, at: -0.15, rate: 0 },
  { t: 10.75, at: 0.9, rate: 2 },
  { t: EXIT_2013, at: 1.1, rate: 0 },
  { t: 11.5, at: 0.15 },
  { t: 11.8, at: -0.45 },
  { t: CRASH_2013, at: -0.1, rate: 1.5 },
  { t: CRASH_2013 + 0.15, at: 0, rate: 0 },
  { t: SLIDE_1.off, at: 0, rate: 0 },
  { t: SLIDE_1.splash, at: -0.7, rate: 0 },
  { t: 14.06, at: 0.2 },
  { t: EXIT_HOOK, at: 1.05, rate: 0 },
  { t: 14.7, at: 0.25 },
  { t: LOOP_S, at: -0.4, rate: -0.3 },
  { t: LOOP_S + 0.8, at: -0.58 },
  { t: CRASH_HOOK, at: -0.1, rate: 1.5 },
  { t: CRASH_HOOK + 0.15, at: 0, rate: 0 },
  { t: SLIDE_2.off, at: 0, rate: 0 },
  { t: SLIDE_2.splash, at: -0.7, rate: 0 },
  { t: 18.0, at: 0, rate: 0 },
  { t: 19.6, at: 0.1, rate: 0 },
  { t: BURST, at: 1.25, rate: 0 },
  { t: APEX_6M, at: 0.1 },
  { t: APEX_6M + 0.4, at: -0.7 },
  { t: FALLBACK, at: -1.2, rate: 0 },
  { t: END, at: -0.5, rate: 0 },
];

/** Its horizontal scale: 1 faces right, -1 left, squeezed edge-on as it flips round. */
const TURN_KEYS: readonly Key[] = [
  { t: CUT_AT, at: 1, rate: 0 },
  { t: SLIDE_1.turn, at: 1, rate: 0 },
  { t: SLIDE_1.off, at: -1, rate: 0 },
  { t: SLIDE_1.splash - 0.02, at: -1, rate: 0 },
  { t: EXIT_HOOK - 0.01, at: 1, rate: 0 },
  { t: SLIDE_2.turn, at: 1, rate: 0 },
  { t: SLIDE_2.off, at: -1, rate: 0 },
  { t: END, at: -1, rate: 0 },
];

/** Jaws, 0 shut .. 1 wide: biting the line, gaping in the air, gnashing on the deck. */
const JAW_KEYS: readonly Key[] = [
  { t: CUT_AT, at: 0.2, rate: 0 },
  { t: HOOKED_AT, at: 0.2, rate: 0 },
  { t: HOOKED_AT + 0.15, at: 0.45, rate: 0 },
  { t: EXIT_2013, at: 0.6 },
  { t: 11.4, at: 0.95, rate: 0 },
  { t: CRASH_2013 - 0.06, at: 0.95, rate: 0 },
  { t: CRASH_2013 + 0.06, at: 0.35, rate: 0 },
  { t: SLIDE_1.turn, at: 0.35, rate: 0 },
  { t: SLIDE_1.splash, at: 0.15, rate: 0 },
  { t: EXIT_HOOK, at: 0.5 },
  { t: 14.6, at: 1, rate: 0 },
  { t: CRASH_HOOK - 0.06, at: 1, rate: 0 },
  { t: CRASH_HOOK + 0.06, at: 0.35, rate: 0 },
  { t: SLIDE_2.splash, at: 0.15, rate: 0 },
  { t: 18.0, at: 0.05, rate: 0 },
  { t: 19.6, at: 0.1, rate: 0 },
  { t: BURST + 0.2, at: 0.7, rate: 0 },
  { t: APEX_6M + 0.3, at: 0.5 },
  { t: FALLBACK, at: 0.2, rate: 0 },
  { t: END, at: 0.2, rate: 0 },
];

/** How hard it swims, 0 .. 1: thrashing on the line and the deck, flat out under the sea. */
const EFFORT_KEYS: readonly Key[] = [
  { t: CUT_AT, at: 0.35, rate: 0 },
  { t: HOOKED_AT, at: 0.35, rate: 0 },
  { t: HOOKED_AT + 0.2, at: 1, rate: 0 },
  { t: EXIT_2013, at: 1, rate: 0 },
  { t: 11.5, at: 0.4, rate: 0 },
  { t: CRASH_2013, at: 0.6, rate: 0 },
  { t: CRASH_2013 + 0.2, at: 1, rate: 0 },
  { t: SLIDE_1.turn, at: 1, rate: 0 },
  { t: EXIT_HOOK, at: 1, rate: 0 },
  { t: 14.8, at: 0.45, rate: 0 },
  { t: CRASH_HOOK, at: 0.6, rate: 0 },
  { t: CRASH_HOOK + 0.2, at: 1, rate: 0 },
  { t: 19.6, at: 1, rate: 0 },
  { t: BURST + 0.3, at: 0.5, rate: 0 },
  { t: FALLBACK, at: 0.6, rate: 0 },
  { t: END, at: 0.35, rate: 0 },
];

/** Tail beats: a whole number a loop, so the beat flows on round the loop point. */
const BEATS = 36;

export interface Shark {
  /** Its body's centre, world px (before it rides the boat: see `onDeck`). */
  readonly x: number;
  readonly y: number;
  /** Nose up, radians. */
  readonly tilt: number;
  /** Horizontal scale: 1 facing right, -1 left. */
  readonly turn: number;
  readonly jaw: number;
  readonly beat: number;
  readonly effort: number;
  /** How much it rides the rocking boat, 0 .. 1 (1 lying on the foredeck). */
  readonly onDeck: number;
  /** Its flop on the deck: up off the planks (px) and rocking (radians). */
  readonly hop: number;
}

/** How far into a flop, 0 .. 1, for flops starting at `from`, `every` s apart, `count` of them. */
function flops(v: number, from: number, every: number, count: number): number {
  const s = v - from;
  if (s < 0 || s >= every * count) return 0;
  return Math.sin(Math.PI * ((s % every) / every));
}

/** On the deck it flops: three flops after the 2013 crash ("Great fishing trip."), a bounce after the opening's. */
function hopAt(v: number): number {
  return 46 * flops(v, CRASH_2013 + 0.18, 0.4, 3) + 26 * flops(v, CRASH_HOOK + 0.06, 0.18, 1);
}

/** The thrash on the line: head shakes after "hooked", until it rushes up. */
function thrashAt(v: number): number {
  const on = ramp(v, HOOKED_AT, HOOKED_AT + 0.15) * (1 - ramp(v, 10.7, 10.9));
  return on * 0.2 * Math.sin(2 * Math.PI * 3.5 * (v - HOOKED_AT));
}

export function sharkAt(t: number): Shark {
  const v = take(t);
  const hop = hopAt(v);
  const rock = 0.08 * Math.sin(2 * Math.PI * 1.25 * (v - CRASH_2013)) * (hop > 0 ? 1 : 0) * (v < CRASH_HOOK - 1 ? 1 : 0);
  const onDeck = Math.max(
    ramp(v, CRASH_2013 - 0.02, CRASH_2013 + 0.02) * (1 - ramp(v, SLIDE_1.off, SLIDE_1.off + 0.12)),
    ramp(v, CRASH_HOOK - 0.02, CRASH_HOOK + 0.02) * (1 - ramp(v, SLIDE_2.off, SLIDE_2.off + 0.12)),
  );
  return {
    x: curveAt(X_KEYS, v).at,
    y: curveAt(Y_KEYS, v).at - hop,
    tilt: curveAt(TILT_KEYS, v).at + thrashAt(v) + rock,
    turn: Math.max(-1, Math.min(1, curveAt(TURN_KEYS, v).at)),
    jaw: Math.max(0, Math.min(1, curveAt(JAW_KEYS, v).at + 0.25 * Math.max(0, Math.sin(2 * Math.PI * 2.5 * v)) * (hop > 5 ? 1 : 0))),
    beat: (2 * Math.PI * BEATS * v) / LOOP_S,
    effort: Math.max(0, Math.min(1, curveAt(EFFORT_KEYS, v).at)),
    onDeck,
    hop,
  };
}

/** Its velocity, world px/s (by finite difference, before the boat's rocking). */
export function sharkVelocity(t: number): { readonly x: number; readonly y: number } {
  const h = 1 / 240;
  const a = sharkAt(t - h);
  const b = sharkAt(t + h);
  return { x: (b.x - a.x) / (2 * h), y: (b.y - a.y) / (2 * h) };
}

/** Is it in the air (its body clear of the water), for spray off it. */
export const airborne = (s: Shark): boolean => s.y < -SHARK_LEN * 0.15 && s.onDeck < 0.5;

/** The moments it leaves the water, hits it, and lands on the deck, take time. */
export const SPLASH_TIMES = { exit2013: EXIT_2013, crash2013: BOAT2_AT, slide1: SLIDE_1.splash, exitHook: EXIT_HOOK, crashHook: CRASH_HOOK, slide2: SLIDE_2.splash, burst: BURST, fallback: FALLBACK } as const;
