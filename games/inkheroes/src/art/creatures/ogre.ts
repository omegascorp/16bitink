import { closed, makeDraw, oval, pt, type Draw } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';
import { mix } from '../wash';
import { chain, limb, tufted } from './beastFur';
import { dab, finished, gleam, groundShadow, paint, SHADOW } from './beastPaint';
import { CLUB, OGRE, ogreClub, ogreFist, ogreHead } from './ogreParts';
import type { CreatureDrawer } from './types';

/**
 * The Ogre, chapter one's bridge boss: a hunched brute ~88 tall, all
 * shoulders and belly on short thick legs, a small tusked head thrust
 * forward, an iron-banded club over its near shoulder. A hide loincloth
 * under a broad belt with a bronze buckle, its feet bound in hide wraps.
 * Tan-olive skin washed and cross-hatched in the shadows, lit from the
 * upper left. Origin on the ground between its feet, facing right.
 */
const SEED = 5000;
const FIST: Pt = pt(16.2, -59.6);

const TORSO: Pt[] = chain(
  pt(-8, -84),
  [pt(-3, -84.6), pt(2, -83), pt(5, -80)],
  [pt(10, -74), pt(16, -70), pt(22, -67.6)],
  [pt(31, -64), pt(36.4, -56), pt(35.4, -48)],
  [pt(34.4, -42), pt(30, -38.6), pt(22, -38)],
  [pt(8, -37), pt(-14, -37), pt(-24, -39)],
  [pt(-30, -44), pt(-30.4, -58), pt(-26.4, -70)],
  [pt(-23, -79), pt(-15, -84), pt(-8, -84)],
);

const PEC: Pt[] = chain(pt(5, -75), [pt(13, -72), pt(24, -68), pt(28.6, -63)], [pt(24, -59.2), pt(13, -59.4), pt(5.4, -62.6)], [pt(3.4, -66.6), pt(3.4, -71.6), pt(5, -75)]);
const BELLY: Pt[] = chain(pt(7, -60), [pt(20, -64.6), pt(35.6, -60), pt(36.4, -48)], [pt(37, -41), pt(31, -37.2), pt(22, -37.4)], [pt(12, -37.8), pt(3.6, -43), pt(3.6, -51)], [pt(3.6, -56), pt(4.6, -58.8), pt(7, -60)]);

/** The body: a hump of shoulder and trapezius, a slab of chest and the great belly, each mass modelled in washes and hatching. */
function torso(d: Draw): void {
  paint(d, TORSO, OGRE.skin, { shadow: 0.85, hatch: 0.28, cross: true, line: 0 });
  d.pen.clipped(TORSO, () => {
    dab(d, oval(-10, -78, 11, 6, 16), OGRE.skinLit, 0.55, 2.4);
    dab(d, [pt(-32, -60), pt(-24, -48), pt(-10, -42), pt(4, -40), pt(4, -34), pt(-32, -34)], SHADOW, 0.35, 2.4);
    d.pen.stipple(TORSO, 160, (_, y) => (y > -70 ? 0.5 : 0.2), 0.35, OGRE.skinDeep);
  });
  d.pen.stroke(closed(TORSO), 0.85, d.ink, 0.95);
  // The trapezius rising to the neck, the shoulder blade under the hide of the back.
  d.pen.hair(chain(pt(-6, -83), [pt(-1, -80), pt(3, -77), pt(6, -74)]), 0.45, d.ink, 0.55);
  d.pen.hair(chain(pt(-24, -70), [pt(-20, -64), pt(-18, -58), pt(-20, -52)]), 0.4, d.ink, 0.5);
  paint(d, PEC, OGRE.skin, { shadow: 0.7, hatch: 0.22, line: 0.55, lineAlpha: 0.75 });
  d.pen.clipped(PEC, () => dab(d, oval(12, -71, 6, 3, 12), OGRE.skinLit, 0.5, 1.4));
  paint(d, BELLY, mix(OGRE.skin, OGRE.skinLit, 0.25), { shadow: 0.9, hatch: 0.26, cross: true, line: 0.7 });
  d.pen.clipped(BELLY, () => {
    dab(d, oval(16, -55, 8, 5.6, 16), OGRE.skinLit, 0.65, 2);
    dab(d, [pt(36, -52), pt(38, -38), pt(14, -36), pt(28, -42)], SHADOW, 0.35, 2);
    d.pen.stipple(BELLY, 90, (_, y) => (y > -48 ? 0.5 : 0.15), 0.32, OGRE.skinDeep);
  });
  d.pen.hair([pt(28.4, -48.6), pt(29.4, -47.4), pt(30.6, -48.2)], 0.5, d.ink, 0.75);
}

/** A thick leg from under the loincloth to the ankle. */
function leg(d: Draw, joints: readonly Pt[], widths: readonly number[], far: boolean): void {
  const shape = limb(joints, widths);
  paint(d, shape, far ? mix(OGRE.skin, SHADOW, 0.3) : OGRE.skin, { shadow: 0.7, hatch: 0.24, cross: !far, line: 0.75 });
  const knee = joints[1]!;
  d.pen.hair([pt(knee.x - 2.6, knee.y - 1), pt(knee.x + 0.4, knee.y + 0.4), pt(knee.x + 3, knee.y - 0.6)], 0.4, d.ink, 0.6);
}

/** A foot bound in hide wraps, the toes peeking out at the front. */
function foot(d: Draw, x: number, far: boolean): void {
  const dim = (c: string): string => (far ? mix(c, SHADOW, 0.3) : c);
  for (const k of [0, 1, 2]) {
    const toe = oval(x + 15 + k * 1.6, -1.6 - k * 0.2, 2, 1.7, 10);
    paint(d, toe, dim(OGRE.skin), { shadow: 0.5, hatch: 0, line: 0.5 });
  }
  const wrap = chain(pt(x, -9), [pt(x + 6, -10.6), pt(x + 12, -8.4), pt(x + 16, -4)], [pt(x + 17.4, -1.6), pt(x + 16, 0.6), pt(x + 13, 0.6)], [pt(x + 7, 0.8), pt(x, 0.8), pt(x - 1.2, -2.4)], [pt(x - 1.8, -5), pt(x - 1.2, -7.6), pt(x, -9)]);
  paint(d, wrap, dim(OGRE.wrap), { shadow: 0.75, hatch: 0.24, line: 0.7 });
  d.pen.clipped(wrap, () => {
    for (const k of [0, 1, 2, 3]) d.pen.stroke([pt(x + 1 + k * 3.4, -10), pt(x + 3.4 + k * 3.4, 1)], 0.7, dim(OGRE.belt), 0.8, false);
  });
  d.pen.stroke([pt(x - 0.6, -7.2), pt(x + 5, -8.6), pt(x + 11, -7)], 0.5, dim(OGRE.hideLight), 0.7, false);
}

/** The loincloth: a hide skirt with a ragged hem, dappled, its front flap hanging longer. */
function loincloth(d: Draw): void {
  const hem = tufted(chain(pt(26.6, -26), [pt(14, -23.6), pt(-8, -23), pt(-27.6, -27.6)]), { len: 2.2, every: 3, rake: pt(-0.2, 0.6), side: 1, seed: SEED + 1, skip: 0.3 });
  const skirt = [pt(-29, -40), ...chain(pt(-29, -40), [pt(-10, -38.4), pt(12, -38), pt(29, -39)]).slice(1), pt(29.6, -33), ...hem, pt(-29.6, -34)];
  paint(d, skirt, OGRE.hide, { shadow: 0.65, hatch: 0.24, line: 0.75 });
  d.pen.clipped(skirt, () => {
    for (const [x, y, r] of [[-18, -30, 2.2], [-6, -27, 1.6], [4, -32, 2], [-24, -26, 1.4], [16, -28, 1.8], [-12, -35, 1.3]] as const) {
      dab(d, oval(x, y, r * 1.3, r, 10), OGRE.hideSpot, 0.7, 0.4);
    }
    // Folds hanging from the belt.
    for (const x of [-20, -9, 3]) d.pen.hair([pt(x, -36), pt(x - 0.6, -29), pt(x + 0.4, -23)], 0.4, d.ink, 0.5);
  });
  const flap = [pt(10, -38), pt(23, -38.4), ...tufted([pt(23.6, -18), pt(9.4, -17)], { len: 1.8, every: 2.6, rake: pt(0, 0.6), side: 1, seed: SEED + 2 }), pt(9.4, -17)];
  const flapShape = [flap[0]!, flap[1]!, pt(24, -29), ...flap.slice(2)];
  paint(d, flapShape, mix(OGRE.hide, OGRE.hideLight, 0.45), { shadow: 0.55, hatch: 0.18, line: 0.7 });
  d.pen.clipped(flapShape, () => dab(d, oval(14, -24, 2.4, 1.8, 10), OGRE.hideSpot, 0.6, 0.4));
  for (let y = -34; y < -19; y += 2.6) d.pen.hair([pt(11.2, y), pt(11.6, y + 1.2)], 0.35, d.ink, 0.6);
}

/** The broad belt over the loincloth, a bronze buckle at the front. */
function belt(d: Draw): void {
  const top = chain(pt(-30, -43), [pt(-10, -41.4), pt(14, -41), pt(31, -42.6)]);
  const bot = chain(pt(30.4, -36.4), [pt(14, -35), pt(-10, -35.4), pt(-29.6, -37)]);
  const band = [...top, ...bot];
  paint(d, band, OGRE.belt, { shadow: 0.6, hatch: 0.2, line: 0.7 });
  d.pen.hair(top.map((p) => pt(p.x, p.y + 1.1)), 0.3, OGRE.hideLight, 0.5);
  for (let x = -26; x < 16; x += 3.4) d.pen.dot(x, -39.4 + Math.abs(x) * 0.012, 0.3, OGRE.hideLight, 0.7);
  const buckle = [pt(17.6, -43.4), pt(25, -43.8), pt(25.4, -34.6), pt(17.8, -34.4)];
  paint(d, buckle, OGRE.bronze, { gloss: true, shadow: 0.55, hatch: 0, line: 0.65 });
  const hole = [pt(19.4, -41.6), pt(23.4, -41.8), pt(23.6, -36.4), pt(19.6, -36.2)];
  d.pen.fill(hole, OGRE.belt, 1);
  d.pen.stroke([pt(19.6, -39), pt(24.4, -39.2)], 0.7, mix(OGRE.bronze, PAPER_FILL, 0.3), 1, false);
  gleam(d, [pt(18.4, -42.6), pt(22, -42.9)], 0.45, 0.85);
}

/** The near arm: a great rounded shoulder, the elbow dropped, the forearm bringing the fist up to the club. */
function nearArm(d: Draw): void {
  const upper = limb([pt(-11, -74), pt(-9, -62), pt(-6, -50)], [18, 15, 12]);
  paint(d, upper, OGRE.skin, { shadow: 0.65, hatch: 0.24, cross: true, line: 0.8 });
  const delt = chain(pt(-21, -76), [pt(-19, -84), pt(-6, -85), pt(-2, -76)], [pt(0, -70), pt(-3, -63), pt(-9, -61)], [pt(-15, -60.4), pt(-21.4, -66), pt(-21, -76)]);
  paint(d, delt, OGRE.skin, { shadow: 0.75, hatch: 0.24, cross: true, line: 0.75 });
  d.pen.clipped(delt, () => dab(d, oval(-14, -78, 5, 3.6, 12), OGRE.skinLit, 0.7, 1.4));
  const fore = limb([pt(-6, -50), pt(4, -54.6), pt(13, -58.6)], [12.4, 11.4, 8.4]);
  paint(d, fore, OGRE.skin, { shadow: 0.6, hatch: 0.22, line: 0.8 });
  d.pen.hair([pt(-3, -55), pt(4, -58.2), pt(10, -60)], 0.4, d.ink, 0.5);
  // A leather bracer round the wrist.
  const bracer = limb([pt(7.4, -56.6), pt(12.4, -58.4)], [10, 9]);
  paint(d, bracer, OGRE.belt, { shadow: 0.5, hatch: 0, line: 0.6 });
  for (const t of [0.3, 0.7]) d.pen.dot(7.4 + 5 * t, -56.6 - 1.8 * t - 3, 0.4, OGRE.bronze, 1);
}

/** The far arm hanging forward of the belly, its fist below the chest. */
function farArm(d: Draw): void {
  const arm = limb([pt(16, -68), pt(30, -55), pt(37, -40)], [13, 11, 8.6]);
  const dim = mix(OGRE.skin, SHADOW, 0.3);
  paint(d, arm, dim, { shadow: 0.6, hatch: 0.18, line: 0.75 });
  const fist = chain(pt(33, -40), [pt(36, -44), pt(42, -42.6), pt(42.6, -37)], [pt(43, -33), pt(39, -30.4), pt(35.6, -31.6)], [pt(32.6, -33), pt(31.4, -37), pt(33, -40)]);
  paint(d, fist, dim, { shadow: 0.55, hatch: 0.16, line: 0.75 });
  d.pen.clipped(fist, () => dab(d, oval(41, -37, 2.6, 4, 10), '#b0715a', 0.35, 1));
  for (const y of [-38.6, -36, -33.4]) d.pen.hair([pt(40, y - 0.6), pt(42.4, y + 0.4)], 0.4, d.ink, 0.7);
}

function ogre(d: Draw): void {
  leg(d, [pt(-14, -32), pt(-17, -16), pt(-15.6, -6)], [16, 12, 9], true);
  foot(d, -21, true);
  farArm(d);
  leg(d, [pt(10, -32), pt(14.6, -16), pt(12.4, -6)], [17, 13, 9.6], false);
  foot(d, 7, false);
  torso(d);
  loincloth(d);
  belt(d);
  ogreHead(d);
  nearArm(d);
  ogreClub(d);
  ogreFist(d, FIST);
  void CLUB;
}

export const drawOgre: CreatureDrawer = (ctx, seed, f) => {
  const ground = makeDraw(ctx, seed + f, f, 0);
  finished(ctx, { line: 0.9, rim: 0.55 }, () => groundShadow(ground, 0, 36, 3.6), (layer) => ogre(makeDraw(layer, seed + f, f, 0)));
};
