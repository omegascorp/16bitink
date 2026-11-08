import { pt, type Draw } from '../kit';
import type { Pt } from '../pen';
import { finished, gleam, groundShadow, limb, lineOf, mix, paint, shapeOf, SHADOW } from './crownElitePaint';
import { caparison, chanfron, goldCrown } from './crownMountBarding';
import { farLegs, head, HORSE, nearLegs, tail, torsoInFigure, type HorseLook } from './crownMountHorse';
import { apply, beat, invert, mountRig, within, type AttackMotion, type Beat, type MountRig } from './crownMountRig';
import { asHead, asRider, CROWN_BLUE, elbowFor, fist, GOLD, headstall, offRider, onRider, pauldron, plateArm, reins, RIDER, riderLeg, riderTorso, saddle, STEEL } from './crownMountRider';
import { IDLE, type CreatureDrawer } from './types';

/**
 * The Lancer: a knight in full plate on a barded grey warhorse at the
 * charge, near foreleg folded high, a blue-and-white lance couched under
 * the arm with a pennon at its head, a vamplate guarding the hand, a
 * crowned armet with a blue plume, and a blue caparison powdered with gold
 * crowns. About 92 units to the lance's point.
 *
 * Idle: the destrier paws with the lifted fore, shifts its weight, nods and
 * swishes its tail; the knight breathes, the lance tip drifts, the pennon
 * stirs. Walk: the gallop. Attack: a charge: the horse gathers and rears a
 * little as the lance is drawn up and back (0.25), then lunges as the lance
 * drops level and drives home (0.5), and settles.
 */
/** The plume's lit feathers: warm ivory. */
const PLUME_LIGHT = '#d8ccae';
/** The lance: dark walnut, painted in spirals of Crown blue. */
const WALNUT = '#3e2818';

const MOUNT: HorseLook = { coat: '#3f3a36', points: '#1e1a17', mane: '#231d19', hoof: '#1b1613', build: 1.22, pose: 'charge' };

const CHARGE: AttackMotion = {
  pitch: [0, -4.5, 3, 1.2, 0],
  dx: [0, -1.6, 1.4, 0.8, 0],
  dy: [0, -0.4, 0.8, 0.3, 0],
  neck: [0, -6, 6, 2.4, 0],
  nod: [0, -3, 3, 1, 0],
  lean: [0, -4, 7, 3.5, 0],
  breath: [0, -0.6, 0.4, 0, 0],
  tailLift: [0, 6, 16, 7, 0],
  swish: [0, 1, 3, 1.4, 0],
  wind: [0, 0.2, 0.75, 0.4, 0],
  pawDx: [0, -1.4, 4.5, 1.6, 0],
  pawDy: [0, -3.4, 0.6, -0.4, 0],
  pawFold: [0, -20, 34, 10, 0],
};

/** The lance at rest (body coordinates), couched through the armpit and fist; LEN long, the fist GRIP_S from the butt. */
const BUTT = pt(-24, -56.3);
const TIP = pt(55, -98.2);
const LEN = Math.hypot(TIP.x - BUTT.x, TIP.y - BUTT.y);
const REST_ANGLE = (Math.atan2(TIP.y - BUTT.y, TIP.x - BUTT.x) * 180) / Math.PI;
/** Where the fist grips the lance (rider units), and its place along the lance. */
const GRIP = pt(6, -70);
const GRIP_AT = onRider(GRIP);
const GRIP_S = Math.hypot(GRIP_AT.x - BUTT.x, GRIP_AT.y - BUTT.y);

/** The charge: the fist's place (body coordinates) and the lance's angle in the figure, at the five frames. */
const THRUST = {
  x: [GRIP_AT.x, 2.6, -1.6, -0.6, GRIP_AT.x] as Beat,
  y: [GRIP_AT.y, -74.6, -63, -64, GRIP_AT.y] as Beat,
  angle: [REST_ANGLE, -37, -3, -5, REST_ANGLE] as Beat,
};

/** A lance placed this frame: `along(s, off)` is the point s from the butt, `off` below the shaft. */
interface Lance {
  readonly grip: Pt;
  readonly along: (s: number, off?: number) => Pt;
}

function lanceOf(grip: Pt, angle: number): Lance {
  const a = (angle * Math.PI) / 180;
  const u = pt(Math.cos(a), Math.sin(a));
  const n = pt(-u.y, u.x);
  const butt = pt(grip.x - u.x * GRIP_S, grip.y - u.y * GRIP_S);
  return { grip, along: (s, off = 0) => pt(butt.x + u.x * s + n.x * off, butt.y + u.y * s + n.y * off) };
}

/** Where the lance is this frame (body coordinates). */
function placeLance(rig: MountRig): Lance {
  const { motion: m, t, kind } = rig;
  if (kind === 'attack') {
    // Aimed in the figure: undo the body's pitch so it comes down level.
    return lanceOf(pt(beat(THRUST.x, t), beat(THRUST.y, t)), beat(THRUST.angle, t) - m.pitch);
  }
  // Held steady against the body's pitch and the rider's lean, only bobbing a little (never lower than at rest, or the point leaves the frame).
  const w = t * Math.PI * 2;
  const angle = kind === 'walk' ? -31 - 1.4 * (1 + Math.sin(w - 0.9)) : REST_ANGLE - 0.7 * (1 + Math.sin(w + 0.4));
  return lanceOf(apply(rig.upper, GRIP_AT), angle - m.pitch);
}

/** The lance: painted in blue-and-white spirals, a steel head. */
function lance(d: Draw, l: Lance): void {
  const { pen } = d;
  const { along } = l;
  const head = LEN - 6;
  const butt = along(0);
  const tip = along(LEN);
  const shaft = limb([[butt.x, butt.y, 2.2], [along(GRIP_S).x, along(GRIP_S).y, 3], [along(head).x, along(head).y, 1.4]]);
  paint(d, shaft.shape, WALNUT, { shadow: 0.6, hatch: 0, line: 0.6, gloss: true });
  pen.clipped(shaft.shape, () => {
    for (let s = 2; s < head; s += 5) pen.fill([along(s, -3), along(s + 2.2, -3), along(s + 0.4, 3), along(s - 1.8, 3)], CROWN_BLUE, 0.9);
    pen.stroke([along(2, 0.9), along(head, 0.4)], 0.7, SHADOW, 0.5, false);
    gleam(d, [along(4, -0.6), along(head - 2, -0.3)], 0.45, 0.6);
  });
  const xy = (p: Pt): [number, number] => [p.x, p.y];
  const point = shapeOf([xy(along(head - 1, -1)), xy(along(head + 2.4, -1.6)), xy(tip), xy(along(head + 2.4, 1.6)), xy(along(head - 1, 1))], 3);
  paint(d, point, STEEL, { shadow: 0.4, hatch: 0, line: 0.55, gloss: true });
}

/** The pennon below the lance's head, streaming back; `t` ripples it, `wind` stretches it. */
function pennon(d: Draw, l: Lance, t: number, wind: number): void {
  const { along } = l;
  const w = (k: number): number => (0.55 + wind * 0.5) * Math.sin(t * Math.PI * 2 - k);
  const s0 = LEN - 8;
  const s1 = LEN - 17;
  const tail = wind * 2.4;
  const shape = [along(s0, 0.8), along(s0 - 7, 3.2 + w(0.6)), along(s0 - 16, 2.6 - w(1.4)), along(s1 - 15 - tail, 3.6 + w(2.4)), along(s1 - 8 - tail * 0.5, 6.6), along(s1 - 14 - tail, 10 - w(3)), along(s1 - 4, 8.4 + w(2.2)), along(s1, 7.6)];
  paint(d, shapeOf(shape.map((p) => [p.x, p.y] as [number, number]), 4), CROWN_BLUE, { shadow: 0.45, hatch: 0.14, line: 0.55, lit: pt(0.7, 0.3) });
  d.pen.stroke(lineOf([[along(s0, 2).x, along(s0, 2).y], [along(s1, 6.4).x, along(s1, 6.4).y]]), 1, GOLD, 0.95, false);
  goldCrown(d, along(s1 - 4, 4.6), 3.6);
}

/** The vamplate: a steel cone on the lance in front of the fist. */
function vamplate(d: Draw, l: Lance): void {
  const { along } = l;
  const s = GRIP_S + 2.6;
  const shape = [along(s, -4.2), along(s + 1.2, -4.4), along(s + 6, -1.6), along(s + 6, 1.6), along(s + 1.2, 4.4), along(s, 4.2)];
  paint(d, shape, STEEL, { shadow: 0.5, hatch: 0.14, line: 0.6, gloss: true });
  d.pen.stroke([along(s + 0.6, -4), along(s + 0.6, 4)], 0.6, GOLD, 0.9, false);
  gleam(d, [along(s + 1.4, -3.4), along(s + 5.4, -1.2)], 0.6, 0.85);
}

/** The armet: a close helm with a jutting beaked visor and a dark eye slit, a brass coronet, and a swept plume; `stir` lifts the plume. */
function armet(d: Draw, stir: number): void {
  const { pen } = d;
  const h = RIDER.head;
  const at = (x: number, y: number): [number, number] => [h.x + x, h.y + y];
  asHead(d, () => {
    for (const [c, dy, len] of [[mix(CROWN_BLUE, SHADOW, 0.45), 1.4, 13], [CROWN_BLUE, 0, 15.6], [PLUME_LIGHT, -1.2, 11]] as const) {
      const plume = shapeOf([at(-1, -7.4), at(-5, -11 - dy), at(-len * 0.72, -10.4 - dy * 0.5 - stir * 0.6), at(-len - stir * 0.5, -5.6 + dy - stir), at(-len * 0.66, -6.4 + dy - stir * 0.5), at(-5, -5.6)], 5);
      paint(d, plume, c, { shadow: 0.55, hatch: 0, line: 0.5 });
    }
    for (const k of [0, 1, 2]) pen.hair(lineOf([at(-2, -8 + k * 0.6), at(-7 - k * 2, -9.4 + k), at(-12 - k, -6.6 + k)]), 0.3, mix(CROWN_BLUE, SHADOW, 0.6), 0.7);
    const bowl = shapeOf([at(-5, 4.4), at(-6, -1.4), at(-4.6, -6.2), at(-0.8, -8.4), at(3.2, -7.4), at(5.8, -4.4), at(6.8, -1.2), at(9.2, 1.6), at(6.4, 3.8), at(2.6, 6), at(-2.4, 6.4)], 5);
    paint(d, bowl, STEEL, { shadow: 0.75, hatch: 0.22, cross: true, line: 0.7, gloss: true, lit: pt(0.3, 0.18) });
    // Visor: the eye slit in deep shadow, its upper edge lit; breaths; the bevor's line.
    pen.stroke(lineOf([at(1.2, -2.2), at(4, -2), at(7, -1.2)]), 1.1, '#120c09', 1, false);
    pen.hair(lineOf([at(1, -3), at(4, -2.9), at(6.8, -2.2)]), 0.35, '#f3e6c6', 0.7);
    pen.hair(lineOf([at(-0.6, 0.6), at(3.4, 1.4), at(9, 1.6)]), 0.4, d.ink, 0.7);
    for (const [x, y] of [[4.6, 3], [5.8, 2.6], [3.8, 4]] as const) pen.dot(h.x + x, h.y + y, 0.3, '#120c09');
    pen.hair(lineOf([at(-3.4, 4.6), at(-1.6, 0), at(-2.4, -4)]), 0.4, d.ink, 0.5);
    gleam(d, lineOf([at(-3.8, -4.2), at(-0.8, -6.6), at(2.6, -6.4)]), 0.8, 0.95);
    gleam(d, lineOf([at(6.2, -0.4), at(8.2, 1.4)]), 0.5, 0.8);
    // The brass coronet round the brow.
    pen.stroke(lineOf([at(-5.4, -4.4), at(-1, -6.8), at(3.6, -6)]), 1, GOLD, 0.95, false);
    for (const x of [-3.6, -0.4, 2.6]) pen.dot(h.x + x, h.y - 6.6 + Math.abs(x) * 0.1, 0.55, GOLD);
    pen.stroke(lineOf([at(-4.8, 5), at(0, 6.2), at(4.8, 5)]), 0.7, GOLD, 0.85, false);
  });
}

export const drawLancer: CreatureDrawer = (ctx, seed, f, pose = IDLE) => {
  const rig = mountRig(MOUNT.pose, pose, CHARGE);
  const { motion: m, body, upper } = rig;
  const l = placeLance(rig);
  // The fist on the lance, in the rider's own (unscaled, upright) drawing.
  const grip = offRider(apply(invert(upper), l.grip));
  const shoulder = RIDER.shoulder;
  const wrist = pt(grip.x - 1.4, grip.y + 0.8);
  const toBody = invert(body);
  const knees = [rig.legs.nearFore, rig.legs.nearHind].map((leg) => apply(toBody, pt(leg.joints[3]![0], leg.joints[3]![1])));
  const swing = Math.sin(rig.t * Math.PI * 2);
  finished(ctx, seed, f, (d) => {
    farLegs(d, MOUNT, rig);
    nearLegs(d, MOUNT, rig, torsoInFigure(rig));
    within(d, body, () => {
      caparison(d, { warp: rig.warp, wind: m.wind, t: rig.t, knees });
      tail(d, MOUNT, 2.4 + m.swish, m.tailLift);
      within(d, rig.head, () => {
        head(d, MOUNT);
        chanfron(d);
        headstall(d, '#3d2a22');
      });
      reins(d, apply(rig.head, HORSE.bit), apply(upper, onRider(RIDER.reinHand)));
      saddle(d, CROWN_BLUE, GOLD, true, false);
      asRider(d, () => riderLeg(d, true, STEEL));
      within(d, upper, () => asRider(d, () => {
        riderTorso(d, CROWN_BLUE, GOLD);
        fist(d, RIDER.reinHand);
      }));
      lance(d, l);
      pennon(d, l, rig.t, m.wind);
      within(d, upper, () => asRider(d, () => {
        pauldron(d, pt(shoulder.x, shoulder.y + 0.6));
        plateArm(d, shoulder, elbowFor(shoulder, wrist), wrist);
        fist(d, grip);
      }));
      vamplate(d, l);
      within(d, upper, () => asRider(d, () => armet(d, m.wind * (1 + 0.5 * swing))));
    });
  }, (d) => groundShadow(d, -6 + m.dx, 42), { line: 0.7 });
};
