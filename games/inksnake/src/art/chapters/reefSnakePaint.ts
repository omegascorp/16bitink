import { createRng } from '../../logic/rng';
import { closed, pt, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import { Pen, pathOf, type Pt, withScratch } from '../pen';
import { glaze } from '../snakes/cornPaint';
import { SNAKE_W } from '../types';
import { rgba } from '../wash';

/**
 * The banded sea krait's paint box and the brushwork its back strip and its
 * neck share: a silver-blue ground, even blue-black bands right round the
 * body (broadest over the back), the smooth glossy scales of a snake that
 * lives wet, and a cylinder's light and shade with a strong wet sheen.
 * Everything is deterministic: the same call paints the same pixels.
 */
export const KRAIT_PAINT = {
  ground: '#9db8cc',
  silver: '#e3edf1',
  blue: '#7d9cb8',
  slate: '#5a7590',
  shadow: '#1c2a40',
  band: '#1a1e2b',
  bandLit: '#3f4d6c',
  bandDeep: '#0b0d14',
  sheen: '#8ea4c6',
  yellow: '#e9c64c',
  yellowLit: '#f7e6a2',
  yellowDeep: '#b08826',
  belly: '#ece0ae',
  cream: '#f1e6bf',
  lip: '#f0d77a',
  mottle: '#7a7a7e',
  mouth: '#eec3bf',
  mouthDeep: '#c07a84',
  throat: '#4a1c2a',
  iris: '#3b3026',
  tongue: '#4a2a3c',
  tongueTip: '#120c12',
} as const;

const K = KRAIT_PAINT;

/** One period of the pattern, board px. */
export const KRAIT_PERIOD = 120;
/** Bands per period: about one body width apart, as on a real krait. */
export const BANDS = 5;
export const BAND_STEP = KRAIT_PERIOD / BANDS;
/** Where the long contours run. */
export const TOP_EDGE = 1.2;
export const BOTTOM_EDGE = SNAKE_W - 1.2;

export const mod = (i: number, n: number): number => ((i % n) + n) % n;

/** A fixed pseudo-random 0..1 for (j, r). */
export function hash(j: number, r: number): number {
  const v = Math.sin(j * 12.9898 + r * 78.233) * 43758.5453;
  return v - Math.floor(v);
}

/** The back's cross-section wash, `yTop` being where the strip's y = 0 lies: silver where the light hits, deepening to slate blue on the far flank. */
export function kraitCrossWash(ctx: CanvasRenderingContext2D, yTop: number): CanvasGradient {
  const g = ctx.createLinearGradient(0, yTop, 0, yTop + SNAKE_W);
  g.addColorStop(0, '#e6eff3');
  g.addColorStop(0.16, '#c6d8e3');
  g.addColorStop(0.42, '#a3bdd0');
  g.addColorStop(0.74, '#839fb9');
  g.addColorStop(1, '#5d7893');
  return g;
}

/**
 * Light and shade over the painted pattern, a wet cylinder lit from the
 * upper left: a strong sheen high on the back with a bright specular streak
 * in it, the far flank in deep blue shadow with reflected light at its edge.
 */
export function kraitModel(ctx: CanvasRenderingContext2D, x0: number, x1: number, yTop: number, sheen = 0.42): void {
  const h = SNAKE_W;
  const dark = ctx.createLinearGradient(0, yTop, 0, yTop + h);
  dark.addColorStop(0, rgba(K.shadow, 0.05));
  dark.addColorStop(0.12, rgba(K.shadow, 0));
  dark.addColorStop(0.5, rgba(K.shadow, 0));
  dark.addColorStop(0.68, rgba(K.shadow, 0.14));
  dark.addColorStop(0.86, rgba(K.shadow, 0.38));
  dark.addColorStop(0.95, rgba(K.shadow, 0.48));
  dark.addColorStop(1, rgba(K.shadow, 0.22));
  const gloss = ctx.createLinearGradient(0, yTop, 0, yTop + h);
  gloss.addColorStop(0.07, rgba(PAPER_FILL, 0));
  gloss.addColorStop(0.17, rgba(PAPER_FILL, sheen));
  gloss.addColorStop(0.21, rgba(PAPER_FILL, sheen * 1.25));
  gloss.addColorStop(0.27, rgba(PAPER_FILL, sheen * 0.6));
  gloss.addColorStop(0.42, rgba(PAPER_FILL, 0));
  ctx.save();
  ctx.fillStyle = dark;
  ctx.fillRect(x0, yTop - 4, x1 - x0, h + 8);
  ctx.fillStyle = gloss;
  ctx.fillRect(x0, yTop - 4, x1 - x0, h + 8);
  ctx.restore();
}

/** Dorsal scale rows round the body (a krait has 21 to 25; fewer read better this small). */
const ROWS = 19;

/**
 * The smooth, overlapping scales, row on row round the body: each free edge
 * an arc towards the tail (+x), the rows packed tighter where the back turns
 * away. On the silver they're drawn in slate; `light` draws them pale (for
 * over the black bands, where only their glossy edges show). `len` must
 * divide `period` for the rows to repeat with it.
 */
export function smoothScales(ctx: CanvasRenderingContext2D, x0: number, x1: number, yTop: number, len: number, alpha: number, period: number, light = false): void {
  const perRow = Math.max(1, Math.round(period / len));
  const span = 2.7;
  const dth = span / ROWS;
  ctx.save();
  ctx.lineCap = 'round';
  for (let r = 0; r < ROWS; r++) {
    const th = -span / 2 + dth * (r + 0.5);
    const sy = 12 + 11.3 * Math.sin(th);
    const y = yTop + sy;
    const hh = 11.3 * Math.cos(th) * dth * 0.56;
    const shift = (r % 2) * (len / 2);
    const first = Math.floor((x0 - len) / len) * len + shift;
    const edges = new Path2D();
    const glints = new Path2D();
    for (let x = first; x <= x1 + len; x += len) {
      const j = ((Math.round((x - shift) / len) % perRow) + perRow) % perRow;
      const h = hash(j, r);
      const b = (hash(j + 7, r + 3) - 0.5) * 0.26;
      edges.moveTo(x - len * 0.4, y - hh + b);
      edges.quadraticCurveTo(x + len * (0.6 + 0.12 * h), y + b, x - len * 0.4, y + hh + b);
      if (h > 0.25) {
        glints.moveTo(x - len * 0.3, y - hh * 0.45 + b);
        glints.lineTo(x + len * (0.05 + 0.25 * h), y - hh * 0.5 + b);
      }
    }
    const shade = sy / SNAKE_W;
    const lit = Math.max(0, 1 - Math.abs(sy - 5) / 4.5);
    ctx.lineWidth = 0.26;
    ctx.strokeStyle = light ? rgba(K.sheen, alpha * (0.9 - 0.6 * shade)) : rgba(K.shadow, alpha * (0.35 + 0.8 * shade));
    ctx.stroke(edges);
    ctx.lineWidth = light ? 0.4 : 0.34;
    ctx.strokeStyle = rgba(PAPER_FILL, (light ? 0.35 : 0.5) * Math.max(lit, 0.12 * (1 - shade)));
    ctx.stroke(glints);
  }
  ctx.restore();
}

/** A shape's bounding centre and half-extents. */
export function centreOf(shape: readonly Pt[]): { cx: number; cy: number; rx: number; ry: number } {
  const xs = shape.map((p) => p.x);
  const ys = shape.map((p) => p.y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, rx: (x1 - x0) / 2, ry: (y1 - y0) / 2 };
}

/**
 * Band i (any integer), the same as band i + BANDS one period along: a
 * blue-black ring seen from above, broadest over the back and narrowing down
 * the flanks, its edges stepped a little scale by scale.
 */
export function bandShape(i: number, yTop = 0): Pt[] {
  const k = mod(i, BANDS);
  const rng = createRng(14100 + k * 17);
  const cx = i * BAND_STEP + BAND_STEP / 2 + (rng() - 0.5) * 1.6;
  const mid = 10.4 + (rng() - 0.5) * 1.2;
  const lean = (rng() - 0.5) * 1.4;
  const [p1, p2] = [rng() * TAU, rng() * TAU];
  const n = 26;
  const side = (s: 1 | -1): Pt[] =>
    Array.from({ length: n + 1 }, (_, m) => {
      const y = -1 + ((SNAKE_W + 2) * m) / n;
      const v = (y - 12) / 12;
      const half = (mid / 2) * (1 - 0.3 * v * v);
      const step = (hash(k * 31 + m, s > 0 ? 5 : 9) - 0.5) * 0.7;
      const wob = 0.35 * Math.sin(y * 0.9 + (s > 0 ? p1 : p2));
      return pt(cx + lean * v + s * (half + step + wob), yTop + y);
    });
  return [...side(-1), ...side(1).reverse()];
}

/**
 * A black band painted as watercolour: the blue-black laid in, a cooler
 * sheen lifted where the light falls on its wet scales, the pigment pooled
 * deeper at its drying edges, a soft pen rim, a fine ink hairline round it.
 */
export function paintBand(ctx: CanvasRenderingContext2D, shape: readonly Pt[], seed: number, ink: string, yTop = 0): void {
  const pen = new Pen(ctx, seed, 0.3);
  const { cx, rx } = centreOf(shape);
  pen.fill(shape, K.band, 0.96);
  pen.clipped(shape, () => {
    glaze(ctx, cx - rx * 0.2, yTop + 6, rx * 1.1, 4.4, 0, K.bandLit, 0.55);
    glaze(ctx, cx + rx * 0.3, yTop + 19, rx * 0.9, 3, 0, K.slate, 0.16);
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.strokeStyle = rgba(K.bandDeep, 0.55);
    ctx.lineWidth = 2.2;
    pathOf(ctx, shape);
    ctx.stroke();
    ctx.restore();
  });
  pen.hair(closed(shape), 0.32, ink, 0.4);
}

/** Pigment in the paper's tooth: fine dots over x0..x0+w, repeated every `w` when `wrap`. */
export function grainOf(ctx: CanvasRenderingContext2D, x0: number, w: number, yTop: number, seed: number, count: number, wrap: boolean): void {
  const rng = createRng(seed);
  ctx.save();
  for (let i = 0; i < count; i++) {
    const x = x0 + rng() * w;
    const y = yTop + 1.2 + rng() * 21.6;
    const r = 0.16 + rng() * 0.3;
    const pale = rng() < 0.2;
    ctx.fillStyle = pale ? rgba(PAPER_FILL, 0.3) : rgba(K.shadow, 0.08 + 0.14 * rng() + 0.1 * ((y - yTop) / SNAKE_W));
    for (const k of wrap ? [-w, 0, w] : [0]) {
      ctx.beginPath();
      ctx.arc(x + k, y, r, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
}

/**
 * Paints one period on a tile at the target's own resolution, then lays the
 * tile end to end along `length`, so x = period + a is pixel for pixel x = a.
 */
export function layKraitTile(ctx: CanvasRenderingContext2D, length: number, paint: (tile: CanvasRenderingContext2D) => void): void {
  const res = Math.abs(ctx.getTransform().a) || 1;
  withScratch(Math.round(KRAIT_PERIOD * res), Math.round(SNAKE_W * res), (tctx, tile) => {
    tctx.scale(res, res);
    paint(tctx);
    for (let x = 0; x < length; x += KRAIT_PERIOD) ctx.drawImage(tile, x, 0, KRAIT_PERIOD, SNAKE_W);
  });
}
