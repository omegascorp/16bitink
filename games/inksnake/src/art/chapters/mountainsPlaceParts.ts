import type { Rng } from '../../logic/rng';
import { blob, body, castShadow, polar, SHADOW } from '../groundKit';
import { closed, type Draw, oval, pt, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { specks } from '../places/farmGroundParts';
import { strokes } from '../places/farmKit';
import { mix } from '../wash';
import {
  GRASS_DRY, GRASS_DRY_DEEP, GRASS_DRY_LIT, inset, LIME, LIME_DEEP, LIME_GREY, LIME_LIT, LIME_SHADE, OAK, OAK_DEEP, OAK_LIT, rockShape, SAGE, SAGE_DEEP, SAGE_LIT, SHADE, THYME_FLOWER,
} from './mountainsPlaceKit';

/**
 * The Mountains' small things, painted from above: loose limestone stones
 * (angular, lit on top, each with its shadow), tufts of sun-dried grass,
 * spiny grey-green cushions (milk-vetch), thyme's low mats and the crowns of
 * Persian oak reaching in from the board's edges.
 */

/** An angular limestone stone of size s at c: facets lit and shaded, a contour, its shadow. */
export function stone(d: Draw, c: Pt, s: number, rng: Rng, ink = 0.7): void {
  const { pen } = d;
  const shape = rockShape(c, s, s * (0.6 + rng() * 0.35), rng, rng() * TAU, 5 + Math.floor(rng() * 3));
  castShadow(d, shape, s * 0.6, 0.24, SHADE);
  body(d, shape, mix(LIME_GREY, rng() < 0.3 ? '#cbb89a' : LIME, rng() * 0.7), 0.9);
  pen.crescent(shape, pt(-SHADOW.x * s * 0.6, -SHADOW.y * s * 0.6), () => pen.fill(shape, LIME_SHADE, 0.6));
  pen.fill(inset(shape, c, 0.5, -s * 0.2, -s * 0.25), LIME_LIT, 0.55);
  if (s > 2.2) pen.hair(closed(shape), Math.min(0.8, 0.3 + s * 0.08), d.ink, ink);
  else pen.fill(shape.map((p) => pt(p.x + 0.2, p.y + 0.3)), LIME_DEEP, 0.2);
}

/** A tuft of sun-dried grass at c, s across: thin blades fanning out, golden lit, umber at the root. */
export function dryTuft(d: Draw, c: Pt, s: number, rng: Rng): void {
  const lean = -2.3 + (rng() - 0.5) * 1.4;
  const n = 16 + Math.floor(s * 2.2);
  d.pen.fill(oval(c.x + SHADOW.x * s * 0.35, c.y + SHADOW.y * s * 0.35, s * 0.55, s * 0.4, 10), SHADE, 0.14);
  const blade = (): readonly [number, number, number, number, number] => {
    const a = lean + (rng() - 0.5) * 2.4;
    return [c.x + (rng() - 0.5) * s * 0.25, c.y + (rng() - 0.5) * s * 0.25, a, s * (0.35 + rng() * 0.8), (rng() - 0.5) * s * 0.3];
  };
  strokes(d, GRASS_DRY_DEEP, 0.6, 0.55, n, blade);
  strokes(d, GRASS_DRY, 0.75, 0.42, n, blade);
  strokes(d, GRASS_DRY_LIT, 0.7, 0.32, Math.round(n * 0.6), blade);
  d.pen.fill(oval(c.x, c.y, s * 0.12, s * 0.1, 6), GRASS_DRY_DEEP, 0.7);
}

/** A spiny cushion (milk-vetch) at c, radius r: a dome of grey-green spines, darker inside, lit at the upper left, a contour, its shadow. */
export function cushion(d: Draw, c: Pt, r: number, rng: Rng): void {
  const { pen } = d;
  const shape = blob(c, r, r * 0.9, rng, 0.14, 20, rng() * TAU);
  castShadow(d, shape, r * 0.45, 0.2, SHADE);
  body(d, shape, SAGE, 0.85);
  pen.crescent(shape, pt(-SHADOW.x * r * 0.5, -SHADOW.y * r * 0.5), () => pen.fill(shape, SAGE_DEEP, 0.55));
  pen.clipped(shape, () => {
    strokes(d, SAGE_DEEP, 0.6, 0.45, Math.round(r * 9), () => {
      const a = rng() * TAU;
      const p = polar(c, a, rng() * r * 0.9);
      return [p.x, p.y, a + (rng() - 0.5) * 0.6, 1.5 + rng() * 2.4, 0];
    });
    strokes(d, SAGE_LIT, 0.8, 0.4, Math.round(r * 8), () => {
      const a = rng() * TAU;
      const p = polar(pt(c.x - r * 0.25, c.y - r * 0.3), a, rng() * r * 0.65);
      return [p.x, p.y, a + (rng() - 0.5) * 0.6, 1.2 + rng() * 2, 0];
    });
  });
  // Spines standing out past the edge.
  strokes(d, SAGE_DEEP, 0.7, 0.35, Math.round(r * 3), () => {
    const a = rng() * TAU;
    const p = polar(c, a, r * (0.85 + rng() * 0.1));
    return [p.x, p.y, a, 1.2 + rng() * 1.6, 0];
  });
  pen.hair(closed(shape), 0.6, d.ink, 0.6);
}

/** A thyme mat at c, radius r: a low mound of tiny grey-green leaves, flecked with mauve flowers; `rim` inks its edge. */
export function thymeMat(d: Draw, c: Pt, r: number, rng: Rng, flowers = 1, rim = true): void {
  const { pen } = d;
  const shape = blob(c, r, r * 0.86, rng, 0.22, 26, rng() * TAU);
  castShadow(d, shape, r * 0.3, 0.2, SHADE);
  body(d, shape, mix(SAGE, '#8f9a6e', 0.4), 0.92);
  pen.clipped(shape, () => {
    pen.crescent(shape, pt(-SHADOW.x * r * 0.4, -SHADOW.y * r * 0.4), () => pen.fill(shape, SAGE_DEEP, 0.5));
    pen.crescent(shape, pt(SHADOW.x * r * 0.3, SHADOW.y * r * 0.3), () => pen.fill(shape, SAGE_LIT, 0.3));
    const leaves = (k: number, off: Pt, s0: number): (readonly [number, number, number])[] =>
      Array.from({ length: Math.round(r * r * k) }, () => {
        const q = polar(pt(c.x + off.x, c.y + off.y), rng() * TAU, Math.sqrt(rng()) * r * 1.05);
        return [q.x, q.y, s0 * (0.6 + rng() * 0.6)] as const;
      });
    specks(d, SAGE_DEEP, 0.55, leaves(0.5, pt(r * 0.2, r * 0.25), 0.6));
    specks(d, mix(SAGE, '#9aa77a', 0.5), 0.6, leaves(0.55, pt(0, 0), 0.55));
    specks(d, SAGE_LIT, 0.7, leaves(0.3, pt(-r * 0.3, -r * 0.35), 0.5));
    for (let i = 0; i < r * r * 0.012 * flowers; i++) {
      const q = polar(pt(c.x - r * 0.1, c.y - r * 0.1), rng() * TAU, Math.sqrt(rng()) * r * 0.85);
      specks(d, THYME_FLOWER, 0.85, Array.from({ length: 5 }, () => [q.x + (rng() - 0.5) * 2.4, q.y + (rng() - 0.5) * 2.4, 0.45 + rng() * 0.35] as const));
      specks(d, PAPER_FILL, 0.45, [[q.x - 0.4, q.y - 0.5, 0.35]]);
    }
  });
  if (rim) pen.hair(closed(shape), 0.7, d.ink, 0.6);
}

/** A Persian oak's crown, centre c (often off the board), radius r: clumps of dark leaves, lit on the upper left, in a heavy shadow. */
export function oakCrown(d: Draw, c: Pt, r: number, rng: Rng): void {
  const { pen } = d;
  const clumps = Array.from({ length: 9 }, () => {
    const p = polar(c, rng() * TAU, Math.sqrt(rng()) * r * 0.62);
    return blob(p, r * (0.3 + rng() * 0.16), r * (0.26 + rng() * 0.14), rng, 0.3, 16, rng() * TAU);
  });
  for (const cl of clumps) castShadow(d, cl, r * 0.35, 0.14, SHADE);
  for (const cl of clumps) {
    body(d, cl, OAK, 0.9);
    pen.crescent(cl, pt(-SHADOW.x * r * 0.14, -SHADOW.y * r * 0.14), () => pen.fill(cl, OAK_DEEP, 0.6));
    pen.clipped(cl, () => {
      strokes(d, OAK_LIT, 0.55, 1.1, Math.round(r * 1.6), () => {
        const p = polar(c, rng() * TAU, rng() * r);
        return [p.x - r * 0.08, p.y - r * 0.1, rng() * TAU, 2 + rng() * 2.5, (rng() - 0.5) * 1.5];
      });
      strokes(d, OAK_DEEP, 0.5, 0.9, Math.round(r * 1.2), () => {
        const p = polar(c, rng() * TAU, rng() * r);
        return [p.x + r * 0.05, p.y + r * 0.08, rng() * TAU, 2 + rng() * 2, (rng() - 0.5) * 1.5];
      });
    });
    pen.hair(closed(cl), 0.8, d.ink, 0.55);
  }
}
