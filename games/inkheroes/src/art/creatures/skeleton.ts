import { bezier, pt, type Draw } from '../kit';
import type { Pt } from '../pen';
import { sprite } from './neutralFinish';
import { blob, dab, folds, gleam, glow, mix, ovalAt, paint, roundTube, SHADOW, stud, tatters } from './neutralKit';
import { beat, beatPt, breath, chainOf, joint, lowJoint, place, pulse, smear, step, strideBob, turn, wave, within, xf, type Xf } from './neutralRig';
import { IDLE, type CreatureDrawer, type Pose } from './types';

/**
 * The Skeleton: an undead warrior about 60 tall in bleached, weathered
 * bone, a rusty notched sword raised overhead in the near hand and a
 * cracked round shield held forward on the far arm. Scraps of an old moss
 * tabard hang from a rope at its hips; a faint green light burns in its
 * eye sockets. Bones, never gore.
 */
const C = {
  bone: '#e9e0c6',
  boneDeep: '#b9a77e',
  stain: '#c2a86e',
  socket: '#221b2a',
  glow: '#b8f5c4',
  steel: '#a3a9ad',
  rust: '#a4572c',
  grip: '#5b4130',
  wood: '#9a6d3e',
  rim: '#7c7f84',
  paint: '#b98a3e',
  cloth: '#6f7d4c',
  clothEdge: '#a8894a',
  rope: '#bfa375',
} as const;

/** The jaw's hinge, under the cheekbone at the back of the skull. */
const JAW_HINGE = pt(3, -55.6);

/** A bone from a to b: a shaft of width w swelling to knobbed ends. */
function bone(d: Draw, a: Pt, b: Pt, w: number, color: string = C.bone, knob = 0.8): Pt[] {
  const spine = Array.from({ length: 13 }, (_, i) => pt(a.x + ((b.x - a.x) * i) / 12, a.y + ((b.y - a.y) * i) / 12));
  const shape = roundTube(spine, (u) => w * (1 + knob * Math.exp(-((u / 0.11) ** 2)) + knob * Math.exp(-(((1 - u) / 0.11) ** 2))));
  paint(d, shape, color, { shadow: 0.55, line: 0.55, hatch: 0.18 });
  // A lit ridge along the shaft and a stain or two of age.
  const nx = -(b.y - a.y);
  const ny = b.x - a.x;
  const l = Math.hypot(nx, ny) || 1;
  const off = pt((-nx / l) * w * 0.2 * Math.sign(nx + ny || 1), (-ny / l) * w * 0.2 * Math.sign(nx + ny || 1));
  gleam(d, spine.slice(3, 10).map((p) => pt(p.x + off.x - 0.2, p.y + off.y - 0.2)), w * 0.3, 0.6);
  return shape;
}

/** A forearm: radius and ulna side by side, joined at the wrist. */
function forearm(d: Draw, elbow: Pt, wrist: Pt, color: string): void {
  const nx = -(wrist.y - elbow.y);
  const ny = wrist.x - elbow.x;
  const l = Math.hypot(nx, ny) || 1;
  const o = pt((nx / l) * 0.75, (ny / l) * 0.75);
  bone(d, pt(elbow.x - o.x, elbow.y - o.y), pt(wrist.x - o.x * 0.4, wrist.y - o.y * 0.4), 0.95, mix(color, SHADOW, 0.12), 0.5);
  bone(d, pt(elbow.x + o.x, elbow.y + o.y), pt(wrist.x + o.x * 0.4, wrist.y + o.y * 0.4), 1.05, color, 0.55);
}

/** A leg: femur, kneecap, shin and a bony foot pointing forward. */
function leg(d: Draw, hip: Pt, knee: Pt, ankle: Pt, toe: Pt, color: string, tilt = 0): void {
  bone(d, hip, knee, 2.1, color);
  bone(d, pt(knee.x - 0.6, knee.y + 0.8), pt(ankle.x - 0.4, ankle.y), 0.8, mix(color, SHADOW, 0.15), 0.6);
  bone(d, pt(knee.x + 0.3, knee.y + 0.6), ankle, 1.6, color);
  paint(d, ovalAt(pt(knee.x + 1, knee.y - 0.2), 1.3, 1.5), color, { shadow: 0.4, line: 0.45, hatch: 0 });
  within(d.pen.ctx, xf(ankle, tilt), () => foot(d, ankle, toe, color));
}

/** The heel bone, then the long bones of the foot fanning to the toes. */
function foot(d: Draw, ankle: Pt, toe: Pt, color: string): void {
  paint(d, ovalAt(pt(ankle.x - 1, ankle.y + 1.6), 1.6, 1.4), color, { shadow: 0.5, line: 0.5, hatch: 0 });
  for (const [k, w] of [[-0.5, 0.95], [0.5, 1.05]] as const) {
    const a = pt(ankle.x + 0.4, ankle.y + 1 + k * 0.6);
    const b = pt(toe.x - 1.6, toe.y - 0.9 + k * 0.7);
    bone(d, a, b, w, k < 0 ? mix(color, SHADOW, 0.12) : color, 0.5);
    bone(d, b, pt(toe.x, toe.y - 0.5 + k * 0.5), w * 0.8, color, 0.4);
  }
}

/** The rib cage in three-quarter view: shadowed hollow, spine, ribs arching to the breastbone. */
function ribcage(d: Draw): void {
  const hollow = blob([pt(-5.4, -50.6), pt(1.6, -51.6), pt(6.8, -48.6), pt(7.4, -43.2), pt(5.4, -38.6), pt(-0.6, -38), pt(-5, -40.6), pt(-6, -45.6)], 4);
  dab(d, hollow, SHADOW, 0.32, 0.8);
  dab(d, ovalAt(pt(0.6, -44.4), 4, 4.4), C.socket, 0.35, 1.2);
  for (let y = -50.2; y < -38; y += 2.2) paint(d, ovalAt(pt(-4.6 + (y + 50) * 0.04, y), 1.35, 1.05), mix(C.bone, SHADOW, 0.15), { shadow: 0.4, line: 0.4, hatch: 0 });
  for (let i = 4; i >= 0; i--) {
    const y0 = -49 + i * 2.3;
    const end = i < 4 ? pt(5.9 + i * 0.1, -47.4 + i * 1.75) : pt(3.4, -38.6);
    const rib = bezier(pt(-4.2, y0), pt(1.6 - i * 0.4, y0 - 2.6 + i * 0.25), end, 12);
    paint(d, roundTube(rib, (u) => 1.45 - u * 0.4), C.bone, { shadow: 0.45, line: 0.5, hatch: 0 });
    gleam(d, rib.slice(2, 8).map((p) => pt(p.x, p.y - 0.35)), 0.35, 0.55);
  }
  bone(d, pt(6, -49.4), pt(6.4, -41.6), 1.4, C.bone, 0.3);
  bone(d, pt(-3.4, -50.6), pt(6, -50.4), 1.2, C.bone, 0.5);
}

/** The pelvis: a bowl of bone with its hollows, the rope belt and tabard scraps hung over it. */
function hips(d: Draw): void {
  const pelvis = blob([pt(-5.6, -33.4), pt(-1, -34.6), pt(4.6, -33.6), pt(6.2, -30.4), pt(3.6, -27), pt(0, -26.4), pt(-3.8, -27.4), pt(-6.2, -30.4)], 4);
  paint(d, pelvis, C.bone, { shadow: 0.55, line: 0.6, hatch: 0.2 });
  paint(d, ovalAt(pt(1.6, -29.4), 1.5, 1.2, 0.3), C.socket, { shadow: 0, line: 0.35, hatch: 0, alpha: 0.7 });
  for (let y = -39.2; y < -34; y += 2) paint(d, ovalAt(pt(-1.6, y), 1.6, 1.05), C.bone, { shadow: 0.4, line: 0.45, hatch: 0 });
  // The tabard: one long torn scrap down the front, a shorter one behind.
  const back = [pt(-6, -33.2), pt(-2, -33.8), ...tatters(pt(-2.4, -26), pt(-7.4, -25.4), 2, 3.4, 11)];
  paint(d, back, mix(C.cloth, SHADOW, 0.3), { shadow: 0.4, line: 0.5, hatch: 0.15 });
  const front = [pt(-1.4, -34.2), pt(5.6, -33.6), pt(6.8, -27), ...tatters(pt(7.2, -22.6), pt(-1.6, -21.8), 3, 3.2, 5)];
  paint(d, front, C.cloth, { shadow: 0.5, line: 0.6, hatch: 0.2 });
  d.pen.clipped(front, () => {
    paint(d, [pt(1.2, -36), pt(3.2, -36), pt(3.8, -18), pt(1.8, -18)], C.clothEdge, { shadow: 0.2, line: 0, hatch: 0, alpha: 0.75 });
    d.pen.stipple(front, 60, (_, y) => (y > -27 ? 0.5 : 0.15), 0.3, mix(C.cloth, SHADOW, 0.5));
  });
  folds(d, [[pt(0.2, -32), pt(-0.2, -24)], [pt(4.8, -31.6), pt(5.6, -24.4)]], C.cloth, 0.4, 0.7);
  // A hole worn through it.
  paint(d, ovalAt(pt(4.6, -27.4), 0.9, 0.7), C.socket, { shadow: 0, line: 0.3, hatch: 0, alpha: 0.6 });
  const rope = roundTube([pt(-6.4, -33.6), pt(0, -34.6), pt(6.8, -33.2)], () => 1.3);
  paint(d, rope, C.rope, { shadow: 0.4, line: 0.45, hatch: 0 });
  for (let x = -5.4; x < 6.6; x += 1.3) d.pen.hair([pt(x, -34.6), pt(x + 0.6, -33.3)], 0.25, mix(C.rope, SHADOW, 0.5), 0.8);
  d.pen.stroke([pt(-5.6, -33.4), pt(-7, -29.6), pt(-6.6, -27.6)], 0.7, C.rope, 1, false);
}

/** The shield on the far arm, turned a little away: planks, a faded ochre band, an iron rim and boss, a crack. */
function shield(d: Draw, c: Pt): void {
  const rim = ovalAt(c, 7.8, 11.6, -0.1, 28);
  // A bite out of the rim at the top.
  const bitten = rim.map((p, i) => (i >= 19 && i <= 21 ? pt(c.x + (p.x - c.x) * 0.84, c.y + (p.y - c.y) * 0.84) : p));
  paint(d, bitten, C.rim, { shadow: 0.55, line: 0.75, hatch: 0.18, gloss: true });
  const face = ovalAt(pt(c.x + 0.2, c.y), 6.5, 10.2, -0.1, 28).map((p, i) => (i >= 19 && i <= 21 ? pt(c.x + (p.x - c.x) * 0.9, c.y + (p.y - c.y) * 0.9) : p));
  paint(d, face, C.wood, { shadow: 0.5, line: 0.45, hatch: 0.16 });
  d.pen.clipped(face, () => {
    paint(d, [pt(c.x - 9, c.y - 2.4), pt(c.x + 9, c.y - 4.2), pt(c.x + 9, c.y + 0.6), pt(c.x - 9, c.y + 2.4)], C.paint, { shadow: 0.3, line: 0, hatch: 0, alpha: 0.7 });
    for (const x of [-3.4, 0.2, 3.6]) d.pen.hair([pt(c.x + x + 1, c.y - 12), pt(c.x + x - 1, c.y + 12)], 0.35, mix(C.wood, SHADOW, 0.5), 0.75);
    d.pen.stipple(face, 50, () => 0.5, 0.3, mix(C.wood, SHADOW, 0.4));
  });
  paint(d, ovalAt(pt(c.x + 0.6, c.y - 0.4), 2.4, 3.2, -0.1), C.rim, { shadow: 0.5, line: 0.55, hatch: 0, gloss: true });
  dab(d, ovalAt(pt(c.x + 1.6, c.y + 0.8), 1.6, 2), C.rust, 0.5, 0.5);
  stud(d, pt(c.x + 0.2, c.y - 1.2), 0.7, '#c4c8cc');
  for (const k of [3, 9, 15, 24]) stud(d, rim[k]!, 0.45, '#9aa0a6');
  // The crack: from the bite down across the face, split once.
  d.pen.stroke([pt(c.x - 1.6, c.y - 9.6), pt(c.x - 0.4, c.y - 6.8), pt(c.x - 2, c.y - 4.6), pt(c.x - 1, c.y - 2.8)], 0.7, d.ink, 0.95, false);
  d.pen.hair([pt(c.x - 2, c.y - 4.6), pt(c.x - 4.4, c.y - 3.4)], 0.4, d.ink, 0.85);
  gleam(d, [pt(c.x - 1, c.y - 9.6), pt(c.x + 0.2, c.y - 6.9)], 0.35, 0.6);
  gleam(d, [pt(c.x - 6.8, c.y + 2), pt(c.x - 7, c.y - 4), pt(c.x - 5, c.y - 9.2)], 0.6, 0.6);
}

/** The sword, from its pommel up past the guard to the point: a notched, rust-bitten blade. */
function sword(d: Draw, hand: Pt, dir: Pt): void {
  const at = (k: number, side = 0): Pt => pt(hand.x + dir.x * k - dir.y * side, hand.y + dir.y * k + dir.x * side);
  const blade = [at(2.6, -1.6), at(20, -1.4), at(28, -0.2), at(30.4, 0), at(28, 0.5), at(16.4, 1.5), at(15.6, 0.9), at(14.6, 1.6), at(7.2, 1.6), at(6.4, 1.1), at(5.6, 1.6), at(2.6, 1.6)];
  paint(d, blade, C.steel, { shadow: 0.5, line: 0.6, hatch: 0.14, gloss: true });
  d.pen.clipped(blade, () => {
    dab(d, ovalAt(at(9, 0.4), 2.6, 1.3, Math.atan2(dir.y, dir.x)), C.rust, 0.55, 0.6);
    dab(d, ovalAt(at(18, 0.8), 3.4, 1.1, Math.atan2(dir.y, dir.x)), C.rust, 0.45, 0.6);
    d.pen.stipple(blade, 50, () => 0.5, 0.25, C.rust);
  });
  d.pen.hair([at(3.4, 0), at(22, -0.1)], 0.35, mix(C.steel, SHADOW, 0.5), 0.8);
  gleam(d, [at(4, -0.9), at(24, -0.8)], 0.45, 0.85);
  paint(d, roundTube([at(2.4, -4.2), at(2.2, 0), at(2.4, 4.2)], () => 1.5), C.rim, { shadow: 0.4, line: 0.5, hatch: 0, gloss: true });
  paint(d, roundTube([at(-3.6), at(1.6)], () => 1.6), C.grip, { shadow: 0.4, line: 0.45, hatch: 0 });
  paint(d, ovalAt(at(-4.3), 1.3, 1.3), C.rim, { shadow: 0.4, line: 0.45, hatch: 0, gloss: true });
}

/** The skull, in three-quarter profile: long cranium, deep glowing sockets, the nose's hollow, teeth, a jaw hung a little open. */
function skull(d: Draw, jawOpen: number): void {
  // The dark of the mouth, showing as the jaw drops.
  if (jawOpen > 0.01) d.pen.fill([pt(4.4, -56.4), pt(12.2, -56.4), turn(pt(12.2, -54.2), JAW_HINGE, jawOpen), turn(pt(4.4, -54.2), JAW_HINGE, jawOpen)], C.socket, 1);
  within(d.pen.ctx, xf(JAW_HINGE, jawOpen), () => jaw(d));
  cranium(d);
}

/** The jaw, hung from its hinge below the ear, with its row of lower teeth. */
function jaw(d: Draw): void {
  const jaw = blob([pt(2.4, -56.6), pt(6.8, -55.4), pt(11.6, -55.2), pt(12.2, -53.2), pt(10.2, -51.6), pt(5.6, -52), pt(3, -53.8)], 4);
  paint(d, jaw, mix(C.bone, SHADOW, 0.12), { shadow: 0.55, line: 0.6, hatch: 0.2 });
  dab(d, [pt(6.4, -55.4), pt(12, -55.2), pt(11.6, -54.2), pt(6.6, -54.4)], C.socket, 0.8, 0.2);
  for (let x = 7; x < 11.8; x += 1.1) paint(d, [pt(x - 0.45, -54.6), pt(x + 0.45, -54.6), pt(x + 0.35, -53.4), pt(x - 0.35, -53.4)], C.bone, { shadow: 0, line: 0.25, hatch: 0 });
}

function cranium(d: Draw): void {
  const cranium = blob([pt(-2.2, -60.6), pt(-1, -64.8), pt(3.4, -67.2), pt(8.4, -66), pt(10.8, -62.8), pt(11.4, -60.2), pt(12.8, -57.8), pt(12.2, -55.6), pt(7.4, -55.4), pt(3, -56), pt(-0.6, -57.6)], 5);
  paint(d, cranium, C.bone, { shadow: 0.55, line: 0.75, hatch: 0.2, cross: true });
  d.pen.clipped(cranium, () => {
    // The hollow of the temple and the cheekbone's shadow below it.
    dab(d, ovalAt(pt(3.6, -59.6), 2, 1.6, 0.3), C.boneDeep, 0.45, 0.8);
    dab(d, [pt(4, -57.6), pt(9.6, -58), pt(11.4, -55.6), pt(5, -55.8)], mix(C.boneDeep, SHADOW, 0.2), 0.4, 0.6);
    d.pen.stipple(cranium, 50, (_, y) => (y > -60 ? 0.6 : 0.2), 0.28, C.boneDeep);
  });
  // Upper teeth.
  for (let x = 7; x < 12; x += 1.1) paint(d, [pt(x - 0.45, -56.2), pt(x + 0.45, -56.2), pt(x + 0.35, -55), pt(x - 0.35, -55)], C.bone, { shadow: 0, line: 0.25, hatch: 0 });
  d.pen.hair(bezier(pt(4, -58), pt(6.6, -58.6), pt(9, -57.6), 6), 0.45, d.ink, 0.7);
  // The sockets, dark under the brow, with the light burning in them.
  const near = blob([pt(5.2, -61.8), pt(7.4, -63.2), pt(9.6, -62.2), pt(9.2, -59.4), pt(6.4, -58.8)], 4);
  const far = blob([pt(10.6, -62.6), pt(11.6, -62), pt(11.6, -59.6), pt(10.5, -59.8)], 4);
  for (const s of [near, far]) paint(d, s, C.socket, { shadow: 0, line: 0.5, hatch: 0, alpha: 1 });
  glow(d.pen.ctx, pt(7.6, -61), 3.8, C.glow, 0.6);
  glow(d.pen.ctx, pt(11.1, -61), 2.4, C.glow, 0.45);
  d.pen.dot(7.8, -61, 0.7, '#effff0', 1);
  d.pen.dot(11.1, -61, 0.42, '#effff0', 0.9);
  paint(d, [pt(11.6, -59.2), pt(12.7, -57), pt(11.1, -56.8)], C.socket, { shadow: 0, line: 0.35, hatch: 0, alpha: 1 });
  // A hairline crack on the crown, and the light along the brow and dome.
  d.pen.hair([pt(1.4, -66.8), pt(2.2, -64.8), pt(1.4, -63.4), pt(2, -62.2)], 0.35, d.ink, 0.8);
  gleam(d, [pt(-1, -62.6), pt(0.8, -65.6), pt(4.6, -66.8)], 0.8, 0.7);
  gleam(d, [pt(5.8, -64), pt(8.6, -64.4), pt(10.2, -63)], 0.5, 0.6);
}


// The rest pose, as painted: the hips the body turns about, the spine the chest creaks about, the neck, and each limb's joints.
const HIPS = pt(0, -30);
const SPINE = pt(-0.6, -36);
const NECK = pt(3.4, -52);
const FAR_HIP = pt(2.6, -29.2);
const NEAR_HIP = pt(-2.2, -29.2);
const FAR_LEG = chainOf(FAR_HIP, pt(8.4, -16.4), pt(7.2, -3.4));
const NEAR_LEG = chainOf(NEAR_HIP, pt(-5.2, -16.2), pt(-10, -3.6));
const FAR_ANKLE = pt(7.2, -3.4);
const NEAR_ANKLE = pt(-10, -3.6);
/** The toe, from the ankle. */
const FAR_TOE = pt(6.6, 3);
const NEAR_TOE = pt(6.4, 3.2);
const SHIELD_SHOULDER = pt(5, -49.2);
const SHIELD_ARM = chainOf(SHIELD_SHOULDER, pt(10.6, -41.6), pt(15.4, -37.4));
const SHIELD_WRIST = pt(15.4, -37.4);
/** The shield's centre, from the wrist that holds it. */
const SHIELD_AT = pt(1.2, 2);
const SHOULDER = pt(-3.6, -49.8);
const ARM = chainOf(SHOULDER, pt(-12.4, -51.4), pt(-9.8, -59.4));
/** The sword hand (the root of the guard) and the way the blade points, at rest. */
const HAND = pt(-9.4, -60.6);
const SWORD_ANG = Math.atan2(-0.879, 0.476);
const SWORD_LEN = 30.4;

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
    chest: xf(SPINE, 0.035 * jerk(wave(t, 0.1)), 0, -0.4 * breath(t)),
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

/** Walk: a stiff, jerky march: near-straight legs kicked high, the body rocking in starts, the jaw clacking at each footfall. */
function walk(t: number): Rig {
  const body = xf(HIPS, 0.04 + 0.035 * jerk(wave(2 * t, 0.1)), 0.5, 0.8 - 1.8 * strideBob(t));
  const mid = place(body, HIPS).x + 1.4;
  const near = step(t, 5.5, 4.6);
  const far = step(t + 0.5, 5.5, 4.6);
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
    hand: beatPt(t, [HAND, pt(-12, -64), pt(12.5, -42.5), pt(10.5, -37.5), HAND]),
    swordAng: beat(t, [SWORD_ANG, -1.9, 0.3, 0.7, SWORD_ANG]),
    shieldWrist: beatPt(t, [SHIELD_WRIST, pt(16.5, -40), pt(11.6, -34.6), pt(12.2, -35.4), SHIELD_WRIST]),
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
function legTo(d: Draw, r: Rig, hip: Pt, chain: typeof FAR_LEG, ankle: Pt, toe: Pt, color: string, tilt: number): void {
  const h = place(r.body, hip);
  leg(d, h, joint(chain, h, ankle), ankle, pt(ankle.x + toe.x, ankle.y + toe.y), color, tilt);
}

export const drawSkeleton: CreatureDrawer = (ctx, seed, f, pose: Pose = IDLE) => {
  const r = rigOf(pose);
  sprite(ctx, seed, f, { shadow: 16, shadowX: 1.5, line: 0.6 }, (d) => {
    const far = mix(C.bone, SHADOW, 0.22);
    const inBody = (draw: () => void): void => within(d.pen.ctx, r.body, draw);
    const inChest = (draw: () => void): void => inBody(() => within(d.pen.ctx, r.chest, draw));
    // The far side, in shade: shield arm and the front leg.
    const shieldElbow = joint(SHIELD_ARM, SHIELD_SHOULDER, r.shieldWrist);
    inChest(() => {
      bone(d, SHIELD_SHOULDER, shieldElbow, 1.6, far);
      forearm(d, shieldElbow, r.shieldWrist, far);
    });
    legTo(d, r, FAR_HIP, FAR_LEG, r.farAnkle, FAR_TOE, far, r.farTilt);
    legTo(d, r, NEAR_HIP, NEAR_LEG, r.nearAnkle, NEAR_TOE, C.bone, r.nearTilt);
    inBody(() => hips(d));
    inChest(() => {
      ribcage(d);
      // A scrap of the tabard still caught on the near shoulder.
      const scrap = [pt(-4.6, -51.6), pt(-1, -51.4), pt(-0.2, -48), ...tatters(pt(-0.8, -45.2), pt(-5.4, -44.4), 2, 2.6, 9)];
      paint(d, scrap, C.cloth, { shadow: 0.45, line: 0.5, hatch: 0.15 });
      shield(d, pt(r.shieldWrist.x + SHIELD_AT.x, r.shieldWrist.y + SHIELD_AT.y));
      sword(d, r.hand, pt(Math.cos(r.swordAng), Math.sin(r.swordAng)));
      within(d.pen.ctx, r.head, () => skull(d, r.jaw));
      // The sword arm: upper arm, forearm up to the fist round the grip.
      const spin = r.swordAng - SWORD_ANG;
      const wrist = turn(pt(r.hand.x - 0.4, r.hand.y + 1.2), r.hand, spin);
      const elbow = joint(ARM, SHOULDER, wrist);
      bone(d, SHOULDER, elbow, 1.7);
      forearm(d, elbow, wrist, C.bone);
      within(d.pen.ctx, xf(HAND, spin, r.hand.x - HAND.x, r.hand.y - HAND.y), () => {
        const fist = blob([pt(-11.4, -61.4), pt(-8.4, -62.4), pt(-7.4, -60), pt(-8.6, -58.4), pt(-11, -58.8)], 4);
        paint(d, fist, C.bone, { shadow: 0.45, line: 0.55, hatch: 0 });
        for (const k of [0, 1, 2]) d.pen.hair([pt(-10.8 + k * 0.9, -61.6 + k * 0.3), pt(-10.2 + k * 0.9, -58.8 + k * 0.2)], 0.3, d.ink, 0.7);
      });
    });
  });
  // The chop: speed lines along the sword point's path as it comes down.
  if (pose.kind === 'attack') {
    const path = Array.from({ length: 11 }, (_, i) => swordPoint(attack(pose.t - 0.11 + (i / 10) * 0.1)));
    smear(ctx, seed, f, path, 1, beat(pose.t, [0, 0, 0.75, 0.25, 0]));
  }
};
