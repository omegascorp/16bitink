import type { Draw } from '../kit';
import type { Pt } from '../pen';
import { mix } from '../wash';
import { boot, cast, CROWN, far, fist, head, limb, neck, oval, part, pt, quilt, ribbonOf, rivets, steel, trim } from './crownInfantryKit';
import { dab, gleam, infantryFigure, SHADOW } from './crownInfantryPaint';
import type { CreatureDrawer } from './types';

/**
 * The Bowman: a hooded Crown archer at full draw: a deep blue hood and
 * dagged shoulder-cape with gold edging, its long tail down the back, a
 * laced leather jerkin over a blue tunic, a quiver of blue-fletched arrows
 * on the back, and a tall yew longbow held out in front with the string
 * pulled to the chin. Silhouette: the bow's tall arc at the front, the
 * level arms and the hood's point.
 */

const YEW = '#c99a5c';
/** The bow: tips, grip and how far the grip stands forward of them. */
const BOW = { x: 16.6, top: -85, bottom: -13, grip: -49, bend: 7.6 } as const;
/** Where the string is drawn back to: the nock, under the chin. */
const NOCK = pt(5.4, -49.6);
const ARROW_TIP = pt(35, -49);

const bowX = (y: number): number => BOW.x + BOW.bend * (1 - ((y - BOW.grip) / ((BOW.bottom - BOW.top) / 2)) ** 2);

/** The quiver on the back and the arrows' fletchings standing out of it. */
function quiver(d: Draw): void {
  const tube = [pt(-14.4, -58), pt(-9.4, -59.4), pt(-4.6, -31.6), pt(-9, -30.4)];
  part(d, tube, CROWN.leather, { shadow: 0.55, line: 0.6 });
  trim(d, [pt(-14.4, -57.4), pt(-9.4, -58.8)], 1.4, CROWN.leatherDark);
  trim(d, [pt(-9.2, -31.4), pt(-4.8, -32.4)], 1.2, CROWN.gold);
  for (const [x, y, k] of [[-14.6, -62.6, 0], [-12.4, -63.6, 1], [-10.6, -62.2, 0], [-13.4, -61, 1]] as const) {
    const vane = [pt(x + 1, y + 3.6), pt(x - 0.6, y + 0.8), pt(x - 0.2, y - 1.4), pt(x + 1.2, y - 0.4), pt(x + 2, y + 2.8)];
    part(d, vane, k ? CROWN.blueLight : CROWN.linen, { shadow: 0.4, hatch: 0, line: 0.45 });
    d.pen.hair([pt(x + 1.6, y + 4.8), pt(x + 0.3, y - 0.6)], 0.4, d.ink, 0.8);
  }
}

function legs(d: Draw): void {
  const back = limb(pt(-2.4, -29), pt(-5, -16.5), pt(-7, -6), 6, 4.8, 3.8);
  part(d, back, far(CROWN.hose), { shadow: 0.55 });
  boot(d, -7, -15, 6.8, far(CROWN.leather));
  const front = limb(pt(3, -29), pt(7, -16.5), pt(9.4, -6), 6.2, 5, 4);
  part(d, front, CROWN.hose, { shadow: 0.5 });
  boot(d, 9.4, -15, 7.2, CROWN.leather);
  for (const leg of [back, front]) cast(d, leg, [pt(-14, -26), pt(14, -26), pt(14, -22), pt(-14, -22)], 1.4, 0.4);
}

/** The blue tunic's skirt, the laced jerkin over it, the belt and the quiver's strap. */
function body(d: Draw): void {
  const skirt = [pt(-7.6, -36), pt(8.4, -36), pt(10.4, -22.6), pt(2, -21.4), pt(-9.8, -22.2)];
  part(d, skirt, CROWN.blue, { shadow: 0.55, line: 0.65 });
  quilt(d, skirt, [[pt(-3, -34), pt(-3.6, -22)], [pt(3, -34), pt(3.6, -22)]], CROWN.blue);
  trim(d, [pt(-9.6, -22.6), pt(2, -21.8), pt(10.2, -23)], 1.4);
  const jerkin = [pt(-4, -51.6), pt(-8.2, -49), pt(-8.8, -42), pt(-7.4, -34), pt(-8, -29.6), pt(0, -28.4), pt(9.2, -29.8), pt(8.4, -35), pt(9.6, -42), pt(8.6, -48), pt(5.4, -51)];
  part(d, jerkin, CROWN.hide, { shadow: 0.6, hatch: 0.22, line: 0.7 });
  // Seams down the panels, the lacing at the front.
  for (const x of [-3.8, 1.8]) d.pen.hair([pt(x, -48), pt(x - 0.4, -40), pt(x + 0.2, -30)], 0.35, mix(CROWN.hide, SHADOW, 0.5), 0.8);
  for (let y = -46; y < -32; y += 2.4) d.pen.hair([pt(6.2, y), pt(8, y + 1.2)], 0.35, CROWN.leatherDark, 0.9);
  cast(d, jerkin, nearUpperArm(), 2, 0.3);
  // The strap across the chest to the quiver, and the belt with its pouch.
  const strap = ribbonOf([pt(-8.4, -33), pt(0, -41), pt(7.6, -49.4)], 1.8);
  part(d, strap, CROWN.leatherDark, { shadow: 0.3, hatch: 0, line: 0.45 });
  const belt = [pt(-8, -33.4), pt(0, -32.6), pt(9, -33.6), pt(9, -31.2), pt(0, -30.2), pt(-8, -31)];
  part(d, belt, CROWN.leatherDark, { shadow: 0.4, hatch: 0, line: 0.55 });
  steel(d, [pt(1.6, -33.2), pt(3.6, -33.2), pt(3.6, -30.6), pt(1.6, -30.6)], CROWN.gold, { hatch: 0, line: 0.45 });
  part(d, [pt(-6.8, -31.4), pt(-2.6, -31), pt(-2.8, -26.4), pt(-4.8, -25.2), pt(-6.8, -26.4)], CROWN.leather, { shadow: 0.5, hatch: 0, line: 0.5 });
}

/** The bow arm held straight out, its leather bracer, and the longbow in its fist. */
function bowArm(d: Draw): void {
  const arm = limb(pt(7, -48.6), pt(14.4, -48.8), pt(21.6, -48.8), 5.6, 4.6, 3.8);
  part(d, arm, far(CROWN.blue), { shadow: 0.5 });
  part(d, [pt(15.4, -51), pt(20.6, -50.8), pt(20.6, -46.8), pt(15.4, -46.6)], CROWN.leatherDark, { shadow: 0.4, hatch: 0, line: 0.5 });
  const spine = Array.from({ length: 25 }, (_, i) => {
    const y = BOW.top + ((BOW.bottom - BOW.top) * i) / 24;
    return pt(bowX(y), y);
  });
  const limbShape = ribbonOf(spine, 0, (u) => 0.9 + 1.3 * (1 - Math.abs(u - 0.5) * 2));
  part(d, limbShape, YEW, { shadow: 0.45, hatch: 0, line: 0.6 });
  gleam(d, spine.slice(2, 11).map((p) => pt(p.x - 0.3, p.y)), 0.4, 0.6);
  // Horn nocks at the tips.
  for (const y of [BOW.top, BOW.bottom]) part(d, oval(bowX(y), y, 0.9, 1.3, 8), CROWN.linen, { shadow: 0.3, hatch: 0, line: 0.45 });
  // The arrow along the string's line (the string goes on after the finish: see `string`).
  const shaft = ribbonOf([NOCK, ARROW_TIP], 0.9);
  part(d, shaft, CROWN.linen, { shadow: 0.3, hatch: 0, line: 0.4 });
  steel(d, [pt(ARROW_TIP.x - 0.6, ARROW_TIP.y - 1.4), pt(ARROW_TIP.x + 3.2, ARROW_TIP.y), pt(ARROW_TIP.x - 0.6, ARROW_TIP.y + 1.4)], CROWN.steel, { hatch: 0, line: 0.45 });
  for (const s of [-1, 1]) part(d, [pt(NOCK.x + 1.6, NOCK.y), pt(NOCK.x + 7, NOCK.y + 0.2), pt(NOCK.x + 6, NOCK.y + s * 1.8), pt(NOCK.x + 2.6, NOCK.y + s * 1.6)], CROWN.blueLight, { shadow: 0.3, hatch: 0, line: 0.4 });
  part(d, [pt(21.2, -52.6), pt(26.4, -52.4), pt(26.4, -45.6), pt(21.2, -45.4)].map((p) => pt(p.x + (bowX(-49) - 23.8), p.y)), CROWN.leatherDark, { shadow: 0.4, hatch: 0, line: 0.5 });
  fist(d, pt(bowX(-49) - 0.6, -49), 2.2, CROWN.skin, 0);
}

/** The head under a hood that runs into a dagged cape over the shoulders, its long tail down the back. */
function hood(d: Draw): void {
  const tail = ribbonOf([pt(-6.6, -65.4), pt(-9.8, -60), pt(-11.4, -52), pt(-11, -45)], 0, (u) => 2.8 - u * 1.4);
  part(d, tail, far(CROWN.blue), { shadow: 0.5, line: 0.55 });
  neck(d, pt(3.2, -52.4));
  const c = pt(3.6, -57.2);
  head(d, c, { stubble: false, scale: 1.1 });
  const cape = [pt(8.4, -62), pt(5.6, -65.4), pt(1.4, -66.6), pt(-3, -66.6), pt(-8, -67.2), pt(-6, -62.6), pt(-5.4, -57), pt(-4.8, -55), pt(-6, -52.4), pt(-10.4, -48.6), pt(-11.4, -44.4), pt(-9, -42.6), pt(-7, -44), pt(-5, -42), pt(-3, -43.6), pt(-1, -41.8), pt(1, -43.4), pt(3, -41.8), pt(5, -43.4), pt(7, -42), pt(9.6, -43.6), pt(10.8, -45.4), pt(10, -49.4), pt(8, -51.4), pt(5.8, -51.6), pt(4.4, -53.2), pt(4.6, -57.4), pt(5.8, -59.8)];
  part(d, cape, CROWN.blue, { shadow: 0.6, hatch: 0.2, line: 0.75 });
  trim(d, [pt(-11.2, -44.6), pt(-9, -42.9), pt(-7, -44.2), pt(-5, -42.3), pt(-3, -43.8), pt(-1, -42.1), pt(1, -43.6), pt(3, -42.1), pt(5, -43.6), pt(7, -42.3), pt(9.6, -43.8)], 0.9);
  trim(d, [pt(8.2, -61.8), pt(5.8, -59.6), pt(4.7, -57.2), pt(4.5, -53.2), pt(5.8, -51.8)], 0.8);
  // The folds of the cowl, and the hood's shade over the brow.
  for (const [a, b] of [[pt(-2, -63), pt(-1, -55)], [pt(1.4, -64.6), pt(2, -59.4)], [pt(-6.6, -50), pt(-5.4, -44)], [pt(6.6, -50.6), pt(6.8, -44.4)]] as const) d.pen.hair([a, b], 0.4, mix(CROWN.blue, SHADOW, 0.6), 0.75);
  d.pen.clipped(cape, () => gleam(d, [pt(-3.4, -62), pt(-1.6, -65), pt(2, -66)], 0.8, 0.5));
  dab(d, [pt(4.6, -62), pt(9.2, -61.6), pt(9, -59.2), pt(5, -57.6)], SHADOW, 0.34, 0.7);
}

/** The bowstring, drawn back to the nock: laid over the finished figure so it stays a fine line. */
function string(d: Draw): void {
  const hand = pt(NOCK.x - 0.4, NOCK.y + 0.2);
  for (const y of [BOW.top, BOW.bottom]) {
    const tip = pt(bowX(y), y);
    const k = 2.2 / Math.hypot(tip.x - hand.x, tip.y - hand.y);
    d.pen.hair([tip, pt(hand.x + (tip.x - hand.x) * k, hand.y + (tip.y - hand.y) * k)], 0.55, d.ink, 0.95);
  }
}

function nearUpperArm(): Pt[] {
  return limb(pt(-3, -48.6), pt(-7, -49.4), pt(-10.6, -49.6), 6.2, 5.6, 5.2);
}

/** The drawing arm: elbow raised level behind, the fingers hooked on the string under the chin. */
function drawArm(d: Draw): void {
  const fore = limb(pt(-10.6, -49.6), pt(-2.6, -49.8), pt(NOCK.x - 1.4, NOCK.y + 0.2), 5.2, 4.6, 3.8);
  part(d, nearUpperArm(), CROWN.blue, { shadow: 0.5 });
  part(d, oval(-10.6, -49.6, 2.8, 2.8, 12), CROWN.blue, { shadow: 0.5, hatch: 0, line: 0.55 });
  part(d, fore, CROWN.blue, { shadow: 0.5 });
  part(d, [pt(-4.4, -52), pt(1.6, -51.8), pt(1.6, -47.6), pt(-4.4, -47.4)], CROWN.leatherDark, { shadow: 0.4, hatch: 0, line: 0.5 });
  rivets(d, [pt(-2.6, -49.7), pt(0, -49.7)], 0.4, CROWN.gold);
  fist(d, pt(NOCK.x - 0.4, NOCK.y + 0.2), 2.1, CROWN.skin, 0);
}

export const drawBowman: CreatureDrawer = (ctx, seed, f) =>
  infantryFigure(ctx, seed, f, { shadowRx: 19, after: string }, (d) => {
    quiver(d);
    legs(d);
    body(d);
    bowArm(d);
    hood(d);
    drawArm(d);
  });
