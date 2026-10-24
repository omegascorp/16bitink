import { pt } from '../kit';
import type { Pt } from '../pen';
import type { Pose } from './types';
import { farOf, flex, keyed, type WingKey } from './wingRig';

/**
 * How the Seraph moves. The trunk (cuirass, head, arms, sword, wing roots)
 * turns about the waist; the head turns on the neck; the robe hangs from
 * the waist and its hem lags and streams in the wind; arms reach for the
 * hilt by two-bone reach (seraph.ts), so only the hands are posed.
 *
 * - idle: hovering at rest, the sword raised one-handed; the body rises and
 *   settles, the wings slowly flex, the hem and the hair stir, the flames
 *   flicker.
 * - walk: flying, leaning into it: one strong wingbeat, robe and hair
 *   streaming back, the sword carried before it.
 * - attack: a great two-handed sweep: the blade drawn back over the head,
 *   then swept down in front with the wings flung wide (t = 0.5), and low
 *   through the follow-through.
 */

/** The trunk turns about the waist. */
export const WAIST = pt(0, -46);
/** The head turns about the neck. */
export const NECK = pt(2, -70);

export interface SeraphRig {
  readonly trunk: { readonly rot: number; readonly x: number; readonly y: number };
  readonly head: { readonly rot: number; readonly x: number; readonly y: number };
  /** Hair: blown back (0..1) and stirring (−1..1). */
  readonly hair: { readonly stream: number; readonly stir: number };
  /** The wind on the hem (units at the hem, world), and a ripple travelling along it. */
  readonly robe: { readonly wx: number; readonly wy: number; readonly ripple: number; readonly phase: number };
  /** The sandalled foot: turned (toes down) as the robe lifts. */
  readonly foot: number;
  readonly near: WingKey;
  readonly far: WingKey;
  /** The sword hand, trunk space, and the blade's angle (trunk space, radians). */
  readonly hand: Pt;
  readonly blade: number;
  /** 0 one-handed (the far hand down at the side), 1 both hands on the grip. */
  readonly grip: number;
  /** Flame height, 1 as drawn. */
  readonly flame: number;
  readonly ground: number;
}

const NEAR_REST: WingKey = {
  shoulder: pt(-6, -64), elbow: pt(-19, -74), wrist: pt(-15, -87), hand: pt(-27, -90.6),
  primaries: { n: 9, a0: -3.16, a1: -2.5, l0: 20, l1: 15 },
  secondaries: { n: 9, a: 2.42, l0: 21, l1: 24 },
};

const FAR_REST: WingKey = {
  shoulder: pt(-1, -66), elbow: pt(-6, -79), wrist: pt(0, -89), hand: pt(-5.4, -93),
  primaries: { n: 6, a0: -2.5, a1: -1.8, l0: 13, l1: 10 },
  secondaries: { n: 6, a: 2.2, l0: 15, l1: 16 },
};

const W = (elbow: [number, number], wrist: [number, number], hand: [number, number], a0: number, a1: number, l0: number, l1: number, sa: number, s0: number, s1: number): WingKey => ({
  shoulder: NEAR_REST.shoulder, elbow: pt(...elbow), wrist: pt(...wrist), hand: pt(...hand),
  primaries: { n: 9, a0, a1, l0, l1 },
  secondaries: { n: 9, a: sa, l0: s0, l1: s1 },
});

/** One wingbeat, six keys a frame apart: top, spreading, sweeping down, bottom, folding, rising. */
const BEAT: readonly WingKey[] = [
  W([-17, -76], [-12, -88], [-21, -93], -2.9, -2.25, 19, 14, 2.45, 20, 23),
  W([-20, -71], [-28, -80], [-40, -82], -3.15, -2.7, 18, 14, 2.4, 20, 23),
  W([-18, -60], [-28, -54], [-37, -47], -3.6, -4.0, 17, 14, 3.7, 18, 21),
  W([-12, -52], [-15, -40], [-19, -29], -4.5, -4.8, 17, 15, 3.3, 18, 20),
  W([-16, -66], [-13, -77], [-21, -79], -3.75, -4.25, 18, 15, 2.5, 17, 19),
  W([-17, -71], [-13, -84], [-22, -88], -3.3, -3.1, 18, 15, 2.5, 19, 22),
];

/** Flung wide behind for the blow. */
const FLARE: WingKey = W([-20, -68], [-30, -76], [-42, -77], -3.2, -2.75, 18, 14, 2.35, 20, 23);
/** Thrown up for the wind-up. */
const RAISED: WingKey = W([-18, -76], [-16, -89], [-27, -93], -3.0, -2.35, 19, 13, 2.4, 20, 23);

const farBeat = (k: WingKey): WingKey => farOf(k, FAR_REST.shoulder, { np: 6, ns: 6, sx: 0.5, turn: 0.35 });

export const HAND = pt(15.4, -70);
export const BLADE = -0.86;

const TAU = Math.PI * 2;

function idle(t: number): SeraphRig {
  const s = Math.sin(TAU * t);
  return {
    trunk: { rot: 0.012 * s, x: 0, y: 0.7 - 1 * s },
    head: { rot: 0.035 * Math.sin(TAU * (t - 0.1)), x: 0, y: 0 },
    hair: { stream: 0, stir: Math.sin(TAU * (t - 0.2)) },
    robe: { wx: 0.9 * Math.sin(TAU * (t - 0.25)), wy: 0, ripple: 0.6, phase: TAU * t },
    foot: 0,
    near: flex(NEAR_REST, 1.3 * Math.sin(TAU * (t - 0.05)) - 0.9),
    far: flex(FAR_REST, 1.1 * Math.sin(TAU * (t - 0.12)) - 0.9),
    hand: pt(HAND.x + 0.3 * s, HAND.y + 1.4 - 0.4 * s),
    blade: BLADE + 0.035 * Math.sin(TAU * (t - 0.15)),
    grip: 0,
    flame: 0.86,
    ground: 1,
  };
}

function walk(t: number): SeraphRig {
  const lift = Math.sin(TAU * (t - 0.25));
  return {
    trunk: { rot: 0.16 + 0.02 * lift, x: 2, y: 6 - 2 * lift },
    head: { rot: -0.1, x: 0, y: 0.6 * lift },
    hair: { stream: 0.55, stir: 1.2 * Math.sin(TAU * (t - 0.3)) },
    robe: { wx: -11 + 1.2 * lift, wy: -6 - 1.5 * lift, ripple: 1.6, phase: TAU * t },
    foot: 0.9,
    near: keyed(BEAT, t, true),
    far: farBeat(keyed(BEAT, t - 0.05, true)),
    hand: pt(HAND.x - 0.5, HAND.y + 1),
    blade: -0.62 + 0.04 * lift,
    grip: 0,
    flame: 0.85,
    ground: 0.3,
  };
}

/** The sweep, five keys a frame apart: stance, drawn back, the blow, follow-through, stance. */
const SWEEP: readonly SeraphRig[] = [
  idle(0),
  {
    trunk: { rot: -0.1, x: -2, y: 0 },
    head: { rot: -0.1, x: 0, y: 0 },
    hair: { stream: 0.2, stir: 0.6 },
    robe: { wx: 2.4, wy: -0.6, ripple: 0.8, phase: 1 },
    foot: 0,
    near: RAISED,
    far: farBeat(RAISED),
    hand: pt(1.5, -86),
    blade: -2.8,
    grip: 1,
    flame: 0.5,
    ground: 1,
  },
  {
    trunk: { rot: 0.2, x: 2, y: 1 },
    head: { rot: 0.12, x: 0.5, y: 0 },
    hair: { stream: 0.7, stir: -0.6 },
    robe: { wx: -6, wy: -2.4, ripple: 1.2, phase: 2.2 },
    foot: 0.2,
    near: FLARE,
    far: farBeat(FLARE),
    hand: pt(14, -60),
    blade: 0.15,
    grip: 1,
    flame: 0.9,
    ground: 1,
  },
  {
    trunk: { rot: 0.1, x: 1, y: 0.5 },
    head: { rot: 0.08, x: 0, y: 0 },
    hair: { stream: 0.4, stir: 0.4 },
    robe: { wx: -3, wy: -1, ripple: 1, phase: 3.4 },
    foot: 0.1,
    near: BEAT[3]!,
    far: farBeat(BEAT[3]!),
    hand: pt(12, -53),
    blade: 1.15,
    grip: 1,
    flame: 0.9,
    ground: 1,
  },
  idle(0),
];

export function seraphRig(pose: Pose | undefined): SeraphRig {
  if (!pose) return idle(0);
  if (pose.kind === 'walk') return walk(pose.t);
  if (pose.kind === 'attack') return keyed(SWEEP, pose.t, false);
  return idle(pose.t);
}
