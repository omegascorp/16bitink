import { bezier, pt, type Draw } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { sprite } from './neutralFinish';
import { blob, dab, folds, gleam, limb, mix, ovalAt, paint, roundTube, SHADOW, stitches, stud, tatters } from './neutralKit';
import { beat, beatPt, breath, chainOf, joint, lowJoint, place, pulse, smear, step, strideBob, turn, wave, within, xf, type Xf } from './neutralRig';
import { IDLE, type CreatureDrawer, type Pose } from './types';

/**
 * The Goblin: a small, wiry green imp about 44 tall, crouched and leaning
 * in with a grin, a nail-studded club cocked up in its front hand and the
 * other clawed hand flung back for balance. Big leaf ears swept back, a
 * long hooked nose, yellow eyes under a wicked brow, a ragged ochre tunic
 * belted with rope. Mischievous, never gross.
 */
const C = {
  skin: '#86a65a',
  skinDeep: '#56733a',
  ear: '#c48a6a',
  tunic: '#b08445',
  tunicDeep: '#7a5530',
  rope: '#cdb07a',
  pouch: '#7d5a38',
  wood: '#8c6236',
  woodDeep: '#5a3d22',
  iron: '#8f949a',
  eye: '#f3d24a',
  mouth: '#4a1f22',
  tooth: '#fbf3dc',
  nail: '#e9dcb8',
} as const;

/** A big bare foot: heel at `heel`, long toes pointing forward, claws at the tips; `tilt` turns it about the ankle (+ toes down). */
function foot(d: Draw, heel: Pt, len: number, color: string, tilt = 0): void {
  within(d.pen.ctx, xf(pt(heel.x + 2.6, heel.y - 1.8), tilt), () => footAt(d, heel, len, color));
}

function footAt(d: Draw, heel: Pt, len: number, color: string): void {
  const shape = blob([pt(heel.x - 1.4, heel.y - 1), pt(heel.x + 1, heel.y - 3.6), pt(heel.x + len * 0.55, heel.y - 2.6), pt(heel.x + len, heel.y - 0.6), pt(heel.x + len * 0.6, heel.y + 0.4), pt(heel.x, heel.y + 0.3)], 4);
  paint(d, shape, color, { shadow: 0.45, line: 0.6, hatch: 0.12 });
  for (const k of [0, 1]) d.pen.hair([pt(heel.x + len * (0.62 + k * 0.16), heel.y - 1.8 + k * 0.6), pt(heel.x + len * (0.7 + k * 0.16), heel.y - 0.2)], 0.3, d.ink, 0.6);
  d.pen.stroke([pt(heel.x + len - 0.4, heel.y - 0.9), pt(heel.x + len + 1.3, heel.y - 0.1)], 0.6, C.nail, 1, false);
}

/** A bent leg, hip to knee to ankle, with a knobbly knee. */
function leg(d: Draw, hip: Pt, knee: Pt, ankle: Pt, color: string): void {
  limb(d, hip, knee, 4.4, 3.4, color, { shadow: 0.5, hatch: 0.16 });
  limb(d, knee, ankle, 3.3, 2.4, color, { shadow: 0.5, hatch: 0.16 });
  paint(d, ovalAt(knee, 1.5, 1.3), color, { shadow: 0.35, line: 0.35, hatch: 0, lineAlpha: 0.6 });
}

/** A clawed hand: a small palm and three hooked fingers fanned out. */
function claw(d: Draw, at: Pt, ang: number, color: string): void {
  for (const k of [-0.55, 0, 0.55]) {
    const a = ang + k;
    const tip = pt(at.x + Math.cos(a) * 4.2, at.y + Math.sin(a) * 4.2);
    const bend = pt(at.x + Math.cos(a - 0.35) * 2.6, at.y + Math.sin(a - 0.35) * 2.6);
    paint(d, roundTube(bezier(at, bend, tip, 6), (u) => 1.6 - u * 0.9), color, { shadow: 0.3, line: 0.4, hatch: 0 });
    d.pen.dot(tip.x, tip.y, 0.35, C.nail, 1);
  }
  paint(d, ovalAt(at, 1.9, 1.6, ang), color, { shadow: 0.35, line: 0.45, hatch: 0 });
}

/** A big leaf ear from its root out to a tip, with a notch bitten out of its top edge. */
function ear(d: Draw, root: Pt, tip: Pt, wide: number, near: boolean): void {
  const mid = pt((root.x + tip.x) / 2 + (near ? 0 : 0.5), (root.y + tip.y) / 2 - wide * 0.55);
  const spine = bezier(root, mid, tip, 12);
  const shape = roundTube(spine, (u) => wide * Math.pow(1 - u, 0.75) * (u < 0.15 ? 0.75 + u * 1.6 : 1) + 0.4);
  const skin = near ? C.skin : mix(C.skin, SHADOW, 0.25);
  paint(d, shape, skin, { shadow: 0.45, line: near ? 0.7 : 0.55, hatch: 0.14 });
  // The inner ear: a warm, darker hollow along the lower half.
  const inner = roundTube(bezier(pt(root.x - (tip.x - root.x) * 0.02, root.y + 0.6), pt(mid.x, mid.y + wide * 0.35), pt(tip.x - (tip.x - root.x) * 0.18, tip.y - (tip.y - root.y) * 0.18 + 0.4), 10), (u) => wide * 0.45 * Math.pow(1 - u, 0.9));
  d.pen.clipped(shape, () => dab(d, inner, near ? C.ear : mix(C.ear, SHADOW, 0.3), 0.75, 0.4));
  if (near) {
    d.pen.hair(bezier(pt(root.x - 1, root.y + 0.4), pt(mid.x, mid.y + wide * 0.5), pt(tip.x + 2, tip.y + 1), 8), 0.35, d.ink, 0.6);
    // A notch in the top edge, and a lit ridge.
    const n = spine[5]!;
    d.pen.stroke([pt(n.x - 0.8, n.y - wide * 0.42), pt(n.x, n.y - wide * 0.2), pt(n.x + 0.9, n.y - wide * 0.45)], 0.5, d.ink, 0.9, false);
    gleam(d, spine.slice(2, 8).map((p) => pt(p.x, p.y - wide * 0.28)), 0.5, 0.55);
  }
}

/** The head: a round cranium, hooked nose, wide toothy grin, yellow eyes under a wicked brow, a few wiry hairs. */
function head(d: Draw): void {
  const skull = blob([pt(-2.2, -36), pt(-0.6, -41.2), pt(4.6, -44), pt(10.4, -42), pt(13, -38), pt(14.2, -33.4), pt(13.2, -29.4), pt(10, -27), pt(5, -27.4), pt(0.4, -29.6)], 5);
  paint(d, skull, C.skin, { shadow: 0.55, line: 0.8, hatch: 0.18, cross: true });
  // Wiry hairs on the crown.
  for (const [x, y, dx, dy] of [[2, -43.2, -1.6, -3.2], [4.4, -44, 0.2, -3.6], [6.6, -43.6, 1.8, -3]] as const) {
    d.pen.hair([pt(x, y), pt(x + dx * 0.6, y + dy * 0.6), pt(x + dx, y + dy)], 0.4, d.ink, 0.85);
  }
  // Brow ridge shadow over the eye, and the cheek's form.
  dab(d, ovalAt(pt(9.6, -37.6), 4.2, 2, -0.2), C.skinDeep, 0.45, 0.8);
  // Eyes: the far one peeks past the nose bridge; the near one is big and sly.
  const far = ovalAt(pt(13.2, -37.4), 1.15, 1.35, 0.3, 14);
  paint(d, far, mix(C.eye, SHADOW, 0.2), { shadow: 0.25, line: 0.4, hatch: 0 });
  d.pen.dot(13.5, -37.3, 0.55, d.ink, 1);
  const eye = blob([pt(6.4, -37.2), pt(8.4, -38.8), pt(10.6, -38.2), pt(10.4, -36.4), pt(8.2, -35.6)], 4);
  paint(d, eye, C.eye, { shadow: 0.2, line: 0.55, hatch: 0, gloss: true });
  d.pen.fill(ovalAt(pt(9.2, -37.2), 0.55, 1.2, 0.15, 12), d.ink, 1);
  d.pen.dot(8.6, -37.9, 0.4, PAPER_FILL, 1);
  // A slanted brow: low over the nose, cocked up at the back.
  d.pen.stroke([pt(5.6, -40.4), pt(8.6, -40), pt(11.6, -38.6)], 1.1, d.ink, 1, false);
  // The nose: long and hooked, pointing forward and down.
  const nose = blob([pt(10.6, -38.8), pt(14.6, -37.2), pt(19.6, -33.8), pt(18.2, -32.6), pt(14.2, -32.4), pt(11.6, -34)], 4);
  paint(d, nose, C.skin, { shadow: 0.5, line: 0.65, hatch: 0.15 });
  gleam(d, [pt(12.4, -37), pt(15.4, -35.6), pt(17.6, -34.2)], 0.55, 0.7);
  d.pen.hair([pt(13.6, -33.4), pt(14.6, -32.8)], 0.4, d.ink, 0.8);
  // The grin: wide, curling up at the corner, a row of sharp teeth.
  const mouth = blob([pt(6.4, -31.4), pt(10, -30.6), pt(14.2, -31.4), pt(15.6, -32.8), pt(14.4, -29.6), pt(10.6, -28.2), pt(7.4, -29.4)], 4);
  paint(d, mouth, C.mouth, { shadow: 0.2, line: 0.55, hatch: 0, alpha: 1 });
  d.pen.clipped(mouth, () => {
    for (let i = 0; i < 5; i++) {
      const x = 7.4 + i * 1.6;
      const y = -31.2 + Math.abs(i - 2) * 0.05 - (i > 3 ? 0.4 : 0);
      d.pen.fill([pt(x - 0.7, y - 0.6), pt(x + 0.7, y - 0.6), pt(x, y + 1.3)], C.tooth, 1);
    }
    d.pen.fill([pt(9.6, -27.8), pt(10.8, -28), pt(10.2, -29.8)], C.tooth, 1);
  });
  d.pen.hair([pt(15.6, -32.8), pt(16.2, -33.8)], 0.45, d.ink, 0.9);
  d.pen.hair(bezier(pt(5.4, -33.6), pt(5.6, -31), pt(7.2, -29.2), 6), 0.4, d.ink, 0.6);
  // Chin and jaw hatching, and a lit line along the brow.
  gleam(d, [pt(0.6, -39.8), pt(3.6, -42.8), pt(7.4, -43.4)], 0.7, 0.6);
}

/** The ragged tunic: hunched back, a torn hem, a rope belt with a knot and a pouch. */
function tunic(d: Draw): void {
  const hem = tatters(pt(8.4, -11.6), pt(-7.6, -12.4), 5, 2.6, 3);
  const body = [...blob([pt(-7.4, -14), pt(-7.6, -21), pt(-5.2, -27.4), pt(0, -30.8), pt(5, -30.2), pt(8.8, -26.4), pt(9.8, -19), pt(8.6, -12)], 4).slice(0, 29), ...hem];
  paint(d, body, C.tunic, { shadow: 0.6, line: 0.75, hatch: 0.22, cross: true });
  folds(d, [[pt(-4, -27), pt(-4.6, -20), pt(-3.6, -13)], [pt(4, -24), pt(5, -18), pt(4.2, -12.6)], [pt(0.2, -22), pt(0.6, -14)]], C.tunic, 0.45, 0.7);
  // A patch, stitched on crooked.
  const p = [pt(-5.2, -24), pt(-1.8, -24.6), pt(-1.4, -21.2), pt(-5, -20.8)];
  paint(d, p, mix(C.tunic, '#6f7a4e', 0.6), { shadow: 0.2, line: 0.35, hatch: 0 });
  stitches(d, pt(-5, -24.2), pt(-1.6, -24.6), 3, d.ink);
  stitches(d, pt(-1.5, -24.4), pt(-1.4, -21.2), 3, d.ink);
  // The rope belt, its knot and a pouch hanging off it.
  const belt = roundTube([pt(-7.6, -17.4), pt(0, -16.6), pt(9.6, -17.6)], () => 1.7);
  paint(d, belt, C.rope, { shadow: 0.4, line: 0.5, hatch: 0 });
  for (let x = -6.6; x < 9; x += 1.4) d.pen.hair([pt(x, -18.2), pt(x + 0.8, -16.3)], 0.3, mix(C.rope, SHADOW, 0.5), 0.8);
  paint(d, ovalAt(pt(6.4, -17), 1.3, 1.1), C.rope, { shadow: 0.3, line: 0.45, hatch: 0 });
  d.pen.stroke([pt(6.6, -16), pt(7.4, -13.4)], 0.9, C.rope, 1, false);
  d.pen.hair([pt(6.6, -16), pt(7.4, -13.4)], 0.3, d.ink, 0.7);
  const pouch = blob([pt(-5.6, -16.4), pt(-2.6, -16.6), pt(-2.2, -13.2), pt(-4, -11.8), pt(-5.8, -13.2)], 4);
  paint(d, pouch, C.pouch, { shadow: 0.5, line: 0.55, hatch: 0.15 });
  d.pen.hair([pt(-5.4, -15.4), pt(-2.5, -15.6)], 0.35, d.ink, 0.7);
}

/** The club: a knotty shaft swelling to a heavy round head, bent nails driven through it. */
function club(d: Draw, grip: Pt, top: Pt): void {
  const ang = Math.atan2(top.y - grip.y, top.x - grip.x);
  const len = Math.hypot(top.x - grip.x, top.y - grip.y);
  const along = (k: number, side = 0): Pt => pt(grip.x + Math.cos(ang) * k - Math.sin(ang) * side, grip.y + Math.sin(ang) * k + Math.cos(ang) * side);
  // Nails first, so the head's wood closes over their roots.
  for (const [k, side, lean] of [[0.62, 1, -0.3], [0.78, -1, 0.2], [0.86, 1, 0.35], [0.98, 0.15, 0]] as const) {
    const base = along(len * k, side * 1.6);
    const tip = along(len * k + lean * 2 + (side === 0.15 ? 3.4 : 0), side * (side === 0.15 ? 0 : 5.6));
    d.pen.stroke([base, tip], 0.75, d.ink, 1, false);
    d.pen.stroke([base, tip], 0.4, C.iron, 1, false);
  }
  const spine = Array.from({ length: 15 }, (_, i) => along(-2.6 + ((len * 0.94 + 2.6) * i) / 14, 0.35 * Math.sin(i * 1.3)));
  const shape = roundTube(spine, (u) => 2.3 + Math.pow(u, 2.2) * 5.6);
  paint(d, shape, C.wood, { shadow: 0.6, line: 0.75, hatch: 0.22, cross: true });
  // Grain, a knot, and the lit side.
  d.pen.hair([along(2, 0.4), along(len * 0.5, 0.6), along(len * 0.9, 1.4)], 0.35, C.woodDeep, 0.75);
  d.pen.hair([along(len * 0.45, -0.6), along(len * 0.88, -1.8)], 0.3, C.woodDeep, 0.65);
  paint(d, ovalAt(along(len * 0.72, 0.6), 1, 0.7, ang), C.woodDeep, { shadow: 0, line: 0.35, hatch: 0 });
  gleam(d, [along(len * 0.3, -1.2), along(len * 0.6, -1.8), along(len * 0.86, -3)], 0.6, 0.6);
  for (const [k, side] of [[0.7, -1.2], [0.84, 1.4], [0.9, -1.6]] as const) stud(d, along(len * k, side), 0.6, C.iron);
}


// The rest pose, as painted: the hips the body turns about, the neck the head turns about, and each limb's joints.
const HIPS = pt(-0.7, -14);
const NECK = pt(4.6, -29);
const FAR_HIP = pt(-3.4, -14);
const NEAR_HIP = pt(2, -14);
const FAR_LEG = chainOf(FAR_HIP, pt(-9.6, -8.6), pt(-9, -2.2));
const NEAR_LEG = chainOf(NEAR_HIP, pt(8, -8.8), pt(6, -2.2));
/** Knees bent forward, as in a stride (the far knee rests splayed back). */
const FORWARD = NEAR_LEG.bend;
const FAR_HEEL = pt(-11.4, -0.4);
const NEAR_HEEL = pt(3.2, -0.4);
/** The ankle sits up and forward of the heel. */
const ANKLE = pt(2.6, -1.8);
const FAR_SHOULDER = pt(-2, -27.6);
const FAR_ARM = chainOf(FAR_SHOULDER, pt(-8.4, -24), pt(-13.6, -26.8));
const FAR_HAND = pt(-13.6, -26.8);
const CLAW_ANG = Math.PI + 0.35;
const SHOULDER = pt(3.6, -27);
const ARM = chainOf(SHOULDER, pt(9.4, -21), pt(14.6, -24.4));
/** The club's grip and the way it points (grip to head), at rest. */
const GRIP = pt(15, -24.2);
const CLUB_ANG = Math.atan2(-43.4 + 24.2, 25.4 - 15);
const CLUB_LEN = Math.hypot(25.4 - 15, -43.4 + 24.2);
const FAR_EAR = { root: pt(3.6, -40.8), tip: pt(-9.6, -49.4) };
const NEAR_EAR = { root: pt(1.4, -35.2), tip: pt(-14.6, -44.4) };

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
  /** The club's grip and angle, in body space. */
  readonly grip: Pt;
  readonly clubAng: number;
}

/** Idle: twitchy, never still: weight rocking foot to foot, a sudden glance, an ear flicking. */
function idle(t: number): Rig {
  return {
    body: xf(HIPS, 0.03 * wave(t, 0.1), 0.9 * wave(t), -0.6 * breath(t) + 0.5 * pulse(t, 0.5, 0.17)),
    head: xf(NECK, 0.05 * wave(t, 0.25) - 0.09 * pulse(t, 0.5, 0.17), 0, -0.3 * breath(t)),
    earFar: 0.03 * wave(t) + 0.26 * pulse(t, 0.67, 0.17),
    earNear: 0.04 * wave(t, 0.5) + 0.24 * pulse(t, 0.33, 0.17),
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

/** Walk: a hunched scurry: bent low and leaning in, short quick steps, the club bobbing, ears trailing. */
function walk(t: number): Rig {
  const body = xf(HIPS, 0.13, 0.4, 1.3 - 1.5 * strideBob(t));
  // Both feet stride about one spot under the hips (the far one a touch behind), so they pass each other.
  const mid = place(body, HIPS).x + 1.6;
  const foot = (x: number, u: number): { heel: Pt; tilt: number } => {
    const s = step(u, 6, 4);
    return { heel: pt(x + s.x - ANKLE.x, -0.4 + s.y), tilt: s.tilt };
  };
  const near = foot(mid + 0.8, t);
  const far = foot(mid - 0.8, t + 0.5);
  const swing = Math.cos(Math.PI * 2 * t);
  return {
    body,
    head: xf(NECK, -0.1 + 0.04 * wave(2 * t, 0.15), 0, 0.4 * wave(2 * t, 0.2)),
    earFar: 0.1 * wave(2 * t, 0.1) - 0.06,
    earNear: 0.13 * wave(2 * t, 0.05) - 0.06,
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

/** Attack: a quick hack: club cocked back over the shoulder, then whipped down and forward with a hop onto the front foot. */
function attack(t: number): Rig {
  return {
    body: xf(HIPS, beat(t, [0, -0.13, 0.2, 0.13, 0]), beat(t, [0, -2, 3.4, 2.4, 0]), beat(t, [0, 0.4, 1.6, 1.2, 0])),
    head: xf(NECK, beat(t, [0, -0.12, 0.13, 0.06, 0])),
    earFar: beat(t, [0, -0.12, 0.16, 0.08, 0]),
    earNear: beat(t, [0, -0.14, 0.2, 0.1, 0]),
    farHeel: pt(beat(t, [FAR_HEEL.x, -12, -10.6, -10.6, FAR_HEEL.x]), FAR_HEEL.y),
    farTilt: 0,
    nearHeel: pt(beat(t, [NEAR_HEEL.x, 2.4, 7, 7, NEAR_HEEL.x]), NEAR_HEEL.y - beat(t, [0, 2, 0, 0, 0])),
    nearTilt: beat(t, [0, -0.2, 0, 0, 0]),
    farBend: FAR_LEG.bend,
    nearBend: NEAR_LEG.bend,
    farHand: beatPt(t, [FAR_HAND, pt(-9.5, -31), pt(-14.4, -24.4), pt(-14, -25.4), FAR_HAND]),
    clawAng: beat(t, [CLAW_ANG, Math.PI - 0.4, CLAW_ANG + 0.3, CLAW_ANG + 0.15, CLAW_ANG]),
    grip: beatPt(t, [GRIP, pt(-0.4, -31), pt(17.6, -22.6), pt(15.8, -20.4), GRIP]),
    clubAng: beat(t, [CLUB_ANG, -2.2, 0.3, 0.62, CLUB_ANG]),
  };
}

function rigOf(pose: Pose): Rig {
  if (pose.kind === 'walk') return walk(pose.t);
  if (pose.kind === 'attack') return attack(pose.t);
  return idle(pose.t);
}

/** Where the club's head is, on the frame. */
const clubHead = (r: Rig): Pt => place(r.body, pt(r.grip.x + Math.cos(r.clubAng) * CLUB_LEN, r.grip.y + Math.sin(r.clubAng) * CLUB_LEN));

/** A leg from its hip (body space) down to its foot (ground space), knee solved between. */
function legTo(d: Draw, r: Rig, hip: Pt, heel: Pt, chain: typeof NEAR_LEG, bend: number, color: string): void {
  const h = place(r.body, hip);
  const ankle = pt(heel.x + ANKLE.x, heel.y + ANKLE.y);
  leg(d, h, joint(chain, h, ankle, bend), ankle, color);
}

export const drawGoblin: CreatureDrawer = (ctx, seed, f, pose: Pose = IDLE) => {
  const r = rigOf(pose);
  sprite(ctx, seed, f, { shadow: 15, shadowX: 1, line: 0.6 }, (d) => {
    const far = mix(C.skin, SHADOW, 0.3);
    const inBody = (draw: () => void): void => within(d.pen.ctx, r.body, draw);
    const inHead = (draw: () => void): void => inBody(() => within(d.pen.ctx, r.head, draw));
    // The far side, in shade: ear behind the head, leg, foot, and the arm flung back.
    inHead(() => ear(d, FAR_EAR.root, turn(FAR_EAR.tip, FAR_EAR.root, r.earFar), 4.4, false));
    foot(d, r.farHeel, 8.2, far, r.farTilt);
    legTo(d, r, FAR_HIP, r.farHeel, FAR_LEG, r.farBend, far);
    inBody(() => {
      const elbow = joint(FAR_ARM, FAR_SHOULDER, r.farHand);
      limb(d, FAR_SHOULDER, elbow, 3.4, 2.8, far, { hatch: 0.14 });
      limb(d, elbow, r.farHand, 2.8, 2.2, far, { hatch: 0.1 });
      claw(d, pt(r.farHand.x - 0.6, r.farHand.y - 0.4), r.clawAng, far);
    });
    // The near leg and foot.
    foot(d, r.nearHeel, 8.8, C.skin, r.nearTilt);
    legTo(d, r, NEAR_HIP, r.nearHeel, NEAR_LEG, r.nearBend, C.skin);
    inBody(() => tunic(d));
    // The near ear, swept back, then the head over its root.
    inHead(() => {
      head(d);
      ear(d, NEAR_EAR.root, turn(NEAR_EAR.tip, NEAR_EAR.root, r.earNear), 6.4, true);
    });
    inBody(() => {
      // The club arm: upper arm in a torn sleeve, forearm, fist round the club.
      const spin = r.clubAng - CLUB_ANG;
      const hand = turn(pt(14.6, -24.4), GRIP, spin);
      const wrist = pt(hand.x + r.grip.x - GRIP.x, hand.y + r.grip.y - GRIP.y);
      const elbow = lowJoint(ARM, SHOULDER, wrist);
      limb(d, SHOULDER, elbow, 3.8, 3.2, C.skin, { hatch: 0.14 });
      const sleeve = [...blob([pt(1, -29.4), pt(5.6, -29.8), pt(7.6, -26)], 4).slice(0, 10), ...tatters(pt(7.6, -25.4), pt(2, -24.8), 2, 1.6, 7)];
      paint(d, sleeve, C.tunic, { shadow: 0.45, line: 0.55, hatch: 0.15 });
      limb(d, elbow, wrist, 3.2, 2.7, C.skin, { hatch: 0.12 });
      club(d, r.grip, pt(r.grip.x + Math.cos(r.clubAng) * CLUB_LEN, r.grip.y + Math.sin(r.clubAng) * CLUB_LEN));
      within(d.pen.ctx, xf(GRIP, spin, r.grip.x - GRIP.x, r.grip.y - GRIP.y), () => {
        paint(d, ovalAt(pt(15.2, -24.6), 2.3, 2, 0.4), C.skin, { shadow: 0.4, line: 0.55, hatch: 0 });
        for (const k of [0, 1]) d.pen.hair([pt(14.4 + k * 1.1, -26.2 + k * 0.4), pt(15.6 + k * 1.1, -23.2 + k * 0.4)], 0.3, d.ink, 0.65);
      });
    });
  });
  // The blow: speed lines along the club head's path as it lands.
  if (pose.kind === 'attack') {
    const path = Array.from({ length: 9 }, (_, i) => clubHead(attack(pose.t - 0.13 + (i / 8) * 0.12)));
    smear(ctx, seed, f, path, 0.9, beat(pose.t, [0, 0, 0.75, 0.25, 0]));
  }
};
