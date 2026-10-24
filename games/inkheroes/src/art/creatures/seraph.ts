import { pt, type Draw } from '../kit';
import type { Pt } from '../pen';
import { dab, finished, gleam, glow, groundShadow, limb, lineOf, mix, paint, shapeOf, SHADOW } from './crownElitePaint';
import { CROWN_BLUE, GOLD } from './crownMountRider';
import { wing, type WingSpec } from './wings';
import type { CreatureDrawer } from './types';

/**
 * The Seraph, the Crown's highest: a tall winged warrior in a white robe
 * and a gilded cuirass with a blue sash, golden hair under a circlet, a
 * ring of light behind the head, and a flaming sword raised before it.
 * Two great white wings lift from the shoulders, the far one peeking over
 * the near. About 100 units to the wingtips, the body about 84.
 */
const C = {
  robe: '#f1ede2',
  robeShade: '#b9bfd6',
  gold: '#d6a843',
  skin: '#ecc39c',
  hair: '#dcac48',
  feather: '#f4f0e6',
  featherTip: '#cdb47c',
  covert: '#fbf7ec',
  blade: '#e8eef6',
  flame: '#f29a2e',
  flameCore: '#ffe9a6',
} as const;

const NEAR_WING: WingSpec = {
  shoulder: pt(-6, -64), elbow: pt(-19, -74), wrist: pt(-15, -87), hand: pt(-27, -90.6),
  primaries: { n: 9, a0: -3.16, a1: -2.5, l0: 20, l1: 15 },
  secondaries: { n: 9, a: 2.42, l0: 21, l1: 24 },
  feather: C.feather, tip: C.featherTip, covert: C.covert,
};

const FAR_WING: WingSpec = {
  shoulder: pt(-1, -66), elbow: pt(-6, -79), wrist: pt(0, -89), hand: pt(-5.4, -93),
  primaries: { n: 6, a0: -2.5, a1: -1.8, l0: 13, l1: 10 },
  secondaries: { n: 6, a: 2.2, l0: 15, l1: 16 },
  feather: C.feather, tip: C.featherTip, covert: C.covert, far: true,
};

const HEAD = pt(3, -77);
const SHOULDER = pt(2.4, -67);
const HAND = pt(15.4, -70);
const SWORD_DIR = (() => {
  const a = -0.86;
  return pt(Math.cos(a), Math.sin(a));
})();
const at = (s: number, off = 0): Pt => pt(HAND.x + SWORD_DIR.x * s - SWORD_DIR.y * off, HAND.y + SWORD_DIR.y * s + SWORD_DIR.x * off);

/** The robe: falling from the waist to a hem swept back by the wind, folds catching the light. */
function robe(d: Draw): void {
  const shape = shapeOf([[-7, -52], [6.4, -52], [9, -36], [13, -16], [15.4, -2.4], [8, -0.6], [-2, -1], [-12, -2], [-21, -5], [-15, -18], [-10, -36]], 6);
  paint(d, shape, C.robe, { shadow: 0.55, hatch: 0.16, line: 0.6, lit: pt(0.45, 0.2) });
  d.pen.clipped(shape, () => {
    for (const [x0, x1, dark] of [[-4, -12, false], [-1, -5, true], [2, 2, false], [4, 7, true], [6, 11, false]] as const) {
      const line = lineOf([[x0, -50], [(x0 + x1) / 2 - 0.4, -26], [x1, -2]]);
      if (dark) dab(d, [...line.map((p) => pt(p.x - 1, p.y)), ...[...line].reverse().map((p) => pt(p.x + 1.2, p.y))], C.robeShade, 0.4, 1.2);
      else gleam(d, line, 1.2, 0.5);
      d.pen.hair(line.map((p) => pt(p.x + 1.4, p.y)), 0.35, mix(C.robeShade, SHADOW, 0.4), 0.5);
    }
  });
  const hem = lineOf([[-20.4, -5.6], [-12, -3], [-2, -2.2], [8, -1.8], [15, -3.6]]);
  d.pen.clipped(shape, () => d.pen.stroke(hem, 2, C.gold, 0.95, false));
  // A sandalled foot stepping out under the hem.
  const foot = shapeOf([[8.4, -3.4], [13, -3.2], [17.6, -1.2], [17.4, 0], [8.6, 0]], 3);
  paint(d, foot, C.skin, { shadow: 0.4, hatch: 0, line: 0.55 });
  d.pen.hair([pt(12, -3), pt(12.6, 0)], 0.5, C.gold, 1);
}

/** The gilded cuirass with a blue sash and a skirt of gold strips. */
function cuirass(d: Draw): void {
  const { pen } = d;
  for (let i = 0; i < 5; i++) {
    const x = -7.4 + i * 3.1;
    const strip = [pt(x, -53), pt(x + 2.8, -53), pt(x + 3.1 + i * 0.3, -44.4), pt(x + 1.6 + i * 0.3, -43.6), pt(x + 0.2 + i * 0.3, -44.2)];
    paint(d, strip, C.gold, { shadow: 0.4, hatch: 0, line: 0.5, gloss: true });
    pen.dot(x + 1.5 + i * 0.25, -46, 0.45, '#5f8fe0');
  }
  const plate = shapeOf([[-7.4, -51.6], [-8.6, -58.6], [-7.4, -65.6], [-3.6, -69.4], [2.4, -69.6], [6.4, -66], [7.8, -60], [6.2, -53.2], [3, -51]], 5);
  paint(d, plate, C.gold, { shadow: 0.55, hatch: 0.2, line: 0.65, gloss: true, lit: pt(0.5, 0.25) });
  pen.hair(lineOf([[5, -68], [7, -61.4], [5.6, -54]]), 0.4, d.ink, 0.5);
  gleam(d, lineOf([[3.8, -67.4], [5.6, -61.6], [4.6, -55.6]]), 0.9, 0.9);
  // Muscled breastplate: a line under the pectoral.
  pen.hair(lineOf([[-2, -61.4], [2.6, -60], [6.6, -61.6]]), 0.4, mix(C.gold, SHADOW, 0.6), 0.7);
  const sash = shapeOf([[-7.8, -66.6], [-4.8, -68.8], [7.6, -53.4], [4.4, -51.6]], 3);
  paint(d, sash, CROWN_BLUE, { shadow: 0.45, hatch: 0, line: 0.55 });
  pen.hair(lineOf([[-6.2, -67.4], [5.8, -52.6]]), 0.3, '#c9d6f5', 0.6);
}

/** Head in profile: serene face, golden hair streaming back, circlet, and a ring of light behind. */
function headAndHalo(d: Draw): void {
  const { pen } = d;
  const h = HEAD;
  const k = 1.25;
  const P = (x: number, y: number): [number, number] => [h.x + x * k, h.y + y * k];
  glow(pen.ctx, pt(h.x - 3, h.y - 2), 15, '#fff1c0', 0.32);
  const ring = shapeOf([P(-3.4, -10.4), P(-0.6, -9.8), P(-0.4, -1), P(-3.4, 8), P(-6.4, 7.6), P(-6.6, -1)], 6);
  pen.stroke([...ring, ring[0]!], 2.2, d.ink, 0.5);
  pen.stroke([...ring, ring[0]!], 1.4, '#f3cf6a', 1);
  // Hair: a long golden fall streaming back past the shoulders.
  const hair = shapeOf([P(0.6, -5.8), P(-4, -5.6), P(-7.4, -2), P(-10.6, 3), P(-14.6, 7.6), P(-10.6, 7), P(-9, 9.4), P(-5.4, 7.6), P(-2.6, 5.6), P(-0.6, 1)], 5);
  paint(d, hair, C.hair, { shadow: 0.5, hatch: 0.16, line: 0.55, lit: pt(0.5, 0.2) });
  for (const n of [0, 1, 2, 3]) pen.hair(lineOf([P(-1.4, -4.6 + n), P(-6 - n, 0 + n * 1.2), P(-11 - n * 0.6, 6 + n * 0.4)]), 0.32, n % 2 ? mix(C.hair, SHADOW, 0.45) : mix(C.hair, '#ffffff', 0.5), 0.8);
  const face = shapeOf([P(-1.2, -4.8), P(2, -5.4), P(3.8, -3.6), P(4.2, -1.6), P(5.6, 0.4), P(4.4, 0.9), P(4.6, 1.9), P(4.1, 2.5), P(4.2, 3.2), P(3, 4.6), P(0.2, 4.8), P(-1.6, 2.4)], 4);
  paint(d, face, C.skin, { shadow: 0.4, hatch: 0, line: 0.55, lit: pt(0.6, 0.3) });
  dab(d, shapeOf([P(-1.4, 0), P(1.4, 1), P(1, 4), P(-1.2, 3)]), SHADOW, 0.14, 1);
  // Brow, a calm lowered eye, lips.
  pen.hair(lineOf([P(1.4, -2.5), P(2.6, -2.8), P(3.6, -2.3)]), 0.4, mix(C.hair, SHADOW, 0.5), 0.9);
  pen.hair(lineOf([P(1.8, -1.2), P(2.7, -0.9), P(3.4, -1.2)]), 0.5, d.ink, 0.95);
  pen.hair(lineOf([P(3.9, 1.95), P(4.5, 2.1)]), 0.35, '#a5603e', 0.9);
  // Hair over the brow and the gold circlet with a blue stone.
  const fringe = shapeOf([P(-2, -4.2), P(0.4, -6.4), P(3, -5.6), P(3.8, -3.6), P(1.6, -4.2), P(-0.6, -2.6)], 4);
  paint(d, fringe, C.hair, { shadow: 0.3, hatch: 0, line: 0.5 });
  pen.stroke(lineOf([P(-3.2, -3.6), P(0, -5.2), P(3.4, -4.4)]), 1.1, GOLD, 1, false);
  pen.dot(h.x + 2 * k, h.y - 4.9 * k, 0.8, '#5f8fe0');
}

/** The flaming sword: a long bright blade wreathed in fire, gold hilt. */
function sword(d: Draw): void {
  const { pen } = d;
  const len = 36;
  glow(pen.ctx, at(len * 0.55), 18, '#ffb84a', 0.3);
  // Fire wreathing the blade: irregular tongues rising up the screen off both edges, a soft envelope
  // round them and hot cores inside.
  const tongues = [[5, 6, 1], [8.6, 9.6, -1], [12.4, 7.2, 1], [15.6, 11.4, -1], [19.4, 8, 1], [22.4, 12.6, -1], [26, 9, 1], [29.4, 11, -1], [32.6, 7.4, 1]] as const;
  const shapes = tongues.map(([s, h, side], i) => {
    const base = at(s, side * 1.1);
    const lean = [-2.2, -0.6, -3, -1.2, -2.6, -0.4, -2, -1.4, -2.8][i]!;
    const curl = [1, -1, 1.4, -0.8, 1.2, -1.2, 0.8, -1, 1][i]!;
    return { base, shape: shapeOf([[base.x - 2.6, base.y + 1.4], [base.x - 2.4 + lean * 0.2, base.y - h * 0.4], [base.x + lean * 0.7 - curl, base.y - h * 0.75], [base.x + lean, base.y - h], [base.x + lean * 0.4 + curl * 0.6, base.y - h * 0.55], [base.x + 2.4, base.y - h * 0.2], [base.x + 2.4, base.y + 0.8], [base.x, base.y + 2.4]], 4) };
  });
  for (const { base, shape } of shapes) pen.fill(shape.map((p) => pt(base.x + (p.x - base.x) * 1.4, base.y + (p.y - base.y) * 1.25)), '#f7b955', 0.35);
  for (const { base, shape } of shapes) {
    pen.fill(shape, C.flame, 0.85);
    pen.fill(shape.map((p) => pt(base.x + (p.x - base.x) * 0.62, base.y + 0.6 + (p.y - base.y) * 0.62)), '#ffc24a', 0.95);
    pen.fill(shape.map((p) => pt(base.x + (p.x - base.x) * 0.3, base.y + 0.9 + (p.y - base.y) * 0.32)), C.flameCore, 1);
    pen.hair(shape.slice(2, 9), 0.3, '#a8461a', 0.5);
  }
  const blade = [at(3, -1.6), at(len - 4, -1.1), at(len, 0), at(len - 4, 1.1), at(3, 1.6)];
  paint(d, blade, C.blade, { shadow: 0.35, hatch: 0, line: 0.55, gloss: true });
  pen.hair([at(4, 0), at(len - 3, 0)], 0.35, '#9aa6bd', 0.7);
  gleam(d, [at(5, -0.7), at(len - 6, -0.5)], 0.6, 0.95);
  const guard = shapeOf([[at(2.4, -5).x, at(2.4, -5).y], [at(3.6, -5).x, at(3.6, -5).y], [at(3.6, 5).x, at(3.6, 5).y], [at(2.4, 5).x, at(2.4, 5).y]], 2);
  paint(d, guard, C.gold, { shadow: 0.3, hatch: 0, line: 0.5, gloss: true });
  pen.stroke([at(-4, 0), at(2.4, 0)], 2.2, d.ink, 1, false);
  pen.stroke([at(-4, 0), at(2.4, 0)], 1.4, '#6a4a2e', 1, false);
  pen.dot(at(-4.8).x, at(-4.8).y, 1.3, C.gold);
}

/** The sword arm: bare forearm, gold vambrace, the fist round the grip. */
function arm(d: Draw): void {
  const elbow = pt(9.4, -60.6);
  const upper = limb([[SHOULDER.x, SHOULDER.y, 5], [elbow.x, elbow.y, 4]]);
  paint(d, upper.shape, C.robe, { shadow: 0.5, hatch: 0.14, line: 0.6 });
  const fore = limb([[elbow.x, elbow.y, 4], [HAND.x, HAND.y, 3.2]]);
  paint(d, fore.shape, C.skin, { shadow: 0.45, hatch: 0, line: 0.6 });
  const brace = limb([[elbow.x + (HAND.x - elbow.x) * 0.35, elbow.y + (HAND.y - elbow.y) * 0.35, 4.4], [HAND.x - 1.2, HAND.y + 1, 3.8]]);
  paint(d, brace.shape, C.gold, { shadow: 0.4, hatch: 0, line: 0.5, gloss: true });
  const pad = shapeOf([[SHOULDER.x - 4.6, SHOULDER.y + 1.6], [SHOULDER.x - 2, SHOULDER.y - 3], [SHOULDER.x + 3, SHOULDER.y - 2.4], [SHOULDER.x + 4.6, SHOULDER.y + 1.8], [SHOULDER.x, SHOULDER.y + 3.6]], 4);
  paint(d, pad, C.gold, { shadow: 0.45, hatch: 0, line: 0.55, gloss: true });
}

function fist(d: Draw): void {
  const shape = shapeOf([[HAND.x - 2.2, HAND.y - 1.2], [HAND.x + 0.6, HAND.y - 2.6], [HAND.x + 2.6, HAND.y - 0.6], [HAND.x + 2, HAND.y + 2], [HAND.x - 1, HAND.y + 2.4]], 4);
  paint(d, shape, C.skin, { shadow: 0.45, hatch: 0, line: 0.6 });
}

export const drawSeraph: CreatureDrawer = (ctx, seed, f) => {
  finished(ctx, seed, f, (d) => {
    wing(d, FAR_WING);
    wing(d, NEAR_WING);
    robe(d);
    cuirass(d);
    headAndHalo(d);
    arm(d);
    sword(d);
    fist(d);
  }, (d) => groundShadow(d, -2, 22), { line: 0.7 });
};
