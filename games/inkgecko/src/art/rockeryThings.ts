import type { Rng } from '../logic/rng';
import { arc, blob, body, castShadow, polar, SHADOW } from './groundKit';
import { bezier, closed, type Draw, oval, pt, shade, TAU } from './kit';
import { LEAF, MOSS, PAPER_FILL, STONE, STONE_DARK } from './palette';
import type { Pt } from './pen';
import { mix } from './wash';

/**
 * The rockery's stones and plants, seen from above: weathered boulders and
 * slabs with their bedding lines and lichen, pebbles, alpine cushions
 * (mossy saxifrage, thrift, houseleek rosettes, aubrieta) and shade ferns.
 * Board coordinates; each takes the rng it draws its variety from.
 */
export const ROCK = '#b9b1a1';
const ROCK_WARM = '#c7b28d';
const ROCK_COOL = '#a3aba8';
const LICHEN = '#c9c47e';
const LICHEN_GREY = '#d9d8cc';
const SAXIFRAGE = '#7fa65a';
const THRIFT_LEAF = '#7f9a6e';
const THRIFT = '#e39ab5';
const HOUSELEEK = '#9fb67c';
const HOUSELEEK_TIP = '#a5473f';
const AUBRIETA = '#9a6fc0';
const FERN = '#6a9a4c';

/** A rough stone outline: a lumpy polygon with worn corners, `flat` squashing it into a slab, turned by `turn`. */
export function stoneShape(c: Pt, r: number, rng: Rng, flat = 1, turn = 0): Pt[] {
  const n = 7 + Math.floor(rng() * 4);
  const corners = Array.from({ length: n }, (_, i) => {
    const a = ((i + rng() * 0.6) / n) * TAU;
    const k = 0.8 + rng() * 0.3;
    const x = Math.cos(a) * r * k;
    const y = Math.sin(a) * r * k * flat;
    return pt(c.x + x * Math.cos(turn) - y * Math.sin(turn), c.y + x * Math.sin(turn) + y * Math.cos(turn));
  });
  // Round each corner with a short curve through the side midpoints.
  return corners.flatMap((p, i) => {
    const a = corners[(i - 1 + n) % n]!;
    const b = corners[(i + 1) % n]!;
    return bezier(pt((a.x + p.x) / 2, (a.y + p.y) / 2), p, pt((p.x + b.x) / 2, (p.y + b.y) / 2), 4).slice(0, 4);
  });
}

/** A weathered boulder (or a slab, flat < 1): heavy shadow, bedding lines, cracks, lichen and moss, hatched on its shady side. */
export function boulder(d: Draw, c: Pt, r: number, rng: Rng, flat = 1, turn = rng() * TAU): Pt[] {
  const { pen } = d;
  const shape = stoneShape(c, r, rng, flat, turn);
  castShadow(d, shape, r * 0.32, 0.12);
  castShadow(d, shape, r * 0.18, 0.12);
  body(d, shape, mix(rng() < 0.5 ? ROCK_WARM : ROCK_COOL, ROCK, rng() * 0.5), 0.8);
  pen.clipped(shape, () => {
    // Modelling: the whole stone dulled, its top lit where it faces the light.
    pen.fill(shape, STONE_DARK, 0.18);
    pen.fill(blob(pt(c.x - SHADOW.x * r * 0.25, c.y - SHADOW.y * r * 0.25), r * 0.62, r * 0.55 * flat, rng, 0.2, 18, turn), PAPER_FILL, 0.32);
    // Bedding planes across the stone, and weathering blooms.
    const bed = turn + 0.3 + (rng() - 0.5) * 0.4;
    for (let k = -3; k <= 3; k++) {
      const o = polar(c, bed + Math.PI / 2, k * r * 0.28 + (rng() - 0.5) * 6);
      pen.hair(arc(polar(o, bed, -r * 1.2), polar(o, bed, r * 1.2), (rng() - 0.5) * r * 0.3, 10), 0.5, d.ink, 0.22 + rng() * 0.15);
    }
    for (let k = 0; k < 4; k++) pen.fill(blob(polar(c, rng() * TAU, rng() * r * 0.6), r * (0.15 + rng() * 0.25), r * (0.1 + rng() * 0.15), rng, 0.3, 14), STONE_DARK, 0.1);
    pen.stipple(shape, Math.round(r * 3), () => 0.6, 0.6, STONE_DARK);
    // Lichen rosettes and moss on the top, where it's damp and shaded.
    for (let k = 0; k < 2 + Math.floor(r / 20); k++) {
      const p = polar(c, rng() * TAU, rng() * r * 0.7);
      const lr = 3 + rng() * 6;
      pen.fill(blob(p, lr, lr * 0.85, rng, 0.25, 14), rng() < 0.5 ? LICHEN : LICHEN_GREY, 0.55);
      pen.hair(closed(blob(p, lr, lr * 0.85, rng, 0.25, 14)), 0.4, d.ink, 0.3);
    }
    for (let k = 0; k < r * 0.8; k++) {
      const p = polar(c, -2.2 + (rng() - 0.5) * 1.6, r * (0.55 + rng() * 0.45));
      pen.fill(oval(p.x, p.y, 1.5 + rng() * 2.4, 1.2 + rng() * 1.8, 8), rng() < 0.4 ? LEAF : MOSS, 0.55);
    }
  });
  pen.crescent(shape, pt(-SHADOW.x * r * 0.25, -SHADOW.y * r * 0.25), () => pen.fill(shape, mix(STONE_DARK, d.ink, 0.25), 0.45));
  pen.crescent(shape, pt(SHADOW.x * r * 0.15, SHADOW.y * r * 0.15), () => pen.fill(shape, PAPER_FILL, 0.3));
  shade(d, shape, 0.4, r > 40);
  // A crack or two.
  for (let k = 0; k < (r > 35 ? 2 : 1); k++) {
    const p = polar(c, rng() * TAU, r * 0.9);
    const q = polar(p, Math.atan2(c.y - p.y, c.x - p.x) + (rng() - 0.5) * 0.8, r * (0.3 + rng() * 0.3));
    pen.stroke([p, polar(pt((p.x + q.x) / 2, (p.y + q.y) / 2), rng() * TAU, 2), q], 0.9, d.ink, 0.7, false);
  }
  pen.stroke(closed(shape), 1.3, d.ink, 0.95);
  return shape;
}

/** A pebble with its shadow. */
export function pebble(d: Draw, c: Pt, r: number, rng: Rng): void {
  const { pen } = d;
  const shape = blob(c, r * (1 + rng() * 0.4), r, rng, 0.12, 12, rng() * TAU);
  castShadow(d, shape, r * 0.5, 0.14);
  body(d, shape, mix(STONE, rng() < 0.3 ? '#b7a189' : STONE_DARK, rng() * 0.6), 0.6);
  pen.crescent(shape, pt(-r * 0.35, -r * 0.5), () => pen.fill(shape, STONE_DARK, 0.4));
  pen.hair(closed(shape), 0.5, d.ink, 0.65);
}

/** A cushion of mossy saxifrage studded with tiny white flowers. */
function saxifrage(d: Draw, c: Pt, r: number, rng: Rng): void {
  const { pen } = d;
  const mound = blob(c, r, r * 0.9, rng, 0.15, 24);
  castShadow(d, mound, 4, 0.15);
  body(d, mound, SAXIFRAGE, 0.75);
  pen.clipped(mound, () => {
    for (let k = 0; k < r * 3; k++) {
      const p = polar(c, rng() * TAU, Math.sqrt(rng()) * r);
      pen.fill(oval(p.x, p.y, 1.4 + rng() * 1.4, 1.2 + rng(), 7), rng() < 0.5 ? mix(SAXIFRAGE, '#c8d98a', 0.5) : mix(SAXIFRAGE, d.ink, 0.35), 0.6);
    }
  });
  pen.crescent(mound, pt(-SHADOW.x * r * 0.3, -SHADOW.y * r * 0.3), () => pen.fill(mound, mix(SAXIFRAGE, d.ink, 0.5), 0.35));
  for (let k = 0; k < r * 0.9; k++) {
    const p = polar(c, rng() * TAU, Math.sqrt(rng()) * r * 0.85);
    for (let s = 0; s < 5; s++) pen.hair([p, polar(p, (s / 5) * TAU, 1.8)], 0.7, PAPER_FILL, 0.95);
    pen.dot(p.x, p.y, 0.5, '#d9b23a', 0.9);
  }
  pen.hair(closed(mound), 0.6, d.ink, 0.6);
}

/** A tuft of thrift: fine grassy leaves and pink pompom flower heads. */
function thrift(d: Draw, c: Pt, r: number, rng: Rng): void {
  const { pen } = d;
  const tuftShape = blob(c, r, r * 0.9, rng, 0.2, 20);
  castShadow(d, tuftShape, 4, 0.12);
  body(d, tuftShape, THRIFT_LEAF, 0.6);
  for (let k = 0; k < r * 2.5; k++) {
    const a = rng() * TAU;
    pen.hair([polar(c, a, r * 0.2 * rng()), polar(c, a + (rng() - 0.5) * 0.3, r * (0.6 + rng() * 0.45))], 0.55, mix(THRIFT_LEAF, d.ink, 0.3), 0.6);
  }
  for (let k = 0; k < 3 + Math.floor(r / 6); k++) {
    const p = polar(c, rng() * TAU, Math.sqrt(rng()) * r * 0.75);
    const head = oval(p.x, p.y, 3.6, 3.6, 12);
    castShadow(d, head, 3, 0.15);
    body(d, head, THRIFT, 0.9);
    pen.stipple(head, 10, () => 0.8, 0.45, '#b4567a');
    pen.hair(closed(head), 0.45, d.ink, 0.7);
  }
}

/** A houseleek (sempervivum) rosette: pointed fleshy leaves in rings, red-tipped. */
function houseleek(d: Draw, c: Pt, r: number, rng: Rng): void {
  const { pen } = d;
  castShadow(d, oval(c.x, c.y, r, r, 16), 3, 0.15);
  const turn = rng() * TAU;
  for (const [rr, n] of [[r, 11], [r * 0.7, 8], [r * 0.4, 5]] as const) {
    for (let k = 0; k < n; k++) {
      const a = turn + (k / n) * TAU + rr * 0.05;
      const tip = polar(c, a, rr);
      const leafShape = [...arc(polar(c, a, rr * 0.15), tip, rr * 0.2, 5), ...arc(tip, polar(c, a, rr * 0.15), rr * 0.2, 5).slice(1)];
      body(d, leafShape, mix(HOUSELEEK, '#c4d29a', rr < r ? 0.35 : 0), 0.8);
      pen.clipped(leafShape, () => pen.fill(oval(tip.x, tip.y, rr * 0.25, rr * 0.25, 10), HOUSELEEK_TIP, 0.75));
      pen.hair(closed(leafShape), 0.45, d.ink, 0.7);
    }
  }
}

/** A mat of aubrieta: a low spreading cushion smothered in small purple flowers. */
function aubrieta(d: Draw, c: Pt, r: number, rng: Rng): void {
  const { pen } = d;
  const mat = blob(c, r * 1.2, r * 0.8, rng, 0.25, 22, rng() * TAU);
  castShadow(d, mat, 3, 0.12);
  body(d, mat, '#7f9a60', 0.6);
  for (let k = 0; k < r * 2.2; k++) {
    const p = polar(c, rng() * TAU, Math.sqrt(rng()) * r * 0.95);
    for (let s = 0; s < 4; s++) {
      const q = polar(p, (s / 4) * TAU + 0.4, 1.3);
      pen.fill(oval(q.x, q.y, 1.3, 1.3, 6), mix(AUBRIETA, PAPER_FILL, rng() * 0.3), 0.9);
    }
  }
  pen.hair(closed(mat), 0.5, d.ink, 0.5);
}

/** An alpine at c, roughly radius r: one of saxifrage, thrift, houseleeks or aubrieta. */
export function alpine(d: Draw, c: Pt, r: number, rng: Rng): void {
  const kind = rng();
  if (kind < 0.3) saxifrage(d, c, r, rng);
  else if (kind < 0.55) thrift(d, c, r * 0.85, rng);
  else if (kind < 0.8) {
    houseleek(d, c, r * 0.8, rng);
    if (rng() < 0.7) houseleek(d, polar(c, rng() * TAU, r * 0.95), r * 0.5, rng);
  } else aubrieta(d, c, r, rng);
}

/** A fern frond: a curving stem with paired leaflets shrinking to the tip. */
function frond(d: Draw, base: Pt, ang: number, len: number, bend: number): void {
  const { pen } = d;
  const tip = polar(polar(base, ang, len), ang + Math.PI / 2, bend);
  const rachis = arc(base, tip, bend * 0.4, 22);
  const wash = mix(FERN, '#ffffff', 0.12);
  for (let i = 2; i < rachis.length - 1; i++) {
    const p = rachis[i]!;
    const q = rachis[i + 1]!;
    const a = Math.atan2(q.y - p.y, q.x - p.x);
    const t = i / rachis.length;
    const size = len * 0.17 * Math.sin(Math.PI * Math.min(1, t * 1.1)) + 2;
    for (const side of [1, -1]) {
      const end = polar(p, a + side * 1.1, size);
      const leaflet = [...arc(p, end, side * size * 0.25, 4), ...arc(end, p, side * size * 0.25, 4).slice(1)];
      pen.fill(leaflet, wash, 0.55);
      if (i % 2 === 0) pen.hair(leaflet, 0.4, d.ink, 0.4);
    }
  }
  pen.stroke(rachis, 1, mix(FERN, d.ink, 0.5), 0.75, false);
}

/** A shade fern: fronds fanning out from a crown along `ang`. */
export function fern(d: Draw, base: Pt, ang: number, len: number): void {
  for (let i = 0; i < 5; i++) {
    const k = i / 4 - 0.5;
    frond(d, base, ang + k * 1.5, len * (0.75 + 0.25 * Math.cos(k * 2)), (k < 0 ? -1 : 1) * len * 0.12);
  }
}
