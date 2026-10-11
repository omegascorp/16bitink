import type { FishShape } from '../../src/art/fishArt';

/**
 * The food-chain loop for the promo video: a fish swims, a bigger one eats
 * it, a bigger one eats that, and so on, while the camera pulls back.
 *
 * Every fish follows the same path in its own units (body lengths), and each
 * fish is GROWTH times the size of the one it eats, so the picture is
 * self-similar: one stage later the scene looks the same, one fish further
 * up the chain. After CHAIN.length stages the species line up again and the
 * video loops without a seam. Odd generations are mirrored, so predators
 * come at their prey head-on from alternating sides.
 *
 * Fish j's "age" at time t is t / STAGE_S - j: it gulps its prey at age GULP
 * and is gulped itself at age 1 + GULP.
 */

/** Smallest to biggest. The last one is eaten by the first, one size up, which closes the loop. */
export const CHAIN: readonly FishShape[] = ['inkling', 'clownfish', 'perch', 'mahi', 'grouper', 'shark'];
/** How many times bigger each predator is than its prey (and how far the camera pulls back per stage). */
export const GROWTH = 3;
export const STAGE_S = 2;
export const LOOP_S = CHAIN.length * STAGE_S;

/** Age at which a fish gulps its prey. */
const GULP = 0.3;
/** Mouth distance from the body's centre, in body lengths. */
export const NOSE = 0.46;
/** Cruising speed after a meal, body lengths per stage: the "peaceful" part. */
const CRUISE = 0.22;
/** The predator creeps in from the edge first (visible, menacing), then charges. Distances in body lengths, times in ages. */
const STALK = 0.75;
const STALK_AT = GULP - 0.5;
const STALK_LEN = 0.17;
const CHARGE = 0.45;
const CHARGE_AT = GULP - 0.07;
const CHARGE_LEN = 0.05;
/** How far a fish rises and sinks through its peaceful stage, body lengths. */
const BOB = 0.07;
/** First age at which a fish is drawn (it is still off screen then). */
export const ENTER_AGE = GULP - 0.9;

const sigmoid = (z: number): number => 0.5 * (1 + Math.tanh(z));

/** Distance swum forwards by age `a`, body lengths. */
function distance(a: number): number {
  return CRUISE * a + STALK * sigmoid((a - STALK_AT) / STALK_LEN) + CHARGE * sigmoid((a - CHARGE_AT) / CHARGE_LEN);
}

/** Derivative of the sigmoid ramp of `size` centred at `at`, `len` wide. */
const ramp = (a: number, size: number, at: number, len: number): number => {
  const s = sigmoid((a - at) / len);
  return (size * 2 * s * (1 - s)) / len;
};

/** Forward speed at age `a`, body lengths per stage. */
export function speedAt(a: number): number {
  return CRUISE + ramp(a, STALK, STALK_AT, STALK_LEN) + ramp(a, CHARGE, CHARGE_AT, CHARGE_LEN);
}

/**
 * Where the path starts so that each predator's mouth meets its prey: with
 * x(a) = X0 - distance(a), the prey's spot at age 1 + GULP must be the
 * predator's mouth at age GULP, scaled up by GROWTH and mirrored.
 * x(1 + g) = -GROWTH * (x(g) - NOSE).
 */
const X0 = (GROWTH * NOSE + GROWTH * distance(GULP) + distance(1 + GULP)) / (1 + GROWTH);

/** A fish's position in its own frame, body lengths: heading -x, y down. */
export function pathAt(a: number): { readonly x: number; readonly y: number } {
  return { x: X0 - distance(a), y: -BOB * (1 - Math.cos(2 * Math.PI * (a - GULP))) };
}

/** Nose-up tilt in radians from the path's slope. */
function tiltAt(a: number): number {
  const dy = -BOB * 2 * Math.PI * Math.sin(2 * Math.PI * (a - GULP));
  return Math.max(-0.3, Math.min(0.3, Math.atan2(-dy, speedAt(a))));
}

export const speciesOf = (j: number): FishShape => CHAIN[((j % CHAIN.length) + CHAIN.length) % CHAIN.length]!;

export interface Frame {
  /** Screen centre of the zoom, px. */
  readonly cx: number;
  readonly cy: number;
  /** A fish's body length on screen at age 0, px. */
  readonly unit: number;
}

export interface Pose {
  readonly j: number;
  readonly shape: FishShape;
  readonly age: number;
  /** Screen position of the body's centre, px. */
  readonly x: number;
  readonly y: number;
  /** Body length on screen, px. */
  readonly length: number;
  /** 1 faces right, -1 left. */
  readonly facing: 1 | -1;
  readonly tilt: number;
  /** Tail-beat phase (radians) and strength (0..1). */
  readonly beat: number;
  readonly effort: number;
}

/** The camera's zoom phase at stage-time `tau`: eases out after each gulp, then drifts. Grows by exactly 1 per stage. */
export function zoomPhase(tau: number): number {
  return tau + 0.05 * Math.sin(2 * Math.PI * (tau - GULP));
}

/** Fish j's pose at stage-time `tau` (seconds / STAGE_S), before any swallowing. */
export function poseOf(j: number, tau: number, frame: Frame): Pose {
  const age = tau - j;
  const mirror = j % 2 === 0 ? 1 : -1;
  const scale = frame.unit * GROWTH ** (j - zoomPhase(tau));
  const p = pathAt(age);
  // Tail beats faster in the charge; integrate roughly as phase from age.
  const beat = 2 * Math.PI * (2.2 * age + 1.2 * sigmoid((age - STALK_AT) / STALK_LEN) + 0.8 * sigmoid((age - CHARGE_AT) / CHARGE_LEN));
  return {
    j,
    shape: speciesOf(j),
    age,
    x: frame.cx + mirror * p.x * scale,
    y: frame.cy + p.y * scale,
    length: scale,
    facing: mirror === 1 ? -1 : 1,
    tilt: tiltAt(age),
    beat,
    effort: Math.min(1, speedAt(age) / 4),
  };
}

/** Where a pose's mouth is on screen. */
export function mouthOf(p: Pose): { readonly x: number; readonly y: number } {
  return {
    x: p.x + p.facing * Math.cos(p.tilt) * NOSE * p.length,
    y: p.y - Math.sin(p.tilt) * NOSE * p.length,
  };
}

/** The generations alive at stage-time `tau`, biggest (newest) first. */
export function aliveAt(tau: number): number[] {
  const first = Math.ceil(tau - 1 - GULP);
  const last = Math.floor(tau - ENTER_AGE);
  const out: number[] = [];
  for (let j = last; j >= first; j--) out.push(j);
  return out;
}

/** Age at which fish j is swallowed. */
export const EATEN_AGE = 1 + GULP;
export const GULP_AGE = GULP;
