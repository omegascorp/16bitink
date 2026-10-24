import type { Draw } from '../kit';
import type { Pt } from '../pen';
import { mix } from '../wash';
import { boot, cast, CROWN, far, fist, head, limb, neck, oval, part, pt, quilt, rivets, seg, shine, steel, trim, wraps } from './crownInfantryKit';
import { dab, gleam, infantryFigure, SHADOW } from './crownInfantryPaint';
import type { CreatureDrawer } from './types';

/**
 * The Spearman: Crown militia in a steel kettle hat and a quilted blue
 * gambeson with gold hems, a round blue shield with a gold cross on the
 * front arm and a long ash spear held low in the other, angled up past the
 * hat with a blue pennon under its leaf blade. Silhouette: the wide-brimmed
 * hat, the round shield and the long diagonal spear.
 */

const BUTT = pt(-9, -3);
const TIP = pt(40, -100);
const along = (t: number): Pt => pt(BUTT.x + (TIP.x - BUTT.x) * t, BUTT.y + (TIP.y - BUTT.y) * t);
/** Where the near hand grips the shaft. */
const GRIP = 0.33;
const BLADE = 0.87;

/** A stretch of the ash shaft, from t0 to t1 of the way from butt to tip. */
function shaft(d: Draw, t0: number, t1: number): void {
  const a = along(t0);
  const b = along(t1);
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const ux = (b.x - a.x) / len;
  const uy = (b.y - a.y) / len;
  const w = 0.85;
  const shape = [pt(a.x - uy * w, a.y + ux * w), pt(b.x - uy * w, b.y + ux * w), pt(b.x + uy * w, b.y - ux * w), pt(a.x + uy * w, a.y - ux * w)];
  part(d, shape, CROWN.wood, { shadow: 0.5, hatch: 0, line: 0.5 });
  gleam(d, [pt(a.x - uy * 0.3, a.y + ux * 0.3), pt(b.x - uy * 0.3, b.y + ux * 0.3)], 0.35, 0.55);
}

/** The steel leaf blade, its socket and the pennon tied under it. */
function spearHead(d: Draw): void {
  const base = along(BLADE);
  const ux = (TIP.x - BUTT.x) / Math.hypot(TIP.x - BUTT.x, TIP.y - BUTT.y);
  const uy = (TIP.y - BUTT.y) / Math.hypot(TIP.x - BUTT.x, TIP.y - BUTT.y);
  const at = (s: number, n: number): Pt => pt(base.x + ux * s - uy * n, base.y + uy * s + ux * n);
  const L = Math.hypot(TIP.x - base.x, TIP.y - base.y);
  // The pennon: a swallow-tailed blue streamer, lifting back off the shaft.
  const p0 = along(0.79);
  const p1 = along(0.835);
  const pennon = [p1, pt(p1.x - 5, p1.y - 0.8), pt(p1.x - 10, p1.y + 1), pt(p1.x - 15, p1.y + 0.2), pt(p1.x - 11.6, p1.y + 4), pt(p1.x - 15, p1.y + 7.6), pt(p1.x - 8.4, p1.y + 6.8), pt(p0.x - 3.4, p0.y + 1.8), p0];
  part(d, pennon, CROWN.blue, { shadow: 0.45, hatch: 0.12, line: 0.6 });
  // The fold: the far panel in shade.
  d.pen.clipped(pennon, () => dab(d, [pt(p1.x - 6, p1.y - 2), pt(p1.x - 16, p1.y - 1), pt(p1.x - 16, p1.y + 9), pt(p1.x - 9, p1.y + 8)], SHADOW, 0.3, 0.6));
  d.pen.hair([pt(p1.x - 5.6, p1.y - 0.2), pt(p1.x - 7.4, p1.y + 3.4), pt(p1.x - 8.6, p1.y + 6.4)], 0.35, d.ink, 0.6);
  trim(d, [pt(p1.x - 0.4, p1.y + 0.2), pt(p1.x - 5, p1.y - 0.4), pt(p1.x - 10, p1.y + 1.4), pt(p1.x - 14.2, p1.y + 0.7)], 0.8);
  // Socket, then the blade with its midrib.
  steel(d, [at(-2.6, -1.1), at(0.6, -1.25), at(0.6, 1.25), at(-2.6, 1.1)], CROWN.steelDark, { hatch: 0, line: 0.5 });
  const blade = [at(0, -1.2), at(L * 0.3, -2.6), at(L * 0.62, -2.1), at(L, 0), at(L * 0.62, 2.1), at(L * 0.3, 2.6), at(0, 1.2)];
  steel(d, blade, CROWN.steel, { line: 0.6 });
  d.pen.hair([at(0.4, 0), at(L * 0.92, 0)], 0.35, d.ink, 0.7);
  shine(d, [at(L * 0.18, -1.4), at(L * 0.62, -1.3)], 0.55);
}

function legs(d: Draw): void {
  const back = limb(pt(-3, -30), pt(-6, -17), pt(-8, -6), 6.6, 5, 4);
  part(d, back, far(CROWN.hose), { shadow: 0.55 });
  wraps(d, pt(-6, -16), pt(-7.8, -9), 4.6, 4);
  boot(d, -8, -9.5, 7, far(CROWN.boot));
  shaft(d, 0, GRIP);
  steel(d, [...seg(along(0), along(0.04), 2).map((p) => pt(p.x - 1, p.y)), ...seg(along(0.04), along(0), 2).map((p) => pt(p.x + 1, p.y))], CROWN.steelDark, { hatch: 0, line: 0.45 });
  const front = limb(pt(3, -30), pt(6.5, -17), pt(7.4, -6), 6.8, 5.2, 4.2);
  part(d, front, CROWN.hose, { shadow: 0.5 });
  wraps(d, pt(6.6, -16), pt(7.4, -9), 5, 4);
  boot(d, 7.4, -9.5, 7.6);
  // The gambeson's skirt shades the tops of the legs.
  for (const leg of [back, front]) cast(d, leg, [pt(-14, -26), pt(14, -26), pt(14, -22), pt(-14, -22)], 1.6, 0.4);
}

/** The quilted gambeson: body and skirt, collar, belt and gold hems. */
function gambeson(d: Draw): void {
  const body = [pt(-3.8, -52.4), pt(-9, -49.8), pt(-10, -44), pt(-8.4, -36), pt(-10, -28), pt(-12, -20.8), pt(-4, -19.8), pt(4, -20.2), pt(11.6, -21.4), pt(10, -28), pt(9, -34), pt(10.8, -41), pt(10.4, -46.8), pt(7.4, -50.8), pt(3.2, -52.6)];
  part(d, body, CROWN.blue, { shadow: 0.55, hatch: 0.2, line: 0.7 });
  const rows = [-5.4, -2, 1.6, 5, 8].map((x) => [pt(x * 0.95, -50.5), pt(x * 0.92, -42), pt(x * 0.9, -35), pt(x * 1.08, -28), pt(x * 1.2, -20)]);
  quilt(d, body, rows, CROWN.blue);
  quilt(d, body, [[pt(-12, -27.4), pt(0, -26.6), pt(12, -27.6)]], CROWN.blue);
  // The near arm's shadow down the side, and the chin's on the collar.
  cast(d, body, nearArm(), 2.2, 0.34);
  cast(d, body, oval(4, -52.5, 4, 2, 12), 1.2, 0.35);
  trim(d, [pt(-11.2, -21.2), pt(-4, -20.3), pt(4, -20.7), pt(11, -21.8)], 1.6);
  // The padded collar.
  part(d, [pt(-4.2, -52.6), pt(-1, -50.6), pt(3.8, -51.2), pt(4.4, -53.4), pt(0, -53.2), pt(-3.8, -54.4)], CROWN.blueDeep, { shadow: 0.4, hatch: 0, line: 0.5 });
  trim(d, [pt(-4, -52.4), pt(-0.8, -50.6), pt(3.9, -51.1)], 0.8);
  // Belt and buckle.
  const belt = [pt(-8, -35.6), pt(0, -34.4), pt(9.2, -35.4), pt(9.2, -32.8), pt(0, -31.8), pt(-8, -33)];
  part(d, belt, CROWN.leather, { shadow: 0.4, hatch: 0, line: 0.55 });
  steel(d, [pt(5.4, -35.4), pt(8, -35.6), pt(8, -32.4), pt(5.4, -32.3)], CROWN.gold, { hatch: 0, line: 0.5 });
  d.pen.hair([pt(6.7, -35), pt(6.7, -32.8)], 0.3, d.ink, 0.8);
}

/** The shield arm and the round shield on it, at the front. */
function shield(d: Draw): void {
  part(d, limb(pt(7, -48), pt(12, -40), pt(17, -40.5), 6, 5, 4), far(CROWN.blue), { shadow: 0.5 });
  const c = pt(19, -36.5);
  const disc = oval(c.x, c.y, 7.8, 11.2, 36);
  part(d, disc, CROWN.blue, { shadow: 0.6, hatch: 0.18, line: 0.8 });
  d.pen.clipped(disc, () => {
    // The gold cross, drawn as the board curves away.
    part(d, [pt(c.x - 1.6, c.y - 12), pt(c.x + 1.2, c.y - 12), pt(c.x + 1.2, c.y + 12), pt(c.x - 1.6, c.y + 12)], CROWN.gold, { shadow: 0.35, hatch: 0, line: 0.4, gloss: true });
    part(d, [pt(c.x - 9, c.y - 1.8), pt(c.x + 9, c.y - 1.2), pt(c.x + 9, c.y + 1.4), pt(c.x - 9, c.y + 1.6)], CROWN.gold, { shadow: 0.35, hatch: 0, line: 0.4, gloss: true });
    dab(d, oval(c.x + 4.6, c.y + 3, 4.6, 10, 20), SHADOW, 0.22, 1.2);
  });
  // The iron rim and the boss.
  const rim = Array.from({ length: 41 }, (_, i) => {
    const a = (i / 40) * Math.PI * 2;
    return pt(c.x + Math.cos(a) * 7, c.y + Math.sin(a) * 10.3);
  });
  d.pen.stroke(rim, 1.5, mix(CROWN.steelDark, SHADOW, 0.2), 0.85, false);
  gleam(d, rim.slice(21, 31), 0.5, 0.7);
  rivets(d, [0.6, 1.6, 2.6, 3.6, 4.6, 5.6].map((a) => pt(c.x + Math.cos(a) * 7, c.y + Math.sin(a) * 10.3)), 0.5);
  steel(d, oval(c.x - 0.2, c.y, 2.8, 3.6, 18), CROWN.steel, { line: 0.6 });
  d.pen.dot(c.x - 1.1, c.y - 1.2, 0.6, '#ffffff', 0.9);
}

/** The head under a kettle hat: a steel dome with a wide brim casting its shade on the face. */
function kettleHat(d: Draw): void {
  neck(d, pt(2.2, -52.6));
  const c = pt(3.2, -57.4);
  head(d, c, { stubble: true, hair: CROWN.hair, scale: 1.1 });
  d.pen.ctx.save();
  d.pen.ctx.translate(0, -1.2);
  // The brim's shadow across the eyes.
  dab(d, [pt(-1, -61.4), pt(9.6, -61.4), pt(9.4, -58.6), pt(5, -58.2), pt(-1, -59)], SHADOW, 0.32, 0.8);
  const dome = [pt(-3.6, -61.6), pt(-3.6, -65), pt(-1.4, -68.2), pt(3, -69.2), pt(7.4, -68), pt(9.4, -65), pt(9.6, -61.6)];
  steel(d, dome, CROWN.steel, { line: 0.7 });
  // The comb along the crown, and the riveted band.
  d.pen.hair([pt(-1.6, -67.6), pt(3, -69), pt(7.6, -67.6)], 0.45, d.ink, 0.7);
  trim(d, [pt(-3.6, -62.6), pt(3, -62.2), pt(9.6, -62.6)], 1.3, CROWN.steelDark);
  rivets(d, [pt(-1.4, -62.5), pt(3, -62.2), pt(7.4, -62.5)], 0.42);
  const brim = Array.from({ length: 30 }, (_, i) => {
    const a = (i / 30) * Math.PI * 2;
    return pt(3 + Math.cos(a) * 10.6, -61.2 + Math.sin(a) * 2.4 + Math.cos(a) * 0.7);
  });
  steel(d, brim, CROWN.steel, { line: 0.75, shadow: 0.7 });
  shine(d, [pt(-5.6, -61.8), pt(-1, -63.2), pt(4, -63.4)], 0.6);
  shine(d, [pt(-1.6, -65.4), pt(0.4, -67.6), pt(2.6, -68.4)], 0.8);
  d.pen.ctx.restore();
}

function nearArm(): Pt[] {
  const hand = along(GRIP);
  return limb(pt(-4.6, -48), pt(-6.4, -39), pt(hand.x - 1.4, hand.y + 0.4), 7, 5.4, 4.2);
}

/** The near arm, holding the spear low at the hip; the shaft carries on up past the hat. */
function spearArm(d: Draw): void {
  const hand = along(GRIP);
  const arm = nearArm();
  part(d, arm, CROWN.blue, { shadow: 0.5 });
  quilt(d, arm, [[pt(-7.4, -45), pt(-5.6, -44.6), pt(-2, -46)], [pt(-8.6, -40.4), pt(-6.6, -39.4), pt(-4.6, -40.8)]], CROWN.blue);
  trim(d, [pt(hand.x - 3.2, hand.y - 2.3), pt(hand.x - 2.8, hand.y + 2.4)], 1.1);
  shaft(d, GRIP - 0.03, BLADE + 0.02);
  fist(d, hand, 2.2, CROWN.leather, -1.1);
  spearHead(d);
}

export const drawSpearman: CreatureDrawer = (ctx, seed, f) =>
  infantryFigure(ctx, seed, f, { shadowRx: 19 }, (d) => {
    legs(d);
    gambeson(d);
    shield(d);
    kettleHat(d);
    spearArm(d);
  });
