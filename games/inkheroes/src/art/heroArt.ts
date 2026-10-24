import { pt, type Draw } from './kit';
import type { Pt } from './pen';
import { dab, finished, gleam, groundShadow, LIGHT, limb, lineOf, mix, paint, shapeOf, SHADOW } from './creatures/crownElitePaint';
import { farLegs, head, mane, nearLegs, tail, torso, type HorseLook } from './creatures/crownMountHorse';
import { asRider, bridle, fist, GOLD, LEATHER, legShadow, onRider, pauldron, plateArm, RIDER, riderLeg, riderTorso, saddle, STEEL } from './creatures/crownMountRider';

/**
 * The hero on horseback: a commander on a light bay riding horse (no
 * barding, a blaze down its face), in a breastplate with a cloak and a
 * plumed open helm, a sword at the hip and the army's banner held high in
 * the owner's colour. Unlike the Lancer: no lance, no caparison, a lighter
 * horse walking, and the flag, which carries the read at map size.
 */
const MOUNT: HorseLook = { coat: '#8f5a32', points: '#3a2a24', mane: '#2c211d', hoof: '#4a3f38', build: 0.9, pose: 'walk', blaze: true };

const SKIN = '#e2b48c';
/** The banner pole: the hand holds it at HAND, its foot rests by the stirrup. */
const HAND = pt(7.6, -63);
const POLE_FOOT = pt(7.6, -36);
const POLE_TOP = pt(11.8, -101.6);

const poleAt = (y: number): Pt => {
  const t = (y - POLE_FOOT.y) / (POLE_TOP.y - POLE_FOOT.y);
  return pt(POLE_FOOT.x + (POLE_TOP.x - POLE_FOOT.x) * t, y);
};

/** The cloak, thrown back from the shoulders over the horse's croup, its hem lifting. */
function cloak(d: Draw, banner: string): void {
  const shape = shapeOf([[-6, -72], [-1.6, -71], [-6.4, -62], [-12, -53], [-20, -48.4], [-29, -46], [-33.4, -48.4], [-30, -52.4], [-25, -56], [-18.6, -61], [-12, -67.4]], 5);
  paint(d, shape, banner, { shadow: 0.6, hatch: 0.22, cross: true, line: 0.65 });
  d.pen.clipped(shape, () => {
    for (const k of [0, 1, 2]) {
      const x = -10 - k * 6;
      gleam(d, lineOf([[x + 4, -66 + k * 4], [x - 1, -57 + k * 3], [x - 5, -51 + k * 1.5]]), 0.9, 0.3);
      d.pen.hair(lineOf([[x + 6, -66 + k * 3], [x + 1, -56 + k * 2.4], [x - 3, -49.6 + k]]), 0.35, mix(banner, SHADOW, 0.6), 0.7);
    }
  });
  d.pen.stroke(lineOf([[-29, -46.4], [-20, -48.8], [-12, -53.4]]), 0.8, GOLD, 0.9, false);
}

/** A sword at the near hip: scabbard slung back under the cloak, guard and grip at the belt. */
function sword(d: Draw): void {
  const sheath = limb([[-7, -55], [-14, -47], [-21.6, -39.6]].map(([x, y], i) => [x!, y!, [2.4, 2.2, 1.8][i]!] as const));
  paint(d, sheath.shape, '#3d2a22', { shadow: 0.4, hatch: 0, line: 0.55 });
  d.pen.stroke(lineOf([[-19.6, -41.6], [-21.8, -39.4]]), 1.6, GOLD, 1, false);
  d.pen.stroke(lineOf([[-9.6, -52.4], [-11, -51]]), 1.4, GOLD, 1, false);
  paint(d, shapeOf([[-4.2, -58.6], [-3, -59.2], [-1.4, -55.6], [-2.6, -55]], 3), GOLD, { shadow: 0.3, hatch: 0, line: 0.5, gloss: true });
  d.pen.stroke(lineOf([[-1.2, -61.6], [-3.6, -56]]), 1.2, d.ink, 0.95, false);
  d.pen.stroke(lineOf([[-6.4, -57.4], [-1, -59.6]]), 1.3, GOLD, 1, false);
  d.pen.dot(-0.9, -62.2, 0.9, GOLD);
}

/** The banner: a pole with a gilt finial and a swallowtailed flag streaming back, a gold crown on it. */
function standard(d: Draw, banner: string, f: number): void {
  const { pen } = d;
  const ripple = [0, 0.5, -0.4][f]!;
  const top = POLE_TOP;
  const flag = shapeOf([
    [top.x - 0.6, top.y + 2.6], [top.x - 9, top.y + 0.6 + ripple], [top.x - 19, top.y + 3.2], [top.x - 29, top.y + 1.2 - ripple],
    [top.x - 36, top.y + 3.4], [top.x - 29.4, top.y + 8], [top.x - 35, top.y + 13], [top.x - 26, top.y + 12.6 + ripple],
    [top.x - 17, top.y + 14], [top.x - 8, top.y + 12.6 - ripple], [poleAt(top.y + 14).x - 0.4, top.y + 14],
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
  const c = pt(top.x - 14, top.y + 7.6);
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

/**
 * The hero on horseback, for the map and beside the battlefield. Same
 * contract as a creature drawing (creatures/types.ts): origin on the ground
 * under the horse, facing right. `banner` is the owner's colour (palette.ts BANNER).
 */
export function drawHero(ctx: CanvasRenderingContext2D, seed: number, f: number, banner: string): void {
  finished(ctx, seed, f, (d) => {
    farLegs(d, MOUNT);
    tail(d, MOUNT, 0.6);
    const body = torso(d, MOUNT);
    nearLegs(d, MOUNT, body);
    mane(d, MOUNT);
    head(d, MOUNT);
    bridle(d, LEATHER, onRider(RIDER.reinHand));
    saddle(d, banner, GOLD, false);
    asRider(d, () => cloak(d, banner));
    legShadow(d, body);
    asRider(d, () => {
      sword(d);
      riderLeg(d, false, '#5a4636');
      riderTorso(d, mix(banner, SHADOW, 0.15), GOLD);
      fist(d, RIDER.reinHand, '#6b4a32');
    });
    standard(d, banner, d.f);
    asRider(d, () => {
      pauldron(d, pt(RIDER.shoulder.x, RIDER.shoulder.y + 0.6));
      plateArm(d, RIDER.shoulder, pt(-3.6, -61.6), pt(HAND.x - 1.6, HAND.y + 0.6));
      fist(d, HAND);
      helmAndFace(d, banner);
    });
  }, (d) => groundShadow(d, -4, 40), { line: 0.7 });
}
