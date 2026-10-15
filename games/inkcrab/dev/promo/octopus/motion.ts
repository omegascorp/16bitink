import { clamp01, lerp, ramp, smooth, window01 } from '../short';
import {
  BAD_AT, COUNT_AT, EVERY_AT, HOLE_AT, HUNTS_AT, INTO_AT, KNOCK_AT, looped, LOOP_S, POKING_AT, STOPS_AT,
} from './story';

/**
 * How the octopus and the hermit crab move, as functions of loop time. The
 * octopus is placed by its arm base (where the eight arms meet under the
 * head) and drawn in local units, OCTO_K screen px each; its arms are
 * spines of points in local units around that base, unrotated (they bend
 * their own way, the body turns with `angle`).
 */
export interface P {
  readonly x: number;
  readonly y: number;
}

export const OCTO_K = 5;
export const ARMS = 8;
const ARM_STEPS = 16;

/** The sand under the pool, screen y at screen x. */
export const sandY = (x: number): number => 1062 + 10 * Math.sin(x / 140 + 0.6) + 4 * Math.sin(x / 47);

/** Where the arms reach in the hunt: the hermit crab's shell and three holes in the rocks (screen px). */
export const CRAB_X = 900;
export const SHELL_TOP: P = { x: CRAB_X + 18, y: 968 };
export const HOLES = { r1: { x: 1000, y: 868 }, r2: { x: 1032, y: 985 }, m: { x: 452, y: 1022 } } as const;
export type HoleId = keyof typeof HOLES;

export interface Octo {
  readonly x: number;
  readonly y: number;
  /** Radians, clockwise: 0 has the mantle straight up. */
  readonly angle: number;
  /** 0 .. 1: the mantle squeezed by a jet. */
  readonly squeeze: number;
  /** 0 .. 1: arms trailing behind in a swim. */
  readonly trail: number;
  /** Each arm's spine, root to tip, local units about (x, y), unrotated. */
  readonly arms: readonly (readonly P[])[];
}

// ---------------------------------------------------------------- the body

/** Hovering in the middle of the pool; jets up and away on "stops"; parachutes onto the rocks by "Bad news"; back up for the count. */
const JET_FROM = STOPS_AT - 0.05;
const baseX = looped([
  { t: 0.6, at: 540 },
  { t: JET_FROM - 0.15, at: 534 },
  { t: JET_FROM + 0.45, at: 690 },
  { t: JET_FROM + 0.85, at: 730 },
  { t: BAD_AT + 0.05, at: 705 },
  { t: HUNTS_AT, at: 712 },
  { t: POKING_AT + 0.2, at: 730 },
  { t: HOLE_AT + 0.08, at: 724 },
  { t: COUNT_AT + 0.2, at: 540 },
]);
const baseY = looped([
  { t: 0.6, at: 790 },
  { t: JET_FROM - 0.15, at: 806 },
  { t: JET_FROM + 0.45, at: 600 },
  { t: JET_FROM + 0.85, at: 560 },
  { t: BAD_AT + 0.05, at: 928 },
  { t: HUNTS_AT, at: 934 },
  { t: POKING_AT + 0.2, at: 940 },
  { t: HOLE_AT + 0.08, at: 934 },
  { t: COUNT_AT + 0.2, at: 790 },
]);
const baseAngle = looped([
  { t: 0.6, at: 0 },
  { t: JET_FROM - 0.2, at: -0.08 },
  { t: JET_FROM + 0.35, at: 0.85 },
  { t: JET_FROM + 0.8, at: 0.7 },
  { t: JET_FROM + 1.35, at: 0.08 },
  { t: BAD_AT + 0.05, at: 0 },
  { t: COUNT_AT + 0.2, at: 0 },
]);

/** A wave that goes round a whole number of times a loop. */
const cyc = (t: number, n: number, phase = 0): number => Math.sin((2 * Math.PI * n * t) / LOOP_S + phase);

/** Arms trailing straight behind it while it jets, spread out again as it settles. */
export const trailAt = (t: number): number => Math.min(ramp(t, JET_FROM - 0.12, JET_FROM + 0.3), 1 - ramp(t, JET_FROM + 0.85, JET_FROM + 1.45));
/** Arms spread wide over the rocks for the hunt. */
const wideAt = (t: number): number => window01(t, BAD_AT - 0.4, HOLE_AT + 0.35, 0.35);
/** The two squeezes of the mantle that shoot it along. */
export const JETS: readonly number[] = [JET_FROM, JET_FROM + 0.5];
const squeezeAt = (t: number): number => Math.max(...JETS.map((at) => (t < at ? 0 : Math.min(ramp(t, at, at + 0.08), 1 - ramp(t, at + 0.12, at + 0.4)))));
/** How hard it's moving: the swim calms the ambient bob. */
const still = (t: number): number => 1 - window01(t, JET_FROM - 0.3, BAD_AT + 0.3, 0.3);

// ---------------------------------------------------------------- the arms

/** Arm i's place across the fan, -1 (its left) .. 1 (its right). */
const fanOf = (i: number): number => -1 + (2 * i) / (ARMS - 1);
const lengthOf = (i: number): number => 60 + 5 * Math.cos(i * 1.7);

/** An arm hanging free: fanned out, tips curled up and outward, a slow wave running down it. */
function freeArm(i: number, t: number, angle: number, trail: number, wide: number): P[] {
  const fan = fanOf(i);
  const width = lerp(lerp(1.15, 1.7, wide), 0.16, trail);
  const curl = lerp(lerp(2.6, 0.9, wide), 0.3, trail) * (0.55 + 0.45 * Math.abs(fan)) * (1 + 0.25 * Math.sin(i * 2.1));
  const amp = lerp(0.32, 0.55, trail);
  // The wave runs faster as it swims: extra phase only while trailing, so it comes round with the loop.
  const phase = (2 * Math.PI * 13 * t) / LOOP_S + trail * 9 * (t - JET_FROM) + i * 1.3;
  const root = rotate({ x: fan * 9, y: -3 }, angle);
  const len = lengthOf(i);
  const pts: P[] = [root];
  let p = root;
  for (let s = 0; s < ARM_STEPS; s++) {
    const u = s / ARM_STEPS;
    const h = Math.PI / 2 + angle - fan * width - Math.sign(fan) * curl * u ** 2.6 + amp * u * Math.sin(2 * Math.PI * 1.2 * u - phase);
    p = { x: p.x + (Math.cos(h) * len) / ARM_STEPS, y: p.y + (Math.sin(h) * len) / ARM_STEPS };
    pts.push(p);
  }
  return pts;
}

/** An arm reaching for `to` (local): an arch from its root, the tip feeling about. */
function reachArm(from: P, to: P): P[] {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const d = Math.hypot(dx, dy) || 1;
  // Arched: the control point off the line's middle, on the side up the screen.
  const up = dx / d >= 0 ? 1 : -1;
  const ctrl = { x: (from.x + to.x) / 2 + up * (dy / d) * d * 0.28, y: (from.y + to.y) / 2 - up * (dx / d) * d * 0.28 };
  return Array.from({ length: ARM_STEPS + 1 }, (_, s) => {
    const u = s / ARM_STEPS;
    const v = 1 - u;
    return { x: v * v * from.x + 2 * v * u * ctrl.x + u * u * to.x, y: v * v * from.y + 2 * v * u * ctrl.y + u * u * to.y };
  });
}

/** Which arm goes where in the hunt, and when (it reaches in just before the word, and lets go after "hole"). */
interface Reach {
  readonly arm: number;
  readonly to: P;
  readonly from: number;
}
export const REACHES: readonly Reach[] = [
  { arm: 6, to: SHELL_TOP, from: HUNTS_AT - 0.15 },
  { arm: 7, to: HOLES.r1, from: POKING_AT - 0.2 },
  { arm: 5, to: HOLES.r2, from: INTO_AT - 0.25 },
  { arm: 1, to: HOLES.m, from: EVERY_AT - 0.3 },
];
const LET_GO = HOLE_AT + 0.05;
export const reachAt = (r: Reach, t: number): number => window01(t, r.from, LET_GO + 0.35, 0.35);

/** The tip feeling about in a hole, and the tap on the shell on "feel". */
function probe(r: Reach, t: number): P {
  const tap = r.to === SHELL_TOP ? -14 * Math.max(0, Math.sin(Math.PI * clamp01((t - KNOCK_AT) / 0.12))) - 10 * Math.max(0, Math.sin(Math.PI * clamp01((t - KNOCK_AT - 0.15) / 0.12))) : 0;
  return { x: r.to.x + 7 * Math.sin(t * 7 + r.arm), y: r.to.y + 5 * Math.cos(t * 9 + r.arm) - tap };
}

export function octoAt(t: number): Octo {
  const calm = still(t);
  const x = baseX(t) + 6 * cyc(t, 3, 1) * calm;
  const y = baseY(t) + 9 * cyc(t, 5) * calm;
  const angle = baseAngle(t) + 0.035 * cyc(t, 4, 2) * calm;
  const trail = trailAt(t);
  const wide = wideAt(t);
  const arms = Array.from({ length: ARMS }, (_, i) => {
    const free = freeArm(i, t, angle, trail, wide);
    const reach = REACHES.find((r) => r.arm === i);
    const w = reach ? smooth(reachAt(reach, t)) : 0;
    const pts = w > 0 ? free.map((p, s) => {
      const tip = probe(reach!, t);
      const q = reachArm(free[0]!, { x: (tip.x - x) / OCTO_K, y: (tip.y - y) / OCTO_K })[s]!;
      return { x: lerp(p.x, q.x, w), y: lerp(p.y, q.y, w) };
    }) : free;
    // Nothing goes through the sand: arms that reach it lie along it.
    return pts.map((p) => ({ x: p.x, y: Math.min(p.y, (sandY(x + p.x * OCTO_K) - 8 - y) / OCTO_K) }));
  });
  return { x, y, angle, squeeze: squeezeAt(t), trail, arms };
}

export function rotate(p: P, angle: number): P {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return { x: p.x * c - p.y * s, y: p.x * s + p.y * c };
}

/** A point of the body (local units, mantle up) on screen. */
export const bodyToScreen = (o: Octo, p: P): P => {
  const r = rotate(p, o.angle);
  return { x: o.x + r.x * OCTO_K, y: o.y + r.y * OCTO_K };
};

// ---------------------------------------------------------------- the hermit crab

/** Pulled into its shell from the knock on "feel" until the octopus has gone back up. */
export const hiddenAt = (t: number): number => window01(t, KNOCK_AT + 0.1, COUNT_AT + 0.35, 0.16);

export interface Crab {
  readonly x: number;
  readonly ground: number;
  /** 0 out .. 1 all the way in. */
  readonly hidden: number;
  /** Radians: a tremble while it hides, a little rock as it walks. */
  readonly tilt: number;
}

export function crabAt(t: number): Crab {
  const hidden = hiddenAt(t);
  const x = CRAB_X + 14 * cyc(t, 2) * (1 - hidden);
  const tremble = hidden * 0.05 * Math.sin(t * 46) * (0.4 + 0.6 * Math.max(0, Math.sin(t * 5)));
  return { x, ground: sandY(x) + 2, hidden, tilt: 0.025 * cyc(t, 12) * (1 - hidden) + tremble };
}

/** The holes' little puffs of sand as an arm tip goes in. */
export const PUFFS: readonly { readonly at: number; readonly to: P }[] = REACHES.map((r) => ({ at: r.from + 0.32, to: r.to }));
export const PUFF_S = 0.7;
