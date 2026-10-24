import { pt, type Draw } from '../kit';
import type { Pt } from '../pen';
import { finished, gleam, groundShadow, limb, lineOf, mix, paint, shapeOf, SHADOW } from './crownElitePaint';
import { caparison, chanfron, goldCrown } from './crownMountBarding';
import { farLegs, head, nearLegs, tail, torsoShape, type HorseLook } from './crownMountHorse';
import { asRider, bridle, CROWN_BLUE, fist, GOLD, onRider, pauldron, plateArm, RIDER, riderLeg, riderTorso, saddle, STEEL } from './crownMountRider';
import type { CreatureDrawer } from './types';

/**
 * The Lancer: a knight in full plate on a barded grey warhorse at the
 * charge, near foreleg folded high, a blue-and-white lance couched under
 * the arm with a pennon at its head, a vamplate guarding the hand, a
 * crowned armet with a blue plume, and a blue caparison powdered with gold
 * crowns. About 92 units to the lance's point.
 */
const MOUNT: HorseLook = { coat: '#a39d93', points: '#625c56', mane: '#e2dccf', hoof: '#46403b', build: 1, pose: 'charge' };

/** The lance's butt and point (world units), through the rider's armpit and fist. */
const BUTT = pt(-24, -56.3);
const TIP = pt(55, -98.2);
const LEN = Math.hypot(TIP.x - BUTT.x, TIP.y - BUTT.y);
const U = pt((TIP.x - BUTT.x) / LEN, (TIP.y - BUTT.y) / LEN);
/** Normal to the lance, pointing below it. */
const N = pt(-U.y, U.x);
const along = (s: number, off = 0): Pt => pt(BUTT.x + U.x * s + N.x * off, BUTT.y + U.y * s + N.y * off);
/** Where the fist grips the lance (rider units), and its place along the lance. */
const GRIP = pt(6, -70);
const GRIP_S = (() => {
  const g = onRider(GRIP);
  return (g.x - BUTT.x) * U.x + (g.y - BUTT.y) * U.y;
})();

/** The lance: painted in blue-and-white spirals, a steel head. */
function lance(d: Draw): void {
  const { pen } = d;
  const head = LEN - 6;
  const shaft = limb([[BUTT.x, BUTT.y, 2.2], [along(GRIP_S).x, along(GRIP_S).y, 3], [along(head).x, along(head).y, 1.4]]);
  paint(d, shaft.shape, CROWN_BLUE, { shadow: 0.5, hatch: 0, line: 0.6, gloss: true });
  pen.clipped(shaft.shape, () => {
    for (let s = 2; s < head; s += 5) pen.fill([along(s, -3), along(s + 2.2, -3), along(s + 0.4, 3), along(s - 1.8, 3)], '#eef0f6', 0.92);
    pen.stroke([along(2, 0.9), along(head, 0.4)], 0.6, SHADOW, 0.35, false);
    gleam(d, [along(4, -0.6), along(head - 2, -0.3)], 0.5, 0.7);
  });
  const point = shapeOf([[along(head - 1, -1).x, along(head - 1, -1).y], [along(head + 2.4, -1.6).x, along(head + 2.4, -1.6).y], [TIP.x, TIP.y], [along(head + 2.4, 1.6).x, along(head + 2.4, 1.6).y], [along(head - 1, 1).x, along(head - 1, 1).y]], 3);
  paint(d, point, STEEL, { shadow: 0.4, hatch: 0, line: 0.55, gloss: true });
}

/** The pennon below the lance's head, streaming back in the charge. */
function pennon(d: Draw, f: number): void {
  const w = [0, 0.6, -0.5][f]!;
  const s0 = LEN - 8;
  const s1 = LEN - 17;
  const shape = [along(s0, 0.8), along(s0 - 7, 3.2 + w), along(s0 - 16, 2.6 - w), along(s1 - 15, 3.6 + w), along(s1 - 8, 6.6), along(s1 - 14, 10 - w), along(s1 - 4, 8.4 + w), along(s1, 7.6)];
  paint(d, shapeOf(shape.map((p) => [p.x, p.y] as [number, number]), 4), CROWN_BLUE, { shadow: 0.45, hatch: 0.14, line: 0.55, lit: pt(0.7, 0.3) });
  d.pen.stroke(lineOf([[along(s0, 2).x, along(s0, 2).y], [along(s1, 6.4).x, along(s1, 6.4).y]]), 1, GOLD, 0.95, false);
  goldCrown(d, along(s1 - 4, 4.6), 4.4);
}

/** The vamplate: a steel cone on the lance in front of the fist. */
function vamplate(d: Draw): void {
  const s = GRIP_S + 2.6;
  const shape = [along(s, -4.2), along(s + 1.2, -4.4), along(s + 6, -1.6), along(s + 6, 1.6), along(s + 1.2, 4.4), along(s, 4.2)];
  paint(d, shape, STEEL, { shadow: 0.5, hatch: 0.14, line: 0.6, gloss: true });
  d.pen.stroke([along(s + 0.6, -4), along(s + 0.6, 4)], 0.6, GOLD, 0.9, false);
  gleam(d, [along(s + 1.4, -3.4), along(s + 5.4, -1.2)], 0.6, 0.85);
}

/** The armet: a rounded helm with a jutting visor and eye slit, a gold coronet and a plume of blue and white. */
function armet(d: Draw): void {
  const { pen } = d;
  const h = RIDER.head;
  const at = (x: number, y: number): [number, number] => [h.x + x, h.y + y];
  const { ctx } = d.pen;
  ctx.save();
  ctx.translate(RIDER.neck.x, RIDER.neck.y);
  ctx.scale(0.86, 0.86);
  ctx.translate(-RIDER.neck.x, -RIDER.neck.y);
  for (const [c, dy, len] of [['#e8eefc', -1, 15], [CROWN_BLUE, 0.8, 13.6], [mix(CROWN_BLUE, SHADOW, 0.25), 2.4, 11]] as const) {
    const plume = shapeOf([at(-1, -6), at(-5, -9.6 - dy), at(-len * 0.75, -9 - dy * 0.5), at(-len, -5 + dy), at(-len * 0.7, -5.6 + dy), at(-5, -4)], 5);
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

export const drawLancer: CreatureDrawer = (ctx, seed, f) => {
  finished(ctx, seed, f, (d) => {
    farLegs(d, MOUNT);
    nearLegs(d, MOUNT, torsoShape());
    caparison(d);
    tail(d, MOUNT, 2.4);
    head(d, MOUNT);
    chanfron(d);
    bridle(d, '#3d2a22', onRider(RIDER.reinHand));
    saddle(d, CROWN_BLUE, GOLD, true, false);
    asRider(d, () => {
      riderLeg(d, true, STEEL);
      riderTorso(d, CROWN_BLUE, GOLD);
      fist(d, RIDER.reinHand);
    });
    lance(d);
    pennon(d, d.f);
    asRider(d, () => {
      pauldron(d, pt(RIDER.shoulder.x, RIDER.shoulder.y + 0.6));
      plateArm(d, RIDER.shoulder, pt(-6.6, -62.4), pt(GRIP.x - 1.4, GRIP.y + 0.8));
      fist(d, GRIP);
    });
    vamplate(d);
    asRider(d, () => armet(d));
  }, (d) => groundShadow(d, -6, 42), { line: 0.7 });
};
