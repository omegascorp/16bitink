import { createRng } from '../../logic/rng';
import type { Draw } from '../kit';
import { PAPER_FILL } from '../palette';
import { flankHatch, glaze, periodicLine } from '../snakes/cornPaint';
import { SNAKE_W, stripLength, type SnakeArt } from '../types';
import { KRAIT_HEAD, KRAIT_SNOUT, KRAIT_TONGUE } from './reefSnakeHead';
import {
  BAND_STEP, BANDS, bandShape, BOTTOM_EDGE, grainOf, KRAIT_PAINT, KRAIT_PERIOD, kraitCrossWash, kraitModel, layKraitTile, mod, paintBand, smoothScales, TOP_EDGE,
} from './reefSnakePaint';

/**
 * The banded sea krait (Laticauda colubrina, chapter 6), seen from above:
 * a silver-blue snake ringed by even blue-black bands about a body width
 * apart, broadest over the back, the smooth scales wet and glossy, the
 * yellow of the snout and lip on its head (reefSnakeHead.ts).
 *
 * As the corn snake's, the strip is one period painted once on a tile (the
 * bands crossing the tile's ends drawn at both ends from the same seed) and
 * the tile laid end to end, so x = PERIOD + a is pixel for pixel x = a.
 */
const PERIOD = KRAIT_PERIOD;
/** A scale's length along the body; it divides the period. */
const SCALE_LEN = 2.4;
const K = KRAIT_PAINT;

/** The silver between bands i and i + 1: paler down the middle of the back, cooler blue low on the flanks, unevenly, as a wash dries. */
function groundGlazes(ctx: CanvasRenderingContext2D, i: number): void {
  const k = mod(i, BANDS);
  const rng = createRng(14500 + k * 11);
  const x = i * BAND_STEP;
  glaze(ctx, x + (rng() - 0.5) * 3, 7 + (rng() - 0.5) * 2, 7, 4.5, 0, K.silver, 0.45);
  glaze(ctx, x + (rng() - 0.5) * 5, 18.5 + rng() * 1.5, 8, 3.4, 0, K.slate, 0.28);
  glaze(ctx, x + (rng() - 0.5) * 6, 12 + (rng() - 0.5) * 4, 4, 3, 0, '#b4c9d6', 0.3);
}

/** Paints one period of the back into [0, PERIOD] × [0, SNAKE_W]. */
function paintTile(ctx: CanvasRenderingContext2D, ink: string, f: number): void {
  const boil = f * 1000;
  const bands = Array.from({ length: BANDS + 2 }, (_, j) => bandShape(j - 1));
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, TOP_EDGE - 0.6, PERIOD, BOTTOM_EDGE - TOP_EDGE + 1.2);
  ctx.clip();
  ctx.fillStyle = PAPER_FILL;
  ctx.fillRect(0, 0, PERIOD, SNAKE_W);
  ctx.globalAlpha = 0.94;
  ctx.fillStyle = kraitCrossWash(ctx, 0);
  ctx.fillRect(0, 0, PERIOD, SNAKE_W);
  ctx.globalAlpha = 1;
  for (let i = -1; i <= BANDS; i++) groundGlazes(ctx, i);
  grainOf(ctx, 0, PERIOD, 0, 14600, 320, true);
  smoothScales(ctx, 0, PERIOD, 0, SCALE_LEN, 0.42, PERIOD);
  bands.forEach((b, j) => paintBand(ctx, b, 14700 + mod(j - 1, BANDS) + boil, ink));
  // Over the black, only the scales' glossy edges show.
  for (const b of bands) {
    ctx.save();
    ctx.beginPath();
    b.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.closePath();
    ctx.clip();
    smoothScales(ctx, 0, PERIOD, 0, SCALE_LEN, 0.3, PERIOD, true);
    ctx.restore();
  }
  kraitModel(ctx, 0, PERIOD, 0);
  flankHatch(ctx, 0, PERIOD, 60, 0, 14800 + boil, ink, 0.32, true);
  ctx.restore();
  periodicLine(ctx, PERIOD, -2, PERIOD + 2, TOP_EDGE, 1.05, ink, 0.95, 14900 + boil);
  periodicLine(ctx, PERIOD, -2, PERIOD + 2, BOTTOM_EDGE, 1.75, ink, 1, 14950 + boil);
  periodicLine(ctx, PERIOD, -2, PERIOD + 2, BOTTOM_EDGE - 0.55, 0.6, ink, 0.3, 14990 + boil);
}

function drawStrip(d: Draw, length: number): void {
  layKraitTile(d.pen.ctx, length, (tile) => paintTile(tile, d.ink, d.f));
}

export const KRAIT_ART: SnakeArt | undefined = {
  period: PERIOD,
  drawStrip: (d, length) => drawStrip(d, Math.min(length, stripLength(PERIOD))),
  head: KRAIT_HEAD,
  tongue: KRAIT_TONGUE,
  snout: KRAIT_SNOUT,
  colours: { base: K.ground, mark: K.band, belly: K.belly },
};
