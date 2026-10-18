import { createRng, type Rng } from '../../../src/logic/rng';
import { cub, oval, pt, ribbon, tube, type Draw } from '../../../src/art/kit';
import type { Pt } from '../../../src/art/pen';
import type { Frame } from '../sprites';
import { blackPart, vein } from './blackPaint';

/**
 * The black plants of a red dwarf's world, each drawn in units with its
 * foot at the origin, growing up (−y): what life might grow to catch a dim
 * red sun that never moves in the sky (the planet is tidally locked), so
 * the leaves are broad and turned to face it.
 * - frond trees: a slender ringed trunk and a crown of long lobed fronds
 *   arching over;
 * - sun dishes: broad, cupped round leaves on long stalks, fanned towards
 *   the sun like dishes;
 * - fiddleheads: tall stalks ending in tight curls, still unfurling;
 * - tufts: blades of black grass.
 */
export const TREE_ART: Frame = { w: 300, h: 290, ox: 150, oy: 270 };
export const DISH_ART: Frame = { w: 170, h: 140, ox: 85, oy: 130 };
export const FIDDLE_ART: Frame = { w: 110, h: 150, ox: 55, oy: 140 };
export const TUFT_ART: Frame = { w: 90, h: 60, ox: 45, oy: 52 };

/** A long lobed frond along `spine`, painted, with its midrib and side veins. */
function frond(d: Draw, spine: readonly Pt[], width: number, rng: Rng, lit: Pt): void {
  const lobes = 9 + Math.floor(rng() * 5);
  const { shape, top, bot } = ribbon(spine, (u) => width * Math.sin(Math.PI * Math.min(1, u ** 0.75)) ** 0.8 * (0.7 + 0.3 * Math.abs(Math.sin(u * lobes * Math.PI))) + 0.4);
  blackPart(d, shape, { lit, sheen: 0.7, line: 0.8 });
  vein(d, spine, 0.7, 0.6);
  for (let i = 2; i < spine.length - 2; i += 2) {
    const p = spine[i]!;
    for (const side of [top[i]!, bot[i]!]) vein(d, [p, pt(p.x + (side.x - p.x) * 0.85, p.y + (side.y - p.y) * 0.85 + 1.5)], 0.35, 0.4);
  }
}

/** A frond tree, `lean` tipping its crown sideways. */
export function drawFrondTree(d: Draw, seed: number, lean: number): void {
  const rng = createRng(seed);
  const h = 215 + rng() * 30;
  const crown = pt(lean * 34, -h);
  const trunk = cub(pt(0, 0), pt(lean * -8, -h * 0.35), pt(lean * 30, -h * 0.7), crown, 24);
  const bark = tube(trunk, 11, 5);
  blackPart(d, bark, { lit: pt(-lean * 0.5, -0.5), sheen: 0.45, line: 1 });
  // Rings where old fronds fell.
  for (let i = 3; i < trunk.length - 1; i += 2) {
    const p = trunk[i]!;
    const w = 5.5 - (i / trunk.length) * 2.6;
    vein(d, [pt(p.x - w, p.y + 0.6), pt(p.x, p.y + 1.6), pt(p.x + w, p.y + 0.6)], 0.45, 0.45);
  }
  // Fronds, the back ones first: out from the crown, arching over and down.
  const n = 9;
  const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => Math.abs(b - (n - 1) / 2) - Math.abs(a - (n - 1) / 2));
  for (const i of order) {
    const a = -Math.PI + 0.25 + (i / (n - 1)) * (Math.PI - 0.5) + (rng() - 0.5) * 0.18;
    const len = 95 + rng() * 45 - Math.abs(i - (n - 1) / 2) * 3;
    const dir = pt(Math.cos(a), Math.sin(a));
    const droop = 0.9 + rng() * 0.5;
    const spine = Array.from({ length: 15 }, (_, k) => {
      const s = k / 14;
      return pt(crown.x + dir.x * s * len, crown.y + dir.y * s * len * 0.8 + droop * s * s * len * 0.75);
    });
    frond(d, spine, 15 + rng() * 6, rng, pt(-dir.x * 0.2, -1));
  }
  // The crown's heart.
  blackPart(d, oval(crown.x, crown.y + 2, 8, 6, 16), { sheen: 0.8, line: 0.8 });
}

/** A broad cupped leaf, a dish facing `facing` (radians), at `c`. */
function dish(d: Draw, c: Pt, r: number, facing: number, rng: Rng): void {
  const cupped = 0.55 + rng() * 0.2;
  const pts = Array.from({ length: 28 }, (_, i) => {
    const a = (i / 28) * Math.PI * 2;
    const wob = 1 + 0.035 * Math.sin(a * 3 + rng() * 0.3);
    const x = Math.cos(a) * r * wob;
    const y = Math.sin(a) * r * cupped * wob;
    return pt(c.x + x * Math.cos(facing) - y * Math.sin(facing), c.y + x * Math.sin(facing) + y * Math.cos(facing));
  });
  blackPart(d, pts, { lit: pt(0, -1), sheen: 0.85, line: 0.9 });
  // Radial veins from its heart, and the cupped rim's inner line.
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * Math.PI * 2 + 0.2;
    const x = Math.cos(a) * r * 0.86;
    const y = Math.sin(a) * r * cupped * 0.86;
    vein(d, [c, pt(c.x + x * Math.cos(facing) - y * Math.sin(facing), c.y + x * Math.sin(facing) + y * Math.cos(facing))], 0.45, 0.5);
  }
}

/** A sun dish plant: a fan of cupped leaves on long stalks. */
export function drawSunDish(d: Draw, seed: number): void {
  const rng = createRng(seed);
  const n = 5;
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i - (n - 1) / 2) * 0.32 + (rng() - 0.5) * 0.1;
    const len = 70 + rng() * 40 - Math.abs(i - 2) * 8;
    const tip = pt(Math.cos(a) * len, Math.sin(a) * len);
    const stalk = cub(pt((i - 2) * 2, 0), pt((i - 2) * 4, -len * 0.4), pt(tip.x * 0.8, tip.y * 0.8), tip, 14);
    blackPart(d, tube(stalk, 3.4, 1.8), { lit: pt(0, -1), sheen: 0.4, line: 0.6 });
    dish(d, pt(tip.x, tip.y - 6), 17 + rng() * 7, a + Math.PI / 2 + (rng() - 0.5) * 0.3, rng);
  }
}

/** A cluster of fiddleheads: stalks rising into tight curls. */
export function drawFiddleheads(d: Draw, seed: number): void {
  const rng = createRng(seed);
  for (let k = 0; k < 3; k++) {
    const h = 85 + rng() * 40;
    const x0 = (k - 1) * 16;
    const dirn = k === 1 ? 1 : k === 0 ? -1 : 1;
    const top = pt(x0 + dirn * 8, -h);
    const stalk = cub(pt(x0, 0), pt(x0 - dirn * 6, -h * 0.4), pt(x0 + dirn * 10, -h * 0.8), top, 18);
    // The curl: a spiral winding in from the stalk's top.
    const r0 = 14 + rng() * 5;
    const curl = Array.from({ length: 30 }, (_, i) => {
      const s = i / 29;
      const a = Math.PI + dirn * s * Math.PI * 2.4;
      const r = r0 * (1 - s * 0.82);
      return pt(top.x + dirn * r0 + Math.cos(a) * r * dirn, top.y + Math.sin(a) * r);
    });
    const spine = [...stalk, ...curl.slice(1)];
    const shape = ribbon(spine, (u) => (u < 0.6 ? 6.5 - u * 3 : 4.7 * (1 - (u - 0.6) / 0.4) + 1.2)).shape;
    blackPart(d, shape, { lit: pt(0, -1), sheen: 0.6, line: 0.8 });
    // Small leaflets folded along the stalk.
    for (let i = 4; i < stalk.length - 2; i += 3) {
      const p = stalk[i]!;
      const side = i % 2 === 0 ? 1 : -1;
      blackPart(d, oval(p.x + side * 6, p.y - 2, 5, 2.4, 12), { sheen: 0.6, line: 0.5 });
    }
  }
}

/** A tuft of black grass. */
export function drawTuft(d: Draw, seed: number): void {
  const rng = createRng(seed);
  const n = 10 + Math.floor(rng() * 5);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1) - 0.5) * 36 + (rng() - 0.5) * 4;
    const h = 22 + rng() * 26;
    const bend = (x / 18) * 14 + (rng() - 0.5) * 10;
    const blade = cub(pt(x, 2), pt(x, -h * 0.4), pt(x + bend * 0.5, -h * 0.8), pt(x + bend, -h), 10);
    blackPart(d, tube(blade, 3.2, 0.3), { lit: pt(0, -1), sheen: 0.55, line: 0.45 });
  }
}

/** The close-up's black leaf, along +x from its stalk at the origin: long, ruffled, veined. */
export const BIG_LEAF_ART: Frame = { w: 150, h: 70, ox: 10, oy: 35 };
export const BIG_LEAF_LENGTH = 136;
export function bigLeafShape(): Pt[] {
  const spine = Array.from({ length: 40 }, (_, i) => pt(6 + (i / 39) * BIG_LEAF_LENGTH * 0.95, Math.sin((i / 39) * Math.PI) * -4));
  return ribbon(spine, (u) => 46 * Math.sin(Math.PI * Math.min(1, u ** 0.85)) ** 0.9 * (0.93 + 0.07 * Math.sin(u * 30)) + 0.6).shape;
}
export function drawBigLeaf(d: Draw): void {
  const spine = Array.from({ length: 40 }, (_, i) => pt(6 + (i / 39) * BIG_LEAF_LENGTH * 0.95, Math.sin((i / 39) * Math.PI) * -4));
  blackPart(d, tube([pt(-10, 6), pt(-2, 2), pt(8, 0)], 3.2, 2.4), { sheen: 0.5, line: 0.6 });
  blackPart(d, bigLeafShape(), { lit: pt(-0.2, -1), sheen: 0.5, line: 0.9 });
  vein(d, spine, 1, 0.5);
  for (let i = 3; i < 37; i += 3) {
    const p = spine[i]!;
    const u = i / 39;
    const w = 22 * Math.sin(Math.PI * Math.min(1, u ** 0.85)) ** 0.9;
    for (const s of [-1, 1]) vein(d, [p, pt(p.x + w * 0.45, p.y + s * w * 0.5), pt(p.x + w * 0.8, p.y + s * w * 0.88)], 0.45, 0.5);
  }
}
