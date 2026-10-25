import type { Rng } from '../../logic/rng';
import { bezier, closed, oval, pt, TAU } from '../kit';
import { LEAF, MOSS } from '../palette';
import type { Pt } from '../pen';
import { mix } from '../wash';
import { type Brush, polar, scalloped } from './brush';
import { tracePath } from './common';

/**
 * Trees on the map, seen from above as a naturalist's map draws them, each
 * throwing its shadow down-right: a broadleaf crown of lobes lit at the
 * upper left, a pine's starburst of needle tufts, an acacia's flat
 * umbrella over its branches, a rainforest giant, and a tree standing in
 * flood water. Each paints or pencils by its Brush.
 */
export const DEEP_LEAF = '#3f6b3a';

export interface CrownTone {
  readonly leaf: string;
  readonly lit: string;
  readonly deep: string;
}

export const OAK_TONE: CrownTone = { leaf: mix(LEAF, DEEP_LEAF, 0.2), lit: mix(MOSS, '#ffffff', 0.35), deep: DEEP_LEAF };

/** A broadleaf crown from above, its shadow pooled on the ground beside it. */
export function crown(b: Brush, c: Pt, r: number, rng: Rng, tone: CrownTone = OAK_TONE): void {
  const { pen } = b;
  const shape = scalloped(c, r, 11, rng, 0.1);
  const shadow = shape.map((p) => pt(p.x + r * 0.26, p.y + r * 0.4));
  b.smudge(pt(c.x + r * 0.3, c.y + r * 0.45), r * 0.95, r * 0.65, rng);
  if (!b.draft) {
    pen.fill(shadow, tone.deep, 0.16);
    pen.fill(shadow, b.d.ink, 0.07);
  }
  pen.hatch(shadow, 5, 0.9, 0.45, { color: b.ink, alpha: b.draft ? 0.22 : 0.14 });
  b.body(shape, tone.leaf, 0.6);
  const lobes = Array.from({ length: 7 }, (_, i) => {
    const a = (i / 7) * TAU + rng();
    const k = r * (0.35 + rng() * 0.25);
    return { p: pt(c.x + Math.cos(a) * k, c.y + Math.sin(a) * k), r: r * (0.35 + rng() * 0.15) };
  });
  for (const l of lobes) {
    const s = scalloped(l.p, l.r, 7, rng, 0.14);
    b.tint(s, mix(tone.leaf, tone.lit, rng() * 0.4), 0.26);
    b.shade(s, l.r * 0.6, tone.deep, 0.28);
    b.line(closed(s).slice(4, 22), 0.55, 0.35);
  }
  for (const l of lobes) b.tint(scalloped(pt(l.p.x - l.r * 0.25, l.p.y - l.r * 0.35), l.r * 0.45, 5, rng, 0.2), tone.lit, 0.35);
  b.hatchShade(shape, r * 0.45, b.draft ? 0.3 : 0.22);
  b.edge(shape, 1.2, 0.75);
}

/** A spiky tuft outline: a round with many short needle points, as a pine's needle clusters look from above. */
function tuftShape(c: Pt, r: number, rng: Rng): Pt[] {
  const n = 22 + Math.floor(r);
  const ph = rng() * TAU;
  return Array.from({ length: n * 2 }, (_, i) => polar(c, (i / (n * 2)) * TAU + ph, r * (i % 2 === 0 ? 1 + rng() * 0.12 : 0.82)));
}

/** A pitch pine from above: an open, clumpy crown of needle tufts round its leader, dark, lit at the upper left, its long shadow down-right. */
export function pine(b: Brush, c: Pt, r: number, rng: Rng, needle = '#4f6e48'): void {
  const { pen } = b;
  const tufts = Array.from({ length: 6 + Math.floor(rng() * 4) }, (_, i) => ({ p: i === 0 ? c : polar(c, rng() * TAU, r * (0.35 + rng() * 0.4)), r: r * (0.3 + rng() * 0.18) }));
  const shapes = tufts.map((t) => tuftShape(t.p, t.r, rng));
  // A pine is tall: its shadow is long, pointed and broken where the tufts are.
  // One fill for all the tufts' shadows, so where they overlap it doesn't darken.
  const shadow = new Path2D();
  for (const s of shapes) tracePath(shadow, s, r * 0.75, r * 1.1);
  pen.ctx.save();
  pen.ctx.globalAlpha = b.draft ? 0.07 : 0.15;
  pen.ctx.fillStyle = b.draft ? b.ink : '#3a4030';
  pen.ctx.fill(shadow);
  pen.ctx.restore();
  b.line([c, pt(c.x + r * 0.9, c.y + r * 1.3)], 1.2, 0.12);
  // Branches radiating under the tufts.
  for (const t of tufts.slice(1)) b.line([c, t.p], 1, 0.55, '#5a4030');
  tufts.forEach((t, i) => {
    const s = shapes[i]!;
    b.body(s, mix(needle, '#2f4a32', rng() * 0.4), 0.7);
    b.tint(tuftShape(pt(t.p.x - t.r * 0.25, t.p.y - t.r * 0.3), t.r * 0.5, rng), '#a8c080', 0.4);
    b.shade(s, t.r * 0.55, '#1f3324', 0.4);
    // Needles bristling out at the rim.
    for (let k = 0; k < 10; k++) {
      const a = rng() * TAU;
      const q = polar(t.p, a, t.r * 0.7);
      b.line([q, polar(q, a, t.r * 0.45)], 0.4, 0.55, '#26402e');
    }
    b.line(closed(s).filter((_, k) => k % 2 === 0), 0.5, 0.6);
  });
  b.dot(c.x, c.y, 1.6, '#6b4a33', 0.8);
}

/** An acacia from above: a flat, wide umbrella of feathery foliage, gaps showing the branches beneath. */
export function acacia(b: Brush, c: Pt, r: number, rng: Rng): void {
  const { pen } = b;
  const leaf = '#7f9a4a';
  const shape = scalloped(c, r, 14, rng, 0.08).map((p) => pt(c.x + (p.x - c.x) * 1.25, c.y + (p.y - c.y) * 0.8));
  const shadow = shape.map((p) => pt(p.x + r * 0.5, p.y + r * 0.62));
  b.smudge(pt(c.x + r * 0.5, c.y + r * 0.6), r * 1.1, r * 0.6, rng);
  if (!b.draft) pen.fill(shadow, b.d.ink, 0.12);
  pen.hatch(shadow, 5, 0.9, 0.4, { color: b.ink, alpha: b.draft ? 0.2 : 0.12 });
  // The trunk and its forks under the crown (seen through its gaps).
  for (let i = 0; i < 5; i++) b.line(bezier(c, polar(c, i * 1.3 + rng(), r * 0.3), polar(c, i * 1.25 + rng(), r * 0.95), 8), 1.1, 0.6, '#5a4030');
  b.body(shape, leaf, 0.72);
  b.shade(shape, r * 0.3, '#3f5a2a', 0.4);
  for (let i = 0; i < 9; i++) {
    const p = polar(c, rng() * TAU, r * Math.sqrt(rng()) * 0.9);
    const s = scalloped(p, r * (0.18 + rng() * 0.15), 6, rng, 0.2);
    b.tint(s, mix(leaf, '#f0eab0', 0.4), 0.3);
  }
  // Gaps in the canopy where the branches show.
  for (let i = 0; i < 4; i++) {
    const p = polar(c, rng() * TAU, r * (0.3 + rng() * 0.4));
    const gap = oval(p.x, p.y, r * 0.09, r * 0.06, 10);
    b.tint(gap, '#d9c48c', 0.8);
    b.line([polar(p, 0.4, r * 0.1), polar(p, 3.5, r * 0.1)], 0.8, 0.6, '#5a4030');
  }
  b.hatchShade(shape, r * 0.35, 0.22);
  b.edge(shape, 1, 0.7);
}

/** A rainforest giant: a big crown of several rounded masses, each lit and shaded, emergent above the canopy. */
export function giant(b: Brush, c: Pt, r: number, rng: Rng, leaf = '#4f8a46'): void {
  const masses = Array.from({ length: 5 }, () => ({ p: polar(c, rng() * TAU, r * 0.45 * rng()), r: r * (0.45 + rng() * 0.25) }));
  b.smudge(pt(c.x + r * 0.3, c.y + r * 0.4), r, r * 0.7, rng);
  for (const m of masses) b.cast(scalloped(m.p, m.r, 9, rng, 0.12), r * 0.35, 0.1);
  for (const m of masses) {
    const s = scalloped(m.p, m.r, 9, rng, 0.14);
    b.body(s, mix(leaf, '#2f5a33', rng() * 0.4), 0.62);
    b.tint(scalloped(pt(m.p.x - m.r * 0.3, m.p.y - m.r * 0.35), m.r * 0.5, 6, rng, 0.2), '#bcd68a', 0.35);
    b.shade(s, m.r * 0.5, '#1f3d26', 0.32);
    b.hatchShade(s, m.r * 0.3, 0.18);
    b.edge(s, 0.9, 0.7);
  }
}

/** A tree standing in water: its trunk's foot ringed by ripples, its crown above, its reflection darkening the water. */
export function wadingTree(b: Brush, c: Pt, r: number, rng: Rng): void {
  const { pen } = b;
  const foot = pt(c.x + r * 0.3, c.y + r * 0.5);
  for (const k of [1.4, 1, 0.65]) b.line(closed(oval(foot.x, foot.y, r * 0.3 * k, r * 0.16 * k, 18)).slice(0, 16), 0.5, 0.35 * k);
  if (!b.draft) pen.fill(oval(foot.x + r * 0.2, foot.y + r * 0.4, r * 0.9, r * 0.5, 20), '#2c3b2c', 0.12);
  // Buttress roots splaying into the water.
  for (let i = 0; i < 5; i++) b.line(bezier(foot, polar(foot, i * 1.25 + rng(), r * 0.18), polar(foot, i * 1.25 + rng(), r * 0.34), 6), 1, 0.6, '#4a3a2a');
  crown(b, c, r, rng, { leaf: '#5d8a4e', lit: '#b9d08a', deep: '#2f4f33' });
}

/** A palm-like sapling or fern from above: fronds radiating from a heart. */
export function frondTop(b: Brush, c: Pt, r: number, rng: Rng, leaf = '#5f8f4e'): void {
  const n = 7 + Math.floor(rng() * 3);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + rng() * 0.3;
    const tip = polar(c, a, r * (0.8 + rng() * 0.3));
    const spine = bezier(c, polar(c, a + 0.2, r * 0.5), tip, 8);
    const blade = [...spine.map((p, k) => polar(p, a + Math.PI / 2, r * 0.13 * Math.sin((Math.PI * k) / 8))), ...[...spine].reverse().map((p, k) => polar(p, a - Math.PI / 2, r * 0.13 * Math.sin((Math.PI * (8 - k)) / 8)))];
    b.cast(blade, r * 0.2, 0.08);
    b.body(blade, leaf, 0.55);
    b.line(spine, 0.6, 0.6, mix(leaf, '#1b1a1f', 0.5));
    for (let k = 2; k < 8; k++) b.line([spine[k]!, polar(spine[k]!, a + 0.9, r * 0.1)], 0.35, 0.35);
    b.edge(blade, 0.6, 0.55);
  }
  b.dot(c.x, c.y, 2, '#6b4a33', 0.85);
  b.glint([polar(c, -2.3, r * 0.2), polar(c, -2.3, r * 0.5)], 1, 0.4);
}
