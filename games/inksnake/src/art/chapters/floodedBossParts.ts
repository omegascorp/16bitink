import { cub, pt } from '../kit';
import type { Pt } from '../pen';
import { tube } from '../critters/tomcatParts';
import { leg, type Leg, type LegKey, makeLeg, resample, trunkShape } from './barrensCrittersBeast';
import { smoothLoop } from './floodedCrittersKit';

/**
 * The Jaguar's geometry, seen from above facing +x: a deep-chested,
 * heavy-shouldered trunk, a big broad head with a short powerful muzzle and
 * small round ears, thick legs on broad paws, and a fairly short, thick
 * tail. Board px about the trunk's middle (each pose shifts it to fit the
 * frame and to keep its middle where the game puts the cat).
 */
export type JagPose = 'walk0' | 'walk1' | 'crouch' | 'leap' | 'swim0' | 'swim1' | 'shake' | 'drink' | 'look' | 'startle';
export const JAG_POSES: readonly JagPose[] = ['walk0', 'walk1', 'crouch', 'leap', 'swim0', 'swim1', 'shake', 'drink', 'look', 'startle'];

export type JagEyes = 'keen' | 'fixed' | 'wide' | 'soft';
export type EarSet = 'up' | 'fwd' | 'flat';

export interface Jag {
  readonly pose: JagPose;
  readonly trunk: Pt[];
  /** From the coat's own frame (the trunk at rest) to this pose's (stretched, swayed): for laying the rosettes. */
  readonly map: (p: Pt) => Pt;
  readonly sx: number;
  readonly sy: number;
  readonly head: Pt[];
  readonly C: Pt;
  /** The muzzle's reach from the head's centre to the nose. */
  readonly snout: number;
  /** How far the head tips: 1 level, below 1 lowered (drinking), above 1 raised towards the eye (looking). */
  readonly lift: number;
  readonly ears: EarSet;
  readonly eyes: JagEyes;
  /** Hind +y, hind −y, fore +y, fore −y. */
  readonly legs: readonly Leg[];
  readonly tail: { readonly spine: Pt[]; readonly shape: Pt[] };
  /** 0..1: how far the fur stands up (a fright, a shake). */
  readonly puff: number;
  /** Swimming: everything but the head, the top of the back and the tail lies under the water. */
  readonly swim: boolean;
  readonly shift: Pt;
}

/** The head is drawn this much bigger than its plan: a jaguar's head is massive. */
export const HEAD_K = 1.2;

/** The trunk's half width from the neck back to the rump: deep at the chest, a little waist, solid haunches. */
export const TRUNK: readonly (readonly [number, number])[] = [[37, 8.5], [30, 11.4], [24, 14.4], [15, 16.4], [3, 13.6], [-9, 13], [-24, 15.6], [-34, 13], [-40, 0]];

interface Spec {
  readonly sx: number;
  readonly sy: number;
  readonly bend: number;
  readonly C: Pt;
  readonly snout: number;
  readonly lift: number;
  readonly ears: EarSet;
  readonly eyes: JagEyes;
  readonly legs: readonly [LegKey, LegKey, LegKey, LegKey];
  readonly tail: readonly Pt[];
  readonly puff: number;
  readonly swim?: boolean;
  readonly shift: Pt;
}

const FORE = { fwd: leg(pt(20, 9), pt(28, 15), pt(38, 17)), back: leg(pt(18, 9), pt(13, 16), pt(6, 18.5)), stand: leg(pt(19, 9), pt(22, 15.5), pt(24, 18)) };
const HIND = { fwd: leg(pt(-26, 10), pt(-18, 17), pt(-10, 18.5)), back: leg(pt(-30, 10), pt(-38, 16.5), pt(-47, 16.5)), stand: leg(pt(-28, 10), pt(-30, 16.5), pt(-27, 19)) };

function walk(k: 1 | -1): Spec {
  const a = k === 1;
  return {
    sx: 1, sy: 1, bend: 1.4 * k, C: pt(42, 1.2 * k), snout: 15.5, lift: 1, ears: 'up', eyes: 'keen',
    // A prowl: the legs of one side reach together, the head carried low and level.
    legs: [a ? HIND.fwd : HIND.back, a ? HIND.back : HIND.fwd, a ? FORE.fwd : FORE.back, a ? FORE.back : FORE.fwd],
    tail: cub(pt(-37, 0), pt(-52, -2 * k), pt(-62, 10 * k), pt(-78, 14 * k), 18), puff: 0, shift: pt(-4, 0),
  };
}

const SPECS: Readonly<Record<JagPose, Spec>> = {
  walk0: walk(1),
  walk1: walk(-1),
  crouch: {
    sx: 0.9, sy: 1.12, bend: 0, C: pt(38, 0), snout: 15.0, lift: 0.96, ears: 'fwd', eyes: 'fixed',
    // Low at the bank: elbows jutting out, hind feet drawn up under the haunches, ready to spring.
    legs: [leg(pt(-26, 10), pt(-32, 19), pt(-22, 20.5)), leg(pt(-26, 10), pt(-32, 19.5), pt(-22.5, 20)), leg(pt(18, 9), pt(20, 19), pt(31, 17)), leg(pt(18, 9), pt(20, 19.5), pt(32, 16.5))],
    tail: cub(pt(-34, 0), pt(-50, 1), pt(-62, -2), pt(-76, 6), 18), puff: 0, shift: pt(-2, 0),
  },
  leap: {
    sx: 1.14, sy: 0.9, bend: 0, C: pt(48, 0), snout: 15.0, lift: 1.04, ears: 'fwd', eyes: 'fixed',
    // Stretched out in the air: forelegs flung forward, hind legs trailing straight back, the tail a rudder.
    legs: [leg(pt(-33, 9), pt(-46, 13), pt(-60, 12)), leg(pt(-33, 9), pt(-46, 13.5), pt(-59, 13)), leg(pt(24, 8), pt(38, 13), pt(54, 12)), leg(pt(24, 8), pt(38, 12.5), pt(55, 11))],
    tail: cub(pt(-42, 0), pt(-56, 0), pt(-66, -2), pt(-80, -1), 18), puff: 0, shift: pt(1, 0),
  },
  swim0: {
    sx: 1, sy: 0.96, bend: 0.6, C: pt(42, 0), snout: 15.5, lift: 1.05, ears: 'up', eyes: 'keen',
    legs: [leg(pt(-28, 10), pt(-36, 15), pt(-44, 14)), leg(pt(-28, 10), pt(-30, 15), pt(-26, 18)), leg(pt(20, 9), pt(28, 16), pt(36, 18)), leg(pt(20, 9), pt(16, 16), pt(10, 17))],
    tail: cub(pt(-37, 0), pt(-52, 0), pt(-64, 3), pt(-78, 4), 18), puff: 0, swim: true, shift: pt(-4, 0),
  },
  swim1: {
    sx: 1, sy: 0.96, bend: -0.6, C: pt(42, 0), snout: 15.5, lift: 1.05, ears: 'up', eyes: 'keen',
    legs: [leg(pt(-28, 10), pt(-30, 15), pt(-26, 18)), leg(pt(-28, 10), pt(-36, 15), pt(-44, 14)), leg(pt(20, 9), pt(16, 16), pt(10, 17)), leg(pt(20, 9), pt(28, 16), pt(36, 18))],
    tail: cub(pt(-37, 0), pt(-52, 0), pt(-64, -3), pt(-78, -4), 18), puff: 0, swim: true, shift: pt(-4, 0),
  },
  shake: {
    sx: 0.96, sy: 1.08, bend: 4, C: pt(40, -5), snout: 14.5, lift: 1, ears: 'flat', eyes: 'soft',
    // Shaking off the water from nose to tail, the body twisting, the fur thrown up in wet spikes.
    legs: [HIND.stand, HIND.stand, FORE.stand, FORE.stand],
    tail: cub(pt(-37, 3), pt(-52, 8), pt(-62, -6), pt(-76, -12), 18), puff: 0.8, shift: pt(-3, 0),
  },
  drink: {
    sx: 0.95, sy: 1.04, bend: 0, C: pt(39, 0), snout: 11.0, lift: 0.86, ears: 'up', eyes: 'soft',
    // Head down at the water's edge, lapping; forepaws planted wide, the haunches settled behind.
    legs: [leg(pt(-27, 10), pt(-31, 18), pt(-23, 20)), leg(pt(-27, 10), pt(-31, 18.5), pt(-23, 19.5)), leg(pt(19, 9), pt(26, 18), pt(32, 21)), leg(pt(19, 9), pt(26, 18.5), pt(32.5, 20.5))],
    tail: cub(pt(-35, 0), pt(-50, -1), pt(-60, 8), pt(-72, 16), 18), puff: 0, shift: pt(-3, 0),
  },
  look: {
    sx: 0.98, sy: 1, bend: 0, C: pt(41, 0), snout: 14.0, lift: 1.12, ears: 'up', eyes: 'wide',
    // Head up and still, ears pricked, listening.
    legs: [HIND.stand, HIND.stand, FORE.stand, FORE.stand],
    tail: cub(pt(-37, 0), pt(-52, 1), pt(-62, -10), pt(-72, -18), 18), puff: 0, shift: pt(-3, 0),
  },
  startle: {
    sx: 0.92, sy: 1.12, bend: 0, C: pt(38, 0), snout: 15.0, lift: 1.06, ears: 'flat', eyes: 'wide',
    // Springing back off all four feet, splayed, the fur on end.
    legs: [leg(pt(-26, 10), pt(-34, 20), pt(-46, 24)), leg(pt(-26, 10), pt(-35, 20), pt(-47, 23)), leg(pt(16, 9), pt(22, 20), pt(30, 26)), leg(pt(16, 9), pt(23, 20), pt(31, 25))],
    tail: cub(pt(-34, 0), pt(-50, 3), pt(-62, -8), pt(-76, -16), 18), puff: 1, shift: pt(-1, 0),
  },
};

/** The head from above round C: a round crown, the cheeks flaring widest behind the eyes, a broad short muzzle out to the nose at `snout`. */
function headOf(C: Pt, snout: number, K: number): Pt[] {
  const m = (snout - 15.3) / 5.4;
  const keys: readonly (readonly [number, number])[] = [[-10, 0], [-9.4, 5.6], [-6, 9.4], [-0.5, 11.6], [4.5, 10.6], [8 + m, 7.6], [11 + 3.5 * m, 5.6], [13.6 + 4.6 * m, 3.6], [15 + 5.2 * m, 1.4], [15.3 + 5.4 * m, 0]];
  const half = keys.map(([x, y]) => pt(C.x + x * K, C.y + y * K));
  const other = [...keys].reverse().slice(1, -1).map(([x, y]) => pt(C.x + x * K, C.y - y * K));
  return smoothLoop([...half, ...other], 4);
}

/** The whole cat for a pose. */
export function jaguar(pose: JagPose): Jag {
  const s = SPECS[pose];
  const front = TRUNK[0]![0] * s.sx;
  const back = TRUNK[TRUNK.length - 1]![0] * s.sx;
  const mid = (front + back) / 2;
  const sway = (x: number): number => s.bend * ((x - mid) / ((front - back) / 2)) ** 2;
  const map = (p: Pt): Pt => pt(p.x * s.sx, p.y * s.sy + sway(p.x * s.sx));
  const trunk = trunkShape(TRUNK.map(([x, w]) => [x * s.sx, w * s.sy] as const), s.bend, 0.6 + s.puff * 1.4);
  const K = HEAD_K * Math.max(1, s.lift);
  const head = resample(headOf(s.C, s.snout, K), 1.4);
  const legs = s.legs.map((k, i) => makeLeg(k, i % 2 === 0 ? 1 : -1, i >= 2, i >= 2 ? 9 : 10.5, i >= 2 ? 6.4 : 6.6));
  const spine = [...s.tail];
  const shape = resample(tube(spine, (u) => 10.5 - 3.6 * u + (u > 0.9 ? -(u - 0.9) * 24 : 0)), 1.5);
  return { pose, trunk, map, sx: s.sx, sy: s.sy, head, C: s.C, snout: s.snout, lift: s.lift, ears: s.ears, eyes: s.eyes, legs, tail: { spine, shape }, puff: s.puff, swim: s.swim ?? false, shift: s.shift };
}
