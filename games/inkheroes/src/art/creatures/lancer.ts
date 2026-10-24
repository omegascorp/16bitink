import { pt, type Draw } from '../kit';
import type { Pt } from '../pen';
import { finished, gleam, groundShadow, limb, lineOf, mix, paint, shapeOf, SHADOW } from './crownElitePaint';
import { caparison, chanfron, goldCrown } from './crownMountBarding';
import { farLegs, head, HORSE, nearLegs, tail, torsoInFigure, type HorseLook } from './crownMountHorse';
import { apply, beat, invert, mountRig, within, type AttackMotion, type Beat, type MountRig } from './crownMountRig';
import { asRider, CROWN_BLUE, elbowFor, fist, GOLD, headstall, offRider, onRider, pauldron, plateArm, reins, RIDER, riderLeg, riderTorso, saddle, STEEL } from './crownMountRider';
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
const MOUNT: HorseLook = { coat: '#a39d93', points: '#625c56', mane: '#e2dccf', hoof: '#46403b', build: 1, pose: 'charge' };

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
  paint(d, shaft.shape, CROWN_BLUE, { shadow: 0.5, hatch: 0, line: 0.6, gloss: true });
  pen.clipped(shaft.shape, () => {
    for (let s = 2; s < head; s += 5) pen.fill([along(s, -3), along(s + 2.2, -3), along(s + 0.4, 3), along(s - 1.8, 3)], '#eef0f6', 0.92);
    pen.stroke([along(2, 0.9), along(head, 0.4)], 0.6, SHADOW, 0.35, false);
    gleam(d, [along(4, -0.6), along(head - 2, -0.3)], 0.5, 0.7);
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
  goldCrown(d, along(s1 - 4, 4.6), 4.4);
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

/** The armet: a rounded helm with a jutting visor and eye slit, a gold coronet and a plume of blue and white; `stir` lifts the plume. */
function armet(d: Draw, stir: number): void {
  const { pen } = d;
  const h = RIDER.head;
  const at = (x: number, y: number): [number, number] => [h.x + x, h.y + y];
  const { ctx } = d.pen;
  ctx.save();
  ctx.translate(RIDER.neck.x, RIDER.neck.y);
  ctx.scale(0.86, 0.86);
  ctx.translate(-RIDER.neck.x, -RIDER.neck.y);
  for (const [c, dy, len] of [['#e8eefc', -1, 15], [CROWN_BLUE, 0.8, 13.6], [mix(CROWN_BLUE, SHADOW, 0.25), 2.4, 11]] as const) {
    const plume = shapeOf([at(-1, -6), at(-5, -9.6 - dy), at(-len * 0.75, -9 - dy * 0.5 - stir * 0.6), at(-len - stir * 0.5, -5 + dy - stir), at(-len * 0.7, -5.6 + dy - stir * 0.5), at(-5, -4)], 5);
    paint(d, plume, c, { shadow: 0.4, hatch: 0, line: 0.5 });
  }
  const bowl = shapeOf([at(-4.8, 3.6), at(-5.6, -1.6), at(-3.2, -6.2), at(1.2, -7), at(4.6, -4.8), at(6.4, -1.6), at(7.6, 1.2), at(5.8, 3.6), at(2.4, 5.4), at(-2.4, 5.6)], 5);
  paint(d, bowl, STEEL, { shadow: 0.55, hatch: 0.2, line: 0.7, gloss: true, lit: pt(0.3, 0.2) });
  pen.stroke(lineOf([at(1.6, -1.8), at(4, -1.6), at(6.6, -1)]), 1.1, '#141826', 1, false);
  pen.hair(lineOf([at(-0.4, -0.2), at(3, 0.6), at(7.2, 1.2)]), 0.4, d.ink, 0.6);
  for (const [x, y] of [[4.4, 2.6], [5.6, 2.2], [3.6, 3.6]] as const) pen.dot(h.x + x, h.y + y, 0.35, '#141826');
  gleam(d, lineOf([at(-3.6, -3.6), at(-0.6, -5.6), at(2.6, -5.4)]), 0.8, 0.85);
  pen.stroke(lineOf([at(-4.6, 4.6), at(0, 5.6), at(4.6, 4.6)]), 0.9, GOLD, 0.9, false);
  goldCrown(d, pt(h.x - 0.2, h.y - 7.6), 5);
  ctx.restore();
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
