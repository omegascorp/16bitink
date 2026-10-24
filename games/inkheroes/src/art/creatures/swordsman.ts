import type { Draw } from '../kit';
import type { Pt } from '../pen';
import { mix } from '../wash';
import { cast, cub, CROWN, far, limb, mail, oval, part, pt, ribbonOf, rivets, roundRect, seam, shine, steel, trim } from './crownInfantryKit';
import { dab, gleam, infantryFigure, SHADOW, soft } from './crownInfantryPaint';
import { carried, footed, idleCarriage, joint, keyed, legOf, mixPt, moved, poseOf, step, strike, TAU, walkCarriage, type Bones, type Carriage, type Leg } from './crownInfantryRig';
import type { CreatureDrawer, Pose } from './types';

/**
 * The Swordsman: Crown heavy infantry, broad and planted, in mail under a
 * blue tabard with gold hems, steel pauldron, knee cops and greaves, and a
 * flat-topped great helm ringed with a gold crown. A tall blue kite shield
 * bearing a gold crown covers the front; the sword is cocked back high over
 * the shoulder, ready to cut. Silhouette: the boxy helm, the kite shield
 * and the blade raised behind.
 *
 * Posed: he breathes with the blade steady at the shoulder; marches behind
 * the shield; and cuts by hauling the sword further back over his head,
 * then bringing it over and down past the shield's edge in one big arc.
 */

/** The stance's sword hand, and the sword's line from pommel to point. */
const HAND0 = pt(-6.4, -59.4);
const POMMEL0 = pt(-5.2, -54.6);
const POINT0 = pt(-21.6, -91);
const BLADE_LEN = Math.hypot(POINT0.x - POMMEL0.x, POINT0.y - POMMEL0.y);
const ANGLE0 = Math.atan2(POINT0.y - POMMEL0.y, POINT0.x - POMMEL0.x);
/** Where the fist sits on the grip: along the sword from the pommel, and across it. */
const GRIP_AT = 4.87;
const GRIP_OFF = 0.88;

const SHOULDER = pt(-5.6, -48);
const ELBOW0 = pt(-12.4, -50.4);
const UPPER = Math.hypot(ELBOW0.x - SHOULDER.x, ELBOW0.y - SHOULDER.y);
const FORE = Math.hypot(HAND0.x - 0.6 - ELBOW0.x, HAND0.y + 1.4 - ELBOW0.y);
const BACK_LEG: Bones = { a: pt(-3.6, -30), k: pt(-7.4, -17), b: pt(-9.6, -7) };
const FRONT_LEG: Bones = { a: pt(3.6, -30), k: pt(8.4, -17.4), b: pt(10, -7) };
const SHIELD_ARM = { a: pt(7, -48.6), k: pt(11.6, -39), b: pt(16.6, -39.4) } as const;
const HIPS = pt(0, -28);
const NECK = pt(3, -52);

/** Everything the pose decides, in body units under the carriage (the legs in the frame). */
interface Rig {
  readonly body: Carriage;
  readonly back: Leg;
  readonly front: Leg;
  /** The sword hand and the blade's direction (radians). */
  readonly hand: Pt;
  readonly angle: number;
  /** Which way the sword elbow bends: −1 back and down (cocked), +1 out (reaching forward). */
  readonly elbowBend: 1 | -1;
  /** The shield moved by this. */
  readonly shield: Pt;
  readonly head: Pt;
  readonly nod: number;
  /** The cut's smear: how strong (0 none), and the arc it sweeps (radians about the shoulder). */
  readonly smear: number;
  readonly sweep: readonly [number, number];
}

function rigOf(pose?: Pose): Rig {
  const { kind, t } = poseOf(pose);
  const quiet = { smear: 0, sweep: [0, 0] as const, elbowBend: -1 as const };
  if (kind === 'walk') {
    const body = walkCarriage(t, HIPS, 1.5, 0.03);
    const fs = step(t, 6, 3.6);
    const bs = step(t + 0.5, 6, 3.6);
    const swing = Math.cos(TAU * t);
    return {
      ...quiet,
      body,
      front: legOf(FRONT_LEG, body, -8.6 + fs.x, fs.lift, fs.tilt),
      back: legOf(BACK_LEG, body, 8.4 + bs.x, bs.lift, bs.tilt),
      hand: pt(HAND0.x - 1.2 * swing, HAND0.y + 0.8 * Math.abs(swing)),
      angle: ANGLE0 + 0.07 * swing,
      shield: pt(0.8 * swing, -0.3 * Math.sin(TAU * t * 2)),
      head: pt(0.3, 0.3 * Math.sin(TAU * t * 2)),
      nod: 0.02,
    };
  }
  if (kind === 'attack') {
    const body: Carriage = { dx: strike(t, -2.2, 3.6, 2.6), dy: strike(t, 0.2, 2.4, 2.2), rot: strike(t, -0.09, 0.13, 0.1), pivot: HIPS };
    const keys = (a: number, w: number, h: number, f: number): number => keyed(t, [[0, a], [0.3, w], [0.5, h], [0.75, f], [1, a]]);
    const hand = pt(keys(HAND0.x, -4.4, 13, 9.4), keys(HAND0.y, -67, -53, -41));
    return {
      body,
      front: legOf(FRONT_LEG, body, Math.max(0, strike(t, -0.2, 1, 1)) * 5, 0, 0),
      back: legOf(BACK_LEG, body, strike(t, -1.2, 0.6, 0.4), 0, 0),
      hand,
      angle: keys(ANGLE0, -2.75, 0.32, 1.05),
      elbowBend: hand.x > SHOULDER.x + 4 ? 1 : -1,
      shield: pt(strike(t, 1.4, -1.6, -1.2), strike(t, -0.8, 1.2, 1)),
      head: pt(strike(t, -0.6, 0.8, 0.6), 0),
      nod: strike(t, -0.05, 0.08, 0.06),
      smear: t > 0.4 && t < 0.6 ? 1 : t >= 0.6 && t < 0.85 ? 0.45 : 0,
      sweep: t < 0.6 ? [-2.2, 0.2] : [-0.4, 0.95],
    };
  }
  const body = idleCarriage(t, HIPS, 1);
  const a = TAU * t;
  return {
    ...quiet,
    body,
    front: legOf(FRONT_LEG, body, 0, 0, 0),
    back: legOf(BACK_LEG, body, 0, 0, 0),
    hand: pt(HAND0.x + 0.3 * Math.sin(a), HAND0.y - 0.3 * Math.sin(a + 0.4)),
    angle: ANGLE0 + 0.025 * Math.sin(a + 0.7),
    shield: pt(0, 0.3 * Math.sin(a + 0.4)),
    head: pt(0.25 * Math.sin(a + 1.2), 0.2 * Math.sin(a)),
    nod: 0.015 * Math.sin(a + 0.8),
  };
}

/** The sword's frame: a point `s` along it from the pommel and `n` across. */
function swordAt(r: Rig): (s: number, n: number) => Pt {
  const ux = Math.cos(r.angle);
  const uy = Math.sin(r.angle);
  const px = r.hand.x - ux * GRIP_AT + uy * GRIP_OFF;
  const py = r.hand.y - uy * GRIP_AT - ux * GRIP_OFF;
  return (s, n) => pt(px + ux * s - uy * n, py + uy * s + ux * n);
}

function elbowOf(r: Rig): Pt {
  return joint(SHOULDER, pt(r.hand.x - 0.6, r.hand.y + 1.4), UPPER, FORE, r.elbowBend);
}

function sabaton(d: Draw, x: number, color: string): void {
  const shape = [pt(x - 2.8, -8), pt(x + 2.4, -8.2), pt(x + 3, -3.8), pt(x + 7.4, -2.6), pt(x + 8.2, 0), pt(x - 3.2, 0), pt(x - 3.4, -3)];
  steel(d, shape, color, { line: 0.65 });
  for (const k of [0.3, 0.55]) d.pen.hair([pt(x + 1 + k * 6, -3.6 + k * 1.6), pt(x + 1.6 + k * 6, -0.4)], 0.35, d.ink, 0.7);
  d.pen.stroke([pt(x - 3.2, -0.3), pt(x + 8, -0.3)], 0.9, d.ink, 0.9, false);
  shine(d, [pt(x - 1.6, -6.6), pt(x + 1.6, -6.8)], 0.5);
}

/** One armoured leg: mail chausses, a steel knee cop and greave, a sabaton. */
function leg(d: Draw, l: Leg, x0: number, back: boolean): Pt[] {
  const { hip, knee, ankle } = l;
  const tone = (c: string): string => (back ? far(c) : c);
  const shape = limb(hip, knee, ankle, 7.6, 6, 4.8);
  part(d, shape, tone(CROWN.steelDark), { shadow: 0.55, hatch: 0.1 });
  mail(d, shape, Math.min(hip.x, ankle.x, knee.x) - 5, Math.max(hip.x, knee.x, ankle.x) + 5, Math.min(hip.y, knee.y), Math.max(ankle.y, knee.y));
  const greave = limb(pt(knee.x + 0.2, knee.y + 2), mixPt(knee, ankle, 0.5), pt(ankle.x, ankle.y - 1), 5.2, 5, 4.4);
  steel(d, greave, tone(CROWN.steel));
  shine(d, [pt(knee.x - 0.8, knee.y + 3), pt(ankle.x - 1.2, ankle.y - 2)], 0.6);
  steel(d, oval(knee.x + 0.6, knee.y, 3.4, 3, 14), tone(CROWN.steel));
  rivets(d, [pt(knee.x + 0.6, knee.y)], 0.5);
  footed(d, l, x0, -7, () => sabaton(d, x0, tone(CROWN.steel)));
  return shape;
}

function legs(d: Draw, r: Rig): void {
  const back = leg(d, r.back, BACK_LEG.b.x, true);
  const front = leg(d, r.front, FRONT_LEG.b.x, false);
  const skirt = [pt(-16, -26), pt(16, -26), pt(16, -21), pt(-16, -21)].map((p) => pt(p.x + r.body.dx, p.y + r.body.dy));
  for (const l of [back, front]) cast(d, l, skirt, 1.6, 0.42);
}

/** The mail hauberk's skirt and the blue tabard over it, belted, with gold hems. */
function body(d: Draw, r: Rig): void {
  const hauberk = [pt(-10.4, -36), pt(10, -36), pt(12.4, -21), pt(0, -19.6), pt(-12.6, -20.8)];
  part(d, hauberk, CROWN.steelDark, { shadow: 0.5, hatch: 0.1 });
  mail(d, hauberk, -13, 13, -36, -19);
  const tabard = [pt(-4.4, -53.2), pt(-10.8, -51), pt(-11.6, -44), pt(-9.6, -35), pt(-10.8, -23.4), pt(-3, -22.4), pt(-1.4, -27), pt(0.4, -22.4), pt(9.6, -23.4), pt(9.6, -35), pt(11, -44), pt(9.8, -50.4), pt(4.4, -53.4)];
  part(d, tabard, CROWN.blue, { shadow: 0.6, hatch: 0.22, line: 0.75 });
  trim(d, [pt(-10.6, -23.8), pt(-3.2, -22.8), pt(-1.4, -27.2), pt(0.6, -22.8), pt(9.4, -23.8)], 1.4);
  trim(d, [pt(-4.2, -52.8), pt(0, -50.6), pt(4.2, -53)], 1);
  // The cloth's folds and the near arm's shadow.
  for (const [a, b] of [[pt(-6, -32), pt(-7.4, -24)], [pt(4.6, -32), pt(5.8, -24)]] as const) d.pen.hair([a, b], 0.4, mix(CROWN.blue, SHADOW, 0.6), 0.8);
  cast(d, tabard, limb(pt(-6, -48), elbowOf(r), r.hand, 7.4, 6, 5), 2.4, 0.36);
  const belt = [pt(-10, -36.2), pt(0, -35), pt(9.8, -36.2), pt(9.8, -33.4), pt(0, -32.2), pt(-10, -33.4)];
  part(d, belt, CROWN.leatherDark, { shadow: 0.4, hatch: 0, line: 0.55 });
  rivets(d, [pt(-6, -34.2), pt(-2, -33.6), pt(2, -33.6)], 0.45, CROWN.gold);
}

/** The shield arm (mail) and the kite shield over it: blue, gold-rimmed, a gold crown on it. */
function shield(d: Draw, r: Rig): void {
  const { x: sx, y: sy } = r.shield;
  const arm = limb(SHIELD_ARM.a, pt(SHIELD_ARM.k.x + sx * 0.5, SHIELD_ARM.k.y + sy * 0.5), pt(SHIELD_ARM.b.x + sx, SHIELD_ARM.b.y + sy), 7, 6, 5);
  part(d, arm, far(CROWN.steelDark), { shadow: 0.5, hatch: 0.1 });
  mail(d, arm, 4, 22, -54, -33);
  moved(d, sx, sy, 0, pt(17, -38), () => {
    const left = cub(pt(8.6, -53.4), pt(7.6, -38), pt(11, -24), pt(17.4, -12.8), 14);
    const right = cub(pt(17.4, -12.8), pt(23.6, -24), pt(27, -38), pt(26.4, -53), 14).slice(1);
    const top = cub(pt(26.4, -53), pt(22, -55.6), pt(13, -55.8), pt(8.6, -53.4), 8).slice(1, -1);
    const kite = [...left, ...right, ...top];
    part(d, kite, CROWN.blue, { shadow: 0.7, hatch: 0.2, line: 0.85 });
    // The board curves away on its far side.
    d.pen.clipped(kite, () => dab(d, [pt(21, -58), pt(30, -58), pt(30, -10), pt(18, -10)], SHADOW, 0.25, 1.4));
    trim(d, [...left, ...right, ...top, left[0]!].map((p) => pt(p.x + (17 - p.x) * 0.08, p.y + (-38 - p.y) * 0.05)), 1.4);
    // The crown device.
    const cx = 17.4;
    const cy = -40;
    const crown = [pt(cx - 5, cy + 3), pt(cx - 5.4, cy - 3.4), pt(cx - 2.6, cy - 0.6), pt(cx, cy - 4.6), pt(cx + 2.6, cy - 0.6), pt(cx + 5.2, cy - 3.6), pt(cx + 4.8, cy + 3)];
    steel(d, crown, CROWN.gold, { hatch: 0, line: 0.55, shadow: 0.4 });
    d.pen.hair([pt(cx - 4.8, cy + 1.4), pt(cx + 4.6, cy + 1.4)], 0.35, d.ink, 0.7);
    for (const p of [pt(cx - 5.4, cy - 3.8), pt(cx, cy - 5), pt(cx + 5.2, cy - 4)]) d.pen.dot(p.x, p.y, 0.7, CROWN.goldLight, 1);
    shine(d, left.slice(2, 8).map((p) => pt(p.x + 2.6, p.y)), 0.6);
  });
}

/** The great helm: a flat-topped steel pot, its eye slit and breaths, a gold crown round its top, a mail aventail below. */
function helm(d: Draw, r: Rig): void {
  const aventail = [pt(-4, -54), pt(5, -54.6), pt(7.4, -50.2), pt(-5.8, -49.6)];
  part(d, aventail, CROWN.steelDark, { shadow: 0.5, hatch: 0 });
  mail(d, aventail, -6, 8, -54, -49);
  moved(d, r.head.x, r.head.y, r.nod, NECK, () => {
    const pot = [pt(-3.8, -65), pt(2, -66.6), pt(8.6, -66), pt(10.2, -62.4), pt(10.8, -57.6), pt(10.4, -52.6), pt(4, -51.8), pt(-3.8, -52.6), pt(-4.6, -58.6)];
    steel(d, pot, CROWN.steel, { line: 0.8, shadow: 0.7, cross: true });
    // The front plate's ridge, the eye slit, the breaths.
    d.pen.hair([pt(7.6, -65.6), pt(8.2, -59), pt(7.6, -52.2)], 0.45, d.ink, 0.6);
    const slit = [pt(2.6, -60.4), pt(10.6, -60.6), pt(10.7, -59.2), pt(2.8, -59)];
    d.pen.fill(slit, '#141626', 0.95);
    gleam(d, [pt(3, -58.6), pt(10.4, -58.8)], 0.5, 0.75);
    for (const [x, y] of [[8.8, -55.6], [9.8, -55.6], [8.8, -54.2], [9.8, -54.2]] as const) d.pen.dot(x, y, 0.32, '#141626', 0.9);
    trim(d, [pt(7.9, -58.4), pt(8.2, -55.6), pt(7.9, -52.4)], 1.1);
    seam(d, [pt(-4.4, -56), pt(4, -55.2), pt(10.6, -55.6)], 0.3, 0.5);
    shine(d, [pt(-2.8, -63.4), pt(-3.4, -58), pt(-2.8, -54)], 0.9);
    shine(d, [pt(5.6, -64.6), pt(6.2, -61.4)], 0.6);
    // The gold crown ringed round the top.
    const ring = [pt(-4, -65.2), pt(2, -66.8), pt(8.8, -66.2), pt(8.9, -64), pt(2, -64.4), pt(-4, -63)];
    steel(d, ring, CROWN.gold, { hatch: 0, line: 0.5, shadow: 0.4 });
    for (const [x, y] of [[-3, -65.4], [1.6, -66.8], [6.4, -66.6]] as const) {
      steel(d, [pt(x - 1.2, y + 0.4), pt(x, y - 2.6), pt(x + 1.2, y + 0.4)], CROWN.gold, { hatch: 0, line: 0.45, shadow: 0.3 });
      d.pen.dot(x, y - 2.6, 0.5, CROWN.goldLight, 1);
    }
  });
}

/** The sword: steel blade with its fuller, a gold cross-guard, a wrapped grip and a gold pommel. */
function sword(d: Draw, r: Rig): void {
  const at = swordAt(r);
  const len = BLADE_LEN;
  const blade = [at(8.4, -1.4), at(len - 4, -1.15), at(len, 0), at(len - 4, 1.15), at(8.4, 1.4)];
  steel(d, blade, CROWN.steel, { line: 0.6, shadow: 0.55 });
  d.pen.hair([at(9.4, 0), at(len - 7, 0)], 0.35, mix(CROWN.steelDark, SHADOW, 0.3), 0.8);
  shine(d, [at(10, -0.7), at(len - 6, -0.6)], 0.5);
  steel(d, ribbonOf([at(1, 0), at(7.6, 0)], 1.4), CROWN.leatherDark, { hatch: 0, line: 0.45, gloss: false });
  steel(d, [at(7.4, -4.2), at(8.8, -4.4), at(8.8, 4.4), at(7.4, 4.2)], CROWN.gold, { hatch: 0, line: 0.5, shadow: 0.35 });
  const pommel = at(0, 0);
  steel(d, oval(pommel.x, pommel.y, 1.5, 1.5, 10), CROWN.gold, { hatch: 0, line: 0.5, shadow: 0.35 });
}

/** The sword arm: mail sleeve, a layered steel pauldron and a steel gauntlet round the grip. */
function swordArm(d: Draw, r: Rig): void {
  const hand = r.hand;
  const elbow = elbowOf(r);
  const wrist = pt(hand.x - 0.6, hand.y + 1.4);
  const upper = limb(SHOULDER, mixPt(SHOULDER, elbow, 0.99), elbow, 7.4, 6.4, 6.4);
  part(d, upper, CROWN.steelDark, { shadow: 0.5, hatch: 0.1 });
  mail(d, upper, Math.min(SHOULDER.x, elbow.x) - 6, Math.max(SHOULDER.x, elbow.x) + 6, Math.min(SHOULDER.y, elbow.y) - 6, Math.max(SHOULDER.y, elbow.y) + 6);
  const fore = limb(elbow, mixPt(elbow, wrist, 0.5), wrist, 6, 5.4, 4.6);
  part(d, fore, CROWN.steelDark, { shadow: 0.5, hatch: 0.1 });
  mail(d, fore, Math.min(elbow.x, wrist.x) - 6, Math.max(elbow.x, wrist.x) + 6, Math.min(elbow.y, wrist.y) - 6, Math.max(elbow.y, wrist.y) + 6);
  // A steel vambrace down the forearm, the elbow cop, and one broad pauldron over the shoulder.
  steel(d, limb(mixPt(elbow, wrist, 0.2), mixPt(elbow, wrist, 0.55), mixPt(elbow, wrist, 0.92), 5, 4.8, 4.4), CROWN.steel);
  steel(d, oval(elbow.x - 0.4, elbow.y + 0.2, 3.2, 3, 14), CROWN.steel);
  rivets(d, [pt(elbow.x - 0.4, elbow.y + 0.2)], 0.45);
  const pauldron = [pt(-11.8, -47.4), pt(-11.4, -51.6), pt(-8, -55), pt(-3, -55.4), pt(1, -52.8), pt(0.4, -48.6), pt(-4.6, -47.2)];
  steel(d, pauldron, CROWN.steel, { line: 0.7, shadow: 0.65 });
  trim(d, [pt(-11.4, -48.2), pt(-4.6, -48), pt(0.2, -49.4)], 1.1, CROWN.gold);
  seam(d, [pt(-10.6, -51.2), pt(-5, -52), pt(0.4, -51)], 0.35, 0.6);
  shine(d, [pt(-9.6, -52.6), pt(-6, -54.4), pt(-2.6, -54.4)], 0.6);
  rivets(d, [pt(-5, -54.2), pt(-1.4, -53.4)], 0.45);
  sword(d, r);
  // The gauntlet, turned with the sword.
  moved(d, hand.x - HAND0.x, hand.y - HAND0.y, r.angle - ANGLE0, HAND0, () => {
    const H = HAND0;
    const gauntlet = [pt(H.x - 2.8, H.y + 2.6), pt(H.x - 2.2, H.y - 2.2), pt(H.x + 1.2, H.y - 2.8), pt(H.x + 2.8, H.y - 0.6), pt(H.x + 2.2, H.y + 2.4), pt(H.x - 0.4, H.y + 3.4)];
    steel(d, gauntlet, CROWN.steel, { line: 0.6 });
    d.pen.hair([pt(H.x + 1.8, H.y - 1.8), pt(H.x + 2.2, H.y + 1.8)], 0.35, d.ink, 0.7);
    part(d, roundRect(H.x - 3.4, H.y + 2.2, H.x + 1.8, H.y + 4.6, 0.8), CROWN.leatherDark, { shadow: 0.3, hatch: 0, line: 0.45 });
  });
}

/** The cut's smear: a pale crescent swept behind the blade's point, laid over the finished figure. */
function smear(d: Draw, r: Rig): void {
  if (r.smear <= 0) return;
  carried(d, r.body, () => {
    const [a0, a1] = r.sweep;
    const c = pt(SHOULDER.x + 2, SHOULDER.y - 2);
    const n = 18;
    const arc = (rad: (u: number) => number): Pt[] =>
      Array.from({ length: n + 1 }, (_, i) => {
        const u = i / n;
        const a = a0 + (a1 - a0) * u;
        return pt(c.x + Math.cos(a) * rad(u), c.y + Math.sin(a) * rad(u));
      });
    const outer = arc(() => 46);
    const inner = arc((u) => 46 - 20 * u ** 1.3);
    // A dry-brush streak of pale steel, with a few hard strokes of the brush's bristles along it.
    soft(d.pen.ctx, 0.8, () => d.pen.fill([...outer, ...[...inner].reverse()], mix(CROWN.steel, '#ffffff', 0.35), 0.6 * r.smear));
    d.pen.hair(outer.slice(Math.round(n * 0.2)), 0.6, mix(CROWN.steelDark, SHADOW, 0.3), 0.5 * r.smear);
    for (const k of [42, 37, 32]) d.pen.hair(arc((u) => k + (46 - k) * (1 - u)).slice(Math.round(n * 0.45)), 0.35, mix(CROWN.steelDark, SHADOW, 0.2), 0.35 * r.smear);
  });
}

export const drawSwordsman: CreatureDrawer = (ctx, seed, f, pose) => {
  const r = rigOf(pose);
  infantryFigure(ctx, seed, f, { shadowRx: 21, line: 0.8, after: (d) => smear(d, r) }, (d) => {
    legs(d, r);
    carried(d, r.body, () => {
      body(d, r);
      shield(d, r);
      helm(d, r);
      swordArm(d, r);
    });
  });
};
