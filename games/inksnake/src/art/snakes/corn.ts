import { createRng } from '../../logic/rng';
import type { Draw } from '../kit';
import { PAPER_FILL } from '../palette';
import { withScratch } from '../pen';
import { SNAKE_W, stripLength, type SnakeArt } from '../types';
import { CORN_HEAD, CORN_SNOUT, CORN_TONGUE } from './cornHead';
import { blotchShape, CORN_PAINT, crossWash, flankHatch, glaze, grain, modelOver, paintBlotch, periodicLine, scaleRows } from './cornPaint';

/**
 * The corn snake (Pantherophis guttatus, chapter 1), seen from above: an
 * orange ground, a row of big rust-red saddles each rimmed in black down the
 * back, smaller red blotches along both flanks, smooth glossy scales.
 *
 * The strip is one period painted once on a tile (its features that cross
 * the tile's ends drawn at both ends from the same seed) and the tile laid
 * down end to end, so x = PERIOD + a is pixel for pixel x = a.
 */
const PERIOD = 120;
const SADDLES = 4;
const STEP = PERIOD / SADDLES;
/** A scale's length along the body; it divides the period. */
const SCALE_LEN = 2.5;
/** Where the long contours run. */
const TOP_EDGE = 1.2;
const BOTTOM_EDGE = SNAKE_W - 1.2;

const mod = (i: number, n: number): number => ((i % n) + n) % n;

/** Saddle i (any integer), the same shape as saddle i + SADDLES one period along. */
function saddle(i: number): { shape: ReturnType<typeof blotchShape>; seed: number } {
  const k = mod(i, SADDLES);
  const rng = createRng(5100 + k * 17);
  const cx = i * STEP + STEP / 2 + (rng() - 0.5) * 2.4;
  const cy = 12 + (rng() - 0.5) * 1.4;
  const rx = 8.5 + (rng() - 0.5) * 1.8;
  const ry = 8.3 + (rng() - 0.5) * 0.8;
  return { shape: blotchShape(cx, cy, rx, ry, 5200 + k, { rough: 0.15, pow: 2.15, notch: 0.07, lobe: 0.14, n: 44 }), seed: 5300 + k };
}

/** The flank blotches in the gap before saddle i: one on each side, half turned away over the edge. */
function flankBlotches(i: number): { shape: ReturnType<typeof blotchShape>; seed: number }[] {
  const k = mod(i, SADDLES);
  const rng = createRng(6100 + k * 13);
  const x = i * STEP + (rng() - 0.5) * 3;
  const up = blotchShape(x + (rng() - 0.5) * 2, 2.4, 4.2 + rng() * 0.8, 2.6, 6200 + k, { rough: 0.12, pow: 2.3, n: 24 });
  const down = blotchShape(x + (rng() - 0.5) * 2, SNAKE_W - 2.2, 4.6 + rng() * 0.8, 2.9, 6300 + k, { rough: 0.12, pow: 2.3, n: 24 });
  // The lower lateral row peeks over the edge beside each saddle.
  const sx = i * STEP + STEP / 2 + (rng() - 0.5) * 2;
  const peekUp = blotchShape(sx, 0.2, 3.2, 1.5, 6400 + k, { rough: 0.12, pow: 2.2, n: 20 });
  const peekDown = blotchShape(sx + 1, SNAKE_W - 0.1, 3.4, 1.6, 6500 + k, { rough: 0.12, pow: 2.2, n: 20 });
  return [
    { shape: up, seed: 6600 + k },
    { shape: down, seed: 6700 + k },
    { shape: peekUp, seed: 6800 + k },
    { shape: peekDown, seed: 6900 + k },
  ];
}

/** The ground between the saddles, warmed and paled unevenly, as a wash dries. */
function groundGlazes(ctx: CanvasRenderingContext2D, i: number): void {
  const k = mod(i, SADDLES);
  const rng = createRng(7100 + k * 11);
  const x = i * STEP;
  glaze(ctx, x + (rng() - 0.5) * 3, 9 + rng() * 3, 7 + rng() * 2, 5, 0, CORN_PAINT.tan, 0.42);
  glaze(ctx, x + STEP / 2 + (rng() - 0.5) * 6, 18 + rng() * 2, 12, 4, 0, '#c8602c', 0.22);
  glaze(ctx, x + (rng() - 0.5) * 8, 15 + rng() * 3, 4, 3, 0, '#d97636', 0.3);
}

/** Paints one period of the body into [0, PERIOD] × [0, SNAKE_W]. */
function paintTile(ctx: CanvasRenderingContext2D, ink: string, f: number): void {
  const boil = f * 1000;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, TOP_EDGE - 0.6, PERIOD, BOTTOM_EDGE - TOP_EDGE + 1.2);
  ctx.clip();
  ctx.fillStyle = PAPER_FILL;
  ctx.fillRect(0, 0, PERIOD, SNAKE_W);
  ctx.globalAlpha = 0.93;
  ctx.fillStyle = crossWash(ctx, 0);
  ctx.fillRect(0, 0, PERIOD, SNAKE_W);
  ctx.globalAlpha = 1;
  for (let i = -1; i <= SADDLES; i++) groundGlazes(ctx, i);
  for (let i = -1; i <= SADDLES; i++) for (const b of flankBlotches(i)) paintBlotch(ctx, b.shape, b.seed + boil, ink, 1.05);
  for (let i = -1; i <= SADDLES; i++) {
    const s = saddle(i);
    paintBlotch(ctx, s.shape, s.seed + boil, ink, 1.3);
  }
  scaleRows(ctx, 0, PERIOD, 0, SCALE_LEN, 0.34, PERIOD);
  grain(ctx, 0, PERIOD, 0, 7700, 520, true);
  modelOver(ctx, 0, PERIOD, 0);
  flankHatch(ctx, 0, PERIOD, 60, 0, 7800 + boil, ink, 0.38, true);
  ctx.restore();
  periodicLine(ctx, PERIOD, -2, PERIOD + 2, TOP_EDGE, 1.05, ink, 0.95, 7900 + boil);
  periodicLine(ctx, PERIOD, -2, PERIOD + 2, BOTTOM_EDGE, 1.7, ink, 1, 7950 + boil);
  periodicLine(ctx, PERIOD, -2, PERIOD + 2, BOTTOM_EDGE - 0.5, 0.6, ink, 0.3, 7990 + boil);
}

/** The strip: the tile painted at the strip's own resolution, then laid end to end. */
function drawStrip(d: Draw, length: number): void {
  const { ctx } = d.pen;
  const res = Math.abs(ctx.getTransform().a) || 1;
  withScratch(Math.round(PERIOD * res), Math.round(SNAKE_W * res), (tctx, tile) => {
    tctx.scale(res, res);
    paintTile(tctx, d.ink, d.f);
    for (let x = 0; x < length; x += PERIOD) ctx.drawImage(tile, x, 0, PERIOD, SNAKE_W);
  });
}

export const CORN: SnakeArt = {
  period: PERIOD,
  drawStrip: (d, length) => drawStrip(d, Math.min(length, stripLength(PERIOD))),
  head: CORN_HEAD,
  tongue: CORN_TONGUE,
  snout: CORN_SNOUT,
  colours: { base: CORN_PAINT.ground, mark: CORN_PAINT.saddle, belly: '#f1e9d6' },
};
