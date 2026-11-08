import type { Rng } from '../../logic/rng';
import type { CoverDef } from '../../level/types';
import { blob, polar, SHADOW } from '../groundKit';
import { closed, type Draw, oval, pt, TAU } from '../kit';
import type { Pt } from '../pen';
import {
  BLOOM, BLOOM_DEEP, BLOOM_LIT, GORSE, GORSE_DEEP, GORSE_FLOWER, GORSE_FLOWER_DEEP, GORSE_FLOWER_LIT, GORSE_LIT, LING, LING_BRONZE, LING_DEEP, LING_LIT, LING_RUST, type Mark,
  markShadows, paintingBloom, PEAT_DARK, rngAt, sprig, strokeMarks,
} from './heathPlaceKit';

/**
 * The Heath's cover, painted on the layer over the snake: a bush of old
 * ling heather (a dense low dome of thousands of sprigs, darkest deep in
 * it and down its shaded side, lit across its crown, flowering purple in
 * its season or carrying last year's rusty heads) and a gorse bush (a
 * close tangle of spiny shoots, nearly black-green in its depths, its
 * coconut-yellow pea flowers thick on the sunny side). Each stays inside
 * about r × 1.15 of its centre, opaque, its edge ragged.
 */

/** Which ring of the dome a point is in (0 middle, 1 rim) and how lit it is (the crown towards the upper left). */
function domeLight(c: Pt, r: number, p: Pt): number {
  const dx = (p.x - c.x) / r;
  const dy = (p.y - c.y) / r;
  return Math.max(0, Math.min(1, 0.55 - (dx * SHADOW.x + dy * SHADOW.y) * 0.75 - Math.hypot(dx, dy) * 0.15));
}

/** The bush's body and its shadow on what's under it: an opaque ragged mound, shaded down its far side. */
function mound(d: Draw, c: Pt, r: number, deep: string, mid: string, rng: Rng): Pt[] {
  const { pen } = d;
  const shape = blob(c, r, r * 0.95, rng, 0.12, 36, rng() * TAU);
  pen.fill(blob(pt(c.x + SHADOW.x * 6, c.y + SHADOW.y * 6), r * 1.02, r * 0.97, rng, 0.12, 30), d.ink, 0.28);
  pen.fill(shape, deep, 1);
  pen.clipped(shape, () => {
    pen.fill(blob(pt(c.x - r * 0.2, c.y - r * 0.25), r * 0.75, r * 0.65, rng, 0.25, 24), mid, 0.6);
    pen.crescent(shape, pt(-SHADOW.x * r * 0.4, -SHADOW.y * r * 0.4), () => pen.fill(shape, PEAT_DARK, 0.45));
  });
  return shape;
}

/** A ling bush of radius r at c. */
function heather(d: Draw, c: Pt, r: number): void {
  const rng = rngAt(c.x, c.y, 3);
  const bloom = paintingBloom();
  mound(d, c, r * 0.92, LING_DEEP, LING, rng);
  const layers: Record<'deep' | 'mid' | 'bronze' | 'lit', Mark[]> = { deep: [], mid: [], bronze: [], lit: [] };
  const stems: Mark[] = [];
  const flowers: Mark[] = [];
  const flowersLit: Mark[] = [];
  const old: Mark[] = [];
  const n = Math.round(r * r * 1.1);
  for (let i = 0; i < n; i++) {
    const rr = r * Math.sqrt(rng()) * 1.02;
    const a = rng() * TAU;
    const p = polar(c, a, rr);
    const light = domeLight(c, r, p);
    // Sprigs grow outward, splaying more towards the rim.
    const dir = a + (rng() - 0.5) * (2.6 - 1.6 * (rr / r));
    const k = rng();
    const into = k > 1.15 - light ? layers.lit : k < 0.45 - light * 0.4 ? layers.deep : k < 0.6 ? layers.bronze : layers.mid;
    const f = rng() < bloom * (0.12 + 0.5 * light) ? (light > 0.5 && rng() < 0.6 ? flowersLit : flowers) : rng() < 0.25 * (1 - bloom) ? old : null;
    sprig(p.x, p.y, dir, 3.5 + rng() * 4 * (0.6 + rr / r), rng, stems, into, f);
  }
  // Rim sprigs reaching out over the ground, ragged.
  for (let i = 0; i < r * 3; i++) {
    const a = rng() * TAU;
    const p = polar(c, a, r * (0.9 + rng() * 0.12));
    sprig(p.x, p.y, a + (rng() - 0.5) * 0.8, 4 + rng() * 5, rng, stems, domeLight(c, r, p) > 0.5 ? layers.mid : layers.deep, null);
  }
  markShadows(d, [...layers.deep, ...layers.mid, ...layers.bronze, ...layers.lit], 0.22, 1.2, 1);
  strokeMarks(d, stems, '#2e231c', 0.7, 0.5);
  strokeMarks(d, layers.deep, LING_DEEP, 0.95, 0.9);
  strokeMarks(d, layers.bronze, LING_BRONZE, 0.85, 0.8);
  strokeMarks(d, layers.mid, LING, 0.9, 0.8);
  strokeMarks(d, layers.lit, LING_LIT, 0.85, 0.7);
  markShadows(d, [...flowers, ...flowersLit, ...old], 0.2, 1.2, 0.8);
  strokeMarks(d, old, LING_RUST, 0.8, 1);
  strokeMarks(d, flowers, BLOOM, 0.9, 1.15);
  strokeMarks(d, flowers.filter((_, i) => i % 3 === 0), BLOOM_DEEP, 0.7, 0.8);
  strokeMarks(d, flowersLit, BLOOM_LIT, 0.9, 1);
  d.pen.crescent(blob(c, r, r * 0.95, rng, 0.1, 30), pt(-SHADOW.x * r * 0.3, -SHADOW.y * r * 0.3), () => d.pen.hatch(oval(c.x, c.y, r * 1.1, r * 1.1, 30), 2.2, 0.9, 0.4, { color: d.ink, alpha: 0.22 }));
}

/** A gorse flower: two little yellow wings and a keel, deeper at its heart. */
function pea(d: Draw, p: Pt, a: number, s: number, lit: boolean): void {
  for (const side of [-1, 1]) {
    const q = polar(p, a + side * 0.9, s * 0.55);
    d.pen.fill(oval(q.x, q.y, s * 0.6, s * 0.5, 10), lit ? GORSE_FLOWER_LIT : GORSE_FLOWER, 0.97);
  }
  const k = polar(p, a, s * 0.45);
  d.pen.fill(oval(k.x, k.y, s * 0.45, s * 0.38, 8), GORSE_FLOWER, 1);
  d.pen.dot(p.x, p.y, s * 0.25, GORSE_FLOWER_DEEP, 0.9);
}

/** A gorse bush of radius r at c. */
function gorse(d: Draw, c: Pt, r: number): void {
  const rng = rngAt(c.x, c.y, 4);
  mound(d, c, r * 0.94, GORSE_DEEP, GORSE, rng);
  const shoots: Mark[] = [];
  const spines: Record<'deep' | 'mid' | 'lit', Mark[]> = { deep: [], mid: [], lit: [] };
  const blooms: { p: Pt; a: number; s: number; lit: boolean }[] = [];
  for (let i = 0; i < Math.round(r * 5); i++) {
    const rr = r * Math.sqrt(rng());
    const a = rng() * TAU;
    const p = polar(c, a, rr * 0.9);
    const dir = a + (rng() - 0.5) * 1.6;
    const l = 7 + rng() * 9;
    shoots.push([p.x, p.y, dir, l, (rng() - 0.5) * 3]);
    const light = domeLight(c, r, p);
    for (let j = 0; j < l / 1.3; j++) {
      const q = polar(p, dir, j * 1.3);
      for (const side of [-1, 1]) {
        const m: Mark = [q.x, q.y, dir + side * (0.5 + rng() * 0.5), 2 + rng() * 2.2, 0];
        (rng() < light * 0.9 ? spines.lit : rng() < 0.4 ? spines.deep : spines.mid).push(m);
      }
    }
    if (rng() < 0.25 + light * 0.9) {
      const t = polar(p, dir, l * (0.5 + rng() * 0.5));
      blooms.push({ p: t, a: dir + (rng() - 0.5), s: 1.8 + rng() * 0.8, lit: light > 0.55 });
    }
  }
  markShadows(d, [...spines.deep, ...spines.mid, ...spines.lit], 0.24, 0.9, 0.9);
  strokeMarks(d, shoots, '#3a3020', 0.8, 0.9);
  strokeMarks(d, spines.deep, GORSE_DEEP, 0.95, 0.65);
  strokeMarks(d, spines.mid, GORSE, 0.92, 0.6);
  strokeMarks(d, spines.lit, GORSE_LIT, 0.9, 0.55);
  for (const b of blooms) d.pen.fill(oval(b.p.x + 0.9, b.p.y + 1.3, b.s, b.s * 0.8, 10), d.ink, 0.22);
  for (const b of blooms) pea(d, b.p, b.a, b.s, b.lit);
  d.pen.crescent(blob(c, r, r * 0.95, rng, 0.1, 30), pt(-SHADOW.x * r * 0.3, -SHADOW.y * r * 0.3), () => d.pen.hatch(oval(c.x, c.y, r * 1.1, r * 1.1, 30), 2, 0.9, 0.4, { color: d.ink, alpha: 0.25 }));
  d.pen.hair(closed(blob(c, r * 0.98, r * 0.93, rng, 0.14, 30)).slice(8, 24), 0.6, d.ink, 0.35);
}

export function paintHeathCover(d: Draw, c: CoverDef): void {
  if (c.look === 'gorse') gorse(d, pt(c.x, c.y), c.r);
  else heather(d, pt(c.x, c.y), c.r);
}
