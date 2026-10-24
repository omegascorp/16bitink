import { bezier, pt, type Draw } from '../kit';
import type { Pt } from '../pen';
import { sprite } from './neutralFinish';
import { blob, dab, folds, gleam, limb, mix, ovalAt, paint, roundTube, SHADOW, stitches, stud } from './neutralKit';
import { beat, beatPt, breath, chainOf, hang, joint, lowJoint, place, smear, step, strideBob, turn, wave, within, xf, type Xf } from './neutralRig';
import { IDLE, type CreatureDrawer, type Pose } from './types';

/**
 * The Bandit: a highwayman about 62 tall in a low fighting crouch, hood
 * up and a dark red scarf masking the face below the eyes, a laced leather
 * jerkin, a dun cloak falling behind, tall boots. One long knife held out
 * in the front hand, a second in a reverse grip low at the back hip.
 * Muted browns, so the red scarf and the steel are what catch the eye.
 */
const LIGHT_CLOTH = '#c9b99a';
/** Where the cloak hangs from and where its hem swings. */
const CLOAK_TOP = -50;
const CLOAK_HEM = -10;
const C = {
  cloak: '#786a55',
  cloakIn: '#3f372e',
  jerkin: '#8f6840',
  jerkinDeep: '#6b4626',
  sleeve: '#857660',
  trouser: '#5c4f40',
  boot: '#4a382b',
  bootCuff: '#6e5440',
  glove: '#4d3a2c',
  scarf: '#7e2b26',
  skin: '#d6a47c',
  steel: '#b4babf',
  brass: '#b68b45',
  grip: '#3d2c22',
  lace: '#d7c39a',
} as const;

/** A leg in trousers and a tall boot: thigh, boot shaft with a turned cuff, the foot. */
function leg(d: Draw, hip: Pt, knee: Pt, ankle: Pt, toe: Pt, shade: number, tilt = 0): void {
  const tone = (c: string): string => mix(c, SHADOW, shade);
  limb(d, hip, knee, 6.4, 5.2, tone(C.trouser), { hatch: 0.18 });
  const cuffAt = pt(knee.x + (ankle.x - knee.x) * 0.14, knee.y + (ankle.y - knee.y) * 0.14);
  limb(d, cuffAt, ankle, 5, 4.2, tone(C.boot), { hatch: 0.2, line: 0.65 });
  within(d.pen.ctx, xf(ankle, tilt), () => boot(d, ankle, toe, tone));
  // The cuff: a turned-down band of softer leather across the top of the boot.
  const ux = (ankle.x - knee.x) / (Math.hypot(ankle.x - knee.x, ankle.y - knee.y) || 1);
  const uy = (ankle.y - knee.y) / (Math.hypot(ankle.x - knee.x, ankle.y - knee.y) || 1);
  const cuff = roundTube([pt(cuffAt.x + uy * 2.9, cuffAt.y - ux * 2.9 + 0.8), pt(cuffAt.x - uy * 2.9, cuffAt.y + ux * 2.9 + 0.8)], () => 2.6);
  paint(d, cuff, tone(C.bootCuff), { shadow: 0.45, line: 0.55, hatch: 0 });
  gleam(d, [pt(ankle.x - 1.6, ankle.y - 6), pt(ankle.x - 1.8, ankle.y - 1.6)], 0.5, 0.45);
}

/** The boot's foot, from the ankle to the toe, with its sole and heel block. */
function boot(d: Draw, ankle: Pt, toe: Pt, tone: (c: string) => string): void {
  const foot = blob([pt(ankle.x - 2.6, ankle.y - 1.6), pt(ankle.x + 2, ankle.y - 1.4), pt(toe.x - 3, toe.y - 3), pt(toe.x - 0.4, toe.y - 2), pt(toe.x + 0.2, toe.y - 0.6), pt(toe.x - 1, toe.y + 0.3), pt(ankle.x - 1, toe.y + 0.3), pt(ankle.x - 3, toe.y - 0.2)], 4);
  paint(d, foot, tone(C.boot), { shadow: 0.5, line: 0.65, hatch: 0.15, gloss: true });
  // The sole and the heel block.
  d.pen.stroke([pt(ankle.x - 3, toe.y - 0.4), pt(toe.x - 0.6, toe.y - 0.4)], 0.9, mix(C.boot, SHADOW, 0.6), 0.9, false);
  paint(d, [pt(ankle.x - 3, toe.y - 1.6), pt(ankle.x - 0.4, toe.y - 1.6), pt(ankle.x - 0.6, toe.y + 0.3), pt(ankle.x - 2.8, toe.y + 0.3)], mix(C.boot, SHADOW, 0.35), { shadow: 0.2, line: 0.4, hatch: 0 });
}

/** A long knife: blade from the hand along `dir`, a brass guard and a dark grip behind the fist. */
function knife(d: Draw, hand: Pt, dir: Pt, len: number): void {
  const at = (k: number, side = 0): Pt => pt(hand.x + dir.x * k - dir.y * side, hand.y + dir.y * k + dir.x * side);
  const blade = [at(2.2, -1.2), at(len * 0.7, -1.1), at(len, 0.1), at(len * 0.7, 1.15), at(2.2, 1.2)];
  paint(d, blade, C.steel, { shadow: 0.45, line: 0.55, hatch: 0, gloss: true });
  d.pen.hair([at(2.8, -0.2), at(len * 0.8, -0.1)], 0.3, mix(C.steel, SHADOW, 0.5), 0.75);
  gleam(d, [at(3, -0.6), at(len * 0.85, -0.3)], 0.45, 0.95);
  paint(d, roundTube([at(1.8, -2.6), at(1.8, 2.6)], () => 1.2), C.brass, { shadow: 0.4, line: 0.45, hatch: 0, gloss: true });
  paint(d, roundTube([at(-3.4), at(1.2)], () => 1.5), C.grip, { shadow: 0.4, line: 0.4, hatch: 0 });
  stud(d, at(-3.8), 0.7, C.brass);
}

/** The cloak hanging down the back, its hem swinging out behind, folds running down it. */
function cloak(d: Draw, swing: Pt): void {
  const sw = (pts: readonly Pt[]): Pt[] => hang(pts, CLOAK_TOP, CLOAK_HEM, swing);
  const top = blob([pt(3, -48.6), pt(-3.6, -50.8), pt(-9.4, -47.4), pt(-15.4, -36.4), pt(-20.6, -22)], 4).slice(0, 17);
  const hem: Pt[] = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    hem.push(pt(-24.6 + t * 21.6, -9.6 + Math.sin(t * Math.PI * 3.2) * 1.6 - t * 1.4));
  }
  const shape = sw([...top, ...hem, pt(-1.6, -24), pt(1.4, -40)]);
  paint(d, shape, C.cloak, { shadow: 0.6, line: 0.75, hatch: 0.22, cross: true });
  // The lining shows where the hem turns.
  const lining = [pt(-24.6, -9.6), pt(-21.4, -12.4), pt(-18.6, -10.2), pt(-19.6, -8.4)];
  paint(d, sw(blob(lining, 3)), C.cloakIn, { shadow: 0.3, line: 0.45, hatch: 0 });
  folds(d, [[pt(-6.4, -46), pt(-12, -30), pt(-15.8, -11)], [pt(-3.4, -44), pt(-7, -28), pt(-8.6, -10.2)], [pt(-9.6, -40), pt(-17.6, -22), pt(-21, -12)]].map(sw), C.cloak, 0.55, 0.8);
  gleam(d, sw([pt(-6, -48.6), pt(-11.6, -40), pt(-16.4, -28)]), 0.7, 0.4);
}

/** The scarf's two tails, streaming back from the knot behind the neck. */
function scarfTails(d: Draw, flutter: Pt): void {
  for (const [tip, w, k] of [[pt(-14.4, -42.4), 3, 1], [pt(-11.6, -38.6), 2.4, 0.7]] as const) {
    const spine = bezier(pt(-2, -50.4), pt(-8 + flutter.x * 0.4 * k, -49.6 + flutter.y * 0.4 * k), pt(tip.x + flutter.x * k, tip.y + flutter.y * k), 10);
    paint(d, roundTube(spine, (u) => w * (1 - u * 0.55)), mix(C.scarf, SHADOW, 0.15), { shadow: 0.5, line: 0.55, hatch: 0.15 });
  }
}

/** The jerkin: laced up the front, quilted, belted, with a pouch and a leather pauldron. */
function jerkin(d: Draw): void {
  const body = blob([pt(-5.6, -46.8), pt(-6.6, -38), pt(-5.2, -30.4), pt(-6.6, -23.2), pt(0, -22.6), pt(6.8, -23.4), pt(5.8, -30.2), pt(7.8, -38.2), pt(6, -46.2), pt(1, -48.6)], 5);
  paint(d, body, C.jerkin, { shadow: 0.6, line: 0.75, hatch: 0.22, cross: true });
  // Quilting seams and the lacing up the front.
  for (const x of [-3, 0.4]) stitches(d, pt(x, -45.4), pt(x - 0.3, -31.4), 6, mix(C.jerkin, SHADOW, 0.6), 0.35);
  d.pen.hair([pt(5.4, -46), pt(6.8, -38.4), pt(5.2, -31)], 0.45, d.ink, 0.8);
  for (let y = -44.6; y < -32; y += 2.4) d.pen.hair([pt(4.6, y), pt(6.8, y + 1.1)], 0.35, C.lace, 0.95);
  // The skirt below the belt is split at the hip.
  d.pen.hair([pt(1.2, -28), pt(0.8, -23)], 0.45, d.ink, 0.7);
  const belt = roundTube([pt(-6, -29.6), pt(0, -28.9), pt(6.4, -29.8)], () => 2.2);
  paint(d, belt, C.jerkinDeep, { shadow: 0.4, line: 0.55, hatch: 0 });
  const buckle = [pt(2.6, -31), pt(4.8, -31), pt(4.8, -28.2), pt(2.6, -28.2)];
  paint(d, buckle, C.brass, { shadow: 0.35, line: 0.45, hatch: 0, gloss: true });
  const pouch = blob([pt(-5.6, -28.6), pt(-1.8, -28.4), pt(-1.6, -24.2), pt(-3.6, -23), pt(-5.8, -24.4)], 4);
  paint(d, pouch, C.jerkinDeep, { shadow: 0.5, line: 0.55, hatch: 0.14 });
  stud(d, pt(-3.6, -26.8), 0.45, C.brass);
  dab(d, ovalAt(pt(5, -40), 2, 4), C.jerkinDeep, 0.25, 1);
}

/** The head in its hood: a peaked cowl, the face looking out of it with a hard eye, the red scarf over nose and mouth. */
function head(d: Draw): void {
  const hood = blob([pt(-5.8, -47.8), pt(-6.4, -53.6), pt(-8.6, -59.6), pt(-3.6, -60.6), pt(1.6, -62.8), pt(6.6, -61.2), pt(9.2, -57.6), pt(8.4, -51.6), pt(5, -47.4), pt(-0.6, -46.4)], 5);
  paint(d, hood, C.cloak, { shadow: 0.6, line: 0.8, hatch: 0.22, cross: true });
  folds(d, [[pt(-6.4, -58.4), pt(-3.6, -55), pt(-3, -49)], [pt(0.4, -61.4), pt(-0.6, -56), pt(0.4, -50.6)]], C.cloak, 0.5, 0.75);
  gleam(d, [pt(-7, -58.8), pt(-2.6, -60.4), pt(2, -62.2), pt(5.6, -61.2)], 0.8, 0.55);
  // The cowl's dark inside, round the back of the head.
  paint(d, blob([pt(4.4, -60.6), pt(8.4, -60.2), pt(9, -55), pt(6, -48.8), pt(3.8, -53)], 4), C.cloakIn, { shadow: 0.3, line: 0, hatch: 0, alpha: 1 });
  // The face, turned out of the cowl.
  const face = blob([pt(4.6, -59.2), pt(8.8, -59.4), pt(10.6, -57.2), pt(11.2, -55.2), pt(12.4, -53.6), pt(11, -52.4), pt(10.6, -50), pt(6, -49.2), pt(4.2, -54)], 4);
  paint(d, face, C.skin, { shadow: 0.45, line: 0.6, hatch: 0 });
  d.pen.clipped(face, () => dab(d, [pt(3, -61), pt(12, -61), pt(12, -57.4), pt(3, -56.4)], mix(C.cloakIn, SHADOW, 0.3), 0.55, 0.7));
  // A hard eye under a low brow.
  const eye = blob([pt(7.4, -55.6), pt(8.8, -56.4), pt(10, -55.8), pt(8.8, -55)], 3);
  paint(d, eye, '#f1e6cf', { shadow: 0, line: 0.35, hatch: 0, alpha: 1 });
  d.pen.dot(9, -55.7, 0.6, d.ink, 1);
  d.pen.dot(8.8, -56, 0.24, '#ffffff', 1);
  d.pen.stroke([pt(6.6, -57.4), pt(8.8, -57.6), pt(10.8, -56.6)], 0.85, d.ink, 1, false);
  // The scarf: up over the nose, wound round the neck and chin.
  const scarf = blob([pt(3.4, -53.6), pt(8.4, -54.2), pt(11.4, -54), pt(12.8, -53), pt(12, -50.6), pt(9.8, -47.8), pt(4.6, -46), pt(0, -46.2), pt(-1.4, -49), pt(1, -52)], 4);
  paint(d, scarf, C.scarf, { shadow: 0.55, line: 0.7, hatch: 0.2 });
  folds(d, [[pt(2, -50.4), pt(6.8, -50), pt(11, -51.2)], [pt(1.2, -48), pt(5.6, -47.4), pt(9, -48.4)]], C.scarf, 0.45, 0.85);
  gleam(d, [pt(5, -53.4), pt(9, -53.8), pt(11.8, -53)], 0.55, 0.55);
  // The hood's edge: a lit fold of cloth framing the face.
  const rim = roundTube(bezier(pt(6.8, -60.6), pt(3.4, -57.6), pt(3.8, -49.4), 12), (u) => 1.7 - u * 0.5);
  paint(d, rim, mix(C.cloak, LIGHT_CLOTH, 0.25), { shadow: 0.35, line: 0.5, hatch: 0 });
}


// The rest pose, as painted: the hips the body turns about, the neck the head turns about, and each limb's joints.
const HIPS = pt(0, -28);
const NECK = pt(2, -47);
const BACK_HIP = pt(-2.6, -28);
const FRONT_HIP = pt(2.6, -28);
const BACK_LEG = chainOf(BACK_HIP, pt(-6.4, -15.4), pt(-11.4, -4.4));
const FRONT_LEG = chainOf(FRONT_HIP, pt(10.2, -17.4), pt(10.6, -4.4));
const BACK_ANKLE = pt(-11.4, -4.4);
const FRONT_ANKLE = pt(10.6, -4.4);
/** The toe, from the ankle. */
const BACK_TOE = pt(6.2, 4.1);
const FRONT_TOE = pt(6.6, 4.1);
const SHOULDER = pt(3.6, -44.6);
const ARM = chainOf(SHOULDER, pt(9.4, -36.6), pt(16.4, -39.4));
const BACK_SHOULDER = pt(-2.6, -45);
const BACK_ARM = chainOf(BACK_SHOULDER, pt(-7.6, -36.4), pt(-7.4, -29.6));
/** The knife hands (the knife's root in the fist) and the way each blade points, at rest. */
const HAND = pt(17.6, -39.8);
const KNIFE_ANG = Math.atan2(-0.39, 0.92);
const BACK_HAND = pt(-7.4, -28.4);
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

/** Idle: crouched and ready, breathing behind the scarf, the knife point weaving, the cloak stirring. */
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
  const back = step(t + 0.5, 6.5, 4.5);
  const front = step(t, 6.5, 4.5);
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
    backAnkle: pt(beat(t, [BACK_ANKLE.x, -12, -8, -8, BACK_ANKLE.x]), BACK_ANKLE.y),
    backTilt: 0,
    frontAnkle: pt(beat(t, [FRONT_ANKLE.x, 10, 19, 19, FRONT_ANKLE.x]), FRONT_ANKLE.y - beat(t, [0, 2.5, 0, 0, 0])),
    frontTilt: beat(t, [0, -0.15, 0, 0, 0]),
    hand: beatPt(t, [HAND, pt(7, -42), pt(21.5, -40.5), pt(20, -38.5), HAND]),
    knifeAng: beat(t, [KNIFE_ANG, -0.35, -0.02, 0.1, KNIFE_ANG]),
    backHand: beatPt(t, [BACK_HAND, pt(-5, -31), pt(-11, -31.5), pt(-10, -30), BACK_HAND]),
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
const knifePoint = (r: Rig): Pt => place(r.body, pt(r.hand.x + Math.cos(r.knifeAng) * 13, r.hand.y + Math.sin(r.knifeAng) * 13));

/** A leg from its hip (body space) down to its ankle (ground space), knee solved between. */
function legTo(d: Draw, r: Rig, hip: Pt, chain: typeof BACK_LEG, ankle: Pt, toe: Pt, shade: number, tilt: number): void {
  const h = place(r.body, hip);
  leg(d, h, joint(chain, h, ankle), ankle, pt(ankle.x + toe.x, ankle.y + toe.y), shade, tilt);
}

export const drawBandit: CreatureDrawer = (ctx, seed, f, pose: Pose = IDLE) => {
  const r = rigOf(pose);
  sprite(ctx, seed, f, { shadow: 19, shadowX: 1, line: 0.6 }, (d) => {
    const inBody = (draw: () => void): void => within(d.pen.ctx, r.body, draw);
    inBody(() => {
      cloak(d, r.cloak);
      scarfTails(d, r.scarf);
    });
    // The back leg stretched out behind, the front leg bent forward.
    legTo(d, r, BACK_HIP, BACK_LEG, r.backAnkle, BACK_TOE, 0.2, r.backTilt);
    legTo(d, r, FRONT_HIP, FRONT_LEG, r.frontAnkle, FRONT_TOE, 0, r.frontTilt);
    inBody(() => {
      // The front arm, reaching out with the knife (behind the body at the shoulder).
      const spin = r.knifeAng - KNIFE_ANG;
      const wrist = turn(pt(r.hand.x - 1.2, r.hand.y + 0.4), r.hand, spin);
      const elbow = lowJoint(ARM, SHOULDER, wrist);
      const farSleeve = mix(C.sleeve, SHADOW, 0.15);
      limb(d, SHOULDER, elbow, 4.6, 4, farSleeve, { hatch: 0.16 });
      limb(d, elbow, wrist, 4, 3.4, C.jerkinDeep, { hatch: 0.12 });
      stitches(d, pt(elbow.x + (wrist.x - elbow.x) * 0.23, elbow.y + (wrist.y - elbow.y) * 0.23 - 1), pt(elbow.x + (wrist.x - elbow.x) * 0.77, elbow.y + (wrist.y - elbow.y) * 0.77 - 1), 3, C.lace, 0.3);
      knife(d, r.hand, dirOf(r.knifeAng), 13);
      const glove = turn(pt(r.hand.x - 0.2, r.hand.y + 0.2), r.hand, spin);
      paint(d, ovalAt(glove, 2.3, 2.1), C.glove, { shadow: 0.4, line: 0.55, hatch: 0 });
      jerkin(d);
      // The back arm, low at the hip, a knife held point-down behind it.
      knife(d, r.backHand, dirOf(r.backKnifeAng), 11);
      const backWrist = turn(pt(r.backHand.x, r.backHand.y - 1.2), r.backHand, r.backKnifeAng - BACK_KNIFE_ANG);
      const backElbow = joint(BACK_ARM, BACK_SHOULDER, backWrist);
      limb(d, BACK_SHOULDER, backElbow, 4.6, 4, C.sleeve, { hatch: 0.16 });
      limb(d, backElbow, backWrist, 4, 3.4, C.jerkinDeep, { hatch: 0.12 });
      paint(d, ovalAt(r.backHand, 2.3, 2.2), C.glove, { shadow: 0.4, line: 0.55, hatch: 0 });
      const pauldron = blob([pt(-6.6, -47), pt(-1.4, -48), pt(0.4, -44.4), pt(-2.6, -41.6), pt(-6.8, -42.6)], 4);
      paint(d, pauldron, C.jerkinDeep, { shadow: 0.5, line: 0.6, hatch: 0.16, gloss: true });
      stud(d, pt(-3.4, -45.4), 0.5, C.brass);
      stud(d, pt(-4.6, -43.4), 0.45, C.brass);
      within(d.pen.ctx, r.head, () => head(d));
    });
  });
  // The thrust: speed lines along the knife's path as it goes in.
  if (pose.kind === 'attack') {
    const path = Array.from({ length: 9 }, (_, i) => knifePoint(attack(pose.t - 0.14 + (i / 8) * 0.13)));
    smear(ctx, seed, f, path, 0.8, beat(pose.t, [0, 0, 0.7, 0.2, 0]));
  }
};
