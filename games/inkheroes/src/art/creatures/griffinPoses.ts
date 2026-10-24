import { pt } from '../kit';
import type { Pt } from '../pen';
import type { Pose } from './types';
import { farOf, flex, keyed, place, type WingKey, type Xf } from './wingRig';

/**
 * How the Griffin moves. Its pose is a rig: the trunk (lion body, breast,
 * wings, tail root) turns about the hips; the head turns on the neck; the
 * legs reach from the hips (carried by the trunk) to feet placed on the
 * ground or tucked in flight; wings and tail are posed in the trunk's space.
 *
 * - idle: four-square, the near foreleg lifted; the chest breathes, the
 *   half-folded wings flex with it, the head looks about, the tail flicks.
 * - walk: flying, one wingbeat: up, a wide downstroke that brings the near
 *   wing down across the flank, then folded back up with the tips trailing.
 *   Talons tucked under the breast, hind legs and tail streaming back.
 * - attack: rears with the wings thrown up, then lunges: the talons rake
 *   down and the beak strikes at t = 0.5, and it settles back.
 */

/** The trunk turns about the hips. */
export const HIP = pt(-22, -28);
/** The head turns about the top of the neck. */
export const NECK = pt(17, -52);

export interface Foreleg {
  readonly ankle: Pt;
  readonly foot: Pt;
  /** Which way the toes point. */
  readonly ang: number;
}

export interface Hindleg {
  readonly knee: Pt;
  readonly hock: Pt;
  readonly ankle: Pt;
  readonly paw: Pt;
  /** The paw's turn from flat on the ground. */
  readonly tilt: number;
}

export interface GriffinRig {
  readonly trunk: { readonly rot: number; readonly x: number; readonly y: number };
  readonly head: { readonly rot: number; readonly x: number; readonly y: number; readonly gape: number };
  /** The tail's swing at the root and its extra curl toward the tip, radians. */
  readonly tail: { readonly lift: number; readonly curl: number };
  readonly near: WingKey;
  readonly far: WingKey;
  readonly foreN: Foreleg;
  readonly foreF: Foreleg;
  readonly hindN: Hindleg;
  readonly hindF: Hindleg;
  /** 1 standing on the ground, 0 aloft: the contact shadow. */
  readonly ground: number;
}

/** Hip roots in the trunk's space. */
export const HIP_N = pt(-22, -28);
export const HIP_F = pt(-16, -28);
export const FORE_HIP_N = pt(12, -28);
export const FORE_HIP_F = pt(7, -26);

const NEAR_REST: WingKey = {
  shoulder: pt(-1, -40), elbow: pt(-15, -49), wrist: pt(-10, -61), hand: pt(-21, -67),
  primaries: { n: 8, a0: -3.12, a1: -2.36, l0: 16, l1: 23 },
  secondaries: { n: 8, a: 2.68, l0: 16, l1: 18.6 },
};

const FAR_REST: WingKey = {
  shoulder: pt(4, -42), elbow: pt(-5, -53), wrist: pt(0, -63), hand: pt(-7, -68),
  primaries: { n: 7, a0: -2.8, a1: -2.1, l0: 14, l1: 19 },
  secondaries: { n: 6, a: 2.55, l0: 13, l1: 14 },
};

const W = (elbow: [number, number], wrist: [number, number], hand: [number, number], a0: number, a1: number, l0: number, l1: number, sa: number, s0: number, s1: number): WingKey => ({
  shoulder: NEAR_REST.shoulder, elbow: pt(...elbow), wrist: pt(...wrist), hand: pt(...hand),
  primaries: { n: 8, a0, a1, l0, l1 },
  secondaries: { n: 8, a: sa, l0: s0, l1: s1 },
});

/** One wingbeat, six keys a frame apart: top, spreading, level, bottom, folding, rising. */
const BEAT: readonly WingKey[] = [
  W([-9, -53], [-6, -66], [-13, -77], -2.55, -1.95, 15, 19, 2.75, 15, 17),
  W([-14, -47], [-20, -57], [-30, -62], -2.95, -2.5, 16, 20, 2.55, 16, 19),
  W([-13, -35], [-23, -29], [-31, -24], -3.5, -3.9, 16, 20, 3.45, 16, 19),
  W([-6, -28], [-8, -17], [-12, -8], -4.53, -4.83, 15, 17, 3.3, 14, 16),
  W([-11, -42], [-8, -52], [-16, -56], -3.75, -4.25, 15, 19, 2.5, 14, 16),
  W([-11, -49], [-8, -62], [-17, -68], -3.25, -3.1, 15, 20, 2.6, 15, 17),
];

const farBeat = (k: WingKey): WingKey => farOf(k, FAR_REST.shoulder, { np: 7, ns: 6 });

const restHind = (x: number): Hindleg => ({ knee: pt(x, -17), hock: pt(x - 3, -10.6), ankle: pt(x - 1.6, -5), paw: pt(x + 0.6, -2.4), tilt: 0 });

export const REST: GriffinRig = {
  trunk: { rot: 0, x: 0, y: 0 },
  head: { rot: 0, x: 0, y: 0, gape: 0 },
  tail: { lift: 0, curl: 0 },
  near: NEAR_REST,
  far: FAR_REST,
  foreN: { ankle: pt(19, -20), foot: pt(24.6, -18.6), ang: 0.9 },
  foreF: { ankle: pt(7.6, -10), foot: pt(8.4, -3.2), ang: 0.05 },
  hindN: restHind(-26),
  hindF: restHind(-20),
  ground: 1,
};

const TAU = Math.PI * 2;

function idle(t: number): GriffinRig {
  const s = Math.sin(TAU * t);
  const c = Math.cos(TAU * t) - 1;
  return {
    ...REST,
    trunk: { rot: -0.014 * s, x: 0, y: -0.7 * s },
    head: { rot: 0.07 * Math.sin(TAU * t) - 0.04 * c, x: 0.3 * s, y: 0.4 * c, gape: 0 },
    tail: { lift: 0.12 + 0.06 * Math.sin(TAU * (t - 0.15)), curl: 0.2 * Math.sin(TAU * t) },
    near: flex(NEAR_REST, s),
    far: flex(FAR_REST, Math.sin(TAU * (t - 0.08)) * 0.8),
    foreN: { ankle: pt(19 + 0.3 * s, -20 - 0.8 * s), foot: pt(24.6 + 0.5 * s, -18.6 - 1.2 * s), ang: 0.9 + 0.14 * s },
  };
}

/** Flying: legs are placed off the hips, which ride the trunk. */
function walk(t: number): GriffinRig {
  const s = Math.sin(TAU * t);
  const trunk = { rot: -0.03 + 0.025 * Math.sin(TAU * (t - 0.1)), x: 5.5, y: -3 - 2.2 * Math.sin(TAU * (t - 0.25)) };
  const xf: Xf = { pivot: HIP, ...trunk };
  /** A hind leg streaming back off its hip; `reach` < 1 keeps it tucked further under. */
  const trail = (hip: Pt, k: number, reach: number, drop: number): Hindleg => {
    const h = place(xf, hip);
    const sw = Math.sin(TAU * (t - 0.2) + k) * 1.6;
    const at = (x: number, y: number, m: number): Pt => pt(h.x + x * reach * 0.9 + sw * m, h.y + y * drop + sw * m * 0.7);
    return { knee: at(-7, 8.5, 0.3), hock: at(-14.5, 11, 0.6), ankle: at(-19, 12.4, 0.8), paw: at(-22, 13, 1), tilt: 2.3 - (1 - reach) * 1.2 + sw * 0.05 };
  };
  const tuck = (hip: Pt, k: number): Foreleg => {
    const h = place(xf, hip);
    return { ankle: pt(h.x + 2, h.y + 8 + k), foot: pt(h.x + 8, h.y + 7.4 + k), ang: -0.5 + k * 0.2 };
  };
  const near = keyed(BEAT, t, true);
  return {
    trunk,
    head: { rot: 0.1 - 0.04 * s, x: 2, y: 1.2 * Math.sin(TAU * (t - 0.25)), gape: 0 },
    tail: { lift: -0.2 + 0.06 * Math.sin(TAU * (t - 0.3)), curl: 0.22 * Math.sin(TAU * (t - 0.45)) },
    near,
    far: farBeat(keyed(BEAT, t - 0.04, true)),
    foreN: tuck(FORE_HIP_N, 0),
    foreF: tuck(FORE_HIP_F, 1.4),
    hindN: trail(HIP_N, 0, 1, 1),
    hindF: trail(HIP_F, 1.2, 0.72, 1.8),
    ground: 0.25,
  };
}

/** The strike, five keys a frame apart: stance, rear, rake and bite, land, stance. */
const STRIKE: readonly GriffinRig[] = [
  idle(0),
  {
    trunk: { rot: -0.4, x: -1, y: 0 },
    head: { rot: 0.22, x: 0, y: 0, gape: 0.38 },
    tail: { lift: 0.5, curl: 0.25 },
    near: BEAT[0]!,
    far: farBeat(BEAT[0]!),
    foreN: { ankle: pt(24, -50), foot: pt(30, -55), ang: -0.9 },
    foreF: { ankle: pt(17, -37), foot: pt(23, -41), ang: -0.35 },
    hindN: { knee: pt(-27, -17), hock: pt(-30, -10.6), ankle: pt(-28, -5), paw: pt(-25.4, -2.4), tilt: 0 },
    hindF: { knee: pt(-21, -17.5), hock: pt(-24, -10.6), ankle: pt(-22, -5), paw: pt(-19.4, -2.4), tilt: 0 },
    ground: 1,
  },
  {
    trunk: { rot: -0.1, x: 6, y: 0 },
    head: { rot: 0.48, x: 3, y: 1, gape: 0.5 },
    tail: { lift: -0.15, curl: 0.45 },
    near: BEAT[1]!,
    far: farBeat(BEAT[1]!),
    foreN: { ankle: pt(37, -28), foot: pt(44, -21), ang: 1.05 },
    foreF: { ankle: pt(29, -24), foot: pt(35, -18), ang: 0.75 },
    hindN: { knee: pt(-20, -18), hock: pt(-25, -11), ankle: pt(-26.5, -5.4), paw: pt(-25.4, -2.6), tilt: 0.25 },
    hindF: { knee: pt(-14, -18.5), hock: pt(-19, -11), ankle: pt(-20.5, -5.4), paw: pt(-19.4, -2.6), tilt: 0.25 },
    ground: 1,
  },
  {
    trunk: { rot: -0.02, x: 4, y: 0.6 },
    head: { rot: 0.26, x: 2, y: 0.5, gape: 0.12 },
    tail: { lift: 0.12, curl: -0.25 },
    near: BEAT[4]!,
    far: farBeat(BEAT[4]!),
    foreN: { ankle: pt(33, -10), foot: pt(37.6, -3.2), ang: 0.2 },
    foreF: { ankle: pt(23, -10.5), foot: pt(27, -3.2), ang: 0.08 },
    hindN: { knee: pt(-22.5, -17), hock: pt(-27, -10.6), ankle: pt(-27, -5), paw: pt(-25.4, -2.4), tilt: 0.08 },
    hindF: { knee: pt(-16.5, -17), hock: pt(-21, -10.6), ankle: pt(-21, -5), paw: pt(-19.4, -2.4), tilt: 0.08 },
    ground: 1,
  },
  idle(0),
];

export function griffinRig(pose: Pose | undefined): GriffinRig {
  if (!pose) return idle(0);
  if (pose.kind === 'walk') return walk(pose.t);
  if (pose.kind === 'attack') return keyed(STRIKE, pose.t, false);
  return idle(pose.t);
}
