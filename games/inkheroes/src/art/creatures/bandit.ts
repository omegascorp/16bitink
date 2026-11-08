import { pt, type Draw } from '../kit';
import type { Pt } from '../pen';
import { C, cloak, head, jerkin, knife, leg, scarfTails } from './banditParts';
import { sprite } from './neutralFinish';
import { blob, limb, mix, ovalAt, paint, SHADOW, stitches, stud } from './neutralKit';
import { beat, beatPt, breath, chainOf, joint, lowJoint, place, smear, step, strideBob, turn, wave, within, xf, type Xf } from './neutralRig';
import { IDLE, type CreatureDrawer, type Pose } from './types';

/**
 * The Bandit: a hard-bitten highwayman about 68 tall in a low fighting
 * crouch, built like a man (seven heads), hood drawn deep over a grim,
 * stubbled face, an oxblood scarf at the throat, dark worn leathers, a
 * cloak falling behind and tall boots. One long knife held out in the
 * front hand, a second reversed low at the back hip.
 */

// The rest pose, as painted: the hips the body turns about, the neck the head turns about, and each limb's joints.
const HIPS = pt(0, -33);
const NECK = pt(2.4, -54.6);
const HEAD_SCALE = 0.9;
const BACK_HIP = pt(-2.6, -33);
const FRONT_HIP = pt(2.6, -33);
const BACK_LEG = chainOf(BACK_HIP, pt(-6.6, -17), pt(-13.2, -3.8));
const FRONT_LEG = chainOf(FRONT_HIP, pt(11.4, -19.6), pt(11, -3.8));
const BACK_ANKLE = pt(-13.2, -3.8);
const FRONT_ANKLE = pt(11, -3.8);
/** The toe, from the ankle. */
const BACK_TOE = pt(6.4, 3.6);
const FRONT_TOE = pt(6.8, 3.6);
const SHOULDER = pt(3.8, -51.6);
const ARM = chainOf(SHOULDER, pt(10.6, -41.6), pt(19.4, -43.8));
const BACK_SHOULDER = pt(-2.6, -52);
const BACK_ARM = chainOf(BACK_SHOULDER, pt(-7.4, -41.4), pt(-7.8, -32.6));
/** The knife hands (the knife's root in the fist) and the way each blade points, at rest. */
const HAND = pt(20.6, -44.2);
const KNIFE_ANG = Math.atan2(-0.39, 0.92);
const KNIFE_LEN = 14;
const BACK_HAND = pt(-7.8, -31.4);
const BACK_KNIFE_ANG = Math.atan2(0.8, -0.6);

interface Rig {
  /** The torso, arms, cloak and head, turned about the hips. */
  readonly body: Xf;
  /** The head in its hood, within the body. */
  readonly head: Xf;
  readonly backAnkle: Pt;
  readonly backTilt: number;
  readonly frontAnkle: Pt;
  readonly frontTilt: number;
  /** The knife hands and blade angles, in body space. */
  readonly hand: Pt;
  readonly knifeAng: number;
  readonly backHand: Pt;
  readonly backKnifeAng: number;
  /** How far the cloak's hem and the scarf's tails are blown from where they hang. */
  readonly cloak: Pt;
  readonly scarf: Pt;
}

/** Idle: crouched and ready, breathing, the knife point weaving, the cloak stirring. */
function idle(t: number): Rig {
  return {
    body: xf(HIPS, 0.02 * wave(t, 0.2), 0.4 * wave(t), -0.7 * breath(t)),
    head: xf(NECK, 0.04 * wave(t, 0.3), 0, -0.25 * breath(t)),
    backAnkle: BACK_ANKLE,
    backTilt: 0,
    frontAnkle: FRONT_ANKLE,
    frontTilt: 0,
    hand: pt(HAND.x + 0.6 * wave(t, 0.1), HAND.y + 1 * wave(t, 0.35)),
    knifeAng: KNIFE_ANG + 0.08 * wave(t, 0.2),
    backHand: pt(BACK_HAND.x + 0.3 * wave(t, 0.6), BACK_HAND.y + 0.5 * wave(t, 0.4)),
    backKnifeAng: BACK_KNIFE_ANG + 0.05 * wave(t, 0.5),
    cloak: pt(1.5 * wave(t, -0.15), 0.4 * wave(t, 0.1)),
    scarf: pt(1.2 * wave(t, -0.25), 1 * wave(t, 0.05)),
  };
}

/** Walk: a prowling run: low and leaning in, long quick strides, the cloak streaming out behind. */
function walk(t: number): Rig {
  const body = xf(HIPS, 0.14, 1, 2.6 - 2.2 * strideBob(t));
  // Both feet stride about one spot under the hips, so they pass each other.
  const mid = place(body, HIPS).x + 1.5;
  const back = step(t + 0.5, 7.5, 5);
  const front = step(t, 7.5, 5);
  const swing = Math.cos(Math.PI * 2 * t);
  return {
    body,
    head: xf(NECK, -0.1, 0, 0.3 * wave(2 * t, 0.2)),
    backAnkle: pt(mid - 1 + back.x, BACK_ANKLE.y + back.y),
    backTilt: back.tilt,
    frontAnkle: pt(mid + 1 + front.x, FRONT_ANKLE.y + front.y),
    frontTilt: front.tilt,
    hand: pt(HAND.x - 2 * swing, HAND.y + 0.8 * Math.abs(swing)),
    knifeAng: KNIFE_ANG + 0.1 * swing,
    backHand: pt(BACK_HAND.x + 3.4 * swing, BACK_HAND.y - 1.2 * Math.abs(swing)),
    backKnifeAng: BACK_KNIFE_ANG - 0.25 * swing,
    cloak: pt(-4 + 1.4 * wave(2 * t), -2.5 + 0.8 * wave(2 * t, 0.25)),
    scarf: pt(-2 + 1.6 * wave(2 * t, 0.1), -1.6 + 1 * wave(2 * t, 0.3)),
  };
}

/** Attack: a lunging stab: knife drawn back to the chest, then a long step in and the point driven home; the cloak swings after. */
function attack(t: number): Rig {
  return {
    body: xf(HIPS, beat(t, [0, -0.12, 0.18, 0.12, 0]), beat(t, [0, -3.5, 8, 6, 0]), beat(t, [0, 0.8, 2.8, 2.2, 0])),
    head: xf(NECK, beat(t, [0, -0.06, 0.06, 0.04, 0])),
    backAnkle: pt(beat(t, [BACK_ANKLE.x, -14, -10, -10, BACK_ANKLE.x]), BACK_ANKLE.y),
    backTilt: 0,
    frontAnkle: pt(beat(t, [FRONT_ANKLE.x, 10.4, 20, 20, FRONT_ANKLE.x]), FRONT_ANKLE.y - beat(t, [0, 2.5, 0, 0, 0])),
    frontTilt: beat(t, [0, -0.15, 0, 0, 0]),
    hand: beatPt(t, [HAND, pt(8, -46.4), pt(23, -45.6), pt(21.4, -43.4), HAND]),
    knifeAng: beat(t, [KNIFE_ANG, -0.35, -0.02, 0.1, KNIFE_ANG]),
    backHand: beatPt(t, [BACK_HAND, pt(-5, -34), pt(-11.6, -34.4), pt(-10.6, -33), BACK_HAND]),
    backKnifeAng: beat(t, [BACK_KNIFE_ANG, BACK_KNIFE_ANG + 0.2, BACK_KNIFE_ANG - 0.35, BACK_KNIFE_ANG - 0.2, BACK_KNIFE_ANG]),
    cloak: pt(beat(t, [0, 2, -5.5, -3, 0]), beat(t, [0, 0.5, -3, -1.5, 0])),
    scarf: pt(beat(t, [0, 1.5, -4, -2.5, 0]), beat(t, [0, 1, -2.5, -1, 0])),
  };
}

function rigOf(pose: Pose): Rig {
  if (pose.kind === 'walk') return walk(pose.t);
  if (pose.kind === 'attack') return attack(pose.t);
  return idle(pose.t);
}

const dirOf = (a: number): Pt => pt(Math.cos(a), Math.sin(a));

/** Where the knife's point is, on the frame. */
const knifePoint = (r: Rig): Pt => place(r.body, pt(r.hand.x + Math.cos(r.knifeAng) * KNIFE_LEN, r.hand.y + Math.sin(r.knifeAng) * KNIFE_LEN));

/** A leg from its hip (body space) down to its ankle (ground space), knee solved between. */
function legTo(d: Draw, r: Rig, hip: Pt, chain: typeof BACK_LEG, ankle: Pt, toe: Pt, shade: number, tilt: number): void {
  const h = place(r.body, hip);
  leg(d, h, joint(chain, h, ankle), ankle, pt(ankle.x + toe.x, ankle.y + toe.y), shade, tilt);
}

/** A gloved fist with a leather bracer up the forearm behind it. */
function fist(d: Draw, at: Pt, elbow: Pt, wrist: Pt, tone: number): void {
  const b0 = pt(elbow.x + (wrist.x - elbow.x) * 0.4, elbow.y + (wrist.y - elbow.y) * 0.4);
  limb(d, b0, wrist, 3.9, 3.5, mix(C.jerkinDeep, SHADOW, tone), { shadow: 0.7, hatch: 0.12, line: 0.5 });
  stitches(d, b0, wrist, 3, mix(C.jerkin, '#f6d49a', 0.25), 0.28);
  paint(d, ovalAt(at, 2.1, 1.9), mix(C.glove, SHADOW, tone), { shadow: 0.6, line: 0.5, hatch: 0 });
}

export const drawBandit: CreatureDrawer = (ctx, seed, f, pose: Pose = IDLE) => {
  const r = rigOf(pose);
  sprite(ctx, seed, f, { shadow: 19, shadowX: 1, line: 0.42 }, (d) => {
    const inBody = (draw: () => void): void => within(d.pen.ctx, r.body, draw);
    inBody(() => {
      cloak(d, r.cloak);
      scarfTails(d, r.scarf);
    });
    // The back leg stretched out behind, the front leg bent forward.
    legTo(d, r, BACK_HIP, BACK_LEG, r.backAnkle, BACK_TOE, 0.3, r.backTilt);
    legTo(d, r, FRONT_HIP, FRONT_LEG, r.frontAnkle, FRONT_TOE, 0, r.frontTilt);
    inBody(() => {
      // The front arm, reaching out with the knife (behind the body at the shoulder).
      const spin = r.knifeAng - KNIFE_ANG;
      const wrist = turn(pt(r.hand.x - 1.2, r.hand.y + 0.4), r.hand, spin);
      const elbow = lowJoint(ARM, SHOULDER, wrist);
      limb(d, SHOULDER, elbow, 4.4, 3.8, mix(C.sleeve, SHADOW, 0.2), { shadow: 0.75, hatch: 0.18 });
      limb(d, elbow, wrist, 3.8, 3.2, mix(C.sleeve, SHADOW, 0.1), { shadow: 0.7, hatch: 0.14 });
      knife(d, r.hand, dirOf(r.knifeAng), KNIFE_LEN);
      fist(d, turn(pt(r.hand.x - 0.2, r.hand.y + 0.2), r.hand, spin), elbow, wrist, 0);
      jerkin(d);
      // The back arm, low at the hip, a knife held point-down behind it.
      knife(d, r.backHand, dirOf(r.backKnifeAng), 12);
      const backWrist = turn(pt(r.backHand.x, r.backHand.y - 1.2), r.backHand, r.backKnifeAng - BACK_KNIFE_ANG);
      const backElbow = joint(BACK_ARM, BACK_SHOULDER, backWrist);
      limb(d, BACK_SHOULDER, backElbow, 4.6, 4, C.sleeve, { shadow: 0.75, hatch: 0.18 });
      limb(d, backElbow, backWrist, 4, 3.4, C.sleeve, { shadow: 0.7, hatch: 0.14 });
      fist(d, r.backHand, backElbow, backWrist, 0);
      const pauldron = blob([pt(-6.6, -51.2), pt(-1.4, -52.4), pt(0.4, -48.6), pt(-2.6, -45.6), pt(-6.8, -46.6)], 4);
      paint(d, pauldron, C.jerkinDeep, { shadow: 0.7, line: 0.55, hatch: 0.18, gloss: true });
      d.pen.hair([pt(-6.2, -48.6), pt(-1, -49.6)], 0.3, mix(C.jerkin, '#f6d49a', 0.2), 0.7);
      stud(d, pt(-3.4, -49.6), 0.42, C.brass);
      stud(d, pt(-4.8, -47.6), 0.4, C.brass);
      within(d.pen.ctx, r.head, () => {
        // The head is drawn a touch large for its detail; set it to a man's proportion (about a seventh of his height).
        const c = d.pen.ctx;
        c.save();
        c.translate(NECK.x, NECK.y + 1);
        c.scale(HEAD_SCALE, HEAD_SCALE);
        c.translate(-NECK.x, -NECK.y - 1);
        head(d);
        c.restore();
      });
    });
  });
  // The thrust: speed lines along the knife's path as it goes in.
  if (pose.kind === 'attack') {
    const path = Array.from({ length: 9 }, (_, i) => knifePoint(attack(pose.t - 0.14 + (i / 8) * 0.13)));
    smear(ctx, seed, f, path, 0.7, beat(pose.t, [0, 0, 0.7, 0.2, 0]));
  }
};
