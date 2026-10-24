import { pt } from '../kit';
import type { Pt } from '../pen';
import { sprite } from './neutralFinish';
import { blob, mix, paint, SHADOW } from './neutralKit';
import { beat, beatPt, breath, chainOf, joint, place, pulse, smear, step, strideBob, turn, wave, within, xf, type Xf } from './neutralRig';
import { bone, C, forearm, hips, leg, neck, ribcage, shield, skull, sword } from './skeletonParts';
import { IDLE, type CreatureDrawer, type Pose } from './types';

/**
 * The Skeleton: a gaunt undead warrior about 74 tall (seven and a half
 * skulls), long yellowed bones and dark empty sockets, a notched, rusted
 * sword raised overhead and a split round shield held forward on the far
 * arm. A rusted mail skirt still hangs from its belt. Bones, never gore.
 */

// The rest pose, as painted: the hips the body turns about, the spine the chest creaks about, the neck, and each limb's joints.
const HIPS = pt(0, -36);
const SPINE = pt(-1, -42);
const NECK = pt(2.4, -63);
const FAR_HIP = pt(2.6, -35.4);
const NEAR_HIP = pt(-1.8, -35.4);
const FAR_LEG = chainOf(FAR_HIP, pt(8.2, -19.6), pt(7.2, -3.6));
const NEAR_LEG = chainOf(NEAR_HIP, pt(-5, -19.4), pt(-10, -3.8));
const FAR_ANKLE = pt(7.2, -3.6);
const NEAR_ANKLE = pt(-10, -3.8);
/** The toe, from the ankle. */
const FAR_TOE = pt(6.4, 3.4);
const NEAR_TOE = pt(6.2, 3.6);
const SHIELD_SHOULDER = pt(5.4, -58);
const SHIELD_ARM = chainOf(SHIELD_SHOULDER, pt(10.6, -48.6), pt(15.6, -44.4));
const SHIELD_WRIST = pt(15.6, -44.4);
/** The shield's centre, from the wrist that holds it. */
const SHIELD_AT = pt(1.2, 2);
const SHOULDER = pt(-3.4, -58.4);
const ARM = chainOf(SHOULDER, pt(-15.4, -62.6), pt(-10.8, -71.4));
/** The sword hand (the root of the guard) and the way the blade points, at rest. */
const HAND = pt(-10.4, -72.6);
const SWORD_ANG = Math.atan2(-0.879, 0.476);
const SWORD_LEN = 28;

interface Rig {
  /** Everything above the legs, turned about the hips. */
  readonly body: Xf;
  /** The rib cage, arms and skull, creaking about the spine within the body. */
  readonly chest: Xf;
  /** The skull, within the chest. */
  readonly head: Xf;
  readonly jaw: number;
  readonly farAnkle: Pt;
  readonly farTilt: number;
  readonly nearAnkle: Pt;
  readonly nearTilt: number;
  /** The sword hand and blade angle, the shield wrist, in chest space. */
  readonly hand: Pt;
  readonly swordAng: number;
  readonly shieldWrist: Pt;
}

/** A jerk: the wave snapped toward its ends, so bones move in starts and stops. */
const jerk = (v: number): number => Math.sign(v) * Math.pow(Math.abs(v), 0.4);

/** Idle: a slight creaky sway, the skull tilting and the jaw dropping a moment, the sword point drifting. */
function idle(t: number): Rig {
  return {
    body: xf(HIPS, 0, 0.3 * wave(t), -0.3 * breath(t)),
    chest: xf(SPINE, 0.03 * jerk(wave(t, 0.1)), 0, -0.4 * breath(t)),
    head: xf(NECK, 0.06 * wave(t, 0.35) + 0.07 * pulse(t, 0.5, 0.17)),
    jaw: 0.16 * pulse(t, 0.33, 0.17) + 0.08 * pulse(t, 0.5, 0.17),
    farAnkle: FAR_ANKLE,
    farTilt: 0,
    nearAnkle: NEAR_ANKLE,
    nearTilt: 0,
    hand: pt(HAND.x + 0.4 * wave(t, 0.2), HAND.y + 0.7 * wave(t, 0.45)),
    swordAng: SWORD_ANG + 0.05 * wave(t, 0.25),
    shieldWrist: pt(SHIELD_WRIST.x + 0.4 * wave(t, 0.6), SHIELD_WRIST.y + 0.6 * wave(t, 0.3)),
  };
}

/** Walk: a stiff, jerky march: near-straight legs, the body rocking in starts, the jaw clacking at each footfall. */
function walk(t: number): Rig {
  const body = xf(HIPS, 0.04 + 0.035 * jerk(wave(2 * t, 0.1)), 0.5, 0.8 - 1.8 * strideBob(t));
  const mid = place(body, HIPS).x + 1.4;
  const near = step(t, 6.5, 4.8);
  const far = step(t + 0.5, 6.5, 4.8);
  const swing = Math.cos(Math.PI * 2 * t);
  return {
    body,
    chest: xf(SPINE, 0.04 * jerk(wave(t, 0.25)), 0, 0),
    head: xf(NECK, 0.09 * jerk(wave(2 * t, 0.4)) - 0.03),
    jaw: 0.18 * pulse(t, 0, 0.17) + 0.18 * pulse(t, 0.5, 0.17),
    farAnkle: pt(mid + 1 + far.x, FAR_ANKLE.y + far.y),
    farTilt: far.tilt,
    nearAnkle: pt(mid - 1 + near.x, NEAR_ANKLE.y + near.y),
    nearTilt: near.tilt,
    hand: pt(HAND.x - 0.8 * swing, HAND.y + 1.2 * jerk(wave(2 * t, 0.1))),
    swordAng: SWORD_ANG + 0.09 * jerk(swing),
    shieldWrist: pt(SHIELD_WRIST.x + 1.8 * swing, SHIELD_WRIST.y + 0.6 * Math.abs(swing)),
  };
}

/** Attack: a rattling chop: the sword hauled up and back, then brought down hard in front, the jaw flapping open. */
function attack(t: number): Rig {
  return {
    body: xf(HIPS, beat(t, [0, -0.06, 0.1, 0.07, 0]), beat(t, [0, -1.5, 3, 2, 0]), beat(t, [0, 0, 1.5, 1, 0])),
    chest: xf(SPINE, beat(t, [0, -0.08, 0.1, 0.06, 0])),
    head: xf(NECK, beat(t, [0, -0.1, 0.12, 0.04, 0])),
    jaw: beat(t, [0, 0.06, 0.3, 0.14, 0]),
    farAnkle: pt(beat(t, [FAR_ANKLE.x, 7.2, 11, 11, FAR_ANKLE.x]), FAR_ANKLE.y - beat(t, [0, 2.5, 0, 0, 0])),
    farTilt: beat(t, [0, -0.15, 0, 0, 0]),
    nearAnkle: pt(beat(t, [NEAR_ANKLE.x, -10.4, -9, -9, NEAR_ANKLE.x]), NEAR_ANKLE.y),
    nearTilt: 0,
    hand: beatPt(t, [HAND, pt(-12, -72), pt(13, -48), pt(11, -43), HAND]),
    swordAng: beat(t, [SWORD_ANG, -2, 0.3, 0.7, SWORD_ANG]),
    shieldWrist: beatPt(t, [SHIELD_WRIST, pt(16.5, -47), pt(11.6, -41.6), pt(12.2, -42.4), SHIELD_WRIST]),
  };
}

function rigOf(pose: Pose): Rig {
  if (pose.kind === 'walk') return walk(pose.t);
  if (pose.kind === 'attack') return attack(pose.t);
  return idle(pose.t);
}

/** Where the sword's point is, on the frame. */
const swordPoint = (r: Rig): Pt => place(r.body, place(r.chest, pt(r.hand.x + Math.cos(r.swordAng) * SWORD_LEN, r.hand.y + Math.sin(r.swordAng) * SWORD_LEN)));

/** A leg from its hip (body space) down to its ankle (ground space), knee solved between. */
function legTo(r: Rig, d: Parameters<typeof leg>[0], hip: Pt, chain: typeof FAR_LEG, ankle: Pt, toe: Pt, color: string, tilt: number): void {
  const h = place(r.body, hip);
  leg(d, h, joint(chain, h, ankle), ankle, pt(ankle.x + toe.x, ankle.y + toe.y), color, tilt);
}

export const drawSkeleton: CreatureDrawer = (ctx, seed, f, pose: Pose = IDLE) => {
  const r = rigOf(pose);
  sprite(ctx, seed, f, { shadow: 16, shadowX: 1.5, line: 0.42 }, (d) => {
    const far = C.boneFar;
    const inBody = (draw: () => void): void => within(d.pen.ctx, r.body, draw);
    const inChest = (draw: () => void): void => inBody(() => within(d.pen.ctx, r.chest, draw));
    // The far side, in shade: shield arm and the front leg.
    const shieldElbow = joint(SHIELD_ARM, SHIELD_SHOULDER, r.shieldWrist);
    inChest(() => {
      bone(d, SHIELD_SHOULDER, shieldElbow, 1.35, far);
      forearm(d, shieldElbow, r.shieldWrist, far);
    });
    legTo(r, d, FAR_HIP, FAR_LEG, r.farAnkle, FAR_TOE, far, r.farTilt);
    legTo(r, d, NEAR_HIP, NEAR_LEG, r.nearAnkle, NEAR_TOE, C.bone, r.nearTilt);
    inBody(() => hips(d));
    inChest(() => {
      ribcage(d);
      within(d.pen.ctx, r.head, () => neck(d));
      shield(d, pt(r.shieldWrist.x + SHIELD_AT.x, r.shieldWrist.y + SHIELD_AT.y));
      sword(d, r.hand, pt(Math.cos(r.swordAng), Math.sin(r.swordAng)), SWORD_LEN);
      within(d.pen.ctx, r.head, () => skull(d, r.jaw));
      // The sword arm: upper arm, forearm up to the fist round the grip, the iron plate over the shoulder.
      const spin = r.swordAng - SWORD_ANG;
      const wrist = turn(pt(r.hand.x - 0.4, r.hand.y + 1.2), r.hand, spin);
      const elbow = joint(ARM, SHOULDER, wrist);
      bone(d, SHOULDER, elbow, 1.45, C.bone, 0.7);
      forearm(d, elbow, wrist, C.bone);
      within(d.pen.ctx, xf(HAND, spin, r.hand.x - HAND.x, r.hand.y - HAND.y), () => {
        const h = HAND;
        const fist = blob([pt(h.x - 1.9, h.y - 0.7), pt(h.x + 0.8, h.y - 1.6), pt(h.x + 1.7, h.y + 0.5), pt(h.x + 0.7, h.y + 2), pt(h.x - 1.5, h.y + 1.6)], 4);
        paint(d, fist, C.bone, { shadow: 0.6, line: 0.5, hatch: 0 });
        for (const k of [0, 1, 2]) d.pen.hair([pt(h.x - 1.3 + k * 0.8, h.y - 0.9 + k * 0.25), pt(h.x - 0.8 + k * 0.8, h.y + 1.6 + k * 0.15)], 0.28, mix(C.bone, SHADOW, 0.7), 0.85);
      });
    });
  });
  // The chop: speed lines along the sword point's path as it comes down.
  if (pose.kind === 'attack') {
    const path = Array.from({ length: 11 }, (_, i) => swordPoint(attack(pose.t - 0.11 + (i / 10) * 0.1)));
    smear(ctx, seed, f, path, 0.7, beat(pose.t, [0, 0, 0.75, 0.25, 0]));
  }
};
