import type { Draw } from '../kit';
import type { Pt } from '../pen';
import { mix } from '../wash';
import { cast, cub, CROWN, far, limb, mail, oval, part, pt, ribbonOf, rivets, roundRect, seam, shine, steel, trim } from './crownInfantryKit';
import { dab, gleam, SHADOW, infantryFigure } from './crownInfantryPaint';
import type { CreatureDrawer } from './types';

/**
 * The Swordsman: Crown heavy infantry, broad and planted, in mail under a
 * blue tabard with gold hems, steel pauldron, knee cops and greaves, and a
 * flat-topped great helm ringed with a gold crown. A tall blue kite shield
 * bearing a gold crown covers the front; the sword is cocked back high over
 * the shoulder, ready to cut. Silhouette: the boxy helm, the kite shield
 * and the blade raised behind.
 */

const HAND = pt(-6.4, -59.4);
/** The sword's line, from pommel to point. */
const POMMEL = pt(-5.2, -54.6);
const POINT = pt(-21.6, -91);

function sabaton(d: Draw, x: number, color: string): void {
  const shape = [pt(x - 2.8, -8), pt(x + 2.4, -8.2), pt(x + 3, -3.8), pt(x + 7.4, -2.6), pt(x + 8.2, 0), pt(x - 3.2, 0), pt(x - 3.4, -3)];
  steel(d, shape, color, { line: 0.65 });
  for (const k of [0.3, 0.55]) d.pen.hair([pt(x + 1 + k * 6, -3.6 + k * 1.6), pt(x + 1.6 + k * 6, -0.4)], 0.35, d.ink, 0.7);
  d.pen.stroke([pt(x - 3.2, -0.3), pt(x + 8, -0.3)], 0.9, d.ink, 0.9, false);
  shine(d, [pt(x - 1.6, -6.6), pt(x + 1.6, -6.8)], 0.5);
}

/** One armoured leg: mail chausses, a steel knee cop and greave, a sabaton. */
function leg(d: Draw, hip: Pt, knee: Pt, ankle: Pt, back: boolean): Pt[] {
  const tone = (c: string): string => (back ? far(c) : c);
  const shape = limb(hip, knee, ankle, 7.6, 6, 4.8);
  part(d, shape, tone(CROWN.steelDark), { shadow: 0.55, hatch: 0.1 });
  mail(d, shape, Math.min(hip.x, ankle.x) - 5, Math.max(hip.x, knee.x) + 5, hip.y, ankle.y);
  const greave = limb(pt(knee.x + 0.2, knee.y + 2), pt((knee.x + ankle.x) / 2, (knee.y + ankle.y) / 2), pt(ankle.x, ankle.y - 1), 5.2, 5, 4.4);
  steel(d, greave, tone(CROWN.steel));
  shine(d, [pt(knee.x - 0.8, knee.y + 3), pt(ankle.x - 1.2, ankle.y - 2)], 0.6);
  steel(d, oval(knee.x + 0.6, knee.y, 3.4, 3, 14), tone(CROWN.steel));
  rivets(d, [pt(knee.x + 0.6, knee.y)], 0.5);
  sabaton(d, ankle.x, tone(CROWN.steel));
  return shape;
}

function legs(d: Draw): void {
  const back = leg(d, pt(-3.6, -30), pt(-7.4, -17), pt(-9.6, -7), true);
  const front = leg(d, pt(3.6, -30), pt(8.4, -17.4), pt(10, -7), false);
  for (const l of [back, front]) cast(d, l, [pt(-16, -26), pt(16, -26), pt(16, -21), pt(-16, -21)], 1.6, 0.42);
}

/** The mail hauberk's skirt and the blue tabard over it, belted, with gold hems. */
function body(d: Draw): void {
  const hauberk = [pt(-10.4, -36), pt(10, -36), pt(12.4, -21), pt(0, -19.6), pt(-12.6, -20.8)];
  part(d, hauberk, CROWN.steelDark, { shadow: 0.5, hatch: 0.1 });
  mail(d, hauberk, -13, 13, -36, -19);
  const tabard = [pt(-4.4, -53.2), pt(-10.8, -51), pt(-11.6, -44), pt(-9.6, -35), pt(-10.8, -23.4), pt(-3, -22.4), pt(-1.4, -27), pt(0.4, -22.4), pt(9.6, -23.4), pt(9.6, -35), pt(11, -44), pt(9.8, -50.4), pt(4.4, -53.4)];
  part(d, tabard, CROWN.blue, { shadow: 0.6, hatch: 0.22, line: 0.75 });
  trim(d, [pt(-10.6, -23.8), pt(-3.2, -22.8), pt(-1.4, -27.2), pt(0.6, -22.8), pt(9.4, -23.8)], 1.4);
  trim(d, [pt(-4.2, -52.8), pt(0, -50.6), pt(4.2, -53)], 1);
  // The cloth's folds and the near arm's shadow.
  for (const [a, b] of [[pt(-6, -32), pt(-7.4, -24)], [pt(4.6, -32), pt(5.8, -24)]] as const) d.pen.hair([a, b], 0.4, mix(CROWN.blue, SHADOW, 0.6), 0.8);
  cast(d, tabard, limb(pt(-6, -48), pt(-12.4, -50.4), HAND, 7.4, 6, 5), 2.4, 0.36);
  const belt = [pt(-10, -36.2), pt(0, -35), pt(9.8, -36.2), pt(9.8, -33.4), pt(0, -32.2), pt(-10, -33.4)];
  part(d, belt, CROWN.leatherDark, { shadow: 0.4, hatch: 0, line: 0.55 });
  rivets(d, [pt(-6, -34.2), pt(-2, -33.6), pt(2, -33.6)], 0.45, CROWN.gold);
}

/** The shield arm (mail) and the kite shield over it: blue, gold-rimmed, a gold crown on it. */
function shield(d: Draw): void {
  const arm = limb(pt(7, -48.6), pt(11.6, -39), pt(16.6, -39.4), 7, 6, 5);
  part(d, arm, far(CROWN.steelDark), { shadow: 0.5, hatch: 0.1 });
  mail(d, arm, 4, 20, -52, -35);
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
}

/** The great helm: a flat-topped steel pot, its eye slit and breaths, a gold crown round its top, a mail aventail below. */
function helm(d: Draw): void {
  const aventail = [pt(-4, -54), pt(5, -54.6), pt(7.4, -50.2), pt(-5.8, -49.6)];
  part(d, aventail, CROWN.steelDark, { shadow: 0.5, hatch: 0 });
  mail(d, aventail, -6, 8, -54, -49);
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
}

/** The sword: steel blade with its fuller, a gold cross-guard, a wrapped grip and a gold pommel. */
function sword(d: Draw): void {
  const len = Math.hypot(POINT.x - POMMEL.x, POINT.y - POMMEL.y);
  const ux = (POINT.x - POMMEL.x) / len;
  const uy = (POINT.y - POMMEL.y) / len;
  const at = (s: number, n: number): Pt => pt(POMMEL.x + ux * s - uy * n, POMMEL.y + uy * s + ux * n);
  const blade = [at(8.4, -1.4), at(len - 4, -1.15), at(len, 0), at(len - 4, 1.15), at(8.4, 1.4)];
  steel(d, blade, CROWN.steel, { line: 0.6, shadow: 0.55 });
  d.pen.hair([at(9.4, 0), at(len - 7, 0)], 0.35, mix(CROWN.steelDark, SHADOW, 0.3), 0.8);
  shine(d, [at(10, -0.7), at(len - 6, -0.6)], 0.5);
  steel(d, ribbonOf([at(1, 0), at(7.6, 0)], 1.4), CROWN.leatherDark, { hatch: 0, line: 0.45, gloss: false });
  steel(d, [at(7.4, -4.2), at(8.8, -4.4), at(8.8, 4.4), at(7.4, 4.2)], CROWN.gold, { hatch: 0, line: 0.5, shadow: 0.35 });
  steel(d, oval(POMMEL.x, POMMEL.y, 1.5, 1.5, 10), CROWN.gold, { hatch: 0, line: 0.5, shadow: 0.35 });
}

/** The sword arm cocked back: mail sleeve, a layered steel pauldron and a steel gauntlet round the grip. */
function swordArm(d: Draw): void {
  const upper = limb(pt(-5.6, -48), pt(-12.4, -50.4), pt(-12.4, -50.4), 7.4, 6.4, 6.4);
  part(d, upper, CROWN.steelDark, { shadow: 0.5, hatch: 0.1 });
  mail(d, upper, -18, -2, -55, -44);
  const fore = limb(pt(-12.4, -50.4), pt(-9.6, -55), pt(HAND.x - 0.6, HAND.y + 1.4), 6, 5.4, 4.6);
  part(d, fore, CROWN.steelDark, { shadow: 0.5, hatch: 0.1 });
  mail(d, fore, -16, -4, -60, -47);
  // A steel vambrace down the forearm, the elbow cop, and one broad pauldron over the shoulder.
  steel(d, limb(pt(-11.4, -52.4), pt(-9.4, -55.4), pt(HAND.x - 1.2, HAND.y + 2.4), 5, 4.8, 4.4), CROWN.steel);
  steel(d, oval(-12.8, -50.2, 3.2, 3, 14), CROWN.steel);
  rivets(d, [pt(-12.8, -50.2)], 0.45);
  const pauldron = [pt(-11.8, -47.4), pt(-11.4, -51.6), pt(-8, -55), pt(-3, -55.4), pt(1, -52.8), pt(0.4, -48.6), pt(-4.6, -47.2)];
  steel(d, pauldron, CROWN.steel, { line: 0.7, shadow: 0.65 });
  trim(d, [pt(-11.4, -48.2), pt(-4.6, -48), pt(0.2, -49.4)], 1.1, CROWN.gold);
  seam(d, [pt(-10.6, -51.2), pt(-5, -52), pt(0.4, -51)], 0.35, 0.6);
  shine(d, [pt(-9.6, -52.6), pt(-6, -54.4), pt(-2.6, -54.4)], 0.6);
  rivets(d, [pt(-5, -54.2), pt(-1.4, -53.4)], 0.45);
  sword(d);
  const gauntlet = [pt(HAND.x - 2.8, HAND.y + 2.6), pt(HAND.x - 2.2, HAND.y - 2.2), pt(HAND.x + 1.2, HAND.y - 2.8), pt(HAND.x + 2.8, HAND.y - 0.6), pt(HAND.x + 2.2, HAND.y + 2.4), pt(HAND.x - 0.4, HAND.y + 3.4)];
  steel(d, gauntlet, CROWN.steel, { line: 0.6 });
  d.pen.hair([pt(HAND.x + 1.8, HAND.y - 1.8), pt(HAND.x + 2.2, HAND.y + 1.8)], 0.35, d.ink, 0.7);
  part(d, roundRect(HAND.x - 3.4, HAND.y + 2.2, HAND.x + 1.8, HAND.y + 4.6, 0.8), CROWN.leatherDark, { shadow: 0.3, hatch: 0, line: 0.45 });
}

export const drawSwordsman: CreatureDrawer = (ctx, seed, f) =>
  infantryFigure(ctx, seed, f, { shadowRx: 21, line: 0.8 }, (d) => {
    legs(d);
    body(d);
    shield(d);
    helm(d);
    swordArm(d);
  });
