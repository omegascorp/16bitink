import { bezier, pt, type Draw } from '../kit';
import type { Pt } from '../pen';
import { blob, dab, folds, gleam, IVORY, limb, mix, ovalAt, paint, roundTube, SHADOW, stitches, stud, UMBER } from './neutralKit';
import { hang, within, xf } from './neutralRig';

/**
 * The Bandit's parts, painted: dark hooded leathers, a weathered, stubbled
 * face half lost in the hood's shadow, an oxblood scarf at the throat,
 * tall worn boots and two long knives. Each part is drawn in the rest
 * pose's coordinates; bandit.ts places them.
 */
export const C = {
  cloak: '#3b3329',
  cloakIn: '#1d1813',
  jerkin: '#4a3220',
  jerkinDeep: '#2e1f14',
  sleeve: '#3f372d',
  trouser: '#36302a',
  boot: '#2e221a',
  bootCuff: '#40301f',
  glove: '#2e221a',
  scarf: '#5a1d18',
  skin: '#9a7052',
  steel: '#7c8186',
  brass: '#8a6420',
  grip: '#2a1c14',
} as const;

/** Where the cloak hangs from and where its hem swings. */
export const CLOAK_TOP = -53;
export const CLOAK_HEM = -10;

/** A leg in dark trousers and a tall boot: thigh, boot shaft with a turned cuff, the foot. */
export function leg(d: Draw, hip: Pt, knee: Pt, ankle: Pt, toe: Pt, shade: number, tilt = 0): void {
  const tone = (c: string): string => mix(c, SHADOW, shade);
  limb(d, hip, knee, 6.2, 4.8, tone(C.trouser), { shadow: 0.75, hatch: 0.2 });
  const cuffAt = pt(knee.x + (ankle.x - knee.x) * 0.12, knee.y + (ankle.y - knee.y) * 0.12);
  limb(d, cuffAt, ankle, 4.7, 3.8, tone(C.boot), { shadow: 0.75, hatch: 0.22, line: 0.6 });
  within(d.pen.ctx, xf(ankle, tilt), () => boot(d, ankle, toe, tone));
  const l = Math.hypot(ankle.x - knee.x, ankle.y - knee.y) || 1;
  const [ux, uy] = [(ankle.x - knee.x) / l, (ankle.y - knee.y) / l];
  const cuff = roundTube([pt(cuffAt.x + uy * 2.8, cuffAt.y - ux * 2.8 + 0.8), pt(cuffAt.x - uy * 2.8, cuffAt.y + ux * 2.8 + 0.8)], () => 2.4);
  paint(d, cuff, tone(C.bootCuff), { shadow: 0.6, line: 0.5, hatch: 0 });
  gleam(d, [pt(ankle.x - 1.5, ankle.y - 7), pt(ankle.x - 1.7, ankle.y - 1.6)], 0.4, 0.4);
}

function boot(d: Draw, ankle: Pt, toe: Pt, tone: (c: string) => string): void {
  const foot = blob([pt(ankle.x - 2.4, ankle.y - 1.6), pt(ankle.x + 1.8, ankle.y - 1.4), pt(toe.x - 3, toe.y - 2.8), pt(toe.x - 0.4, toe.y - 1.8), pt(toe.x + 0.2, toe.y - 0.6), pt(toe.x - 1, toe.y + 0.3), pt(ankle.x - 1, toe.y + 0.3), pt(ankle.x - 2.8, toe.y - 0.2)], 4);
  paint(d, foot, tone(C.boot), { shadow: 0.7, line: 0.6, hatch: 0.15, gloss: true });
  d.pen.stroke([pt(ankle.x - 2.8, toe.y - 0.4), pt(toe.x - 0.6, toe.y - 0.4)], 0.7, UMBER, 0.9, false);
}

/** A long fighting knife: blade from the hand along `dir`, an iron guard and a dark wrapped grip behind the fist. */
export function knife(d: Draw, hand: Pt, dir: Pt, len: number): void {
  const at = (k: number, side = 0): Pt => pt(hand.x + dir.x * k - dir.y * side, hand.y + dir.y * k + dir.x * side);
  const blade = [at(2.2, -1.15), at(len * 0.72, -1.05), at(len, -0.2), at(len * 0.8, 0.9), at(len * 0.4, 1.15), at(2.2, 1.15)];
  paint(d, blade, C.steel, { shadow: 0.6, line: 0.5, hatch: 0, gloss: true });
  d.pen.hair([at(2.8, -0.2), at(len * 0.82, -0.25)], 0.26, mix(C.steel, SHADOW, 0.6), 0.85);
  gleam(d, [at(3, -0.6), at(len * 0.86, -0.5)], 0.38, 0.95, '#f3e2b8');
  paint(d, roundTube([at(1.8, -2.4), at(1.8, 2.4)], () => 1.1), mix(C.steel, SHADOW, 0.3), { shadow: 0.5, line: 0.4, hatch: 0, gloss: true });
  paint(d, roundTube([at(-3.4), at(1.2)], () => 1.4), C.grip, { shadow: 0.5, line: 0.38, hatch: 0 });
  stud(d, at(-3.8), 0.6, C.brass);
}

/** The cloak hanging down the back, its hem swinging out behind. */
export function cloak(d: Draw, swing: Pt): void {
  const sw = (pts: readonly Pt[]): Pt[] => hang(pts, CLOAK_TOP, CLOAK_HEM, swing);
  const top = blob([pt(3, -52.6), pt(-3.6, -54.4), pt(-8.4, -51), pt(-14, -38.4), pt(-19.6, -22)], 4).slice(0, 17);
  const hem: Pt[] = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    hem.push(pt(-23.6 + t * 21, -9.6 + Math.sin(t * Math.PI * 3.2) * 1.4 - t * 1.4));
  }
  const shape = sw([...top, ...hem, pt(-1.6, -26), pt(1.4, -44)]);
  paint(d, shape, C.cloak, { shadow: 0.8, line: 0.6, hatch: 0.24, cross: true });
  const lining = [pt(-23.6, -9.6), pt(-20.6, -12.6), pt(-17.8, -10.2), pt(-18.8, -8.4)];
  paint(d, sw(blob(lining, 3)), C.cloakIn, { shadow: 0.3, line: 0.4, hatch: 0 });
  folds(d, [[pt(-6, -50), pt(-11.4, -32), pt(-15, -11)], [pt(-3, -48), pt(-6.6, -30), pt(-8, -10.2)], [pt(-9, -44), pt(-16.6, -24), pt(-20, -12)]].map(sw), C.cloak, 0.5, 0.85);
  gleam(d, sw([pt(-5.6, -52.4), pt(-10.6, -43), pt(-15.4, -30)]), 0.6, 0.35);
}

/** The jerkin: dark fitted leather, laced at the side, a studded belt, the split skirt, a pouch. */
export function jerkin(d: Draw): void {
  const body = blob([pt(-5.4, -50.6), pt(-6.2, -42), pt(-5, -34.4), pt(-6.2, -27.4), pt(0, -26.6), pt(6.4, -27.6), pt(5.6, -34.2), pt(7.4, -42.2), pt(6.2, -50.2), pt(1, -52.6)], 5);
  paint(d, body, C.jerkin, { shadow: 0.8, line: 0.6, hatch: 0.24, cross: true });
  for (const x of [-2.8, 0.6]) stitches(d, pt(x, -49.6), pt(x - 0.3, -35.6), 6, mix(C.jerkin, '#f6d49a', 0.25), 0.3);
  d.pen.hair([pt(5.2, -50), pt(6.6, -42.4), pt(5, -35)], 0.4, UMBER, 0.85);
  for (let y = -48.6; y < -36; y += 2.4) d.pen.hair([pt(4.4, y), pt(6.4, y + 1.1)], 0.28, mix(C.jerkin, '#f6d49a', 0.35), 0.8);
  d.pen.hair([pt(1.2, -32), pt(0.8, -27)], 0.4, UMBER, 0.75);
  const belt = roundTube([pt(-5.8, -33.6), pt(0, -32.9), pt(6, -33.8)], () => 2);
  paint(d, belt, C.jerkinDeep, { shadow: 0.5, line: 0.5, hatch: 0 });
  paint(d, [pt(2.6, -34.9), pt(4.6, -34.9), pt(4.6, -32.3), pt(2.6, -32.3)], C.brass, { shadow: 0.5, line: 0.4, hatch: 0, gloss: true });
  d.pen.fill([pt(3.1, -34.3), pt(4.1, -34.3), pt(4.1, -32.9), pt(3.1, -32.9)], UMBER, 0.85);
  for (const x of [-4.4, -1.6, 1.2]) stud(d, pt(x, -33.3), 0.36, mix(C.steel, SHADOW, 0.2));
  const pouch = blob([pt(-5.4, -32.6), pt(-1.8, -32.4), pt(-1.6, -28.4), pt(-3.6, -27.2), pt(-5.6, -28.6)], 4);
  paint(d, pouch, C.jerkinDeep, { shadow: 0.6, line: 0.5, hatch: 0.15 });
  dab(d, ovalAt(pt(5, -44), 2, 4.4), C.jerkinDeep, 0.35, 1);
}

/** The scarf's two tails, streaming back from the knot behind the neck. */
export function scarfTails(d: Draw, flutter: Pt): void {
  for (const [tip, w, k] of [[pt(-12.6, -46.4), 2.4, 1], [pt(-10.2, -43), 1.9, 0.7]] as const) {
    const spine = bezier(pt(-1.6, -54.2), pt(-7 + flutter.x * 0.4 * k, -53.6 + flutter.y * 0.4 * k), pt(tip.x + flutter.x * k, tip.y + flutter.y * k), 10);
    paint(d, roundTube(spine, (u) => w * (1 - u * 0.55)), mix(C.scarf, SHADOW, 0.25), { shadow: 0.7, line: 0.5, hatch: 0.18 });
  }
}

/** The head in its hood: a deep cowl, a hard weathered face looking out of its shadow, stubble, a scar, the scarf wound at the throat. */
export function head(d: Draw): void {
  const hood = blob([pt(-2.6, -52.8), pt(-3.8, -57.4), pt(-3, -62.2), pt(-0.4, -65.4), pt(3.4, -67.2), pt(7.4, -66.4), pt(10, -63.6), pt(9.2, -62), pt(6, -58), pt(6.6, -54.4), pt(3.6, -52.4)], 5);
  paint(d, hood, C.cloak, { shadow: 0.8, line: 0.65, hatch: 0.24, cross: true });
  folds(d, [[pt(-2.4, -61), pt(-1, -57.6), pt(-0.8, -53.6)], [pt(2.6, -65.6), pt(1.6, -60.4), pt(2, -55.2)]], C.cloak, 0.45, 0.8);
  // The cowl's dark inside, behind the face.
  paint(d, blob([pt(4.6, -64.6), pt(9.4, -64), pt(9, -58.6), pt(6.4, -55), pt(4.2, -58.6)], 4), C.cloakIn, { shadow: 0.2, line: 0, hatch: 0 });
  const face = blob([pt(5.6, -63), pt(7.8, -63.6), pt(9.6, -61.8), pt(9.4, -60.8), pt(11.2, -58.8), pt(10.2, -58.2), pt(10.5, -57.3), pt(10.2, -55.8), pt(8.4, -55), pt(5.8, -56.4), pt(5, -60)], 4);
  paint(d, face, C.skin, { shadow: 0.7, line: 0.5, hatch: 0.16 });
  d.pen.clipped(face, () => {
    // The hood's shadow over the brow and eye; a hollow cheek; the stubble on lip, jaw and chin.
    dab(d, [pt(4, -65), pt(11, -65), pt(11, -60.4), pt(8, -59.6), pt(4, -59)], mix(C.cloakIn, SHADOW, 0.3), 0.62, 0.6);
    d.pen.fill(blob([pt(6.2, -59.2), pt(8.4, -58.6), pt(8, -57.2), pt(6.4, -57.6)], 3), mix(C.skin, SHADOW, 0.5), 0.45);
    d.pen.stipple(face, 120, (x, y) => (y > -58.6 && x > 6.4 ? 0.7 : 0), 0.13, mix(C.skin, UMBER, 0.7));
  });
  // A hard narrow eye under a heavy, level brow.
  const eye = blob([pt(7.5, -60.6), pt(8.6, -61.2), pt(9.6, -60.7), pt(8.6, -60.2)], 3);
  paint(d, eye, '#8f7f68', { shadow: 0, line: 0.28, hatch: 0, alpha: 1 });
  d.pen.fill(ovalAt(pt(8.9, -60.7), 0.36, 0.38, 0, 8), UMBER, 1);
  d.pen.dot(8.75, -60.85, 0.14, IVORY, 0.8);
  d.pen.stroke([pt(6.8, -61.7), pt(8.6, -61.9), pt(10, -61.5)], 0.6, UMBER, 0.95, false);
  // The nose's lit ridge, the mouth set hard, a scar across the cheek.
  gleam(d, [pt(9.8, -60.6), pt(10.6, -59.4), pt(11, -58.9)], 0.32, 0.6);
  d.pen.hair([pt(10.2, -58.3), pt(10.6, -58.5)], 0.28, UMBER, 0.9);
  d.pen.stroke([pt(8.8, -57.3), pt(10.4, -57.4)], 0.38, mix(C.skin, UMBER, 0.75), 0.95, false);
  d.pen.hair([pt(6.8, -60), pt(7.6, -58.4), pt(8.6, -57.8)], 0.28, '#c99a7a', 0.8);
  // The hood's edge: a heavy fold of cloth overhanging the brow and framing the face.
  const rim = roundTube(bezier(pt(10.4, -63.4), pt(5.4, -65.4), pt(4.8, -55.4), 14), (u) => 1.7 - u * 0.6);
  paint(d, rim, mix(C.cloak, '#8a7a62', 0.2), { shadow: 0.55, line: 0.45, hatch: 0 });
  gleam(d, [pt(-2.8, -61.4), pt(-0.2, -65), pt(3.4, -66.8), pt(7.4, -66)], 0.55, 0.45);
  // The scarf wound at the throat.
  const scarf = blob([pt(4, -56.4), pt(7.6, -55.6), pt(9.6, -55.4), pt(9.4, -53.6), pt(6.4, -52), pt(1.6, -51.6), pt(-1.6, -53), pt(0.6, -55.6)], 4);
  paint(d, scarf, C.scarf, { shadow: 0.75, line: 0.55, hatch: 0.2 });
  folds(d, [[pt(1.4, -54.2), pt(5.4, -53.6), pt(9, -54.4)]], C.scarf, 0.4, 0.85);
}
