import { createRng } from '../../logic/rng';
import { pt, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { SNAKE_W } from '../types';
import { rgba } from '../wash';
import { hash } from './barrensSnakePaint';

/**
 * The California kingsnake's paint box (the Dunes' rival snake): glossy
 * black-brown crossed by clean cream bands, smooth shining scales. The
 * bands follow the scale rows, so their edges step scale by scale, and they
 * widen low on the flanks, as the kingsnake's do. Deterministic.
 */
export const KING_PAINT = {
  black: '#241d1a',
  blackLit: '#4b433e',
  blackDeep: '#0e0b0a',
  cream: '#eee4c8',
  creamWarm: '#e6d6aa',
  creamShade: '#b9ab88',
  sheen: '#d8e0ee',
  shadow: '#0c0908',
  lip: '#ece2c6',
  mouth: '#efcfcf',
  mouthDeep: '#c27f86',
  throat: '#4e1c26',
  iris: '#3a2a20',
} as const;

const K = KING_PAINT;
/** Rows of scales round the body, and their spread (radians round the cylinder). */
const ROWS = 15;
const SPAN = 2.64;

/** Strip-y of row r's middle and its half-height. */
export function rowOf(r: number): { y: number; hh: number } {
  const dth = SPAN / ROWS;
  const th = -SPAN / 2 + dth * (r + 0.5);
  return { y: 12 + 11.2 * Math.sin(th), hh: 11.2 * Math.cos(th) * dth * 0.5 };
}

/** The back's cross-section wash on the black, `yTop` being where strip y = 0 lies: a lit, faintly blue-grey top edge into deep black-brown. */
export function kingCrossWash(ctx: CanvasRenderingContext2D, yTop: number): CanvasGradient {
  const g = ctx.createLinearGradient(0, yTop, 0, yTop + SNAKE_W);
  g.addColorStop(0, '#5a5450');
  g.addColorStop(0.18, '#3a322e');
  g.addColorStop(0.45, K.black);
  g.addColorStop(0.8, '#1a1412');
  g.addColorStop(1, K.blackDeep);
  return g;
}

/** The cream's own cross-section wash: lit cream at the top, shaded buff low on the far flank. */
export function creamWash(ctx: CanvasRenderingContext2D, yTop: number): CanvasGradient {
  const g = ctx.createLinearGradient(0, yTop, 0, yTop + SNAKE_W);
  g.addColorStop(0, '#fbf4df');
  g.addColorStop(0.3, K.cream);
  g.addColorStop(0.7, K.creamWarm);
  g.addColorStop(1, K.creamShade);
  return g;
}

/**
 * A cream band round x = cx, `w0` wide over the back and `w1` at the
 * flanks, its edges stepping along the staggered scale rows (`len` long),
 * each edge scale nudged by a seeded hash so the band is a little ragged.
 */
export function bandShape(cx: number, w0: number, w1: number, len: number, seed: number): Pt[] {
  const left: Pt[] = [];
  const right: Pt[] = [];
  for (let r = 0; r < ROWS; r++) {
    const { y, hh } = rowOf(r);
    const half = (w0 + (w1 - w0) * Math.abs(y - 12) / 12) / 2;
    const shift = (r % 2) * (len / 2);
    const snap = (x: number): number => Math.round((x - shift) / len) * len + shift;
    const a = snap(cx - half + (hash(seed, r) - 0.5) * len * 0.9) - len * 0.38;
    const b = snap(cx + half + (hash(seed + 5, r) - 0.5) * len * 0.9) - len * 0.38;
    const y0 = r === 0 ? -1 : y - hh;
    const y1 = r === ROWS - 1 ? SNAKE_W + 1 : y + hh;
    left.push(pt(a, y0), pt(a + len * 0.2, y), pt(a, y1));
    right.push(pt(b, y0), pt(b + len * 0.2, y), pt(b, y1));
  }
  return [...left, ...right.reverse()];
}

/**
 * The smooth scales, row on row: each free edge an arc towards the tail,
 * in fine `edge` line, with a glint on each scale along the gloss band.
 * `len` must divide `period` for the rows to repeat with it.
 */
export function smoothScales(ctx: CanvasRenderingContext2D, x0: number, x1: number, yTop: number, len: number, period: number, edge: string, alpha: number, glint = 0.6): void {
  const perRow = Math.max(1, Math.round(period / len));
  ctx.save();
  ctx.lineCap = 'round';
  for (let r = 0; r < ROWS; r++) {
    const { y: sy, hh } = rowOf(r);
    const y = yTop + sy;
    const shift = (r % 2) * (len / 2);
    const first = Math.floor((x0 - len) / len) * len + shift;
    const edges = new Path2D();
    const glints = new Path2D();
    const gloss = Math.max(0, 1 - Math.abs(sy - 5.4) / 3.6);
    for (let x = first; x <= x1 + len; x += len) {
      const j = ((Math.round((x - shift) / len) % perRow) + perRow) % perRow;
      const h = hash(j, r + 40);
      edges.moveTo(x - len * 0.38, y - hh);
      edges.quadraticCurveTo(x + len * (0.55 + 0.15 * h), y, x - len * 0.38, y + hh);
      if (h > 0.25) {
        glints.moveTo(x - len * 0.3, y - hh * 0.45);
        glints.lineTo(x + len * (0.05 + 0.2 * h), y - hh * 0.5);
      }
    }
    ctx.lineWidth = 0.26;
    ctx.strokeStyle = rgba(edge, alpha * (0.6 + 0.6 * (sy / SNAKE_W)));
    ctx.stroke(edges);
    if (gloss > 0.05 && glint > 0) {
      ctx.lineWidth = 0.42;
      ctx.strokeStyle = rgba(K.sheen, glint * gloss);
      ctx.stroke(glints);
    }
  }
  ctx.restore();
}

/** Fine pale flecks on the black and dark ones on the cream: x0..x0+w, repeated every `w` when `wrap`. */
export function kingFlecks(ctx: CanvasRenderingContext2D, x0: number, w: number, yTop: number, seed: number, count: number, wrap: boolean): void {
  const rng = createRng(seed);
  ctx.save();
  for (let i = 0; i < count; i++) {
    const x = x0 + rng() * w;
    const y = yTop + 1.2 + rng() * 21.6;
    const r = 0.14 + rng() * 0.26;
    ctx.fillStyle = rng() < 0.5 ? rgba(PAPER_FILL, 0.12 + 0.12 * rng()) : rgba(K.shadow, 0.12 + 0.2 * rng());
    for (const k of wrap ? [-w, 0, w] : [0]) {
      ctx.beginPath();
      ctx.arc(x + k, y, r, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
}
