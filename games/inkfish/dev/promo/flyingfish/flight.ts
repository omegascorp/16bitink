import type { Pose } from '../chain';
import { clamp01, curveAt, type Key, ramp } from '../short';
import {
  BURST_AT, GET_AT, KEEP_AT, LOOP_S, SEABIRDS_AT, SPREAD_AT, TAILS_AT, wrap, YEAR_AT,
} from './beats';

/**
 * The flying fish's flight, a side-on cross-section of the sea that follows
 * it: the camera keeps the fish near the middle and the world (waves,
 * splashes, the ferry, the gannet on the water) slides past at its speed.
 *
 *   0     mid-glide, wings spread (it has just escaped)
 *   ~6    the glide ends: it folds its wings and drops back into the sea
 *   7.6   "burst out of the water": it breaks the surface, wings folded
 *   8.7   "spread their fins like wings": they unfold
 *   10.9  "flick their tails on the waves": it sinks to the surface and
 *         sculls with its tail, leaving a zigzag of splashes; "keep going",
 *         it lifts off again
 *   14.6  down into the sea again; mahi-mahi below, a gannet from above
 *   18.5  "To get away,": it bursts out and spreads its wings, climbing
 *         into the glide the loop began with.
 */

/** The waterline at rest, and the glide's height, px from the top. */
export const SURFACE_Y = 720;
export const FISH_LEN = 380;
/** It bolts from between the hunters as the gannet folds its wings to dive. */
export const BOLT_AT = SEABIRDS_AT + 0.6;
/** The world repeats every PERIOD px (waves, wavelets): the camera travels a whole number of them a loop. */
export const PERIOD = 1080;

/** A quantity built up over the loop from its rate, scaled so a loop adds a whole number of `quantum`. */
export interface Running {
  /** Value at any time (not folded: it keeps growing loop after loop), and its rate. */
  at(t: number): number;
  rate(t: number): number;
  /** What one loop adds. */
  readonly perLoop: number;
}

const STEPS = 4680;

export function running(rateOf: (t: number) => number, quantum: number): Running {
  const dt = LOOP_S / STEPS;
  const table = new Float64Array(STEPS + 1);
  for (let i = 1; i <= STEPS; i++) table[i] = table[i - 1]! + 0.5 * (rateOf((i - 1) * dt) + rateOf(i * dt)) * dt;
  const raw = table[STEPS]!;
  const perLoop = Math.max(1, Math.round(raw / quantum)) * quantum;
  const k = perLoop / raw;
  return {
    perLoop,
    rate: (t) => k * rateOf(wrap(t)),
    at: (t) => {
      const loops = Math.floor(t / LOOP_S);
      const u = (t - loops * LOOP_S) / dt;
      const i = Math.min(STEPS - 1, Math.floor(u));
      return loops * perLoop + k * (table[i]! + (table[i + 1]! - table[i]!) * (u - i));
    },
  };
}

// ---------------------------------------------------------------- the camera

/** How fast the fish goes through the water and air (px/s, before scaling to whole periods). */
const SPEED: readonly Key[] = [
  { t: 0, at: 520, rate: 0 },
  { t: 5.6, at: 520 },
  { t: 6.4, at: 260 },
  { t: 7.0, at: 220 },
  { t: 7.35, at: 300 },
  { t: 7.8, at: 580 },
  { t: 8.6, at: 540 },
  { t: 10.5, at: 500 },
  { t: 11.2, at: 430 },
  { t: 11.9, at: 520 },
  { t: 14.3, at: 520 },
  { t: 15.0, at: 240 },
  { t: BOLT_AT, at: 220 },
  { t: 18.2, at: 380 },
  { t: 18.8, at: 580 },
  { t: LOOP_S, at: 520, rate: 0 },
];

/** How far the camera has travelled, px: the world's x on screen is its world x minus this. */
export const CAMERA = running((t) => curveAt(SPEED, t).at, PERIOD);

// ---------------------------------------------------------------- the fish

/** Seconds into its dive, its breach, its taxi along the waves and its escape. */
const Y_KEYS: readonly Key[] = [
  { t: 0, at: 575, rate: -45 },
  { t: 1.6, at: 545 },
  { t: 3.6, at: 530 },
  { t: 5.0, at: 548, rate: 40 },
  { t: YEAR_AT + 0.75, at: 650, rate: 260 },
  { t: 6.3, at: 770, rate: 200 },
  { t: 6.85, at: 840, rate: 0 },
  { t: BURST_AT, at: 825, rate: -250 },
  { t: 7.62, at: SURFACE_Y, rate: -420 },
  { t: 8.3, at: 570, rate: -150 },
  { t: 8.9, at: 530, rate: 0 },
  { t: 9.8, at: 540 },
  { t: 10.3, at: 600, rate: 120 },
  { t: TAILS_AT - 0.15, at: 665, rate: 25 },
  { t: 11.35, at: 672, rate: 0 },
  { t: KEEP_AT, at: 665, rate: -70 },
  { t: 12.35, at: 575, rate: -130 },
  { t: 13.0, at: 545, rate: 0 },
  { t: 13.9, at: 552 },
  { t: 14.3, at: 600, rate: 150 },
  { t: 14.75, at: 750, rate: 280 },
  { t: 15.3, at: 850, rate: 0 },
  { t: 16.2, at: 862 },
  { t: 16.9, at: 858 },
  { t: BOLT_AT, at: 860, rate: 0 },
  { t: 17.9, at: 790, rate: -200 },
  { t: GET_AT + 0.04, at: SURFACE_Y, rate: -420 },
  { t: 19.0, at: 615, rate: -170 },
  { t: LOOP_S, at: 575, rate: -45 },
];

const X_KEYS: readonly Key[] = [
  { t: 0, at: 470, rate: 0 },
  { t: 2.6, at: 420 },
  { t: 5.0, at: 400 },
  { t: 7.0, at: 450 },
  { t: 9.5, at: 500 },
  { t: 11.3, at: 470 },
  { t: 14.0, at: 490 },
  { t: 16.5, at: 540 },
  { t: BOLT_AT, at: 560, rate: 0 },
  { t: 17.9, at: 715, rate: 220 },
  { t: GET_AT + 0.1, at: 750, rate: 0 },
  { t: 19.05, at: 610 },
  { t: LOOP_S, at: 470, rate: 0 },
];

/** The tail's beat: still in a glide, quick underwater, flicking hard on the waves (Hz, before rounding to whole beats). */
const BEAT_HZ: readonly Key[] = [
  { t: 0, at: 0, rate: 0 },
  { t: 5.7, at: 0 },
  { t: 6.3, at: 5 },
  { t: 7.2, at: 5 },
  { t: 7.5, at: 8 },
  { t: 7.9, at: 2 },
  { t: 8.4, at: 0 },
  { t: 10.6, at: 0 },
  { t: TAILS_AT - 0.1, at: 10 },
  { t: KEEP_AT, at: 10 },
  { t: KEEP_AT + 0.4, at: 0 },
  { t: 14.4, at: 0 },
  { t: 15.0, at: 5 },
  { t: BOLT_AT, at: 4 },
  { t: BOLT_AT + 0.3, at: 9 },
  { t: 18.8, at: 2 },
  { t: 19.2, at: 0 },
  { t: LOOP_S, at: 0, rate: 0 },
];
const TAIL = running((t) => Math.max(0, curveAt(BEAT_HZ, t).at), 1);

/** How hard it works its tail, 0 .. 1. */
const EFFORT: readonly Key[] = [
  { t: 0, at: 0.05, rate: 0 },
  { t: 5.8, at: 0.05 },
  { t: 6.4, at: 0.6 },
  { t: 7.3, at: 0.9 },
  { t: 8.2, at: 0.05 },
  { t: 10.6, at: 0.05 },
  { t: TAILS_AT - 0.1, at: 1 },
  { t: KEEP_AT, at: 1 },
  { t: KEEP_AT + 0.4, at: 0.05 },
  { t: 14.5, at: 0.05 },
  { t: 15.1, at: 0.6 },
  { t: BOLT_AT, at: 0.6 },
  { t: BOLT_AT + 0.3, at: 1 },
  { t: 19.0, at: 0.05 },
  { t: LOOP_S, at: 0.05, rate: 0 },
];

/**
 * Wings: spread in the air, tucked as it hits the water, still tucked as it
 * breaks out ("burst out of the water"), unfolding on "spread"; after the
 * escape they open at once.
 */
export function foldAt(t: number): number {
  const first = 1 - ramp(t, 5.86, 6.12);
  const spread = ramp(t, SPREAD_AT, SPREAD_AT + 0.5);
  const second = 1 - ramp(t, 14.4, 14.66);
  const escape = ramp(t, GET_AT + 0.1, GET_AT + 0.55);
  if (t < 7) return first;
  if (t < 12) return spread;
  if (t < 16) return second;
  return escape;
}

export interface Fish extends Pose {
  readonly fold: number;
  /** Climbing (px/s, up is negative) and moving on through the world (px/s). */
  readonly vy: number;
  readonly vx: number;
}

const TILT_MAX = 0.85;

export function fishAt(t: number): Fish {
  const y = curveAt(Y_KEYS, wrap(t));
  const x = curveAt(X_KEYS, wrap(t));
  const vx = CAMERA.rate(t) + x.rate;
  const tilt = Math.max(-TILT_MAX, Math.min(TILT_MAX, Math.atan2(-y.rate, vx)));
  return {
    j: 0,
    shape: 'flyingfish',
    age: 0,
    x: x.at,
    y: y.at,
    length: FISH_LEN,
    facing: 1,
    tilt,
    beat: 2 * Math.PI * TAIL.at(t),
    effort: clamp01(curveAt(EFFORT, wrap(t)).at),
    fold: clamp01(foldAt(wrap(t))),
    vy: y.rate,
    vx,
  };
}

/** Whether the fish's middle is below the waterline. */
export const underwater = (t: number): boolean => fishAt(t).y > SURFACE_Y;

// ---------------------------------------------------------------- where it meets the water

/** The moment the fish's middle crosses the surface between `from` and `to` (bisection). */
function crossing(from: number, to: number): number {
  let a = from;
  let b = to;
  const below = (t: number): boolean => fishAt(t).y > SURFACE_Y;
  const start = below(a);
  if (below(b) === start) throw new Error(`no surface crossing in ${from}..${to}`);
  for (let i = 0; i < 40; i++) {
    const m = (a + b) / 2;
    if (below(m) === start) a = m;
    else b = m;
  }
  return (a + b) / 2;
}

export interface Splash {
  /** When, and where in the world (screen x + camera then). */
  readonly at: number;
  readonly wx: number;
  readonly size: number;
  /** A fish going in, coming out, a bird plunging, or a tail's flick. */
  readonly kind: 'in' | 'out' | 'plunge' | 'flick';
}

const splashAt = (at: number, size: number, kind: Splash['kind'], x = fishAt(at).x): Splash => ({ at, wx: x + CAMERA.at(at), size, kind });

export const DIVES = [crossing(5.5, 6.6), crossing(14.0, 15.1)] as const;
export const BREACHES = [crossing(7.2, 8.1), crossing(18.0, 18.9)] as const;

/** The tail's flicks on the waves, from "tails" to "keep going": where its lower lobe dips into the water. */
export const FLICKS: readonly number[] = Array.from({ length: 7 }, (_, i) => TAILS_AT - 0.04 + i * ((KEEP_AT - TAILS_AT + 0.04) / 6.5));

/** Where the lower tail lobe's tip is, screen px. */
export function tailTip(f: Fish): { readonly x: number; readonly y: number } {
  const back = f.length * 0.62;
  return { x: f.x - Math.cos(f.tilt) * back, y: f.y + Math.sin(f.tilt) * back + f.length * 0.18 };
}

export const FISH_SPLASHES: readonly Splash[] = [
  splashAt(DIVES[0], 0.75, 'in'),
  splashAt(BREACHES[0], 1, 'out'),
  ...FLICKS.map((at, i) => splashAt(at, i % 2 ? 0.4 : 0.55, 'flick', tailTip(fishAt(at)).x)),
  splashAt(DIVES[1], 0.75, 'in'),
  splashAt(BREACHES[1], 1.05, 'out'),
];

/** A world point's x on screen at time t, for a thing that happened at `at` (follows it across the loop point). */
export function screenX(wx: number, at: number, t: number): number {
  const since = wrap(t - at);
  return wx - CAMERA.at(at + since);
}

/** Seconds since an event, folded into the loop. */
export const since = (t: number, at: number): number => wrap(t - at);

