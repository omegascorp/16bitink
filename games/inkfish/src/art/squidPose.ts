/**
 * Giant squid geometry, shared by its drawings and its live rig. Everything
 * is in body px (the same scale as a fish texture, see FISH_RADIUS), origin at
 * the body's centre, arms pointing to +x, the pointed end of the mantle at -x.
 *
 * The squid has eight arms and two long feeding tentacles that end in
 * toothed clubs. A pose says how the arms are held; limbPoints turns it into
 * a polyline per limb, which the game bends a pen-drawn texture along.
 */

export interface Pt {
  readonly x: number;
  readonly y: number;
}

export type LimbKind = 'arm' | 'tentacle';

export interface Limb {
  readonly kind: LimbKind;
  /** Where it leaves the crown of arms around the beak. */
  readonly root: Pt;
  /** Fan angle at full splay, radians from straight ahead (+ is down). */
  readonly spread: number;
  /** Length at rest. */
  readonly length: number;
  /** Behind the body (drawn darker, under it). */
  readonly far: boolean;
  /** Offset of its writhing, so no two arms move in step. */
  readonly phase: number;
  /** Which way its tip likes to curl (+ down, - up). */
  readonly curl: number;
}

/** Half length and half height of the solid body (mantle and head), for hit shapes. */
export const SQUID_BODY = { hl: 124, hh: 30 } as const;
/** Where the arms leave the head. */
export const CROWN_X = 110;
/** Points along each limb; a tentacle's last CLUB_POINTS make up its club. */
export const ARM_POINTS = 14;
export const TENTACLE_POINTS = 19;
const CLUB_POINTS = 6;
/** Length of a tentacle club, kept constant however far the stalk stretches. */
export const CLUB_LENGTH = 56;

export const LIMBS: readonly Limb[] = [
  { kind: 'arm', root: { x: 106, y: -13 }, spread: -0.62, length: 165, far: true, phase: 0.0, curl: -1 },
  { kind: 'arm', root: { x: 109, y: -6 }, spread: -0.3, length: 185, far: true, phase: 1.7, curl: -0.6 },
  { kind: 'tentacle', root: { x: 110, y: -2 }, spread: -0.14, length: 225, far: true, phase: 3.1, curl: -0.4 },
  { kind: 'arm', root: { x: 109, y: 4 }, spread: 0.12, length: 180, far: true, phase: 4.2, curl: 0.7 },
  { kind: 'arm', root: { x: 106, y: 11 }, spread: 0.45, length: 160, far: true, phase: 5.3, curl: 1 },
  { kind: 'arm', root: { x: 112, y: -10 }, spread: -0.45, length: 178, far: false, phase: 0.8, curl: -0.9 },
  { kind: 'arm', root: { x: 114, y: -3 }, spread: -0.16, length: 195, far: false, phase: 2.4, curl: -0.3 },
  { kind: 'tentacle', root: { x: 114, y: 1 }, spread: 0.04, length: 240, far: false, phase: 3.9, curl: 0.5 },
  { kind: 'arm', root: { x: 114, y: 6 }, spread: 0.24, length: 188, far: false, phase: 5.0, curl: 0.8 },
  { kind: 'arm', root: { x: 111, y: 13 }, spread: 0.55, length: 168, far: false, phase: 6.1, curl: 1.1 },
];

export interface SquidPose {
  /** Animation clock, seconds. */
  readonly t: number;
  /** 0: arms held together, 1: fanned wide. */
  readonly splay: number;
  /** How much the arms coil and writhe, 0..1. */
  readonly writhe: number;
  /** 0..1 jetting backwards: arms pressed together into a streamlined trail. */
  readonly stream: number;
  /** Bend from turning, radians: the arms swing behind the turn. */
  readonly lag: number;
  /** Tentacles shot out, 0..1. */
  readonly strike: number;
  /** Where the tentacles strike, in body px. */
  readonly aim: Pt;
}

export const REST_POSE: SquidPose = { t: 0, splay: 0.7, writhe: 0.6, stream: 0, lag: 0, strike: 0, aim: { x: 400, y: 0 } };

/** Points along a limb at rest or writhing, from its root to its tip. */
function restPoints(limb: Limb, pose: SquidPose, count: number, segment: (k: number) => number): Pt[] {
  const { t, splay, writhe, stream, lag } = pose;
  const pts: Pt[] = [limb.root];
  let angle = limb.spread * (0.2 + 0.8 * splay) * (1 - 0.8 * stream);
  let { x, y } = limb.root;
  const calm = 1 - 0.7 * stream;
  for (let k = 1; k < count; k++) {
    const s = k / (count - 1);
    // A wave runs out along the arm; tips curl the most.
    const wave = Math.sin(t * 1.7 + limb.phase - s * 3.4) * writhe * calm * (0.06 + 0.28 * s);
    const coil = limb.curl * s * 0.09 * writhe * calm;
    angle += wave + coil + lag * 0.14 * s;
    x += Math.cos(angle) * segment(k);
    y += Math.sin(angle) * segment(k);
    pts.push({ x, y });
  }
  return pts;
}

/** A tentacle shot straight at the aim, the stalk stretched, the club at full size at its end. */
function strikePoints(limb: Limb, pose: SquidPose): Pt[] {
  const { root } = limb;
  const dx = pose.aim.x - root.x;
  const dy = pose.aim.y - root.y;
  const dist = Math.max(CLUB_LENGTH + 20, Math.hypot(dx, dy));
  const ux = dx / dist;
  const uy = dy / dist;
  const stalk = dist - CLUB_LENGTH;
  const stalkSegs = TENTACLE_POINTS - CLUB_POINTS;
  return Array.from({ length: TENTACLE_POINTS }, (_, k) => {
    const along = k <= stalkSegs ? (k / stalkSegs) * stalk : stalk + ((k - stalkSegs) / (CLUB_POINTS - 1)) * CLUB_LENGTH;
    // A last ripple along the stalk as it snaps straight.
    const ripple = Math.sin(along / 38 - pose.t * 18) * 5 * (1 - pose.strike) * Math.min(1, along / 80);
    return { x: root.x + ux * along - uy * ripple, y: root.y + uy * along + ux * ripple };
  });
}

/** The polyline a limb is drawn along in this pose, in body px. */
export function limbPoints(limb: Limb, pose: SquidPose): Pt[] {
  if (limb.kind === 'arm') {
    const seg = (limb.length * (1 + 0.12 * pose.stream)) / (ARM_POINTS - 1);
    return restPoints(limb, pose, ARM_POINTS, () => seg);
  }
  const stalkSegs = TENTACLE_POINTS - CLUB_POINTS;
  const stalkSeg = (limb.length - CLUB_LENGTH) / stalkSegs;
  const clubSeg = CLUB_LENGTH / (CLUB_POINTS - 1);
  const rest = restPoints(limb, pose, TENTACLE_POINTS, (k) => (k <= stalkSegs ? stalkSeg : clubSeg));
  if (pose.strike <= 0) return rest;
  const out = strikePoints(limb, pose);
  const e = pose.strike;
  return rest.map((p, k) => ({ x: p.x + (out[k]!.x - p.x) * e, y: p.y + (out[k]!.y - p.y) * e }));
}

/** The middle of a tentacle's club in this pose: what actually grabs. */
export function clubPoint(points: readonly Pt[]): Pt {
  return points[TENTACLE_POINTS - Math.ceil(CLUB_POINTS / 2)]!;
}
