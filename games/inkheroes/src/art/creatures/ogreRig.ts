import { pt } from '../kit';
import type { Pt } from '../pen';
import { bump, frac, keyed, lerpN, smooth } from './beastRig';
import type { Pose } from './types';

/**
 * The ogre's poses, as numbers the drawing reads. The hips carry the legs'
 * sockets and the loincloth; the upper body leans about the hips; the
 * fists are placed in the upper body's own (rest) space and the arms reach
 * them by IK; the club turns in the near fist. Idle heaves with breath,
 * the walk is a heavy stomp rocking from foot to foot, the attack hoists
 * the club over the head and smashes it into the ground in front.
 */

/** A foot: its heel's x on the ground, how high it is lifted, its tilt (+ toes down, rolling onto them). */
export interface FootPose {
  readonly x: number;
  readonly lift: number;
  readonly tilt: number;
}

export interface OgrePose {
  /** Hips shifted; the upper body leaned about them (+ forward). */
  readonly hipX: number;
  readonly hipY: number;
  readonly lean: number;
  /** Lungs filled, 0..1: the belly and chest swell, the shoulders rise. */
  readonly breath: number;
  /** Head nodded (+ chin down). */
  readonly nod: number;
  readonly near: FootPose;
  readonly far: FootPose;
  /** The near fist, in upper-body space, and the club's turn in it (radians from resting on the shoulder). */
  readonly fist: Pt;
  readonly club: number;
  /** 0 the near elbow hangs down; 1 it is raised up and back, as when the arm lifts over the head. */
  readonly raise: number;
  /** The far fist, in upper-body space. */
  readonly farFist: Pt;
  /** The loincloth's front flap swung forward (+) or back. */
  readonly flap: number;
  /** The club's blow on the ground: 1 at the moment of impact, fading after. */
  readonly impact: number;
}

/** Where the hips turn (and the upper body leans) from. */
export const HIP = pt(-2, -38);
export const NEAR_FIST = pt(16.2, -59.6);
export const FAR_FIST = pt(37.6, -36);
export const FEET = { near: 7, far: -21 } as const;

export const REST: OgrePose = {
  hipX: 0, hipY: 0, lean: 0, breath: 0, nod: 0,
  near: { x: FEET.near, lift: 0, tilt: 0 },
  far: { x: FEET.far, lift: 0, tilt: 0 },
  fist: NEAR_FIST, club: 0, raise: 0, farFist: FAR_FIST, flap: 0, impact: 0,
};

/** Heavy breathing: the belly and shoulders heave, the club shifts in the fist, the head nods with it. */
function idle(t: number): OgrePose {
  const w = Math.PI * 2;
  const b = 0.5 - 0.5 * Math.cos(w * t);
  return {
    ...REST,
    hipY: 0.3 * b,
    lean: -0.012 * b,
    breath: b,
    nod: 0.035 * Math.sin(w * t - 0.9),
    fist: pt(NEAR_FIST.x + 0.6 * Math.sin(w * t), NEAR_FIST.y - 0.6 * b),
    // The club settles back on the shoulder as it rises (its head must stay inside the frame).
    club: 0.03 * Math.sin(w * t - 0.6) - 0.06 * b,
    farFist: pt(FAR_FIST.x + 0.8 * Math.sin(w * t - 1.4), FAR_FIST.y - 0.8 * b),
    flap: 0.03 * Math.sin(w * t - 1.8),
  };
}

/** One foot through the stomp: planted and rolling back under the body, then hoisted, carried forward and slammed down. */
function step(t: number, land: number, x0: number): FootPose {
  const DUTY = 0.58;
  const HALF = 7;
  const p = frac(t - land);
  if (p < DUTY) {
    const u = p / DUTY;
    return { x: x0 + HALF - 2 * HALF * u, lift: 0, tilt: 0.35 * smooth((u - 0.6) / 0.4) };
  }
  const v = (p - DUTY) / (1 - DUTY);
  return { x: x0 - HALF + 2 * HALF * smooth(v), lift: 10 * Math.sin(Math.PI * Math.pow(v, 0.85)), tilt: lerpN(0.35, -0.12, smooth(v * 1.3)) };
}

/** The stomp, one loop of two heavy steps: near foot down at 0, far foot at 1/2; the body sinks onto each and rocks over it. */
function walk(t: number): OgrePose {
  const w = Math.PI * 2;
  // The body drops hard onto each footfall and labours up between them.
  const sink = Math.max(bump(t, 0.06, 0.2), bump(t, 0.56, 0.2));
  return {
    ...REST,
    hipX: 1.4 * Math.sin(w * t),
    hipY: 0.4 + 3.2 * sink,
    lean: 0.04 + 0.04 * Math.sin(w * t),
    breath: 0.5,
    nod: 0.06 * sink - 0.02,
    near: step(t, 0, FEET.near),
    far: step(t, 0.5, FEET.far),
    fist: pt(NEAR_FIST.x, NEAR_FIST.y + 1.6 * sink),
    club: -0.06 - 0.05 * sink,
    farFist: pt(FAR_FIST.x + 5 * Math.cos(w * t), FAR_FIST.y - 1.5 * Math.abs(Math.cos(w * t)) + 1.2 * sink),
    flap: 0.12 * Math.sin(w * (t - 0.12)),
  };
}

type Key = Record<'hipX' | 'hipY' | 'lean' | 'nod' | 'nearX' | 'nearLift' | 'nearTilt' | 'fx' | 'fy' | 'club' | 'raise' | 'gx' | 'gy' | 'flap' | 'impact', number>;

/** The attack starts and ends on the first idle frame. */
const STILL = idle(0);

const key = (o: Partial<Key>): Key => ({
  hipX: 0, hipY: 0, lean: 0, nod: STILL.nod, nearX: FEET.near, nearLift: 0, nearTilt: 0,
  fx: STILL.fist.x, fy: STILL.fist.y, club: STILL.club, raise: 0, gx: STILL.farFist.x, gy: STILL.farFist.y, flap: STILL.flap, impact: 0,
  ...o,
});

/**
 * The smash: the club hoisted level over the head in both fists, the weight
 * back and the near foot raised (wind-up); the foot stamped forward as the
 * club comes over and down onto the ground in front (contact); the body
 * bowed over it as the dust flies (follow-through); back onto the shoulder.
 */
const ATTACK: readonly (readonly [number, Key])[] = [
  [0, key({})],
  [0.27, key({ hipX: -1.5, hipY: 0.5, lean: -0.04, nod: 0.04, nearX: 9, nearLift: 5, nearTilt: -0.15, fx: 15.5, fy: -86, club: -0.49, raise: 0.35, gx: 3, gy: -90, flap: -0.12 })],
  [0.5, key({ hipX: 3, hipY: 3.4, lean: 0.15, nod: 0.12, nearX: 13, fx: 13.5, fy: -67, club: 3.52, gx: 23.5, gy: -48, flap: 0.18, impact: 1 })],
  [0.75, key({ hipX: 2.5, hipY: 3.8, lean: 0.12, nod: 0.08, nearX: 13, fx: 14, fy: -65, club: 3.58, gx: 24, gy: -46, flap: 0.05, impact: 0.45 })],
  [1, key({})],
];

function attack(t: number): OgrePose {
  const k = keyed(ATTACK, t);
  return {
    ...REST,
    hipX: k.hipX, hipY: k.hipY, lean: k.lean, nod: k.nod,
    breath: 0.6 * Math.sin(Math.PI * t),
    near: { x: k.nearX, lift: k.nearLift, tilt: k.nearTilt },
    fist: pt(k.fx, k.fy), club: k.club, raise: k.raise, farFist: pt(k.gx, k.gy), flap: k.flap,
    impact: t >= 0.45 ? k.impact : 0,
  };
}

export function ogrePose(pose: Pose | undefined): OgrePose {
  if (!pose) return idle(0);
  if (pose.kind === 'walk') return walk(pose.t);
  if (pose.kind === 'attack') return attack(pose.t);
  return idle(pose.t);
}
