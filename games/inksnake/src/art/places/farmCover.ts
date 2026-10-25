import type { Rng } from '../../logic/rng';
import type { CoverDef } from '../../level/types';
import { arc, blob, body, castShadow, polar, SHADOW } from '../groundKit';
import { closed, type Draw, oval, pt, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { mix } from '../wash';
import { GRASS, GRASS_DEEP, GRASS_LIT, ring, strokes } from './farmKit';
import { rngAt } from './farmSolids';

/**
 * The farm's cover, painted on the layer over the snake: a patch of big
 * cabbages, a clump of long meadow grass, pumpkin vines with their fruit.
 * Each stays inside about r × 1.15 of its centre, opaque, its edge leafy
 * and irregular, lit from the upper left with the shade on the lower right.
 */
const CABBAGE = '#74a07c';
const CABBAGE_DEEP = '#4f7a64';
const CABBAGE_HEART = '#cfe0a4';
const PUMPKIN = '#e07a2a';
const PUMPKIN_LIT = '#f4ad4a';
const PUMPKIN_DEEP = '#a2461a';
const VINE_LEAF = '#5c8d44';
const VINE_LIT = '#93b956';
const SEED = '#b39a5e';

/** The cover's reach: nothing is painted past c.r × this. */
const REACH = 1.15;

/** One cabbage, radius r: wrapper leaves fanned round a pale tight heart, ribbed and veined, shaded down-right. */
function cabbage(d: Draw, c: Pt, r: number, rng: Rng): void {
  const { pen } = d;
  castShadow(d, blob(c, r, r * 0.95, rng, 0.12, 18), r * 0.25, 0.22);
  const n = 7 + Math.floor(rng() * 2);
  const turn = rng() * TAU;
  // Outer wrapper leaves, spread wide and frilled at the edge.
  for (let k = 0; k < n; k++) {
    const a = turn + (k / n) * TAU + (rng() - 0.5) * 0.3;
    const lc = polar(c, a, r * 0.52);
    const leaf = ring(lc, 22, (t) => {
      const along = Math.cos(t - a);
      return r * (0.44 + 0.08 * along) * (1 + 0.07 * Math.sin(t * 7 + k));
    });
    const tone = mix(CABBAGE, rng() < 0.5 ? '#9fb879' : '#6f9a8a', rng() * 0.4);
    body(d, leaf, tone, 0.82);
    pen.clipped(leaf, () => {
      pen.fill(oval(lc.x - SHADOW.x * r * 0.12, lc.y - SHADOW.y * r * 0.12, r * 0.25, r * 0.2, 12), PAPER_FILL, 0.14);
      // The midrib and the veins branching off it.
      pen.hair([polar(c, a, r * 0.25), polar(c, a, r * 0.95)], 1.1, mix(PAPER_FILL, tone, 0.45), 0.65);
      for (let v = 0; v < 3; v++) {
        const base = polar(c, a, r * (0.45 + v * 0.15));
        for (const s of [1, -1]) pen.hair([base, polar(base, a + s * 0.9, r * 0.28)], 0.45, mix(PAPER_FILL, tone, 0.35), 0.45);
      }
    });
    pen.crescent(leaf, pt(-SHADOW.x * r * 0.16, -SHADOW.y * r * 0.16), () => pen.fill(leaf, mix(CABBAGE_DEEP, d.ink, 0.3), 0.42));
    pen.hair(closed(leaf), 0.6, d.ink, 0.7);
  }
  // Inner leaves cupped round the heart.
  for (let k = 0; k < 4; k++) {
    const a = turn + 0.4 + (k / 4) * TAU;
    const leaf = blob(polar(c, a, r * 0.2), r * 0.32, r * 0.25, rng, 0.1, 14, a);
    body(d, leaf, mix(CABBAGE, CABBAGE_HEART, 0.45), 0.85);
    pen.crescent(leaf, pt(-SHADOW.x * r * 0.1, -SHADOW.y * r * 0.1), () => pen.fill(leaf, CABBAGE_DEEP, 0.35));
    pen.hair(closed(leaf), 0.5, d.ink, 0.65);
  }
  const heart = blob(c, r * 0.26, r * 0.24, rng, 0.06, 16);
  castShadow(d, heart, r * 0.06, 0.2);
  body(d, heart, CABBAGE_HEART, 0.85);
  pen.fill(oval(c.x - r * 0.07, c.y - r * 0.08, r * 0.12, r * 0.09, 10), PAPER_FILL, 0.5);
  pen.hair(arc(polar(c, turn, r * 0.18), polar(c, turn + 2.2, r * 0.18), r * 0.08, 6), 0.5, d.ink, 0.5);
  pen.crescent(heart, pt(-SHADOW.x * r * 0.08, -SHADOW.y * r * 0.08), () => pen.fill(heart, CABBAGE_DEEP, 0.3));
  pen.stroke(closed(heart), 0.8, d.ink, 0.8, false);
}

/** A patch of big cabbages filling the cover: a mass of leaves under them so nothing shows through, the cabbages crowding over it. */
function cabbagePatch(d: Draw, c: CoverDef, rng: Rng): void {
  const r = c.r;
  const mass = blob(pt(c.x, c.y), r * 0.98, r * 0.94, rng, 0.12, 30);
  castShadow(d, mass, r * 0.12, 0.2);
  body(d, mass, mix(CABBAGE_DEEP, '#3f5f45', 0.4), 0.85);
  const n = 4 + Math.floor(rng() * 2);
  const turn = rng() * TAU;
  const heads: [Pt, number][] = Array.from({ length: n }, (_, k) => [polar(pt(c.x, c.y), turn + (k / n) * TAU + (rng() - 0.5) * 0.3, r * (0.55 + rng() * 0.06)), r * (0.42 + rng() * 0.06)]);
  heads.push([pt(c.x + (rng() - 0.5) * r * 0.1, c.y + (rng() - 0.5) * r * 0.1), r * 0.46]);
  heads.sort((a, b) => a[0].y - b[0].y);
  for (const [p, rr] of heads.slice(0, -1)) cabbage(d, p, rr, rng);
  // The middle one last, sitting up over its neighbours.
  const [mid, mr] = heads.find(([p]) => Math.hypot(p.x - c.x, p.y - c.y) < r * 0.2) ?? heads[heads.length - 1]!;
  cabbage(d, mid, mr, rng);
  for (const [p, rr] of heads) if (p !== mid && p.y > mid.y + r * 0.3) cabbage(d, p, rr * 0.98, rng);
}

/**
 * A clump of long meadow grass: tussocks crowded together, each a fountain
 * of long blades arching out from its root, combed one way by the wind, so
 * the clump's edge is lobed and spiky; deep in the middle, lit on the tops
 * towards the light; a few dead straw blades, seed heads, a buttercup.
 */
function grassClump(d: Draw, c: CoverDef, rng: Rng): void {
  const { pen } = d;
  const r = c.r;
  const centre = pt(c.x, c.y);
  const reach = r * (REACH - 0.03);
  const turn = rng() * TAU;
  const n = 6 + Math.floor(rng() * 2);
  const tussocks: [Pt, number][] = [[polar(centre, rng() * TAU, r * 0.08), r * 0.46]];
  for (let k = 0; k < n; k++) {
    const p = polar(centre, turn + (k / n) * TAU + (rng() - 0.5) * 0.5, r * (0.46 + rng() * 0.14));
    tussocks.push([p, Math.min(r * (0.3 + rng() * 0.12), (reach - Math.hypot(p.x - c.x, p.y - c.y)) / 1.15)]);
  }
  // Back to front: the ones nearer the top of the page first.
  tussocks.sort((a, b) => a[0].y - b[0].y);
  const wind = rng() * TAU;
  for (const [p, rad] of tussocks) castShadow(d, blob(p, rad * 0.95, rad * 0.85, rng, 0.25, 16), rad * 0.4, 0.14);
  for (const [p, rad] of tussocks) body(d, blob(p, rad * 0.85, rad * 0.8, rng, 0.25, 16), '#3a5a30', 0.9);
  const blade = (p: Pt, rad: number, lenK: number, lit: number) => (): readonly [number, number, number, number, number] | null => {
    const a0 = rng() * TAU;
    // Lit passes keep to the side of the tussock towards the light.
    if (lit > 0 && Math.cos(a0 - 3.99) < 1 - lit * 2) return null;
    const a = a0 + 0.45 * Math.sin(wind - a0);
    const start = polar(p, a0, rng() * rad * 0.3);
    let len = rad * lenK * (0.6 + rng() * 0.6);
    // Keep the tip inside the cover's reach.
    for (let i = 0; i < 4 && Math.hypot(start.x + Math.cos(a) * len - c.x, start.y + Math.sin(a) * len - c.y) > reach; i++) len *= 0.75;
    if (len < 4) return null;
    return [start.x, start.y, a, len, len * 0.22 * Math.sin(wind - a)];
  };
  for (const [p, rad] of tussocks) {
    const k = rad / (r * 0.4);
    strokes(d, '#2a4226', 0.75, 1.5, Math.round(150 * k), blade(p, rad, 1.25, 0));
    strokes(d, GRASS_DEEP, 0.85, 1.25, Math.round(190 * k), blade(p, rad, 1.2, 0));
    strokes(d, mix(GRASS, '#7f8f4a', 0.3), 0.85, 1.05, Math.round(170 * k), blade(p, rad, 1.05, 0));
    strokes(d, '#c8b87a', 0.8, 0.9, Math.round(18 * k), blade(p, rad, 1.1, 0));
    strokes(d, '#93a85a', 0.85, 0.95, Math.round(200 * k), blade(p, rad, 0.9, 0.45));
    strokes(d, GRASS_LIT, 0.85, 0.8, Math.round(140 * k), blade(p, rad, 0.75, 0.3));
    // A few tapered blades over the top, catching the light.
    for (let i = 0; i < 6; i++) {
      const a0 = 3.99 + (rng() - 0.5) * 2;
      const a = a0 + 0.45 * Math.sin(wind - a0);
      const st = polar(p, a0, rng() * rad * 0.2);
      const len = Math.min(rad * (0.6 + rng() * 0.4), reach - Math.hypot(st.x - c.x, st.y - c.y) - 2);
      if (len < 5) continue;
      pen.hair(arc(st, polar(st, a, len), len * 0.2 * Math.sin(wind - a), 6), 1.1, mix(GRASS_LIT, '#e2e8b0', rng() * 0.6), 0.9);
    }
  }
  // Seed heads nodding at the tips round the rim.
  for (let k = 0; k < 34; k++) {
    const a = rng() * TAU;
    const p = polar(centre, a, r * (0.6 + rng() * 0.45));
    const head = blob(p, 2.6, 1.1, rng, 0.2, 8, a + 0.45 * Math.sin(wind - a));
    pen.fill(head, SEED, 0.9);
    pen.hair(closed(head), 0.35, d.ink, 0.5);
  }
  for (let k = 0; k < 1 + Math.floor(rng() * 2); k++) {
    const p = polar(centre, rng() * TAU, r * rng() * 0.6);
    castShadow(d, oval(p.x, p.y, 4.6, 4.6, 12), 2.5, 0.25);
    for (let i = 0; i < 5; i++) {
      const q = polar(p, (i / 5) * TAU, 2.3);
      pen.fill(oval(q.x, q.y, 2.4, 2.4, 8), '#f2c62a', 0.95);
    }
    pen.dot(p.x - 1.2, p.y - 1.2, 0.8, PAPER_FILL, 0.9);
    pen.dot(p.x, p.y, 0.9, '#8a7a2a', 0.9);
    pen.hair(closed(oval(p.x, p.y, 4.6, 4.6, 12)), 0.4, d.ink, 0.5);
  }
}

/** A pumpkin leaf: broad, five-lobed, its stalk at `base`, opened towards a; veined from the stalk, mottled, shaded. */
function vineLeaf(d: Draw, c: Pt, s: number, a: number, rng: Rng): void {
  const { pen } = d;
  const base = polar(c, a + Math.PI, s * 0.55);
  const leaf = ring(c, 36, (t) => {
    const rel = t - a;
    const lobes = 0.72 + 0.28 * Math.abs(Math.cos(rel * 2.5));
    const notch = 1 - 0.45 * Math.max(0, Math.cos(rel - Math.PI)) ** 8;
    return s * lobes * notch * (1 + 0.04 * Math.sin(t * 11));
  });
  castShadow(d, leaf, s * 0.22, 0.22);
  const tone = mix(VINE_LEAF, VINE_LIT, rng() * 0.6);
  body(d, leaf, tone, 0.85);
  pen.clipped(leaf, () => {
    pen.fill(oval(c.x - SHADOW.x * s * 0.3, c.y - SHADOW.y * s * 0.3, s * 0.5, s * 0.4, 14), PAPER_FILL, 0.18);
    for (let k = 0; k < 8; k++) pen.fill(blob(polar(c, rng() * TAU, rng() * s * 0.7), 2 + rng() * 3, 1.5 + rng() * 2, rng, 0.3, 8), '#c9d9a4', 0.35);
    for (let v = -2; v <= 2; v++) {
      const tip = polar(c, a + v * 1.05, s * 0.85);
      pen.hair(arc(base, tip, v * s * 0.04, 6), v === 0 ? 0.9 : 0.6, mix(PAPER_FILL, tone, 0.25), 0.75);
    }
  });
  pen.crescent(leaf, pt(-SHADOW.x * s * 0.25, -SHADOW.y * s * 0.25), () => pen.fill(leaf, mix(VINE_LEAF, d.ink, 0.45), 0.4));
  pen.hair(closed(leaf), 0.6, d.ink, 0.75);
}

/** A pumpkin seen from above, radius r: ribs running out from the stalk, lit top, deep shade down-right, the stalk and its curl. */
function pumpkin(d: Draw, c: Pt, r: number, rng: Rng): void {
  const { pen } = d;
  const ribs = 8 + Math.floor(rng() * 3);
  const turn = rng() * TAU;
  const shape = ring(c, ribs * 6, (t) => r * (0.94 + 0.06 * Math.abs(Math.cos(((t - turn) * ribs) / 2))));
  castShadow(d, shape, r * 0.35, 0.28);
  body(d, shape, PUMPKIN, 0.92);
  pen.clipped(shape, () => {
    pen.fill(blob(pt(c.x - SHADOW.x * r * 0.3, c.y - SHADOW.y * r * 0.3), r * 0.62, r * 0.55, rng, 0.2, 16), PUMPKIN_LIT, 0.7);
    pen.fill(oval(c.x - r * 0.35, c.y - r * 0.4, r * 0.2, r * 0.12, 10), PAPER_FILL, 0.45);
    for (let k = 0; k < ribs; k++) {
      const a = turn + (k / ribs) * TAU;
      pen.hair(arc(polar(c, a, r * 0.16), polar(c, a, r * 1.02), r * 0.08, 8), 0.7, PUMPKIN_DEEP, 0.6);
    }
  });
  pen.crescent(shape, pt(-SHADOW.x * r * 0.35, -SHADOW.y * r * 0.35), () => pen.fill(shape, PUMPKIN_DEEP, 0.45));
  pen.crescent(shape, pt(-SHADOW.x * r * 0.25, -SHADOW.y * r * 0.25), () => pen.hatch(shape, 2.2, 0.9, 0.4, { color: d.ink, alpha: 0.3 }));
  pen.stroke(closed(shape), 1.1, d.ink, 0.9);
  const stalk = blob(c, r * 0.16, r * 0.14, rng, 0.2, 10);
  castShadow(d, stalk, 3, 0.35);
  body(d, stalk, '#7a7a3a', 0.9);
  pen.hair(closed(stalk), 0.6, d.ink, 0.85);
  const end = polar(c, turn + 0.6, r * 0.42);
  pen.stroke(arc(c, end, r * 0.12, 6), 2.6, '#6b6a34', 0.95, false);
  pen.hair(arc(c, end, r * 0.12, 6), 0.5, d.ink, 0.8);
}

/** A curling tendril from p. */
function tendril(d: Draw, p: Pt, a: number, s: number, rng: Rng): void {
  const pts = Array.from({ length: 18 }, (_, i) => polar(p, a + i * 0.45 * (rng() < 0.5 ? 1 : 1), s * (1 - i / 22) * (i / 17)));
  d.pen.hair(pts.map((q, i) => polar(q, a + i * 0.5, s * 0.12 * Math.sin(i * 0.9))), 0.6, '#6f8e3a', 0.9);
}

/** Pumpkin vines over the cover: a mass of leaf, runners, big lobed leaves, one or two pumpkins among them, a yellow flower, tendrils. */
function pumpkinPatch(d: Draw, c: CoverDef, rng: Rng): void {
  const { pen } = d;
  const r = c.r;
  const centre = pt(c.x, c.y);
  const mass = blob(centre, r * 0.95, r * 0.88, rng, 0.15, 30);
  castShadow(d, mass, r * 0.12, 0.2);
  body(d, mass, mix(VINE_LEAF, '#2f4a2a', 0.5), 0.88);
  // Runners out from the root.
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * TAU + rng() * 0.6;
    pen.stroke(arc(centre, polar(centre, a, r * 0.95), (rng() - 0.5) * r * 0.4, 10), 2.4, '#6f8e3a', 0.9, false);
  }
  const leaves: [Pt, number, number][] = [];
  const nOuter = 8 + Math.floor(rng() * 3);
  for (let k = 0; k < nOuter; k++) {
    const a = (k / nOuter) * TAU + (rng() - 0.5) * 0.3;
    const s = r * (0.3 + rng() * 0.06);
    leaves.push([polar(centre, a, r * REACH - s * 1.05 - 2), s, a]);
  }
  for (let k = 0; k < 4; k++) {
    const a = rng() * TAU;
    leaves.push([polar(centre, a, r * (0.2 + rng() * 0.2)), r * (0.3 + rng() * 0.06), a]);
  }
  const fruitN = r > 60 && rng() < 0.6 ? 2 : 1;
  const fa = rng() * TAU;
  const fruit: [Pt, number][] = Array.from({ length: fruitN }, (_, k) => [polar(centre, fa + k * 2.6, fruitN === 1 ? r * 0.12 : r * 0.36), r * (fruitN === 1 ? 0.34 : 0.28)]);
  // Outer leaves under, then the fruit, then the inner leaves half over the fruit's rim.
  for (const [p, s, a] of leaves.slice(0, nOuter)) vineLeaf(d, p, s, a, rng);
  for (const [p, rr] of fruit) pumpkin(d, p, rr, rng);
  for (const [p, s, a] of leaves.slice(nOuter)) {
    const onFruit = fruit.some(([f, fr]) => Math.hypot(f.x - p.x, f.y - p.y) < fr * 0.8);
    if (!onFruit) vineLeaf(d, p, s, a, rng);
  }
  // A flower trumpet, and tendrils curling off the runners.
  const fp = polar(centre, fa + 1.4, r * 0.55);
  const petals = ring(fp, 20, (t) => 6.5 * (0.75 + 0.25 * Math.abs(Math.cos(t * 2.5))));
  castShadow(d, petals, 2.5, 0.25);
  body(d, petals, '#f2b82e', 0.95);
  pen.fill(oval(fp.x + 0.5, fp.y + 0.6, 2.4, 2.4, 10), '#c97a14', 0.9);
  pen.hair(closed(petals), 0.5, d.ink, 0.75);
  for (let k = 0; k < 5; k++) tendril(d, polar(centre, rng() * TAU, r * (0.5 + rng() * 0.4)), rng() * TAU, 9 + rng() * 5, rng);
}

/** One patch of the farm's cover, by its look. */
export function paintCover(d: Draw, c: CoverDef): void {
  const rng = rngAt(c.x, c.y, 9);
  // Nothing past the cover's reach: the layer lies over the snake.
  d.pen.clipped(oval(c.x, c.y, c.r * REACH, c.r * REACH, 48), () => {
    if (c.look === 'cabbage') cabbagePatch(d, c, rng);
    else if (c.look === 'pumpkin') pumpkinPatch(d, c, rng);
    else grassClump(d, c, rng);
  });
}
