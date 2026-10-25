import { createRng } from '../../logic/rng';
import type { Draw } from '../kit';
import { flankHatch, glaze, periodicLine } from '../snakes/cornPaint';
import { SNAKE_W, stripLength, type SnakeArt } from '../types';
import { rgba } from '../wash';
import { FLY_HEAD, FLY_SNOUT, FLY_TONGUE } from './rainforestSnakeHead';
import {
  BOTTOM_EDGE, FLY_PAINT, FLY_PER_ROW, FLY_PERIOD, FLY_SCALE, flyCrossWash, flyModel, flyScales, glossGlints, inFlower, layFlyTile, mod, rowOf, SPINE_ROW,
  TOP_EDGE,
} from './rainforestSnakePaint';

/**
 * The paradise flying snake (Chrysopelea paradisi, chapter 5), seen from
 * above: slender and glossy, black, every scale bright green-yellow in its
 * middle so the black shows as a fine net round each one, yellower down
 * the spine and greener low on the flanks, and down the spine a row of
 * red-orange flowers, each four scales: two on the spine and one either
 * side.
 *
 * As the corn snake's, the strip is one period painted once on a tile (the
 * scales and flowers crossing the tile's ends drawn at both ends alike) and
 * the tile laid end to end, so x = PERIOD + a is pixel for pixel x = a.
 */
const PERIOD = FLY_PERIOD;
const FLOWERS = 5;
/** Scales between one flower and the next. */
const GAP = FLY_PER_ROW / FLOWERS;
const F = FLY_PAINT;

/** Flower i's centre along the strip (between two spine scales), the same as flower i + FLOWERS's one period along. */
function flowerAt(i: number): number {
  const nudge = [0, 1, -1, 0, 1][mod(i, FLOWERS)]!;
  return (i * GAP + 3 + nudge) * FLY_SCALE + FLY_SCALE / 2;
}

const CENTRES = Array.from({ length: FLOWERS + 3 }, (_, i) => flowerAt(i - 1));

/** The black ground isn't flat: soft glazes where the wash pooled, green-black here, blue-black there. */
function groundGlazes(ctx: CanvasRenderingContext2D, i: number): void {
  const rng = createRng(14100 + mod(i, FLOWERS) * 11);
  const x = i * GAP * FLY_SCALE;
  glaze(ctx, x + rng() * 20, 8 + rng() * 6, 12, 5, 0, '#1e3326', 0.5);
  glaze(ctx, x + 10 + rng() * 10, 18 + rng() * 3, 10, 3, 0, '#0b1016', 0.4);
}

/** A flower's wash bleeding a little into the net round it, and a fine ink ring drawn round its petals. */
function flowerHalo(ctx: CanvasRenderingContext2D, x: number): void {
  const { y } = rowOf(SPINE_ROW);
  glaze(ctx, x, y, FLY_SCALE * 1.7, 3.6, 0, F.red, 0.42);
  glaze(ctx, x - 0.6, y - 1, FLY_SCALE * 0.9, 1.6, 0, F.redLit, 0.3);
}

/** Paints one period of the back into [0, PERIOD] × [0, SNAKE_W]. */
function paintTile(ctx: CanvasRenderingContext2D, ink: string, f: number): void {
  const boil = f * 1000;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, TOP_EDGE - 0.6, PERIOD, BOTTOM_EDGE - TOP_EDGE + 1.2);
  ctx.clip();
  ctx.fillStyle = flyCrossWash(ctx, 0);
  ctx.fillRect(0, 0, PERIOD, SNAKE_W);
  for (let i = -1; i <= FLOWERS; i++) groundGlazes(ctx, i);
  for (const c of CENTRES) flowerHalo(ctx, c);
  flyScales(ctx, 0, PERIOD, 0, 14200, { red: (j, r) => inFlower(j, r, CENTRES) });
  flyModel(ctx, 0, PERIOD, 0);
  glossGlints(ctx, 0, PERIOD, 0, 14300, 26, true);
  flankHatch(ctx, 0, PERIOD, 60, 0, 14400 + boil, ink, 0.35, true);
  ctx.fillStyle = rgba(F.net, 0.25);
  ctx.fillRect(0, BOTTOM_EDGE - 1.6, PERIOD, 2.4);
  ctx.restore();
  periodicLine(ctx, PERIOD, -2, PERIOD + 2, TOP_EDGE, 1.0, ink, 0.9, 14500 + boil);
  periodicLine(ctx, PERIOD, -2, PERIOD + 2, BOTTOM_EDGE, 1.7, F.net, 1, 14550 + boil);
  periodicLine(ctx, PERIOD, -2, PERIOD + 2, BOTTOM_EDGE - 0.5, 0.5, ink, 0.35, 14590 + boil);
}

function drawStrip(d: Draw, length: number): void {
  layFlyTile(d.pen.ctx, length, (tile) => paintTile(tile, d.ink, d.f));
}

export const FLYING_ART: SnakeArt | undefined = {
  period: PERIOD,
  drawStrip: (d, length) => drawStrip(d, Math.min(length, stripLength(PERIOD))),
  head: FLY_HEAD,
  tongue: FLY_TONGUE,
  snout: FLY_SNOUT,
  colours: { base: F.lime, mark: F.red, belly: F.belly },
};
