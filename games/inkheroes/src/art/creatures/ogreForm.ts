import { closed, cub, oval, pt, type Draw } from '../kit';
import type { Pt } from '../pen';
import { mix } from '../wash';
import { dab, IVORY, paint, SHADOW } from './beastPaint';
import { turn } from './beastRig';

/**
 * Form-making for the ogre: outlines built of bowed planes that meet at
 * corners (muscle masses with dents between them, never one smooth oval),
 * a fist of knuckles and curled fingers, a bare clawed foot, and veins.
 */

/**
 * A closed outline through `corners`, each edge between two corners a plane
 * bowed outward by `bulge` × its length (one value, or one per edge; a
 * negative bulge dents it in). Clockwise on screen keeps "outward" outward.
 */
export function facets(corners: readonly Pt[], bulge: number | readonly number[]): Pt[] {
  const out: Pt[] = [];
  const n = corners.length;
  for (let i = 0; i < n; i++) {
    const a = corners[i]!;
    const b = corners[(i + 1) % n]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const k = typeof bulge === 'number' ? bulge : (bulge[i] ?? 0);
    // Outward is to the left of travel (y down): (dy, −dx).
    const nx = dy * k;
    const ny = -dx * k;
    const seg = cub(a, pt(a.x + dx / 3 + nx, a.y + dy / 3 + ny), pt(a.x + (2 * dx) / 3 + nx, a.y + (2 * dy) / 3 + ny), b, 6);
    out.push(...seg.slice(0, -1));
  }
  return out;
}

/** Shapes in a fist's own frame (wrist at the origin, the hand reaching down +y, knuckles forward +x), turned by `a` and moved to `at`. */
const placed = (at: Pt, a: number) => (q: Pt): Pt => {
  const r = turn(q, pt(0, 0), a);
  return pt(r.x + at.x, r.y + at.y);
};

/**
 * A clenched fist seen from the side: the broad back of the hand, a ridge
 * of knuckles, four thick fingers curled under it (each a roll with its own
 * crease), the thumb clamped across them with a dark nail. `a` turns it
 * from hanging straight down.
 */
export function fist(d: Draw, at: Pt, a: number, color: string, lit: string, s = 1): void {
  const m = placed(at, a);
  const M = (pts: readonly Pt[]): Pt[] => pts.map((q) => m(pt(q.x * s, q.y * s)));
  // The front edge knobbed by the four curled fingers.
  const hand = facets(
    [pt(-5, -1.4), pt(3.6, -1.8), pt(6.6, 2.2), pt(7.2, 4.8), pt(8.2, 6), pt(7.4, 7.2), pt(8.2, 8.4), pt(7.4, 9.6), pt(7.6, 10.8), pt(6, 11.8), pt(1, 12.4), pt(-4, 10.4), pt(-5.6, 4.4)],
    [0.06, 0.08, 0.2, 0.25, 0.04, 0.25, 0.04, 0.25, 0.2, 0.08, 0.1, 0.06, 0.06],
  );
  paint(d, M(hand), color, { shadow: 0.9, hatch: 0.36, line: 0.42 });
  // The back of the hand lit; the fingers' undersides in deep shadow.
  d.pen.clipped(M(hand), () => {
    dab(d, M(oval(-1, 2.6, 4.4, 3.4, 12)), lit, 0.5, 0.8);
    dab(d, M([pt(-6, 9.4), pt(9, 9.4), pt(9, 13), pt(-6, 13)]), SHADOW, 0.55, 0.8);
  });
  // The curled fingers, each a roll between creases, with a lit top edge.
  for (const [y0, y1] of [[2.4, 4.8], [4.8, 7.2], [7.2, 9.6], [9.6, 11.6]] as const) {
    d.pen.hair(M([pt(1.4, y1 - 0.4), pt(4.6, y1 + 0.2), pt(7.6, y1 - 0.2)]), 0.42, d.ink, 0.9);
    d.pen.hair(M([pt(2.4, y0 + 0.6), pt(5, y0 + 0.4), pt(7, y0 + 0.6)]), 0.3, lit, 0.45);
  }
  // The knuckle ridge, bumps catching the light.
  for (const y of [3.4, 5.9, 8.4, 10.6]) d.pen.dot(m(pt(7.2 * s, y * s)).x, m(pt(7.2 * s, y * s)).y, 0.5 * s, mix(lit, IVORY, 0.2), 0.45);
  // The thumb clamped across the fingers.
  const thumb = facets([pt(-3.4, 0.6), pt(2, 1.4), pt(5.6, 3.4), pt(5.2, 5.4), pt(1, 4.8), pt(-3.6, 3.8)], 0.1);
  d.pen.fill(M(thumb), mix(color, lit, 0.25), 1);
  d.pen.fill(M(oval(4.4, 4.3, 1.1, 0.8, 8)), mix(color, IVORY, 0.25), 0.8);
  d.pen.hair(M(closed(thumb)), 0.34, d.ink, 0.85);
}

/** A bare, splayed, clawed foot from its heel at `x`: a heavy heel, the arch, thick toes with dark horny nails, a hide thong round the ankle. */
export function bareFoot(d: Draw, x: number, color: string, lit: string, nail: string, thong: string): void {
  const foot = facets([pt(x - 0.4, -10.6), pt(x + 5.6, -9.6), pt(x + 11, -5.8), pt(x + 15.6, -4.2), pt(x + 18.6, -2.4), pt(x + 19, 0.6), pt(x + 6, 0.9), pt(x - 1.4, 0.6), pt(x - 2.6, -4.6)], [0.05, 0.04, 0.06, 0.1, 0.18, 0.02, 0.02, 0.14, 0.08]);
  paint(d, foot, color, { shadow: 0.85, hatch: 0.36, line: 0.42 });
  d.pen.clipped(foot, () => {
    dab(d, oval(x + 8, -7.6, 4.6, 1.8, 12), lit, 0.5, 0.8);
    dab(d, [pt(x - 3, -1.6), pt(x + 20, -1.6), pt(x + 20, 1.2), pt(x - 3, 1.2)], SHADOW, 0.55, 0.6);
  });
  // Three thick toes, split by deep creases, each ending in a horny nail.
  for (const [tx, ty] of [[x + 12.8, -4], [x + 15.4, -3], [x + 17.8, -1.6]] as const) {
    d.pen.hair([pt(tx - 1.2, ty - 0.4), pt(tx - 0.6, ty + 1.6), pt(tx - 0.4, ty + 3.6)], 0.32, d.ink, 0.75);
    const n = facets([pt(tx + 0.2, ty - 0.4), pt(tx + 1.8, ty + 0.2), pt(tx + 2, ty + 1.8), pt(tx + 0.6, ty + 1.4)], 0.12);
    d.pen.fill(n, nail, 1);
    d.pen.hair(closed(n), 0.26, d.ink, 0.8);
  }
  // A hide thong round the ankle.
  d.pen.stroke([pt(x - 1.4, -8), pt(x + 3, -9.4), pt(x + 7.6, -8.4)], 1.1, thong, 0.95, false);
  d.pen.stroke([pt(x - 1, -6.6), pt(x + 3.4, -7.8), pt(x + 7.2, -6.6)], 0.8, thong, 0.85, false);
}

/** A raised vein winding along a limb from `a` to `b`: a dark line with a lit edge. */
export function vein(d: Draw, a: Pt, b: Pt, wiggle: number, dark: string, lit: string): void {
  const l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const nx = -(b.y - a.y) / l;
  const ny = (b.x - a.x) / l;
  const pts = [0, 0.25, 0.5, 0.75, 1].map((k, i) => {
    const w = (i % 2 === 0 ? 1 : -1) * wiggle * (k > 0 && k < 1 ? 1 : 0);
    return pt(a.x + (b.x - a.x) * k + nx * w, a.y + (b.y - a.y) * k + ny * w);
  });
  d.pen.hair(pts, 0.42, dark, 0.7);
  d.pen.hair(pts.map((q) => pt(q.x - 0.35, q.y - 0.35)), 0.24, lit, 0.5);
}
