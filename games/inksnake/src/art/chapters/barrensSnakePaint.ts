import { createRng } from '../../logic/rng';
import { closed, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import { Pen, pathOf, type Pt, withScratch } from '../pen';
import { glaze } from '../snakes/cornPaint';
import { SNAKE_W } from '../types';
import { rgba } from '../wash';

/**
 * The eastern hognose's paint box and the brushwork its back strip, belly
 * strip and neck share: a sandy, yellow-brown ground, umber-black blotches
 * pooled darker at their drying edges, matte keeled scales (a ridge down
 * each one catching the light), and the cylinder's light and shade.
 * Everything is deterministic: the same call paints the same pixels.
 */
export const HOG_PAINT = {
  ground: '#c39a5c',
  sand: '#e8d29c',
  ochre: '#d6a24c',
  grey: '#8c806c',
  shadow: '#3b2715',
  blotch: '#3f2616',
  blotchLit: '#6c4828',
  blotchDeep: '#22130a',
  rim: '#150c07',
  belly: '#e9e2c8',
  bellyCool: '#c9c4b2',
  mottle: '#5d5b58',
  cream: '#efe3c2',
  lip: '#e6d3a4',
  mouth: '#ecc2bb',
  mouthDeep: '#bf7a80',
  throat: '#4e1c26',
  iris: '#9a6630',
  tongue: '#3a2d38',
  tongueTip: '#120e14',
} as const;

const H = HOG_PAINT;

/** The back's cross-section wash, `yTop` being where the strip's y = 0 lies: pale sand where the light hits, deepening to umber on the far flank. */
export function hogCrossWash(ctx: CanvasRenderingContext2D, yTop: number): CanvasGradient {
  const g = ctx.createLinearGradient(0, yTop, 0, yTop + SNAKE_W);
  g.addColorStop(0, '#ead39e');
  g.addColorStop(0.16, '#dcbb7c');
  g.addColorStop(0.42, '#c9a062');
  g.addColorStop(0.74, '#b0844b');
  g.addColorStop(1, '#84603a');
  return g;
}

/**
 * Light and shade over the painted pattern, a cylinder lit from the upper
 * left: a soft (matte, the scales are keeled) sheen high on the back, the
 * far flank in umber shadow with a little reflected light at its edge.
 */
export function hogModel(ctx: CanvasRenderingContext2D, x0: number, x1: number, yTop: number, shadow: string = H.shadow, sheen = 0.22): void {
  const h = SNAKE_W;
  const dark = ctx.createLinearGradient(0, yTop, 0, yTop + h);
  dark.addColorStop(0, rgba(shadow, 0.05));
  dark.addColorStop(0.12, rgba(shadow, 0));
  dark.addColorStop(0.48, rgba(shadow, 0));
  dark.addColorStop(0.66, rgba(shadow, 0.14));
  dark.addColorStop(0.85, rgba(shadow, 0.4));
  dark.addColorStop(0.95, rgba(shadow, 0.5));
  dark.addColorStop(1, rgba(shadow, 0.26));
  const gloss = ctx.createLinearGradient(0, yTop, 0, yTop + h);
  gloss.addColorStop(0.07, rgba(PAPER_FILL, 0));
  gloss.addColorStop(0.19, rgba(PAPER_FILL, sheen));
  gloss.addColorStop(0.28, rgba(PAPER_FILL, sheen * 0.7));
  gloss.addColorStop(0.44, rgba(PAPER_FILL, 0));
  ctx.save();
  ctx.fillStyle = dark;
  ctx.fillRect(x0, yTop - 4, x1 - x0, h + 8);
  ctx.fillStyle = gloss;
  ctx.fillRect(x0, yTop - 4, x1 - x0, h + 8);
  ctx.restore();
}

/** A fixed pseudo-random 0..1 for (j, r). */
export function hash(j: number, r: number): number {
  const v = Math.sin(j * 12.9898 + r * 78.233) * 43758.5453;
  return v - Math.floor(v);
}

/** Rows of keeled scales round the back. */
const ROWS = 17;

/**
 * The keeled scales, row on row round the body: each a pointed oval whose
 * free edge points to the tail (+x), a ridge down its middle lit on its
 * upper side and shaded below, the rows packed tighter where the back turns
 * away. `len` must divide `period` for the rows to repeat with it.
 */
export function keeledScales(ctx: CanvasRenderingContext2D, x0: number, x1: number, yTop: number, len: number, alpha: number, period: number): void {
  const perRow = Math.max(1, Math.round(period / len));
  const span = 2.7;
  const dth = span / ROWS;
  ctx.save();
  ctx.lineCap = 'round';
  for (let r = 0; r < ROWS; r++) {
    const th = -span / 2 + dth * (r + 0.5);
    const sy = 12 + 11.3 * Math.sin(th);
    const y = yTop + sy;
    const hh = 11.3 * Math.cos(th) * dth * 0.55;
    const shift = (r % 2) * (len / 2);
    const first = Math.floor((x0 - len) / len) * len + shift;
    const edges = new Path2D();
    const lit = new Path2D();
    const dark = new Path2D();
    for (let x = first; x <= x1 + len; x += len) {
      const j = ((Math.round((x - shift) / len) % perRow) + perRow) % perRow;
      const h = hash(j, r);
      const b = (hash(j + 7, r + 3) - 0.5) * 0.28;
      const tip = x + len * (0.58 + 0.12 * h);
      edges.moveTo(x - len * 0.42, y - hh + b);
      edges.quadraticCurveTo(x + len * 0.2, y - hh * 0.8 + b, tip, y + b);
      edges.quadraticCurveTo(x + len * 0.2, y + hh * 0.8 + b, x - len * 0.42, y + hh + b);
      if (h > 0.35) {
        lit.moveTo(x - len * 0.12, y + b - 0.16);
        lit.lineTo(tip - len * (0.3 + 0.2 * h), y + b - 0.13);
      }
      dark.moveTo(x - len * 0.3, y + b + 0.18);
      dark.lineTo(tip - len * 0.22, y + b + 0.16);
    }
    const shade = sy / SNAKE_W;
    ctx.lineWidth = 0.26;
    ctx.strokeStyle = rgba(H.shadow, alpha * (0.45 + 0.85 * shade));
    ctx.stroke(edges);
    ctx.lineWidth = 0.22;
    ctx.strokeStyle = rgba(H.shadow, alpha * (0.3 + 0.6 * shade));
    ctx.stroke(dark);
    ctx.lineWidth = 0.22;
    ctx.strokeStyle = rgba(PAPER_FILL, alpha * Math.max(0, 0.75 - 0.9 * shade));
    ctx.stroke(lit);
  }
  ctx.restore();
}

/** Pigment in the paper's tooth and the hognose's fine dark flecking: dots over x0..x0+w, repeated every `w` when `wrap`. */
export function speckle(ctx: CanvasRenderingContext2D, x0: number, w: number, yTop: number, seed: number, count: number, wrap: boolean, color: string = H.shadow): void {
  const rng = createRng(seed);
  ctx.save();
  for (let i = 0; i < count; i++) {
    const x = x0 + rng() * w;
    const y = yTop + 1.2 + rng() * 21.6;
    const r = 0.16 + rng() * 0.34;
    const pale = rng() < 0.14;
    ctx.fillStyle = pale ? rgba(PAPER_FILL, 0.24) : rgba(color, 0.12 + 0.2 * rng() + 0.1 * ((y - yTop) / SNAKE_W));
    for (const k of wrap ? [-w, 0, w] : [0]) {
      ctx.beginPath();
      ctx.arc(x + k, y, r, 0, TAU);
      ctx.fill();
    }
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
 * A dark blotch painted as watercolour: the umber laid in over a paler halo
 * of ground (the hognose's blotches are edged lighter), its heart lifted
 * warm towards the light, the pigment pooled near-black at the drying edge,
 * a firm pen rim and a fine ink hairline round it.
 */
export function paintHogBlotch(ctx: CanvasRenderingContext2D, shape: readonly Pt[], seed: number, ink: string, rim = 1.2, halo = 0.5): void {
  const pen = new Pen(ctx, seed, 0.35);
  const { cx, cy, rx, ry } = centreOf(shape);
  if (halo > 0) glaze(ctx, cx, cy, rx + 2.6, ry + 1.8, 0, '#f2deaa', halo);
  pen.fill(shape, H.blotch, 0.94);
  pen.clipped(shape, () => {
    glaze(ctx, cx - rx * 0.14, cy - ry * 0.28, rx * 0.9, ry * 0.7, 0, H.blotchLit, 0.5);
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.strokeStyle = rgba(H.blotchDeep, 0.6);
    ctx.lineWidth = rim * 2.6;
    pathOf(ctx, shape);
    ctx.stroke();
    ctx.restore();
    pen.stroke(closed(shape), rim * 1.25, H.rim, 0.85, false);
  });
  pen.hair(closed(shape), 0.3, ink, 0.34);
}

/** One period of the pattern, board px: the back strip and the belly both repeat on it. */
export const HOG_PERIOD = 120;
/** Where the long contours run. */
export const TOP_EDGE = 1.2;
export const BOTTOM_EDGE = SNAKE_W - 1.2;

export const mod = (i: number, n: number): number => ((i % n) + n) % n;

/**
 * Paints one period on a tile at the target's own resolution, then lays the
 * tile end to end along `length`, so x = period + a is pixel for pixel x = a.
 */
export function layTile(ctx: CanvasRenderingContext2D, length: number, paint: (tile: CanvasRenderingContext2D) => void): void {
  const res = Math.abs(ctx.getTransform().a) || 1;
  withScratch(Math.round(HOG_PERIOD * res), Math.round(SNAKE_W * res), (tctx, tile) => {
    tctx.scale(res, res);
    paint(tctx);
    for (let x = 0; x < length; x += HOG_PERIOD) ctx.drawImage(tile, x, 0, HOG_PERIOD, SNAKE_W);
  });
}
