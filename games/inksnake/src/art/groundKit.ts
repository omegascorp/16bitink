import type { Rng } from '../logic/rng';
import { closed, type Draw, pt, TAU } from './kit';
import { PAPER, PAPER_FILL } from './palette';
import type { Pt } from './pen';
import { mix, rgba } from './wash';

/**
 * Painting helpers shared by the chapter 3–5 grounds (greenhouse, orchard,
 * rockery): the page's paper and base wash, eased edgeness, irregular blobs,
 * wet-edged washes, cast shadows and soft bands of light and shade.
 */

/** Where shadows fall: away from a light at the upper left. */
export const SHADOW = pt(0.55, 0.84);

/** 0 in the middle of the board, 1 at its edges, eased. */
export type Edgeness = (x: number, y: number) => number;

/** Edgeness for a w × h board: flat 0 inside `calm` (a share of the half board), rising to 1 at the edge. */
export function edgenessOf(w: number, h: number, calm = 0.5): Edgeness {
  return (x, y) => {
    const e = Math.max(Math.abs(x - w / 2) / (w / 2), Math.abs(y - h / 2) / (h / 2));
    const t = Math.max(0, Math.min(1, (e - calm) / (1 - calm)));
    return t * t * (3 - 2 * t);
  };
}

/** Paper, then a flat ground wash over the whole board. */
export function groundWash(d: Draw, w: number, h: number, colour: string, alpha: number): void {
  const { ctx } = d.pen;
  ctx.save();
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = colour;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/**
 * A wash pooled towards the edges of the board: a soft gradient in from each
 * side, `depth` deep, so the middle stays paper-pale.
 */
export function edgeWash(d: Draw, w: number, h: number, colour: string, alpha: number, depth = 260): void {
  const { ctx } = d.pen;
  const sides: readonly (readonly [number, number, number, number])[] = [
    [0, 0, depth, 0],
    [w, 0, w - depth, 0],
    [0, 0, 0, depth],
    [0, h, 0, h - depth],
  ];
  ctx.save();
  for (const [x0, y0, x1, y1] of sides) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, rgba(colour, alpha));
    g.addColorStop(0.35, rgba(colour, alpha * 0.45));
    g.addColorStop(1, rgba(colour, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.restore();
}

/** An irregular closed blob round c: radius rx × ry, `rough` its wobble (share of the radius). */
export function blob(c: Pt, rx: number, ry: number, rng: Rng, rough = 0.12, n = 22, turn = 0): Pt[] {
  const [p1, p2, p3] = [rng() * TAU, rng() * TAU, rng() * TAU];
  const cos = Math.cos(turn);
  const sin = Math.sin(turn);
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * TAU;
    const k = 1 + rough * (0.55 * Math.sin(a * 2 + p1) + 0.3 * Math.sin(a * 3 + p2) + 0.15 * Math.sin(a * 5 + p3));
    const x = Math.cos(a) * rx * k;
    const y = Math.sin(a) * ry * k;
    return pt(c.x + x * cos - y * sin, c.y + x * sin + y * cos);
  });
}

/**
 * A watercolour wash over a shape: the pigment laid in, then pooled a little
 * darker at its drying edge, as a wet wash does.
 */
export function wash(d: Draw, shape: readonly Pt[], colour: string, alpha: number, edge = 0.5): void {
  d.pen.fill(shape, colour, alpha);
  if (edge > 0) d.pen.hair(closed(shape), 1.4, mix(colour, d.ink, 0.25), alpha * edge);
}

/** A shape's shadow on the ground, `dist` away from the light. */
export function castShadow(d: Draw, shape: readonly Pt[], dist: number, alpha: number, colour?: string): void {
  d.pen.fill(shape.map((p) => pt(p.x + SHADOW.x * dist, p.y + SHADOW.y * dist)), colour ?? d.ink, alpha);
}

/** A soft band along a polyline: a few widening strokes, faintest outside. */
export function softBand(d: Draw, pts: readonly Pt[], width: number, colour: string, alpha: number): void {
  const { ctx } = d.pen;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = rgba(colour, alpha / 3);
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  for (const k of [1, 0.65, 0.35]) {
    ctx.lineWidth = width * k;
    ctx.stroke();
  }
  ctx.restore();
}

/** Paper-white then a wash, the base every painted object starts from. */
export function body(d: Draw, shape: readonly Pt[], colour: string, alpha: number): void {
  d.pen.fill(shape, PAPER_FILL, 1);
  d.pen.fill(shape, colour, alpha);
}

/** Points along a quadratic curve a → b bowed sideways by `bow`. */
export function arc(a: Pt, b: Pt, bow: number, n = 8): Pt[] {
  const l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const c = pt((a.x + b.x) / 2 - ((b.y - a.y) / l) * bow, (a.y + b.y) / 2 + ((b.x - a.x) / l) * bow);
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const u = 1 - t;
    return pt(u * u * a.x + 2 * u * t * c.x + t * t * b.x, u * u * a.y + 2 * u * t * c.y + t * t * b.y);
  });
}

/** A point r from c in direction a. */
export const polar = (c: Pt, a: number, r: number): Pt => pt(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r);

/**
 * A polygon's outline as a closed polyline with extra points along each side,
 * so the pen (which smooths through its points) keeps its sides straight and
 * only softens the corners.
 */
export function outline(poly: readonly Pt[], step = 6): Pt[] {
  const out: Pt[] = [];
  poly.forEach((a, i) => {
    const b = poly[(i + 1) % poly.length]!;
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / step));
    for (let k = 0; k < n; k++) out.push(pt(a.x + ((b.x - a.x) * k) / n, a.y + ((b.y - a.y) * k) / n));
  });
  return [...out, out[0]!];
}
