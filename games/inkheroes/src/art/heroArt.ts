import { IDLE, type Pose } from './creatures/types';
import { pt, type Draw } from './kit';
import type { Pt } from './pen';
import { dab, finished, gleam, groundShadow, LIGHT, limb, lineOf, mix, paint, shapeOf, SHADOW } from './creatures/crownElitePaint';
import { farLegs, forelock, head, HORSE, mane, nearLegs, tail, torso, torsoInFigure, torsoShape, type HorseLook } from './creatures/crownMountHorse';
import { apply, beat, mountRig, within, type AttackMotion, type Beat, type MountRig } from './creatures/crownMountRig';
import { asRider, elbowFor, fist, GOLD, headstall, LEATHER, legShadow, onRider, pauldron, plateArm, reins, RIDER, riderLeg, riderTorso, saddle, STEEL } from './creatures/crownMountRider';

/**
 * The hero on horseback: a commander on a light bay riding horse (no
 * barding, a blaze down its face), in a breastplate with a cloak and a
 * plumed open helm, a sword at the hip and the army's banner held high in
 * the owner's colour. Unlike the Lancer: no lance, no caparison, a lighter
 * horse walking, and the flag, which carries the read at map size.
 *
 * Idle: the horse shifts its weight, paws with the lifted fore, nods and
 * swishes its tail; the banner ripples, the rider breathes. Walk: the
 * gallop, cloak and banner streaming. Attack (casting a battle spell): he
 * lets the banner stand in its stirrup cup, draws and raises the sword high
 * (0.25), brings it down to point at the foe as the spell leaves it (0.5),
 * follows through and sheathes it.
 */
const MOUNT: HorseLook = { coat: '#8f5a32', points: '#3a2a24', mane: '#2c211d', hoof: '#4a3f38', build: 0.9, pose: 'walk', blaze: true };

const SKIN = '#e2b48c';
/** The banner pole: the hand holds it at HAND (rider units), its foot rests by the stirrup. */
const HAND = pt(7.6, -63);
const POLE_FOOT = pt(7.6, -36);
const POLE_TOP = pt(11.4, -97.2);

const CAST: AttackMotion = {
  pitch: [0, -2.6, 1.6, 0.6, 0],
  dx: [0, -0.8, 1, 0.5, 0],
  neck: [0, -5, 3, 1, 0],
  nod: [0, -2, 2.4, 0.6, 0],
  lean: [0, -3, 6, 2.5, 0],
  breath: [0, -0.7, 0.3, 0, 0],
  tailLift: [0, 4, 9, 3, 0],
  swish: [0, 1.6, -1.2, 0.6, 0],
  wind: [0, 0.25, 0.55, 0.3, 0],
  pawDx: [0, 1, 2.2, 1, 0],
  pawDy: [0, -2.2, -0.8, 0, 0],
  pawFold: [0, -16, 12, 2, 0],
};

/** The sword hand through the cast (rider units) and the blade's angle (0 points ahead, −90 straight up). */
const SWING = {
  x: [HAND.x, 1.6, 14, 11, HAND.x] as Beat,
  y: [HAND.y, -84.6, -74, -66.4, HAND.y] as Beat,
  angle: [0, -138, 8, 34, 0] as Beat,
};
const BLADE = 15;

const poleAt = (y: number): Pt => {
  const t = (y - POLE_FOOT.y) / (POLE_TOP.y - POLE_FOOT.y);
  return pt(POLE_FOOT.x + (POLE_TOP.x - POLE_FOOT.x) * t, y);
};

/** The cloak, thrown back from the shoulders over the horse's croup, its hem lifting; `wind` streams it back, rippling with `t`. */
function cloak(d: Draw, banner: string, wind: number, t: number): void {
  const flow = (xy: readonly (readonly [number, number])[]): [number, number][] => xy.map(([x, y]) => {
    const k = Math.max(0, Math.min(1, (-x - 5) / 28)) ** 1.4;
    const ripple = Math.sin(t * Math.PI * 2 + x * 0.22);
    return [x - wind * k * 2.6, y - wind * k * (3.4 + 1.6 * ripple) - (1 - wind) * k * 0.5 * ripple];
  });
  const shape = shapeOf(flow([[-6, -72], [-1.6, -71], [-6.4, -62], [-12, -53], [-20, -48.4], [-29, -46], [-33.4, -48.4], [-30, -52.4], [-25, -56], [-18.6, -61], [-12, -67.4]]), 5);
  paint(d, shape, banner, { shadow: 0.6, hatch: 0.22, cross: true, line: 0.65 });
  d.pen.clipped(shape, () => {
    for (const k of [0, 1, 2]) {
      const x = -10 - k * 6;
      gleam(d, lineOf(flow([[x + 4, -66 + k * 4], [x - 1, -57 + k * 3], [x - 5, -51 + k * 1.5]])), 0.9, 0.3);
      d.pen.hair(lineOf(flow([[x + 6, -66 + k * 3], [x + 1, -56 + k * 2.4], [x - 3, -49.6 + k]])), 0.35, mix(banner, SHADOW, 0.6), 0.7);
    }
  });
  d.pen.stroke(lineOf(flow([[-29, -46.4], [-20, -48.8], [-12, -53.4]])), 0.8, GOLD, 0.9, false);
}

/** A sword at the near hip: scabbard slung back under the cloak, guard and grip at the belt (only the scabbard once it is `drawn`). */
function sword(d: Draw, drawn: boolean): void {
  const sheath = limb([[-7, -55], [-14, -47], [-21.6, -39.6]].map(([x, y], i) => [x!, y!, [2.4, 2.2, 1.8][i]!] as const));
  paint(d, sheath.shape, '#3d2a22', { shadow: 0.4, hatch: 0, line: 0.55 });
  d.pen.stroke(lineOf([[-19.6, -41.6], [-21.8, -39.4]]), 1.6, GOLD, 1, false);
  d.pen.stroke(lineOf([[-9.6, -52.4], [-11, -51]]), 1.4, GOLD, 1, false);
  if (drawn) return;
  paint(d, shapeOf([[-4.2, -58.6], [-3, -59.2], [-1.4, -55.6], [-2.6, -55]], 3), GOLD, { shadow: 0.3, hatch: 0, line: 0.5, gloss: true });
  d.pen.stroke(lineOf([[-1.2, -61.6], [-3.6, -56]]), 1.2, d.ink, 0.95, false);
  d.pen.stroke(lineOf([[-6.4, -57.4], [-1, -59.6]]), 1.3, GOLD, 1, false);
  d.pen.dot(-0.9, -62.2, 0.9, GOLD);
}

/** The banner: a pole with a gilt finial and a swallowtailed flag streaming back, a gold crown on it; waves run down it with `t`, bigger in `wind`. */
function standard(d: Draw, banner: string, t: number, wind: number): void {
  const { pen } = d;
  const amp = 0.55 + wind * 1.1;
  // A wave travelling from the pole to the tails, growing toward the free end.
  const r = (back: number): number => amp * (0.4 + back / 40) * Math.sin(t * Math.PI * 2 - back * 0.2);
  const top = POLE_TOP;
  const flag = shapeOf([
    [top.x - 0.6, top.y + 2.6], [top.x - 9, top.y + 0.6 + r(9)], [top.x - 19, top.y + 3.2 + r(19)], [top.x - 29, top.y + 1.2 + r(29)],
    [top.x - 36 - wind, top.y + 3.4 + r(36)], [top.x - 29.4, top.y + 8 + r(29)], [top.x - 35 - wind, top.y + 13 + r(35)], [top.x - 26, top.y + 12.6 + r(26)],
    [top.x - 17, top.y + 14 + r(17)], [top.x - 8, top.y + 12.6 + r(8)], [poleAt(top.y + 14).x - 0.4, top.y + 14],
  ], 4);
  paint(d, flag, banner, { shadow: 0.5, hatch: 0.2, line: 0.7, lit: pt(0.75, 0.2) });
  pen.clipped(flag, () => {
    // The cloth's folds: light on the crests, shade in the troughs.
    for (const [x, a] of [[-6, 0.35], [-16, 0.28], [-26, 0.22]] as const) {
      dab(d, shapeOf([[top.x + x - 2, top.y], [top.x + x + 2, top.y], [top.x + x + 1, top.y + 18], [top.x + x - 3, top.y + 18]]), LIGHT, a, 1.6);
      dab(d, shapeOf([[top.x + x - 6, top.y], [top.x + x - 4, top.y], [top.x + x - 5, top.y + 18], [top.x + x - 7.4, top.y + 18]]), SHADOW, 0.18, 1.6);
    }
    pen.stroke(flag, 1.6, GOLD, 0.9);
  });
  pen.stroke([...flag, flag[0]!], 0.6, d.ink, 0.9);
  // A gold crown on the field.
  const c = pt(top.x - 14, top.y + 7.6 + r(14));
  const crown = [pt(c.x - 4, c.y + 2.6), pt(c.x - 4.4, c.y - 2.4), pt(c.x - 2, c.y), pt(c.x, c.y - 3.4), pt(c.x + 2, c.y), pt(c.x + 4.4, c.y - 2.4), pt(c.x + 4, c.y + 2.6)];
  paint(d, crown, GOLD, { shadow: 0.3, hatch: 0, line: 0.5, gloss: true });
  // The pole and its finial.
  pen.stroke([POLE_FOOT, top], 2, d.ink, 1, false);
  pen.stroke([POLE_FOOT, top], 1.1, '#8a6236', 1, false);
  pen.hair([pt(POLE_FOOT.x - 0.3, POLE_FOOT.y - 4), pt(top.x - 0.4, top.y + 6)], 0.35, '#e8cfa0', 0.8);
  const tip = shapeOf([[top.x - 1.2, top.y + 0.4], [top.x - 0.4, top.y - 3], [top.x + 0.2, top.y - 5], [top.x + 1, top.y - 2.6], [top.x + 1.4, top.y + 0.6]], 3);
  paint(d, tip, GOLD, { shadow: 0.35, hatch: 0, line: 0.5, gloss: true });
}

/** The head: an open burgonet with a peak, cheek plates, the face in profile and a plume in the banner's colour. */
function helmAndFace(d: Draw, banner: string): void {
  const { pen } = d;
  const h = RIDER.head;
  const plume = shapeOf([[h.x - 1.6, h.y - 5.6], [h.x - 6, h.y - 7], [h.x - 11, h.y - 5.4], [h.x - 14.6, h.y - 1.4], [h.x - 10.4, h.y - 2.8], [h.x - 5.6, h.y - 3]], 5);
  paint(d, plume, '#f1ece0', { shadow: 0.45, hatch: 0, line: 0.55 });
  for (const k of [0, 1, 2]) pen.hair(lineOf([[h.x - 2, h.y - 5.4], [h.x - 6.6 - k * 2, h.y - 6 + k * 0.8], [h.x - 10.4 - k * 1.4, h.y - 4 + k * 0.8]]), 0.3, banner, 0.8);
  const face = shapeOf([[h.x + 1, h.y - 2.4], [h.x + 4, h.y - 1.8], [h.x + 4.6, h.y + 0.2], [h.x + 5.6, h.y + 1.2], [h.x + 4.4, h.y + 2], [h.x + 4.2, h.y + 3.6], [h.x + 2.6, h.y + 5], [h.x, h.y + 4.6]], 4);
  paint(d, face, SKIN, { shadow: 0.4, hatch: 0, line: 0.55 });
  pen.dot(h.x + 2.9, h.y - 0.3, 0.5, '#1d1716');
  pen.hair(lineOf([[h.x + 2, h.y - 1.4], [h.x + 3.6, h.y - 1.3]]), 0.35, d.ink, 0.8);
  const bowl = shapeOf([[h.x - 4.6, h.y + 3], [h.x - 5.4, h.y - 2], [h.x - 3, h.y - 5.8], [h.x + 1.4, h.y - 6.4], [h.x + 4.6, h.y - 4], [h.x + 6.8, h.y - 2.2], [h.x + 3, h.y - 2], [h.x + 0.6, h.y + 0.4], [h.x + 0.4, h.y + 4.6], [h.x - 2.4, h.y + 5]], 5);
  paint(d, bowl, STEEL, { shadow: 0.5, hatch: 0.16, line: 0.65, gloss: true });
  pen.stroke(lineOf([[h.x - 3.6, h.y - 5.4], [h.x + 1, h.y - 6.2], [h.x + 4.6, h.y - 3.6]]), 0.7, GOLD, 0.95, false);
  gleam(d, lineOf([[h.x - 3.4, h.y - 3.4], [h.x - 0.6, h.y - 5]]), 0.7, 0.85);
}

/** The sword in the hand at `hand` (rider units), its blade `angle` degrees from straight ahead. */
function heldSword(d: Draw, hand: Pt, angle: number): void {
  const a = (angle * Math.PI) / 180;
  const u = pt(Math.cos(a), Math.sin(a));
  const n = pt(-u.y, u.x);
  const at = (s: number, off = 0): Pt => pt(hand.x + u.x * s + n.x * off, hand.y + u.y * s + n.y * off);
  const xy = (p: Pt): [number, number] => [p.x, p.y];
  const blade = shapeOf([xy(at(2.6, -1.1)), xy(at(BLADE * 0.75, -0.9)), xy(at(BLADE, 0)), xy(at(BLADE * 0.75, 0.9)), xy(at(2.6, 1.1))], 3);
  paint(d, blade, '#dfe6ee', { shadow: 0.4, hatch: 0, line: 0.55, gloss: true });
  d.pen.hair([at(3.4, 0), at(BLADE * 0.72, 0)], 0.3, d.ink, 0.5);
  gleam(d, [at(3.6, -0.5), at(BLADE * 0.8, -0.35)], 0.5, 0.9);
  paint(d, shapeOf([xy(at(2.2, -3.2)), xy(at(2.9, -3)), xy(at(2.9, 3)), xy(at(2.2, 3.2))], 3), GOLD, { shadow: 0.3, hatch: 0, line: 0.5, gloss: true });
  d.pen.stroke([at(-2.2), at(2)], 1.4, '#3d2a22', 1, false);
  d.pen.dot(at(-2.8).x, at(-2.8).y, 0.95, GOLD);
}

/** The spell leaving the blade's point: a four-pointed star of light and a few sparks. */
function sparkle(d: Draw, c: Pt, s: number): void {
  const star = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
    const a = (i * Math.PI) / 4 - Math.PI / 2;
    const r = i % 2 ? s * 0.28 : s * (i % 4 ? 0.75 : 1);
    return pt(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r);
  });
  paint(d, star, '#ffe9a6', { shadow: 0.2, hatch: 0, line: 0.45, gloss: true, lit: pt(0.5, 0.5) });
  d.pen.dot(c.x, c.y, s * 0.18, '#fffaf0');
  for (const [dx, dy, r] of [[-0.9, -0.7, 0.13], [0.8, 0.9, 0.1], [1.1, -0.5, 0.08]] as const) d.pen.dot(c.x + dx * s, c.y + dy * s, s * r, GOLD);
}

/** Where the sword hand is (rider units), the blade's angle, and whether the sword is out. */
function swordHand(rig: MountRig): { hand: Pt; angle: number; drawn: boolean } {
  const { kind, t } = rig;
  if (kind !== 'attack' || t <= 0.06 || t >= 0.94) return { hand: HAND, angle: 0, drawn: false };
  return { hand: pt(beat(SWING.x, t), beat(SWING.y, t)), angle: beat(SWING.angle, t), drawn: true };
}

/**
 * The hero on horseback, for the map and beside the battlefield. Same
 * contract as a creature drawing (creatures/types.ts): origin on the ground
 * under the horse, facing right. `banner` is the owner's colour (palette.ts BANNER).
 * `pose` as a creature's (creatures/types.ts); the hero's attack is raising the sword to cast a spell.
 */
export function drawHero(ctx: CanvasRenderingContext2D, seed: number, f: number, banner: string, pose: Pose = IDLE): void {
  const rig = mountRig(MOUNT.pose, pose, CAST);
  const { motion: m, body, upper } = rig;
  const grip = swordHand(rig);
  const shoulder = RIDER.shoulder;
  const wrist = pt(grip.hand.x - 1.6, grip.hand.y + 0.6);
  const tip = pt(grip.hand.x + Math.cos((grip.angle * Math.PI) / 180) * (BLADE + 1.4), grip.hand.y + Math.sin((grip.angle * Math.PI) / 180) * (BLADE + 1.4));
  const casting = pose.kind === 'attack' && Math.abs(pose.t - 0.5) < 0.1;
  finished(ctx, seed, f, (d) => {
    farLegs(d, MOUNT, rig);
    within(d, body, () => {
      tail(d, MOUNT, 0.6 + m.swish, m.tailLift);
      torso(d, MOUNT, rig.warp);
    });
    nearLegs(d, MOUNT, rig, torsoInFigure(rig));
    within(d, body, () => {
      mane(d, MOUNT, rig.warp, m.wind, rig.t);
      within(d, rig.head, () => {
        forelock(d, MOUNT);
        head(d, MOUNT);
        headstall(d, LEATHER);
      });
      reins(d, apply(rig.head, HORSE.bit), apply(upper, onRider(RIDER.reinHand)));
      saddle(d, banner, GOLD, false);
      within(d, upper, () => asRider(d, () => cloak(d, banner, m.wind, rig.t)));
      legShadow(d, torsoShape(rig.warp));
      within(d, upper, () => asRider(d, () => sword(d, grip.drawn)));
      asRider(d, () => riderLeg(d, false, '#5a4636'));
      within(d, upper, () => {
        asRider(d, () => {
          riderTorso(d, mix(banner, SHADOW, 0.15), GOLD);
          fist(d, RIDER.reinHand, '#6b4a32');
        });
        standard(d, banner, rig.t, m.wind);
        asRider(d, () => {
          // A sword raised overhead is in front of the helm; otherwise the helm is over the arm's top.
          const raised = grip.hand.y < -78;
          if (raised) helmAndFace(d, banner);
          if (grip.drawn) heldSword(d, grip.hand, grip.angle);
          pauldron(d, pt(shoulder.x, shoulder.y + 0.6));
          plateArm(d, shoulder, elbowFor(shoulder, wrist, 8.86, 9.63), wrist);
          fist(d, grip.hand);
          if (!raised) helmAndFace(d, banner);
          if (casting) sparkle(d, tip, 5.2);
        });
      });
    });
  }, (d) => groundShadow(d, -4 + m.dx, 40), { line: 0.7 });
}
