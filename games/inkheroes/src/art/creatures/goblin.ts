import { pt, type Draw } from '../kit';
import type { Pt } from '../pen';
import { bracer, C, claw, cleaver, ear, foot, head, leg, shoulderPlate, torso } from './goblinParts';
import { sprite } from './neutralFinish';
import { limb, mix, ovalAt, paint, SHADOW, UMBER } from './neutralKit';
import { beat, beatPt, breath, chainOf, joint, lowJoint, place, pulse, smear, step, strideBob, turn, wave, within, xf, type Xf } from './neutralRig';
import { IDLE, type CreatureDrawer, type Pose } from './types';

/**
 * The Goblin: a wiry, hunched raider about 50 tall, its long narrow head
 * thrust forward on a bent neck, sallow olive skin over knotted limbs,
 * slitted eyes sunk under a heavy brow. It wears crude dark leather
 * riveted with iron and carries a jagged iron cleaver cocked in its front
 * hand, the other clawed hand flung back. Sinister, never comic.
 */

// The rest pose, as painted: the hips the body turns about, the neck the head turns about, and each limb's joints.
const HIPS = pt(-1, -22);
const NECK = pt(6, -37);
const FAR_HIP = pt(-3.4, -22);
const NEAR_HIP = pt(1.8, -22);
const FAR_LEG = chainOf(FAR_HIP, pt(-9.4, -12.4), pt(-9, -2));
const NEAR_LEG = chainOf(NEAR_HIP, pt(8.6, -13), pt(6.4, -2));
/** Knees bent forward, as in a stride (the far knee rests splayed back). */
const FORWARD = NEAR_LEG.bend;
const FAR_HEEL = pt(-11.4, -0.4);
const NEAR_HEEL = pt(4, -0.4);
/** The ankle sits up and forward of the heel. */
const ANKLE = pt(2.4, -1.6);
const FAR_SHOULDER = pt(1.6, -36);
const FAR_ARM = chainOf(FAR_SHOULDER, pt(-5.6, -29.6), pt(-12.4, -31.4));
const FAR_HAND = pt(-12.4, -31.4);
const CLAW_ANG = Math.PI + 0.3;
const SHOULDER = pt(5.2, -35.4);
const WRIST = pt(16.6, -31.6);
const ARM = chainOf(SHOULDER, pt(10.6, -27.4), WRIST);
/** The cleaver's grip and the way it points (grip to tip), at rest. */
const GRIP = pt(17, -31.4);
const CLUB_ANG = Math.atan2(-19, 9);
const CLUB_LEN = 21;
const FAR_EAR = { root: pt(10, -45.4), tip: pt(4.6, -50.4) };
const NEAR_EAR = { root: pt(8.6, -42.2), tip: pt(0.6, -47.6) };

interface Rig {
  /** The torso, arms and head, turned about the hips. */
  readonly body: Xf;
  /** The head and ears, within the body. */
  readonly head: Xf;
  readonly earFar: number;
  readonly earNear: number;
  readonly farHeel: Pt;
  readonly farTilt: number;
  readonly nearHeel: Pt;
  readonly nearTilt: number;
  /** Knee bend for each leg (the walk bends both forward). */
  readonly farBend: number;
  readonly nearBend: number;
  /** The free hand and its claw's angle, in body space. */
  readonly farHand: Pt;
  readonly clawAng: number;
  /** The cleaver's grip and angle, in body space. */
  readonly grip: Pt;
  readonly clubAng: number;
}

/** Idle: twitchy, never still: weight rocking foot to foot, a sudden glance, an ear flicking. */
function idle(t: number): Rig {
  return {
    body: xf(HIPS, 0.03 * wave(t, 0.1), 0.9 * wave(t), -0.6 * breath(t) + 0.5 * pulse(t, 0.5, 0.17)),
    head: xf(NECK, 0.05 * wave(t, 0.25) - 0.09 * pulse(t, 0.5, 0.17), 0, -0.3 * breath(t)),
    earFar: 0.03 * wave(t) + 0.2 * pulse(t, 0.67, 0.17),
    earNear: 0.04 * wave(t, 0.5) + 0.18 * pulse(t, 0.33, 0.17),
    farHeel: FAR_HEEL,
    farTilt: 0,
    nearHeel: NEAR_HEEL,
    nearTilt: 0,
    farBend: FAR_LEG.bend,
    nearBend: NEAR_LEG.bend,
    farHand: pt(FAR_HAND.x + 0.7 * wave(t, 0.3), FAR_HAND.y + 0.9 * wave(t, 0.55)),
    clawAng: CLAW_ANG + 0.2 * wave(t, 0.4),
    grip: pt(GRIP.x + 0.5 * wave(t, 0.2), GRIP.y - 0.8 * breath(t)),
    clubAng: CLUB_ANG + 0.07 * wave(t, 0.15),
  };
}

/** Walk: a hunched scurry: bent low and leaning in, short quick steps, the cleaver bobbing, ears laid back. */
function walk(t: number): Rig {
  const body = xf(HIPS, 0.13, 0.4, 1.3 - 1.5 * strideBob(t));
  // Both feet stride about one spot under the hips (the far one a touch behind), so they pass each other.
  const mid = place(body, HIPS).x + 1.6;
  const foot = (x: number, u: number): { heel: Pt; tilt: number } => {
    const s = step(u, 6.5, 4.5);
    return { heel: pt(x + s.x - ANKLE.x, -0.4 + s.y), tilt: s.tilt };
  };
  const near = foot(mid + 0.8, t);
  const far = foot(mid - 0.8, t + 0.5);
  const swing = Math.cos(Math.PI * 2 * t);
  return {
    body,
    head: xf(NECK, -0.1 + 0.04 * wave(2 * t, 0.15), 0, 0.4 * wave(2 * t, 0.2)),
    earFar: 0.08 * wave(2 * t, 0.1) - 0.06,
    earNear: 0.1 * wave(2 * t, 0.05) - 0.06,
    farHeel: far.heel,
    farTilt: far.tilt,
    nearHeel: near.heel,
    nearTilt: near.tilt,
    farBend: FORWARD,
    nearBend: FORWARD,
    farHand: pt(FAR_HAND.x + 3.2 * swing, FAR_HAND.y + 1.2 * Math.abs(swing)),
    clawAng: CLAW_ANG - 0.2 * swing,
    grip: pt(GRIP.x - 2 * swing, GRIP.y - 1 * Math.abs(swing)),
    clubAng: CLUB_ANG + 0.14 * swing,
  };
}

/** Attack: a vicious hack: cleaver cocked back over the shoulder, then whipped down and forward with a hop onto the front foot. */
function attack(t: number): Rig {
  return {
    body: xf(HIPS, beat(t, [0, -0.13, 0.2, 0.13, 0]), beat(t, [0, -2, 3.4, 2.4, 0]), beat(t, [0, 0.4, 1.6, 1.2, 0])),
    head: xf(NECK, beat(t, [0, -0.12, 0.13, 0.06, 0])),
    earFar: beat(t, [0, -0.1, 0.14, 0.06, 0]),
    earNear: beat(t, [0, -0.12, 0.16, 0.08, 0]),
    farHeel: pt(beat(t, [FAR_HEEL.x, -12.4, -11, -11, FAR_HEEL.x]), FAR_HEEL.y),
    farTilt: 0,
    nearHeel: pt(beat(t, [NEAR_HEEL.x, 3.2, 8, 8, NEAR_HEEL.x]), NEAR_HEEL.y - beat(t, [0, 2, 0, 0, 0])),
    nearTilt: beat(t, [0, -0.2, 0, 0, 0]),
    farBend: FAR_LEG.bend,
    nearBend: NEAR_LEG.bend,
    farHand: beatPt(t, [FAR_HAND, pt(-8, -38), pt(-14.4, -30), pt(-14, -31), FAR_HAND]),
    clawAng: beat(t, [CLAW_ANG, Math.PI - 0.4, CLAW_ANG + 0.3, CLAW_ANG + 0.15, CLAW_ANG]),
    grip: beatPt(t, [GRIP, pt(-1, -44), pt(21, -28), pt(19, -25), GRIP]),
    clubAng: beat(t, [CLUB_ANG, -2.3, 0.3, 0.62, CLUB_ANG]),
  };
}

function rigOf(pose: Pose): Rig {
  if (pose.kind === 'walk') return walk(pose.t);
  if (pose.kind === 'attack') return attack(pose.t);
  return idle(pose.t);
}

/** Where the cleaver's tip is, on the frame. */
const clubHead = (r: Rig): Pt => place(r.body, pt(r.grip.x + Math.cos(r.clubAng) * CLUB_LEN, r.grip.y + Math.sin(r.clubAng) * CLUB_LEN));

/** A leg from its hip (body space) down to its foot (ground space), knee solved between. */
function legTo(d: Draw, r: Rig, hip: Pt, heel: Pt, chain: typeof NEAR_LEG, bend: number, color: string): void {
  const h = place(r.body, hip);
  const ankle = pt(heel.x + ANKLE.x, heel.y + ANKLE.y);
  leg(d, h, joint(chain, h, ankle, bend), ankle, color);
}

export const drawGoblin: CreatureDrawer = (ctx, seed, f, pose: Pose = IDLE) => {
  const r = rigOf(pose);
  sprite(ctx, seed, f, { shadow: 15, shadowX: 1, line: 0.42 }, (d) => {
    const far = mix(C.skin, SHADOW, 0.35);
    const inBody = (draw: () => void): void => within(d.pen.ctx, r.body, draw);
    const inHead = (draw: () => void): void => inBody(() => within(d.pen.ctx, r.head, draw));
    // The far side, in shade: ear behind the head, leg, foot, and the arm flung back.
    inHead(() => ear(d, FAR_EAR.root, turn(FAR_EAR.tip, FAR_EAR.root, r.earFar), 2.6, false));
    foot(d, r.farHeel, 7.4, far, r.farTilt);
    legTo(d, r, FAR_HIP, r.farHeel, FAR_LEG, r.farBend, far);
    inBody(() => {
      const elbow = joint(FAR_ARM, FAR_SHOULDER, r.farHand);
      limb(d, FAR_SHOULDER, elbow, 2.8, 2.1, far, { shadow: 0.7, hatch: 0.18 });
      limb(d, elbow, r.farHand, 2.1, 1.5, far, { shadow: 0.7, hatch: 0.14 });
      claw(d, pt(r.farHand.x - 0.4, r.farHand.y - 0.3), r.clawAng, far);
    });
    // The near leg and foot.
    foot(d, r.nearHeel, 7.8, C.skin, r.nearTilt);
    legTo(d, r, NEAR_HIP, r.nearHeel, NEAR_LEG, r.nearBend, C.skin);
    inBody(() => torso(d));
    // The near ear, laid back, then the head over its root.
    inHead(() => {
      head(d);
      ear(d, NEAR_EAR.root, turn(NEAR_EAR.tip, NEAR_EAR.root, r.earNear), 3.4, true);
    });
    inBody(() => {
      // The cleaver arm: a sinewy upper arm, a bracer on the forearm, a knuckled fist round the haft.
      const spin = r.clubAng - CLUB_ANG;
      const hand = turn(WRIST, GRIP, spin);
      const wrist = pt(hand.x + r.grip.x - GRIP.x, hand.y + r.grip.y - GRIP.y);
      const elbow = lowJoint(ARM, SHOULDER, wrist);
      limb(d, SHOULDER, elbow, 3, 2.3, C.skin, { shadow: 0.7, hatch: 0.18 });
      paint(d, ovalAt(elbow, 1.2, 1.1), C.skin, { shadow: 0.5, line: 0.35, hatch: 0 });
      limb(d, elbow, wrist, 2.3, 1.9, C.skin, { shadow: 0.7, hatch: 0.14 });
      bracer(d, elbow, wrist);
      shoulderPlate(d);
      cleaver(d, r.grip, r.clubAng, CLUB_LEN);
      within(d.pen.ctx, xf(GRIP, spin, r.grip.x - GRIP.x, r.grip.y - GRIP.y), () => {
        paint(d, ovalAt(pt(17.2, -31.6), 1.9, 1.6, 0.4), C.skin, { shadow: 0.6, line: 0.5, hatch: 0 });
        for (const k of [0, 1]) d.pen.hair([pt(16.6 + k * 0.9, -32.9 + k * 0.3), pt(17.6 + k * 0.9, -30.5 + k * 0.3)], 0.26, UMBER, 0.7);
      });
    });
  });
  // The blow: speed lines along the cleaver's path as it lands.
  if (pose.kind === 'attack') {
    const path = Array.from({ length: 9 }, (_, i) => clubHead(attack(pose.t - 0.13 + (i / 8) * 0.12)));
    smear(ctx, seed, f, path, 0.7, beat(pose.t, [0, 0, 0.75, 0.25, 0]));
  }
};
