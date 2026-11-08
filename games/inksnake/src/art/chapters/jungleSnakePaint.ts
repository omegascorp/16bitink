import { createRng } from '../../logic/rng';
import { closed, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import { Pen, pathOf, type Pt, withScratch } from '../pen';
import { glaze, periodicLine } from '../snakes/cornPaint';
import { SNAKE_W } from '../types';
import { rgba } from '../wash';

/**
 * The brushwork the Jungle's five snakes share (the king cobra and its
 * rivals: rat snake, banded krait, rock python): the cross-section wash, the
 * scale rows (smooth and glossy, in each one's own colours), light and shade
 * over the pattern, a watercolour blotch, the pen contours, and the tile
 * laid end to end. Each species brings its own paint box and pattern (see
 * StripSpec). Everything is deterministic: the same call paints the same pixels.
 */

/** Where the long contours run. */
export const TOP_EDGE = 1.2;
export const BOTTOM_EDGE = SNAKE_W - 1.2;

export const mod = (i: number, n: number): number => ((i % n) + n) % n;

/** A fixed pseudo-random 0..1 for (j, r). */
export function hash(j: number, r: number): number {
  const v = Math.sin(j * 12.9898 + r * 78.233) * 43758.5453;
  return v - Math.floor(v);
}

/** A cross-section wash from y = yTop (the lit edge) to yTop + SNAKE_W, through `stops` ([0..1, colour]). */
export function crossWash(ctx: CanvasRenderingContext2D, yTop: number, stops: readonly (readonly [number, string])[]): CanvasGradient {
  const g = ctx.createLinearGradient(0, yTop, 0, yTop + SNAKE_W);
  for (const [at, c] of stops) g.addColorStop(at, c);
  return g;
}

export interface ScaleOpts {
  /** Rows round the visible back, and a scale's length along the body (it divides `period`). */
  readonly rows: number;
  readonly len: number;
  readonly period: number;
  /** The colour drawn along each scale's free edge, and how strongly. */
  readonly edge: string;
  readonly alpha: number;
  /** How much each scale glints along the gloss band (0 for matte skin). */
  readonly gloss: number;
  /** A paler heart lifted on each scale (the skin between showing darker), 0..1. */
  readonly heart?: number;
}

/**
 * The scales, row on row round the body: each one's free edge an arc drawn
 * towards the tail (+x), the rows packed tighter towards the edges where the
 * back turns away, a paler heart on each and a glint along the gloss band.
 */
export function scaleRows(ctx: CanvasRenderingContext2D, x0: number, x1: number, yTop: number, o: ScaleOpts): void {
  const { rows, len } = o;
  const perRow = Math.max(1, Math.round(o.period / len));
  const span = 2.66;
  const dth = span / rows;
  ctx.save();
  ctx.lineCap = 'round';
  for (let r = 0; r < rows; r++) {
    const th = -span / 2 + dth * (r + 0.5);
    const sy = 12 + 11.2 * Math.sin(th);
    const y = yTop + sy;
    const hh = 11.2 * Math.cos(th) * dth * 0.56;
    const shift = (r % 2) * (len / 2);
    const first = Math.floor((x0 - len) / len) * len + shift;
    const edges = [new Path2D(), new Path2D()];
    const glints = new Path2D();
    const hearts = new Path2D();
    for (let x = first; x <= x1 + len; x += len) {
      const j = mod(Math.round((x - shift) / len), perRow);
      const h = hash(j, r);
      const b = (hash(j + 7, r + 3) - 0.5) * 0.3;
      const e = edges[h < 0.5 ? 0 : 1]!;
      e.moveTo(x - len * 0.38, y - hh + b);
      e.quadraticCurveTo(x + len * (0.55 + 0.15 * h), y + b, x - len * 0.38, y + hh + b);
      hearts.moveTo(x + len * 0.31, y + b);
      hearts.ellipse(x - len * 0.05, y + b, len * 0.36, hh * 0.62, 0, 0, TAU);
      if (h > 0.3) {
        glints.moveTo(x - len * 0.3, y - hh * 0.42);
        glints.lineTo(x + len * (0.04 + 0.2 * h), y - hh * 0.5);
      }
    }
    const shade = sy / SNAKE_W;
    if (o.heart) {
      ctx.fillStyle = rgba(PAPER_FILL, o.heart * Math.max(0.15, 1 - shade * 1.1));
      ctx.fill(hearts);
    }
    ctx.lineWidth = 0.3;
    edges.forEach((e, i) => {
      ctx.strokeStyle = rgba(o.edge, o.alpha * (0.45 + 0.8 * shade) * (i === 0 ? 0.75 : 1.15));
      ctx.stroke(e);
    });
    const g = Math.max(0, 1 - Math.abs(sy - 5.6) / 3.4);
    if (o.gloss > 0 && g > 0.05) {
      ctx.lineWidth = 0.42;
      ctx.strokeStyle = rgba(PAPER_FILL, o.gloss * g);
      ctx.stroke(glints);
    }
  }
  ctx.restore();
}

/**
 * Light and shade over the painted pattern, a cylinder lit from the upper
 * left: a sheen high on the back, the far flank in shadow with a little
 * reflected light at its very edge.
 */
export function modelBody(ctx: CanvasRenderingContext2D, x0: number, x1: number, yTop: number, shadow: string, sheen: number, deep = 1): void {
  const h = SNAKE_W;
  const dark = ctx.createLinearGradient(0, yTop, 0, yTop + h);
  dark.addColorStop(0, rgba(shadow, 0.05 * deep));
  dark.addColorStop(0.12, rgba(shadow, 0));
  dark.addColorStop(0.5, rgba(shadow, 0));
  dark.addColorStop(0.68, rgba(shadow, 0.13 * deep));
  dark.addColorStop(0.86, rgba(shadow, 0.38 * deep));
  dark.addColorStop(0.95, rgba(shadow, 0.48 * deep));
  dark.addColorStop(1, rgba(shadow, 0.26 * deep));
  const gloss = ctx.createLinearGradient(0, yTop, 0, yTop + h);
  gloss.addColorStop(0.07, rgba(PAPER_FILL, 0));
  gloss.addColorStop(0.2, rgba(PAPER_FILL, sheen));
  gloss.addColorStop(0.28, rgba(PAPER_FILL, sheen * 0.72));
  gloss.addColorStop(0.44, rgba(PAPER_FILL, 0));
  ctx.save();
  ctx.fillStyle = dark;
  ctx.fillRect(x0, yTop - 4, x1 - x0, h + 8);
  ctx.fillStyle = gloss;
  ctx.fillRect(x0, yTop - 4, x1 - x0, h + 8);
  ctx.restore();
}

/** Pigment in the paper's tooth: fine dots over x0..x0+w in `color`, repeated every `w` when `wrap`. */
export function grain(ctx: CanvasRenderingContext2D, x0: number, w: number, yTop: number, seed: number, count: number, wrap: boolean, color: string): void {
  const rng = createRng(seed);
  ctx.save();
  for (let i = 0; i < count; i++) {
    const x = x0 + rng() * w;
    const y = yTop + 1.2 + rng() * 21.6;
    const r = 0.16 + rng() * 0.32;
    const pale = rng() < 0.14;
    ctx.fillStyle = pale ? rgba(PAPER_FILL, 0.2) : rgba(color, 0.1 + 0.16 * rng() + 0.1 * ((y - yTop) / SNAKE_W));
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

/** A blotch's colours: its body, the warm heart lifted towards the light, the pigment pooled at its drying edge, its rim. */
export interface BlotchPaint {
  readonly body: string;
  readonly lit: string;
  readonly deep: string;
  readonly rim: string;
  /** A paler halo laid round it first (the ground edged lighter), with its strength. */
  readonly halo?: string;
  readonly haloAlpha?: number;
}

/**
 * A patch of colour painted as watercolour: laid in over an optional paler
 * halo, its heart lifted towards the light, the pigment pooled darker at
 * the drying edge, a pen rim (`rim` wide, 0 for none) and an ink hairline.
 */
export function paintBlotch(ctx: CanvasRenderingContext2D, shape: readonly Pt[], seed: number, ink: string, p: BlotchPaint, rim = 1.1, alpha = 0.94): void {
  const pen = new Pen(ctx, seed, 0.35);
  const { cx, cy, rx, ry } = centreOf(shape);
  if (p.halo && p.haloAlpha) glaze(ctx, cx, cy, rx + 2.4, ry + 1.8, 0, p.halo, p.haloAlpha);
  pen.fill(shape, p.body, alpha);
  pen.clipped(shape, () => {
    glaze(ctx, cx - rx * 0.14, cy - ry * 0.28, rx * 0.9, ry * 0.7, 0, p.lit, 0.5);
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.strokeStyle = rgba(p.deep, 0.55);
    ctx.lineWidth = Math.max(0.8, rim) * 2.6;
    pathOf(ctx, shape);
    ctx.stroke();
    ctx.restore();
    if (rim > 0) pen.stroke(closed(shape), rim * 1.25, p.rim, 0.85, false);
  });
  pen.hair(closed(shape), 0.3, ink, 0.3);
}

/** The strip's long pen contours: lighter along the lit edge, heavier along the shaded one, a faint second line inside it. */
export function contours(ctx: CanvasRenderingContext2D, period: number, ink: string, seed: number): void {
  periodicLine(ctx, period, -2, period + 2, TOP_EDGE, 1.1, ink, 0.95, seed);
  periodicLine(ctx, period, -2, period + 2, BOTTOM_EDGE, 1.8, ink, 1, seed + 50);
  periodicLine(ctx, period, -2, period + 2, BOTTOM_EDGE - 0.55, 0.6, ink, 0.3, seed + 90);
}

/** Clips to the body between its contours and lays paper and the cross-section wash, then `paint`s inside. */
export function bodyClip(ctx: CanvasRenderingContext2D, x0: number, x1: number, wash: CanvasGradient, paint: () => void): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, TOP_EDGE - 0.6, x1 - x0, BOTTOM_EDGE - TOP_EDGE + 1.2);
  ctx.clip();
  ctx.fillStyle = PAPER_FILL;
  ctx.fillRect(x0, 0, x1 - x0, SNAKE_W);
  ctx.globalAlpha = 0.95;
  ctx.fillStyle = wash;
  ctx.fillRect(x0, 0, x1 - x0, SNAKE_W);
  ctx.globalAlpha = 1;
  paint();
  ctx.restore();
}

/**
 * Paints one period on a tile at the target's own resolution, then lays the
 * tile end to end along `length`, so x = period + a is pixel for pixel x = a.
 */
export function layTile(ctx: CanvasRenderingContext2D, period: number, length: number, paint: (tile: CanvasRenderingContext2D) => void): void {
  const res = Math.abs(ctx.getTransform().a) || 1;
  withScratch(Math.round(period * res), Math.round(SNAKE_W * res), (tctx, tile) => {
    tctx.scale(res, res);
    paint(tctx);
    for (let x = 0; x < length; x += period) ctx.drawImage(tile, x, 0, period, SNAKE_W);
  });
}

/**
 * Paints the strip's tile on a head's neck, mirrored (the neck runs to -x in
 * the head's frame, the strip to +x from the head), so the neck is the very
 * strip that lies under it and the join can't show.
 */
export function neckFromTile(ctx: CanvasRenderingContext2D, period: number, paint: (tile: CanvasRenderingContext2D) => void): void {
  const res = Math.abs(ctx.getTransform().a) || 1;
  withScratch(Math.round(period * res), Math.round(SNAKE_W * res), (tctx, tile) => {
    tctx.scale(res, res);
    paint(tctx);
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(tile, 0, -SNAKE_W / 2, period, SNAKE_W);
    ctx.restore();
  });
}
