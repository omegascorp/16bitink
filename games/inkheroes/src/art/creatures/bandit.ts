import { bezier, pt, type Draw } from '../kit';
import type { Pt } from '../pen';
import { sprite } from './neutralFinish';
import { blob, dab, folds, gleam, limb, mix, ovalAt, paint, roundTube, SHADOW, stitches, stud } from './neutralKit';
import type { CreatureDrawer } from './types';

/**
 * The Bandit: a highwayman about 62 tall in a low fighting crouch, hood
 * up and a dark red scarf masking the face below the eyes, a laced leather
 * jerkin, a dun cloak falling behind, tall boots. One long knife held out
 * in the front hand, a second in a reverse grip low at the back hip.
 * Muted browns, so the red scarf and the steel are what catch the eye.
 */
const LIGHT_CLOTH = '#c9b99a';
const C = {
  cloak: '#786a55',
  cloakIn: '#3f372e',
  jerkin: '#8f6840',
  jerkinDeep: '#6b4626',
  sleeve: '#857660',
  trouser: '#5c4f40',
  boot: '#4a382b',
  bootCuff: '#6e5440',
  glove: '#4d3a2c',
  scarf: '#7e2b26',
  skin: '#d6a47c',
  steel: '#b4babf',
  brass: '#b68b45',
  grip: '#3d2c22',
  lace: '#d7c39a',
} as const;

/** A leg in trousers and a tall boot: thigh, boot shaft with a turned cuff, the foot. */
function leg(d: Draw, hip: Pt, knee: Pt, ankle: Pt, toe: Pt, shade: number): void {
  const tone = (c: string): string => mix(c, SHADOW, shade);
  limb(d, hip, knee, 6.4, 5.2, tone(C.trouser), { hatch: 0.18 });
  const cuffAt = pt(knee.x + (ankle.x - knee.x) * 0.14, knee.y + (ankle.y - knee.y) * 0.14);
  limb(d, cuffAt, ankle, 5, 4.2, tone(C.boot), { hatch: 0.2, line: 0.65 });
  const foot = blob([pt(ankle.x - 2.6, ankle.y - 1.6), pt(ankle.x + 2, ankle.y - 1.4), pt(toe.x - 3, toe.y - 3), pt(toe.x - 0.4, toe.y - 2), pt(toe.x + 0.2, toe.y - 0.6), pt(toe.x - 1, toe.y + 0.3), pt(ankle.x - 1, toe.y + 0.3), pt(ankle.x - 3, toe.y - 0.2)], 4);
  paint(d, foot, tone(C.boot), { shadow: 0.5, line: 0.65, hatch: 0.15, gloss: true });
  // The sole and the heel block.
  d.pen.stroke([pt(ankle.x - 3, toe.y - 0.4), pt(toe.x - 0.6, toe.y - 0.4)], 0.9, mix(C.boot, SHADOW, 0.6), 0.9, false);
  paint(d, [pt(ankle.x - 3, toe.y - 1.6), pt(ankle.x - 0.4, toe.y - 1.6), pt(ankle.x - 0.6, toe.y + 0.3), pt(ankle.x - 2.8, toe.y + 0.3)], mix(C.boot, SHADOW, 0.35), { shadow: 0.2, line: 0.4, hatch: 0 });
  // The cuff: a turned-down band of softer leather across the top of the boot.
  const ux = (ankle.x - knee.x) / (Math.hypot(ankle.x - knee.x, ankle.y - knee.y) || 1);
  const uy = (ankle.y - knee.y) / (Math.hypot(ankle.x - knee.x, ankle.y - knee.y) || 1);
  const cuff = roundTube([pt(cuffAt.x + uy * 2.9, cuffAt.y - ux * 2.9 + 0.8), pt(cuffAt.x - uy * 2.9, cuffAt.y + ux * 2.9 + 0.8)], () => 2.6);
  paint(d, cuff, tone(C.bootCuff), { shadow: 0.45, line: 0.55, hatch: 0 });
  gleam(d, [pt(ankle.x - 1.6, ankle.y - 6), pt(ankle.x - 1.8, ankle.y - 1.6)], 0.5, 0.45);
}

/** A long knife: blade from the hand along `dir`, a brass guard and a dark grip behind the fist. */
function knife(d: Draw, hand: Pt, dir: Pt, len: number): void {
  const at = (k: number, side = 0): Pt => pt(hand.x + dir.x * k - dir.y * side, hand.y + dir.y * k + dir.x * side);
  const blade = [at(2.2, -1.2), at(len * 0.7, -1.1), at(len, 0.1), at(len * 0.7, 1.15), at(2.2, 1.2)];
  paint(d, blade, C.steel, { shadow: 0.45, line: 0.55, hatch: 0, gloss: true });
  d.pen.hair([at(2.8, -0.2), at(len * 0.8, -0.1)], 0.3, mix(C.steel, SHADOW, 0.5), 0.75);
  gleam(d, [at(3, -0.6), at(len * 0.85, -0.3)], 0.45, 0.95);
  paint(d, roundTube([at(1.8, -2.6), at(1.8, 2.6)], () => 1.2), C.brass, { shadow: 0.4, line: 0.45, hatch: 0, gloss: true });
  paint(d, roundTube([at(-3.4), at(1.2)], () => 1.5), C.grip, { shadow: 0.4, line: 0.4, hatch: 0 });
  stud(d, at(-3.8), 0.7, C.brass);
}

/** The cloak hanging down the back, its hem swinging out behind, folds running down it. */
function cloak(d: Draw): void {
  const top = blob([pt(3, -48.6), pt(-3.6, -50.8), pt(-9.4, -47.4), pt(-15.4, -36.4), pt(-20.6, -22)], 4).slice(0, 17);
  const hem: Pt[] = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    hem.push(pt(-24.6 + t * 21.6, -9.6 + Math.sin(t * Math.PI * 3.2) * 1.6 - t * 1.4));
  }
  const shape = [...top, ...hem, pt(-1.6, -24), pt(1.4, -40)];
  paint(d, shape, C.cloak, { shadow: 0.6, line: 0.75, hatch: 0.22, cross: true });
  // The lining shows where the hem turns.
  const lining = [pt(-24.6, -9.6), pt(-21.4, -12.4), pt(-18.6, -10.2), pt(-19.6, -8.4)];
  paint(d, blob(lining, 3), C.cloakIn, { shadow: 0.3, line: 0.45, hatch: 0 });
  folds(d, [[pt(-6.4, -46), pt(-12, -30), pt(-15.8, -11)], [pt(-3.4, -44), pt(-7, -28), pt(-8.6, -10.2)], [pt(-9.6, -40), pt(-17.6, -22), pt(-21, -12)]], C.cloak, 0.55, 0.8);
  gleam(d, [pt(-6, -48.6), pt(-11.6, -40), pt(-16.4, -28)], 0.7, 0.4);
}

/** The scarf's two tails, streaming back from the knot behind the neck. */
function scarfTails(d: Draw): void {
  for (const [tip, w] of [[pt(-14.4, -42.4), 3], [pt(-11.6, -38.6), 2.4]] as const) {
    const spine = bezier(pt(-2, -50.4), pt(-8, -49.6), tip, 10);
    paint(d, roundTube(spine, (u) => w * (1 - u * 0.55)), mix(C.scarf, SHADOW, 0.15), { shadow: 0.5, line: 0.55, hatch: 0.15 });
  }
}

/** The jerkin: laced up the front, quilted, belted, with a pouch and a leather pauldron. */
function jerkin(d: Draw): void {
  const body = blob([pt(-5.6, -46.8), pt(-6.6, -38), pt(-5.2, -30.4), pt(-6.6, -23.2), pt(0, -22.6), pt(6.8, -23.4), pt(5.8, -30.2), pt(7.8, -38.2), pt(6, -46.2), pt(1, -48.6)], 5);
  paint(d, body, C.jerkin, { shadow: 0.6, line: 0.75, hatch: 0.22, cross: true });
  // Quilting seams and the lacing up the front.
  for (const x of [-3, 0.4]) stitches(d, pt(x, -45.4), pt(x - 0.3, -31.4), 6, mix(C.jerkin, SHADOW, 0.6), 0.35);
  d.pen.hair([pt(5.4, -46), pt(6.8, -38.4), pt(5.2, -31)], 0.45, d.ink, 0.8);
  for (let y = -44.6; y < -32; y += 2.4) d.pen.hair([pt(4.6, y), pt(6.8, y + 1.1)], 0.35, C.lace, 0.95);
  // The skirt below the belt is split at the hip.
  d.pen.hair([pt(1.2, -28), pt(0.8, -23)], 0.45, d.ink, 0.7);
  const belt = roundTube([pt(-6, -29.6), pt(0, -28.9), pt(6.4, -29.8)], () => 2.2);
  paint(d, belt, C.jerkinDeep, { shadow: 0.4, line: 0.55, hatch: 0 });
  const buckle = [pt(2.6, -31), pt(4.8, -31), pt(4.8, -28.2), pt(2.6, -28.2)];
  paint(d, buckle, C.brass, { shadow: 0.35, line: 0.45, hatch: 0, gloss: true });
  const pouch = blob([pt(-5.6, -28.6), pt(-1.8, -28.4), pt(-1.6, -24.2), pt(-3.6, -23), pt(-5.8, -24.4)], 4);
  paint(d, pouch, C.jerkinDeep, { shadow: 0.5, line: 0.55, hatch: 0.14 });
  stud(d, pt(-3.6, -26.8), 0.45, C.brass);
  dab(d, ovalAt(pt(5, -40), 2, 4), C.jerkinDeep, 0.25, 1);
}

/** The head in its hood: a peaked cowl, the face looking out of it with a hard eye, the red scarf over nose and mouth. */
function head(d: Draw): void {
  const hood = blob([pt(-5.8, -47.8), pt(-6.4, -53.6), pt(-8.6, -59.6), pt(-3.6, -60.6), pt(1.6, -62.8), pt(6.6, -61.2), pt(9.2, -57.6), pt(8.4, -51.6), pt(5, -47.4), pt(-0.6, -46.4)], 5);
  paint(d, hood, C.cloak, { shadow: 0.6, line: 0.8, hatch: 0.22, cross: true });
  folds(d, [[pt(-6.4, -58.4), pt(-3.6, -55), pt(-3, -49)], [pt(0.4, -61.4), pt(-0.6, -56), pt(0.4, -50.6)]], C.cloak, 0.5, 0.75);
  gleam(d, [pt(-7, -58.8), pt(-2.6, -60.4), pt(2, -62.2), pt(5.6, -61.2)], 0.8, 0.55);
  // The cowl's dark inside, round the back of the head.
  paint(d, blob([pt(4.4, -60.6), pt(8.4, -60.2), pt(9, -55), pt(6, -48.8), pt(3.8, -53)], 4), C.cloakIn, { shadow: 0.3, line: 0, hatch: 0, alpha: 1 });
  // The face, turned out of the cowl.
  const face = blob([pt(4.6, -59.2), pt(8.8, -59.4), pt(10.6, -57.2), pt(11.2, -55.2), pt(12.4, -53.6), pt(11, -52.4), pt(10.6, -50), pt(6, -49.2), pt(4.2, -54)], 4);
  paint(d, face, C.skin, { shadow: 0.45, line: 0.6, hatch: 0 });
  d.pen.clipped(face, () => dab(d, [pt(3, -61), pt(12, -61), pt(12, -57.4), pt(3, -56.4)], mix(C.cloakIn, SHADOW, 0.3), 0.55, 0.7));
  // A hard eye under a low brow.
  const eye = blob([pt(7.4, -55.6), pt(8.8, -56.4), pt(10, -55.8), pt(8.8, -55)], 3);
  paint(d, eye, '#f1e6cf', { shadow: 0, line: 0.35, hatch: 0, alpha: 1 });
  d.pen.dot(9, -55.7, 0.6, d.ink, 1);
  d.pen.dot(8.8, -56, 0.24, '#ffffff', 1);
  d.pen.stroke([pt(6.6, -57.4), pt(8.8, -57.6), pt(10.8, -56.6)], 0.85, d.ink, 1, false);
  // The scarf: up over the nose, wound round the neck and chin.
  const scarf = blob([pt(3.4, -53.6), pt(8.4, -54.2), pt(11.4, -54), pt(12.8, -53), pt(12, -50.6), pt(9.8, -47.8), pt(4.6, -46), pt(0, -46.2), pt(-1.4, -49), pt(1, -52)], 4);
  paint(d, scarf, C.scarf, { shadow: 0.55, line: 0.7, hatch: 0.2 });
  folds(d, [[pt(2, -50.4), pt(6.8, -50), pt(11, -51.2)], [pt(1.2, -48), pt(5.6, -47.4), pt(9, -48.4)]], C.scarf, 0.45, 0.85);
  gleam(d, [pt(5, -53.4), pt(9, -53.8), pt(11.8, -53)], 0.55, 0.55);
  // The hood's edge: a lit fold of cloth framing the face.
  const rim = roundTube(bezier(pt(6.8, -60.6), pt(3.4, -57.6), pt(3.8, -49.4), 12), (u) => 1.7 - u * 0.5);
  paint(d, rim, mix(C.cloak, LIGHT_CLOTH, 0.25), { shadow: 0.35, line: 0.5, hatch: 0 });
}

export const drawBandit: CreatureDrawer = (ctx, seed, f) => {
  sprite(ctx, seed, f, { shadow: 19, shadowX: 1, line: 0.6 }, (d) => {
    cloak(d);
    scarfTails(d);
    // The back leg stretched out behind, the front leg bent forward.
    leg(d, pt(-2.6, -28), pt(-6.4, -15.4), pt(-11.4, -4.4), pt(-5.2, -0.3), 0.2);
    leg(d, pt(2.6, -28), pt(10.2, -17.4), pt(10.6, -4.4), pt(17.2, -0.3), 0);
    // The front arm, reaching out with the knife (behind the body at the shoulder).
    const farSleeve = mix(C.sleeve, SHADOW, 0.15);
    limb(d, pt(3.6, -44.6), pt(9.4, -36.6), 4.6, 4, farSleeve, { hatch: 0.16 });
    limb(d, pt(9.4, -36.6), pt(16.4, -39.4), 4, 3.4, C.jerkinDeep, { hatch: 0.12 });
    stitches(d, pt(11, -38.6), pt(14.8, -40.2), 3, C.lace, 0.3);
    knife(d, pt(17.6, -39.8), pt(0.92, -0.39), 13);
    paint(d, ovalAt(pt(17.4, -39.6), 2.3, 2.1), C.glove, { shadow: 0.4, line: 0.55, hatch: 0 });
    jerkin(d);
    // The back arm, low at the hip, a knife held point-down behind it.
    knife(d, pt(-7.4, -28.4), pt(-0.6, 0.8), 11);
    limb(d, pt(-2.6, -45), pt(-7.6, -36.4), 4.6, 4, C.sleeve, { hatch: 0.16 });
    limb(d, pt(-7.6, -36.4), pt(-7.4, -29.6), 4, 3.4, C.jerkinDeep, { hatch: 0.12 });
    paint(d, ovalAt(pt(-7.4, -28.4), 2.3, 2.2), C.glove, { shadow: 0.4, line: 0.55, hatch: 0 });
    const pauldron = blob([pt(-6.6, -47), pt(-1.4, -48), pt(0.4, -44.4), pt(-2.6, -41.6), pt(-6.8, -42.6)], 4);
    paint(d, pauldron, C.jerkinDeep, { shadow: 0.5, line: 0.6, hatch: 0.16, gloss: true });
    stud(d, pt(-3.4, -45.4), 0.5, C.brass);
    stud(d, pt(-4.6, -43.4), 0.45, C.brass);
    head(d);
  });
};
