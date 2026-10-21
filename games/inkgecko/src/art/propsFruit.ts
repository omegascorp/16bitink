import { createRng } from '../logic/rng';
import { bezier, capsule, closed, type Draw, oval, pt, TAU, tube } from './kit';
import { INK, PAPER_FILL } from './palette';
import type { Pt } from './pen';
import { castShadow, ellipseAt, glaze, gloss, leafBlade, paintLeaf, roundShade } from './propsKit';
import { mix } from './wash';

/**
 * Orchard fruit that rolls across the board to be spat at for a bonus:
 * whole, fresh and glossy, seen from above, each with its stem, a leaf and a
 * soft shadow. Centred at the origin in a FRUIT_FRAME square; radius ~18,
 * the pear a little longer.
 */
export const FRUIT_FRAME = 56;
export const FRUITS = ['apple', 'pear', 'plum'] as const;
export type FruitKind = (typeof FRUITS)[number];

const SHADOW_OFF = pt(2.4, 3.4);
const SHADOW_ALPHA = 0.15;
const STEM = '#73502f';
const STEM_LIGHT = '#a07a4e';
const LEAF_FRESH = '#6c9c48';

const APPLE = { r: 18, skin: '#d2c85e', blush: '#cf3a2c', streak: '#9a2420', deep: '#5e1717', seed: 7101 } as const;
const PEAR = { skin: '#c8cc5a', blush: '#e39a46', russet: '#8a6034', deep: '#5d6a24' } as const;
const PLUM = { rx: 16.8, ry: 15.6, skin: '#62408f', blue: '#3e4a9a', deep: '#24163f', bloom: '#d6d8ee' } as const;

/** A short woody stem from a to b, with a cut end. */
function stem(d: Draw, a: Pt, b: Pt, w0: number, w1: number): void {
  const { pen } = d;
  const s = capsule(a, b, w0, w1);
  pen.fill(s, STEM, 0.95);
  pen.hair([a, b].map((p) => pt(p.x - 0.35, p.y - 0.35)), Math.min(w0, w1) * 0.35, STEM_LIGHT, 0.8);
  pen.stroke(closed(s), 0.65, d.ink, 0.9, false);
  pen.dot(b.x, b.y, w1 * 0.32, mix(STEM, INK, 0.5), 0.9);
}

/** An apple: a round, faintly lobed body, red streaks radiating from the stem well over yellow-green, pale lenticels. */
function apple(d: Draw): void {
  const { pen } = d;
  const R = APPLE.r;
  const body = Array.from({ length: 64 }, (_, i) => {
    const a = (i / 64) * TAU;
    const r = R + 0.3 * Math.sin(5 * a + 0.4) + 0.3 * Math.sin(2 * a + 1.1);
    return pt(Math.cos(a) * r * 1.03, Math.sin(a) * r * 0.98);
  });
  const well = pt(1, 0.6);
  castShadow(d, body, SHADOW_OFF, SHADOW_ALPHA);
  pen.fill(body, PAPER_FILL, 1);
  pen.clipped(body, () => {
    pen.fill(body, APPLE.skin, 0.85);
    // The blush, then streaks fanning out from the stem well as on a real apple.
    glaze(d, -3, -2.6, 24, 21, 0.4, APPLE.blush, 0.95);
    glaze(d, -4, -4.5, 12, 10, 0.4, APPLE.blush, 0.35);
    const rng = createRng(APPLE.seed);
    for (let i = 0; i < 30; i++) {
      const a = (i / 30) * TAU + rng() * 0.18;
      const r0 = 4 + rng() * 2.5;
      const r1 = 11 + rng() * 9;
      const bow = (rng() - 0.5) * 0.25;
      const p = (r: number, k: number): Pt => pt(well.x + Math.cos(a + bow * k) * r, well.y + Math.sin(a + bow * k) * r);
      pen.hair([p(r0, 0), p((r0 + r1) / 2, 0.6), p(r1, 1)], 0.4 + rng() * 0.6, APPLE.streak, 0.18 + rng() * 0.2);
    }
    pen.stipple(body, 90, () => 0.75, 0.32, PAPER_FILL);
  });
  roundShade(d, body, 0, 0, R, APPLE.deep, 0.55);
  // The stem well: a shaded hollow with the skin puckering into it.
  pen.fill(oval(well.x + 0.4, well.y + 0.4, 4.2, 3.8, 18), APPLE.deep, 0.3);
  pen.fill(oval(well.x + 1, well.y + 1, 2.4, 2.1, 14), APPLE.deep, 0.3);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * TAU + 0.3;
    pen.hair([pt(well.x + Math.cos(a) * 5.6, well.y + Math.sin(a) * 5.2), pt(well.x + Math.cos(a) * 2.6, well.y + Math.sin(a) * 2.4)], 0.4, d.ink, 0.35);
  }
  gloss(d, 0, 0, R);
  pen.stroke(closed(body), 1.4, d.ink, 0.95);
  stem(d, well, pt(5, -4.2), 1.9, 1.4);
  paintLeaf(d, leafBlade(pt(4.6, -4.2), -0.75, 15, 10, 0.12), LEAF_FRESH);
}

/** The pear's outline: a soft union of its round bottom and its narrower neck, lying along x (neck to −x). */
function pearOutline(): Pt[] {
  const big = { x: 5, y: 0, r: 13.2 };
  const small = { x: -10.5, y: 0.6, r: 7.6 };
  const K = 0.42;
  const field = (x: number, y: number): number => {
    const d1 = Math.hypot(x - big.x, y - big.y) - big.r;
    const d2 = Math.hypot(x - small.x, y - small.y) - small.r;
    return -Math.log(Math.exp(-K * d1) + Math.exp(-K * d2)) / K;
  };
  const c = pt(0, 0);
  return Array.from({ length: 72 }, (_, i) => {
    const a = (i / 72) * TAU;
    let r = 0;
    while (r < 30 && field(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r) < 0) r += 0.2;
    return pt(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r);
  });
}

/** A pear lying on its side: green-gold with a warm blush, russet freckles, the dried blossom at its broad end. */
function pear(d: Draw): void {
  const { pen } = d;
  const body = pearOutline();
  const neck = body.reduce((m, p) => (p.x < m.x ? p : m), body[0]!);
  const butt = body.reduce((m, p) => (p.x > m.x ? p : m), body[0]!);
  castShadow(d, body, SHADOW_OFF, SHADOW_ALPHA);
  pen.fill(body, PAPER_FILL, 1);
  pen.clipped(body, () => {
    pen.fill(body, PEAR.skin, 0.85);
    glaze(d, 3, -5, 15, 9.5, -0.15, PEAR.blush, 0.5);
    glaze(d, neck.x + 2.5, neck.y, 6, 5, 0, PEAR.russet, 0.35);
    pen.stipple(body, 120, () => 0.7, 0.42, PEAR.russet);
    pen.stipple(body, 40, () => 0.7, 0.3, PAPER_FILL);
  });
  roundShade(d, body, 3, 0, 15, PEAR.deep, 0.55);
  // The blossom end: a little dried star.
  const bloom = pt(butt.x - 2.2, butt.y);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU + 0.4;
    pen.hair([bloom, pt(bloom.x + Math.cos(a) * 1.6, bloom.y + Math.sin(a) * 1.6)], 0.5, d.ink, 0.7);
  }
  pen.dot(bloom.x, bloom.y, 0.7, mix(PEAR.russet, INK, 0.4), 0.9);
  gloss(d, 4, 0, 13);
  pen.stroke(closed(body), 1.4, d.ink, 0.95);
  // A curved stem out of the neck, a leaf from it.
  const s = bezier(pt(neck.x + 1.5, neck.y), pt(neck.x - 3, neck.y - 0.5), pt(neck.x - 4.5, neck.y - 4), 6);
  const sh = tube(s, 2, 1.3);
  pen.fill(sh, STEM, 0.95);
  pen.stroke(closed(sh), 0.6, d.ink, 0.9, false);
  pen.dot(s[s.length - 1]!.x, s[s.length - 1]!.y, 0.5, mix(STEM, INK, 0.5), 0.9);
  paintLeaf(d, leafBlade(pt(neck.x - 2.4, neck.y - 1.6), -1.75, 13.5, 8.5, -0.1), LEAF_FRESH);
}

/** A plum: deep violet-blue, a dusty pale bloom with a rubbed glossy patch, the crease down one side. */
function plum(d: Draw): void {
  const { pen } = d;
  const body = ellipseAt(0, 0.6, PLUM.rx, PLUM.ry, 0.12, 60);
  castShadow(d, body, SHADOW_OFF, SHADOW_ALPHA);
  pen.fill(body, PAPER_FILL, 1);
  pen.clipped(body, () => {
    pen.fill(body, PLUM.skin, 0.9);
    glaze(d, 5, 5, 15, 12, 0.3, PLUM.blue, 0.45);
    // The dusty bloom, lighter towards the light.
    glaze(d, -3.5, -3, 15, 13, 0.2, PLUM.bloom, 0.3);
    pen.stipple(body, 160, (x, y) => 0.75 - (x + y) / 60, 0.34, PLUM.bloom);
  });
  roundShade(d, body, 0, 0.6, 16.5, PLUM.deep, 0.7);
  // The crease: a dark seam with a pale lip beside it.
  const crease = bezier(pt(-0.8, -12.4), pt(6.5, -1), pt(2.5, 14.2), 12);
  pen.hair(crease, 0.8, PLUM.deep, 0.75);
  pen.hair(crease.map((p) => pt(p.x - 1, p.y + 0.2)), 0.7, PLUM.bloom, 0.35);
  pen.fill(oval(-0.6, -12.2, 2.6, 1.6, 14), PLUM.deep, 0.45);
  gloss(d, 0, 0.6, 16, 0.85);
  pen.stroke(closed(body), 1.4, d.ink, 0.95);
  stem(d, pt(-0.6, -12.2), pt(1.2, -17.6), 1.6, 1.2);
  paintLeaf(d, leafBlade(pt(1, -16.4), -0.45, 14, 9, 0.12), LEAF_FRESH);
}

/** One fruit, centred at the origin within FRUIT_FRAME. */
export function drawFruit(d: Draw, kind: FruitKind): void {
  if (kind === 'apple') apple(d);
  else if (kind === 'pear') pear(d);
  else plum(d);
}
