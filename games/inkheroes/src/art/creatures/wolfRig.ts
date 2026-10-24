import { pt } from '../kit';
import type { Pt } from '../pen';
import { bump, clamp01, frac, keyed, lerpN, smooth, turn } from './beastRig';
import type { Pose } from './types';

/**
 * The wolf's poses, as numbers the drawing reads: where the body sits and
 * how it pitches and flexes, where each paw is and how far it is curled,
 * the head's tilt and gape, the ears and the tail. Idle pants; the walk is
 * a bounding gallop; the attack crouches, lunges and snaps.
 */

/** A paw: its joint (y −3 is standing on the ground) and its curl (+ folds it back under). */
export interface PawPose {
  readonly x: number;
  readonly y: number;
  readonly tilt: number;
}

export type LegId = 'farFore' | 'farHind' | 'nearHind' | 'nearFore';

export interface WolfPose {
  /** Body shift, its pitch (+ dips the front) and the back's flex (+ arches it, − stretches it hollow). */
  readonly bx: number;
  readonly by: number;
  readonly pitch: number;
  readonly arch: number;
  /** Ribs filled, 0..1. */
  readonly breath: number;
  readonly paws: Readonly<Record<LegId, PawPose>>;
  /** Head tilt (+ nose down), jaw gape (radians), ears turned back (radians, − lays them back). */
  readonly tilt: number;
  readonly gape: number;
  readonly ear: number;
  /** Tail raised (+) or tucked (−) at the root, and curled along its length. */
  readonly tailLift: number;
  readonly tailCurl: number;
}

/** The legs at rest: socket, elbow or knee, wrist or hock, paw; widths; which way the middle joint bows. */
export const LEGS: Readonly<Record<LegId, { joints: readonly Pt[]; widths: readonly number[]; bow: Pt; far: boolean; fore: boolean; seed: number }>> = {
  farFore: { joints: [pt(12, -31), pt(12, -20), pt(10.6, -9.5), pt(12.6, -3)], widths: [8, 5.6, 3.4, 3.1], bow: pt(-1, 0), far: true, fore: true, seed: 20 },
  farHind: { joints: [pt(-13, -30), pt(-18, -21), pt(-24.6, -12.6), pt(-20, -3)], widths: [8, 6, 3.4, 3], bow: pt(1, 0), far: true, fore: false, seed: 21 },
  nearHind: { joints: [pt(-21, -27), pt(-28, -21), pt(-36.5, -13), pt(-40.4, -3)], widths: [9, 7, 3.6, 3.2], bow: pt(1, 0), far: false, fore: false, seed: 22 },
  nearFore: { joints: [pt(21, -31), pt(23.4, -21), pt(28.6, -10), pt(32.4, -3)], widths: [8.6, 6.2, 3.8, 3.4], bow: pt(-1, 0), far: false, fore: true, seed: 23 },
};

const restPaw = (id: LegId): PawPose => {
  const p = LEGS[id].joints[3]!;
  return { x: p.x, y: p.y, tilt: 0 };
};

export const REST: WolfPose = {
  bx: 0, by: 0, pitch: 0, arch: 0, breath: 0,
  paws: { farFore: restPaw('farFore'), farHind: restPaw('farHind'), nearHind: restPaw('nearHind'), nearFore: restPaw('nearFore') },
  tilt: 0, gape: 0, ear: 0, tailLift: 0, tailCurl: 0,
};

/** Panting: the ribs fill twice a loop, the jaw drops and the tongue shows, an ear flicks, the tail sways. */
function idle(t: number): WolfPose {
  const pant = 0.5 - 0.5 * Math.cos(Math.PI * 4 * t);
  const sway = Math.sin(Math.PI * 2 * t);
  return {
    ...REST,
    by: -0.5 * pant,
    breath: pant,
    tilt: 0.03 * Math.sin(Math.PI * 2 * t - 0.6) - 0.02 * pant,
    gape: 0.06 + 0.16 * pant,
    ear: -0.45 * bump(t, 0.5, 0.17),
    // The tail sways forward of where it hangs, never further back (the frame ends behind it).
    tailLift: -0.07 + 0.06 * sway,
    tailCurl: -0.06 + 0.06 * Math.sin(Math.PI * 2 * t - 1.2),
  };
}

/** Where one leg is in the gallop: on the ground sliding back, or lifted, folded and swung forward. */
function stride(t: number, land: number, cx: number, half: number, fore: boolean): PawPose {
  const DUTY = 0.36;
  const p = frac(t - land);
  if (p < DUTY) {
    const u = p / DUTY;
    const tilt = lerpN(-0.15, 0.55, u * u);
    // Pushing off, the paw rolls onto its toes: the heel comes up off the ground.
    return { x: cx + half - 2 * half * u, y: -3 - (tilt > 0 ? 4.2 : 2.4) * Math.abs(Math.sin(tilt)), tilt };
  }
  const v = (p - DUTY) / (1 - DUTY);
  const fold = Math.sin(Math.PI * clamp01(v / 0.78));
  const reachOut = smooth((v - 0.55) / 0.45);
  const x = cx - half + 2 * half * smooth(v * 1.05) + (fore ? 5 : 2) * Math.sin(Math.PI * v);
  const lift = (fore ? 11 : 8) * Math.sin(Math.PI * Math.pow(v, 0.6));
  const tilt = lerpN(0.55, -0.15, smooth(v)) + (fore ? 1.9 : 1.1) * fold - (fore ? 0.35 : 0.1) * reachOut;
  return { x, y: -3 - lift, tilt };
}

/**
 * The bounding gallop, one loop: t 0 stretched out in the air, the
 * forefeet land (1/6) and pass under, t 1/2 gathered in the air with the
 * back arched, the hind feet land ahead of where the forefeet left (2/3)
 * and drive the body off again.
 */
function walk(t: number): WolfPose {
  const w = Math.PI * 2;
  return {
    ...REST,
    by: 2.2 - 4 * Math.cos(2 * w * t),
    pitch: 0.09 * Math.cos(w * (t - 0.3)),
    arch: -0.12 * Math.cos(w * t),
    breath: 0.4,
    paws: {
      nearFore: stride(t, 0.1, 25, 12, true),
      farFore: stride(t, 0.16, 18, 12, true),
      farHind: stride(t, 0.58, -24, 11, false),
      nearHind: stride(t, 0.64, -31, 11, false),
    },
    tilt: -0.05 * Math.cos(w * (t - 0.3)) + 0.06 * Math.cos(w * t) + 0.04,
    gape: 0.14 + 0.06 * Math.sin(2 * w * t),
    ear: -0.3,
    tailLift: -0.1 + 0.08 * Math.cos(w * (t - 0.45)),
    tailCurl: -0.1 - 0.1 * Math.sin(w * (t - 0.2)),
  };
}

type AttackKey = Record<'bx' | 'by' | 'pitch' | 'arch' | 'tilt' | 'gape' | 'ear' | 'tailLift' | 'nfx' | 'nfy' | 'nft' | 'ffx' | 'ffy' | 'fft' | 'nhx' | 'fhx', number>;

/** The attack starts and ends on the first idle frame. */
const STILL = idle(0);

const fromRest = (o: Partial<AttackKey>): AttackKey => ({
  bx: 0, by: 0, pitch: 0, arch: 0, tilt: STILL.tilt, gape: STILL.gape, ear: 0, tailLift: STILL.tailLift,
  nfx: REST.paws.nearFore.x, nfy: -3, nft: 0, ffx: REST.paws.farFore.x, ffy: -3, fft: 0, nhx: REST.paws.nearHind.x, fhx: REST.paws.farHind.x,
  ...o,
});

/** Crouch (wind-up), lunge and snap (contact), the head wrenching down (follow-through), back to the stance. */
const ATTACK: readonly (readonly [number, AttackKey])[] = [
  [0, fromRest({})],
  [0.27, fromRest({ bx: -7, by: 6, pitch: 0.07, arch: 0.07, tilt: -0.08, gape: 0.5, ear: -0.5, tailLift: -0.65 })],
  [0.5, fromRest({ bx: 0.5, by: -5, pitch: -0.11, arch: -0.08, tilt: 0.1, gape: 0.06, ear: -0.4, tailLift: -0.12, nfx: 37, nfy: -20, nft: 1.1, ffx: 30, ffy: -15, fft: 1.4, nhx: -46, fhx: -30 })],
  [0.75, fromRest({ bx: 1, by: 2.5, pitch: 0.08, arch: 0.03, tilt: 0.2, gape: 0, ear: -0.3, tailLift: -0.08, nfx: 36, ffx: 22, nhx: -40, fhx: -26 })],
  [1, fromRest({})],
];

function attack(t: number): WolfPose {
  const k = keyed(ATTACK, t);
  return {
    ...REST,
    bx: k.bx, by: k.by, pitch: k.pitch, arch: k.arch, breath: 0.6 * Math.sin(Math.PI * t),
    paws: {
      nearFore: { x: k.nfx, y: k.nfy, tilt: k.nft },
      farFore: { x: k.ffx, y: k.ffy, tilt: k.fft },
      nearHind: { x: k.nhx, y: -3, tilt: 0.4 * smooth((t - 0.3) * 5) * (1 - smooth((t - 0.6) * 5)) },
      farHind: { x: k.fhx, y: -3, tilt: 0 },
    },
    tilt: k.tilt, gape: k.gape, ear: k.ear, tailLift: k.tailLift, tailCurl: STILL.tailCurl,
  };
}

export function wolfPose(pose: Pose | undefined): WolfPose {
  if (!pose) return idle(0);
  if (pose.kind === 'walk') return walk(pose.t);
  if (pose.kind === 'attack') return attack(pose.t);
  return idle(pose.t);
}

/** The body's pivot: pitch and flex turn about it. */
const PIVOT = pt(0, -38);

/**
 * The warp that carries the rest-space body into the pose: the ribs fill,
 * the back flexes (front and rear halves turning opposite ways about the
 * middle), the whole body pitches and shifts.
 */
export function bodyWarp(p: WolfPose): (q: Pt) => Pt {
  return (q) => {
    // The barrel swells down and out as the ribs fill.
    const ribs = clamp01(1 - Math.abs(q.x - 10) / 26);
    const y = q.y + p.breath * 1.3 * ribs * clamp01((q.y + 44) / 20);
    const flexed = turn(pt(q.x, y), PIVOT, p.arch * Math.max(-1, Math.min(1, q.x / 34)));
    const pitched = turn(flexed, PIVOT, p.pitch);
    return pt(pitched.x + p.bx, pitched.y + p.by);
  };
}
