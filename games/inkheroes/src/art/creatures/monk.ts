import type { Draw } from '../kit';
import type { Pt } from '../pen';
import { mix } from '../wash';
import { cast, CROWN, far, head, limb, neck, oval, part, pt, ribbonOf, rivets, steel, trim } from './crownInfantryKit';
import { dab, gleam, glow, infantryFigure, SHADOW } from './crownInfantryPaint';
import type { CreatureDrawer } from './types';

/**
 * The Monk: a bearded, tonsured battle-monk of the Crown in a long cream
 * robe with a deep blue scapular and cowl edged in gold, a knotted rope
 * belt and sandals. He holds a tall staff crowned with a gold sun-ring
 * round a burning orb of holy light, and raises his other hand with a mote
 * of the same light ready to throw. Silhouette: the bell of the robe, the
 * upright staff and its glowing head.
 */

const ROBE = '#ddd0b0';
const BEARD = '#a39684';
const STAFF_X = 15;
const ORB = pt(15.8, -85.6);
const PALM = pt(21.4, -53.4);

/** The sandalled feet peeping out under the hem. */
function feet(d: Draw): void {
  for (const [x, back] of [[-5, true], [8.6, false]] as const) {
    const foot = [pt(x - 1.6, -3.2), pt(x + 2.6, -3), pt(x + 5.4, -1.6), pt(x + 5.6, 0), pt(x - 2, 0)];
    part(d, foot, back ? far(CROWN.skin) : CROWN.skin, { shadow: 0.45, hatch: 0, line: 0.55 });
    d.pen.hair([pt(x + 0.4, -3), pt(x + 2.8, -0.6)], 0.5, CROWN.leatherDark, 0.9);
    d.pen.stroke([pt(x - 2, -0.3), pt(x + 5.6, -0.3)], 0.9, CROWN.leatherDark, 0.95, false);
  }
}

/** The robe: a long bell of cream wool, folded, with the blue scapular down its front and a rope belt. */
function robe(d: Draw): void {
  const body = [pt(-4, -52.6), pt(-9.4, -50), pt(-10.4, -42), pt(-9.4, -34), pt(-11.6, -20), pt(-14.2, -6), pt(-13.4, -2.6), pt(-8, -1.6), pt(-3, -2.8), pt(2, -1.4), pt(7, -2.6), pt(12.6, -1.4), pt(13.6, -4), pt(11.4, -18), pt(9.4, -34), pt(10.4, -42), pt(9.8, -48), pt(7, -51.4), pt(3.4, -52.8)];
  part(d, body, ROBE, { shadow: 0.6, hatch: 0.22, line: 0.75 });
  // The folds falling from the belt: a shaded trough beside each lit ridge.
  d.pen.clipped(body, () => {
    for (const x of [-9, -4.4, 0.2]) {
      const fold = [pt(x * 0.5, -32), pt(x * 0.9, -18), pt(x * 1.15, -2)];
      dab(d, ribbonOf(fold.map((p) => pt(p.x + 1, p.y)), 1.8), SHADOW, 0.22, 0.7);
      d.pen.hair(fold, 0.4, mix(ROBE, SHADOW, 0.5), 0.8);
      gleam(d, fold.map((p) => pt(p.x - 0.9, p.y)), 0.6, 0.4);
    }
  });
  cast(d, body, nearSleeve(), 2.4, 0.3);
  // The scapular: a blue panel down the front, gold-edged, a gold sun on the breast.
  const scap = [pt(2.4, -51.6), pt(7.6, -50.8), pt(9.4, -34), pt(11.2, -3.4), pt(5.4, -2.4), pt(3, -34)];
  part(d, scap, CROWN.blue, { shadow: 0.55, hatch: 0.18, line: 0.6 });
  trim(d, [pt(3, -50.8), pt(3.4, -34), pt(5.8, -3)], 0.9);
  trim(d, [pt(5.6, -3), pt(10.8, -3.8)], 1.2);
  const sun = pt(6, -44);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    d.pen.hair([pt(sun.x + Math.cos(a) * 1.6, sun.y + Math.sin(a) * 1.9), pt(sun.x + Math.cos(a) * 2.8, sun.y + Math.sin(a) * 3.2)], 0.4, CROWN.goldLight, 1);
  }
  steel(d, oval(sun.x, sun.y, 1.4, 1.6, 10), CROWN.gold, { hatch: 0, line: 0.4, shadow: 0.3 });
  // The rope belt, its knotted end hanging down the front.
  const rope = [pt(-9.4, -35.4), pt(0, -33.6), pt(9.6, -35.4)];
  d.pen.stroke(rope, 1.6, mix(CROWN.hide, SHADOW, 0.15), 1, false);
  for (let i = 0; i < 7; i++) d.pen.hair([pt(-8 + i * 2.6, -35.6 + Math.abs(i - 3.5) * 0.3), pt(-7 + i * 2.6, -33.8 + Math.abs(i - 3.5) * 0.3)], 0.3, CROWN.leatherDark, 0.8);
  const tail = [pt(8.4, -34.2), pt(8.8, -27), pt(8.2, -20)];
  d.pen.stroke(tail, 1.2, mix(CROWN.hide, SHADOW, 0.15), 1, false);
  for (const y of [-29, -22]) part(d, oval(8.6, y, 1.3, 1, 8), CROWN.hide, { shadow: 0.4, hatch: 0, line: 0.4 });
}

/** The blue cowl lying back on the shoulders, then the tonsured, bearded head. */
function cowlAndHead(d: Draw): void {
  const cowl = [pt(-6.2, -57.4), pt(-9.8, -52.4), pt(-9.4, -48.4), pt(-3, -47.6), pt(4.4, -49), pt(7.4, -51.6), pt(2.4, -53.2), pt(-2.4, -53.6)];
  part(d, cowl, CROWN.blue, { shadow: 0.55, hatch: 0.18, line: 0.65 });
  trim(d, [pt(-9.2, -48.8), pt(-3, -48), pt(4.4, -49.4), pt(7.2, -51.6)], 1);
  neck(d, pt(2.4, -52.4));
  const c = pt(3.6, -57.6);
  head(d, c, { beard: BEARD, hair: mix(BEARD, CROWN.hair, 0.4), scale: 1.1 });
  // The shaven crown catching the light.
  gleam(d, [pt(-0.6, -63.4), pt(2.2, -64.2)], 0.8, 0.7);
  d.pen.hair([pt(-1.6, -60.2), pt(2.6, -61.6), pt(6.6, -61)], 0.35, mix(CROWN.skinShade, SHADOW, 0.3), 0.6);
}

/** The raised hand, palm out, its sleeve fallen back: a mote of light gathering on it (see `light`). */
function raisedArm(d: Draw): void {
  const sleeve = [pt(5, -50.6), pt(10.4, -51.4), pt(15.6, -52.6), pt(17.4, -48.4), pt(15.4, -46.2), pt(9.8, -44.8), pt(5.6, -44)];
  part(d, sleeve, far(ROBE), { shadow: 0.55, line: 0.6 });
  part(d, limb(pt(15.4, -50.4), pt(17.8, -51.4), pt(PALM.x - 1, PALM.y + 1.2), 3.8, 3.4, 3), far(CROWN.skin), { shadow: 0.4, hatch: 0 });
  const palm = [pt(PALM.x - 1.6, PALM.y + 2.6), pt(PALM.x - 1.8, PALM.y - 1), pt(PALM.x - 0.6, PALM.y - 3.6), pt(PALM.x + 0.6, PALM.y - 3.8), pt(PALM.x + 1.6, PALM.y - 1.2), pt(PALM.x + 2.6, PALM.y - 0.4), pt(PALM.x + 1.6, PALM.y + 2.4)];
  part(d, palm, CROWN.skin, { shadow: 0.35, hatch: 0, line: 0.5 });
  d.pen.hair([pt(PALM.x - 0.2, PALM.y - 3.2), pt(PALM.x - 0.1, PALM.y - 0.6)], 0.25, CROWN.skinShade, 0.8);
  d.pen.hair([pt(PALM.x + 0.9, PALM.y - 2.8), pt(PALM.x + 0.7, PALM.y - 0.4)], 0.25, CROWN.skinShade, 0.8);
}

/** The staff: dark wood, iron-shod, a gold sun-ring at its head round the orb. */
function staff(d: Draw): void {
  const shaft = ribbonOf([pt(STAFF_X - 0.4, 0.4), pt(STAFF_X + 0.2, -40), pt(STAFF_X + 0.8, -80.6)], 0, (u) => 2.2 - u * 0.4);
  part(d, shaft, CROWN.woodDark, { shadow: 0.5, hatch: 0, line: 0.55 });
  gleam(d, [pt(STAFF_X - 0.6, -4), pt(STAFF_X + 0.1, -40), pt(STAFF_X + 0.4, -78)], 0.4, 0.45);
  steel(d, [pt(STAFF_X - 1.6, -3), pt(STAFF_X + 1, -3), pt(STAFF_X + 0.8, 0.4), pt(STAFF_X - 1.6, 0.4)], CROWN.iron, { hatch: 0, line: 0.45 });
  for (const y of [-62, -79.4]) steel(d, [pt(STAFF_X - 0.8 + (y + 40) * -0.015, y - 1.2), pt(STAFF_X + 2.4 + (y + 40) * -0.015, y - 1.2), pt(STAFF_X + 2.4 + (y + 40) * -0.015, y + 1.2), pt(STAFF_X - 0.8 + (y + 40) * -0.015, y + 1.2)], CROWN.gold, { hatch: 0, line: 0.45, shadow: 0.3 });
  // The orb, white-hot at its heart.
  part(d, oval(ORB.x, ORB.y, 2.8, 2.8, 16), CROWN.holy, { shadow: 0, hatch: 0, line: 0.4, lineAlpha: 0.5 });
  d.pen.dot(ORB.x - 0.4, ORB.y - 0.4, 1.4, '#ffffff', 0.95);
  const ring = Array.from({ length: 33 }, (_, i) => {
    const a = (i / 32) * Math.PI * 2;
    return pt(ORB.x + Math.cos(a) * 4.8, ORB.y + Math.sin(a) * 5.2);
  });
  d.pen.stroke(ring, 1.5, mix(CROWN.gold, SHADOW, 0.25), 1, false);
  d.pen.stroke(ring.slice(14, 26), 0.6, CROWN.goldLight, 0.9, false);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const tip = pt(ORB.x + Math.cos(a) * 7.4, ORB.y + Math.sin(a) * 7.8);
    steel(d, [pt(ORB.x + Math.cos(a - 0.16) * 5, ORB.y + Math.sin(a - 0.16) * 5.4), tip, pt(ORB.x + Math.cos(a + 0.16) * 5, ORB.y + Math.sin(a + 0.16) * 5.4)], CROWN.gold, { hatch: 0, line: 0.35, shadow: 0.3 });
  }
  rivets(d, [pt(ORB.x, ORB.y + 5.2)], 0.5, CROWN.gold);
}

function nearSleeve(): Pt[] {
  return [pt(-4.6, -50), pt(-9, -47.6), pt(-8.6, -40), pt(-3.6, -35.6), pt(5.6, -36.6), pt(10.4, -37.4), pt(10, -43.8), pt(3.6, -42.6), pt(-1.6, -44)];
}

/** The near arm in its wide sleeve, the hand round the staff. */
function staffArm(d: Draw): void {
  const sleeve = nearSleeve();
  part(d, sleeve, ROBE, { shadow: 0.55, line: 0.65 });
  d.pen.hair([pt(-6, -46), pt(-4.6, -40.4), pt(0, -38.6)], 0.4, mix(ROBE, SHADOW, 0.5), 0.8);
  trim(d, [pt(10, -44.2), pt(10.6, -37)], 1.1);
  const hand = [pt(11.2, -43.2), pt(13.6, -44.4), pt(16.8, -43.4), pt(17.4, -39.6), pt(14.6, -37.2), pt(11.2, -38)];
  part(d, hand, CROWN.skin, { shadow: 0.45, hatch: 0, line: 0.55 });
  for (const y of [-42, -40.2, -38.6]) d.pen.hair([pt(15.6, y), pt(17, y + 0.3)], 0.3, CROWN.skinShade, 0.9);
}

/** The holy light's halo, laid over the finished figure so it glows past the ink. */
function light(d: Draw): void {
  const ctx = d.pen.ctx;
  glow(ctx, ORB, 16, '#fff3c4', 0.6);
  glow(ctx, ORB, 6, '#ffffff', 0.8);
  glow(ctx, pt(PALM.x + 0.6, PALM.y - 5.6), 6, '#fff3c4', 0.75);
  d.pen.dot(PALM.x + 0.6, PALM.y - 5.6, 1.1, '#ffffff', 0.95);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    d.pen.hair([pt(ORB.x + Math.cos(a) * 9.4, ORB.y + Math.sin(a) * 9.4), pt(ORB.x + Math.cos(a) * 12.6, ORB.y + Math.sin(a) * 12.6)], 0.5, CROWN.goldLight, 0.8);
  }
}

export const drawMonk: CreatureDrawer = (ctx, seed, f) =>
  infantryFigure(ctx, seed, f, { shadowRx: 18, after: light }, (d) => {
    feet(d);
    robe(d);
    cowlAndHead(d);
    raisedArm(d);
    staff(d);
    staffArm(d);
  });
