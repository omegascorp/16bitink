import type { Rng } from '../../logic/rng';
import { blob, body, castShadow, polar, SHADOW } from '../groundKit';
import { closed, type Draw, pt, shade, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { specks } from '../places/farmGroundParts';
import { glaze } from '../snakes/cornPaint';
import { mix } from '../wash';
import { rngAt, SAND, SAND_DEEP, VARNISH, WIND } from './dunesPlaceKit';

/**
 * The Dunes' rocks seen from above, each filling its collision shape, lit
 * from the upper left, its shadow thrown down-right: weathered Mojave
 * granite, pink-grey and speckled with black mica, rounded by the wind,
 * streaked with dark desert varnish, split by joints, a few flecks of
 * orange lichen, sand drifted against its windward foot.
 */
const GRANITE = '#c4ab90';
const GRANITE_PINK = '#d6b294';
const GRANITE_GREY = '#9d9286';
const GRANITE_DEEP = '#5f5446';
const MICA = '#2a2522';
const LICHEN = '#d8893a';

/** A round outline squared off by `pow`, wobbling a little: rocks are never quite oval. */
function rockShape(c: Pt, rx: number, ry: number, pow: number, rough: number, rng: Rng, n = 40): Pt[] {
  const e = 2 / pow;
  const ph = [rng() * TAU, rng() * TAU, rng() * TAU];
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * TAU;
    const cs = Math.cos(a);
    const sn = Math.sin(a);
    const k = 1 + rough * (0.5 * Math.sin(2 * a + ph[0]!) + 0.3 * Math.sin(3 * a + ph[1]!) + 0.2 * Math.sin(7 * a + ph[2]!));
    return pt(c.x + Math.sign(cs) * Math.abs(cs) ** e * rx * k, c.y + Math.sign(sn) * Math.abs(sn) ** e * ry * k);
  });
}

/** Sand drifted against a rock's windward foot, and a little tail of it in the lee. */
function drift(d: Draw, c: Pt, rx: number, ry: number, rng: Rng): void {
  const up = pt(c.x - WIND.x * rx * 0.85, c.y - WIND.y * ry * 0.85);
  const pile = blob(up, rx * 0.45 + 6, ry * 0.75 + 4, rng, 0.25, 18, Math.atan2(WIND.y, WIND.x) + Math.PI / 2);
  d.pen.fill(pile, PAPER_FILL, 0.35);
  d.pen.fill(pile, SAND, 0.7);
  d.pen.crescent(pile, pt(-SHADOW.x * 4, -SHADOW.y * 4), () => d.pen.fill(pile, SAND_DEEP, 0.18));
  const lee = blob(pt(c.x + WIND.x * (rx + 8), c.y + WIND.y * (ry + 8)), rx * 0.3 + 4, ry * 0.4 + 2, rng, 0.3, 14, Math.atan2(WIND.y, WIND.x));
  d.pen.fill(lee, SAND, 0.45);
}

/**
 * The granite's skin inside `shape` (centre c, half-extents rx × ry): its
 * mottled wash, the speckle of mica and feldspar, varnish streaks, lichen,
 * the dome's light and its hatched core shadow.
 */
function granite(d: Draw, shape: readonly Pt[], c: Pt, rx: number, ry: number, rng: Rng): void {
  const { pen } = d;
  const { ctx } = pen;
  body(d, shape, mix(GRANITE, GRANITE_PINK, rng() * 0.6), 0.9);
  pen.clipped(shape, () => {
    for (let k = 0; k < 7; k++) {
      const p = pt(c.x + (rng() - 0.5) * rx * 1.6, c.y + (rng() - 0.5) * ry * 1.6);
      glaze(ctx, p.x, p.y, 6 + rng() * rx * 0.4, 4 + rng() * ry * 0.4, rng() * TAU, rng() < 0.5 ? GRANITE_GREY : GRANITE_PINK, 0.3);
    }
    // Desert varnish: dark streaks where water ran down from the top.
    for (let k = 0; k < 3 + Math.floor(rng() * 3); k++) {
      const p = pt(c.x + (rng() - 0.3) * rx * 1.4, c.y + (rng() - 0.2) * ry * 1.2);
      glaze(ctx, p.x, p.y, 3 + rng() * 5, 1.5 + rng() * 2.5, rng() * TAU, VARNISH, 0.35 + rng() * 0.2);
    }
    const area = rx * ry;
    const grit = (n: number, r0: number, r1: number): (readonly [number, number, number])[] =>
      Array.from({ length: Math.round(n * area / 100) }, () => [c.x + (rng() - 0.5) * rx * 2, c.y + (rng() - 0.5) * ry * 2, r0 + rng() * (r1 - r0)] as const);
    specks(d, MICA, 0.55, grit(30, 0.25, 0.6));
    specks(d, PAPER_FILL, 0.55, grit(22, 0.3, 0.7));
    specks(d, '#c99a7e', 0.5, grit(14, 0.4, 0.9));
    for (let k = 0; k < 3; k++) {
      const p = pt(c.x + (rng() - 0.5) * rx * 1.4, c.y + (rng() - 0.5) * ry * 1.4);
      for (let j = 0; j < 6; j++) pen.dot(p.x + (rng() - 0.5) * 4, p.y + (rng() - 0.5) * 3, 0.5 + rng() * 0.8, LICHEN, 0.75);
    }
    glaze(ctx, c.x - rx * 0.3, c.y - ry * 0.35, rx * 0.55, ry * 0.45, 0, PAPER_FILL, 0.3);
  });
  // The rounded sides falling away down-right: a darker band under the lit top.
  const k = Math.min(rx, ry);
  pen.crescent(shape, pt(-SHADOW.x * k * 0.32, -SHADOW.y * k * 0.32), () => pen.fill(shape, GRANITE_DEEP, 0.3));
  pen.crescent(shape, pt(-SHADOW.x * k * 0.14, -SHADOW.y * k * 0.14), () => pen.fill(shape, MICA, 0.16));
  pen.crescent(shape, pt(SHADOW.x * k * 0.22, SHADOW.y * k * 0.22), () => pen.fill(shape, PAPER_FILL, 0.22));
  shade(d, shape, 0.42, true);
}

/** A joint crack across the rock from a to b, wandering, a lit lip on its upper side. */
function crack(d: Draw, a: Pt, b: Pt, rng: Rng): void {
  const pts = Array.from({ length: 7 }, (_, i) => {
    const t = i / 6;
    return pt(a.x + (b.x - a.x) * t + (rng() - 0.5) * 2.4, a.y + (b.y - a.y) * t + (rng() - 0.5) * 2.4);
  });
  d.pen.hair(pts.map((p) => pt(p.x - 0.6, p.y - 0.8)), 0.6, PAPER_FILL, 0.6);
  d.pen.hair(pts, 0.75, GRANITE_DEEP, 0.85);
  d.pen.hair(pts, 0.4, d.ink, 0.6);
}

/** A low granite outcrop filling x, y, w × h: two or three rounded slabs split by joints. */
export function outcrop(d: Draw, x: number, y: number, w: number, h: number): void {
  const rng = rngAt(x, y, 3);
  const c = pt(x + w / 2, y + h / 2);
  const shape = rockShape(c, w / 2 + 1, h / 2 + 1, 3.2, 0.06, rng, 56);
  drift(d, c, w / 2, h / 2, rng);
  castShadow(d, shape, Math.min(w, h) * 0.32, 0.22);
  castShadow(d, shape, Math.min(w, h) * 0.16, 0.16);
  granite(d, shape, c, w / 2, h / 2, rng);
  const long = w >= h;
  const joints = 1 + Math.floor(rng() * 2);
  d.pen.clipped(shape, () => {
    for (let k = 1; k <= joints; k++) {
      const t = k / (joints + 1) + (rng() - 0.5) * 0.12;
      const a = long ? pt(x + w * t + (rng() - 0.5) * 8, y - 2) : pt(x - 2, y + h * t + (rng() - 0.5) * 8);
      const b = long ? pt(x + w * t + (rng() - 0.5) * 10, y + h + 2) : pt(x + w + 2, y + h * t + (rng() - 0.5) * 10);
      crack(d, a, b, rng);
      // Each slab rounds off at the joint: shade just down-right of it.
      d.pen.fill(blob(pt((a.x + b.x) / 2 + 3, (a.y + b.y) / 2 + 3), long ? 3 : w * 0.45, long ? h * 0.45 : 3, rng, 0.2, 12), GRANITE_DEEP, 0.16);
    }
    const flake = rockShape(pt(c.x - w * 0.18, c.y - h * 0.12), w * 0.2, h * 0.22, 2.4, 0.15, rng, 18);
    d.pen.hair(closed(flake).slice(0, 12), 0.45, GRANITE_DEEP, 0.55);
  });
  d.pen.stroke(closed(shape), 1.5, d.ink, 0.95);
}

/** A rounded granite boulder of radius r: a dome speckled with mica, a crack, its long shadow. */
export function boulder(d: Draw, c: Pt, r: number): void {
  const rng = rngAt(c.x, c.y, 5);
  const shape = rockShape(c, r + 0.8, r * 0.94 + 0.8, 2.15, 0.07, rng, 44);
  drift(d, c, r, r, rng);
  castShadow(d, shape, r * 0.55, 0.2);
  castShadow(d, shape, r * 0.25, 0.18);
  granite(d, shape, c, r, r, rng);
  d.pen.clipped(shape, () => {
    const a = rng() * TAU;
    crack(d, polar(c, a, r * 1.1), polar(c, a + Math.PI * 0.75 + rng() * 0.4, r * 0.3), rng);
  });
  d.pen.stroke(closed(shape), 1.5, d.ink, 0.95);
}
