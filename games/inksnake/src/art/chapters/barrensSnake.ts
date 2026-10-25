import { createRng } from '../../logic/rng';
import type { Draw } from '../kit';
import { PAPER_FILL } from '../palette';
import { blotchShape, flankHatch, glaze, periodicLine } from '../snakes/cornPaint';
import { SNAKE_W, stripLength, type SnakeArt } from '../types';
import { drawBelly } from './barrensSnakeBelly';
import { HOG_HEAD, HOG_SNOUT, HOG_TONGUE } from './barrensSnakeHead';
import {
  BOTTOM_EDGE, HOG_PAINT, HOG_PERIOD, hogCrossWash, hogModel, keeledScales, layTile, mod, paintHogBlotch, speckle, TOP_EDGE,
} from './barrensSnakePaint';

/**
 * The eastern hognose (Heterodon platirhinos, chapter 2), seen from above:
 * a stout snake on a sandy, yellow-brown ground, a row of big squarish
 * umber-black blotches down the back, each edged paler, smaller dark blotches
 * on the flanks in the gaps between them and dark bars low on the sides
 * beside them, the ground flecked, the keeled scales matte.
 *
 * As the corn snake's, the strip is one period painted once on a tile (the
 * features crossing the tile's ends drawn at both ends from the same seed)
 * and the tile laid end to end, so x = PERIOD + a is pixel for pixel x = a.
 */
const PERIOD = HOG_PERIOD;
const BLOTCHES = 5;
const STEP = PERIOD / BLOTCHES;
/** A scale's length along the body; it divides the period. */
const SCALE_LEN = 2.4;

type Blotch = { shape: ReturnType<typeof blotchShape>; seed: number };

/** Dorsal blotch i (any integer), the same shape as blotch i + BLOTCHES one period along: broad across the back, squarish. */
function dorsal(i: number): Blotch {
  const k = mod(i, BLOTCHES);
  const rng = createRng(9100 + k * 19);
  const cx = i * STEP + STEP / 2 + (rng() - 0.5) * 2.2;
  const cy = 12 + (rng() - 0.5) * 1.1;
  const rx = 6.6 + (rng() - 0.5) * 1.3;
  const ry = 8 + (rng() - 0.5) * 0.9;
  return { shape: blotchShape(cx, cy, rx, ry, 9200 + k, { rough: 0.19, pow: 3, notch: 0.1, lobe: 0.12, n: 56 }), seed: 9300 + k };
}

/** The flank blotches in the gap before dorsal blotch i, and the dark bars low on the sides beside it. */
function flank(i: number): Blotch[] {
  const k = mod(i, BLOTCHES);
  const rng = createRng(9400 + k * 13);
  const x = i * STEP + (rng() - 0.5) * 2.4;
  const up = blotchShape(x + (rng() - 0.5) * 1.6, 2.9, 3.5 + rng() * 0.8, 2.5, 9500 + k, { rough: 0.15, pow: 2.8, n: 26 });
  const down = blotchShape(x + (rng() - 0.5) * 1.6, SNAKE_W - 2.7, 3.9 + rng() * 0.8, 2.8, 9600 + k, { rough: 0.15, pow: 2.8, n: 26 });
  const sx = i * STEP + STEP / 2 + (rng() - 0.5) * 2;
  const barUp = blotchShape(sx, 0.4, 2.2, 1.6, 9700 + k, { rough: 0.12, pow: 2.6, n: 20 });
  const barDown = blotchShape(sx + 0.8, SNAKE_W - 0.3, 2.4, 1.8, 9800 + k, { rough: 0.12, pow: 2.6, n: 20 });
  return [
    { shape: up, seed: 9900 + k },
    { shape: down, seed: 9950 + k },
    { shape: barUp, seed: 10000 + k },
    { shape: barDown, seed: 10050 + k },
  ];
}

/** The ground between the blotches warmed to ochre down the middle, cooled to grey low on the flanks, unevenly, as a wash dries. */
function groundGlazes(ctx: CanvasRenderingContext2D, i: number): void {
  const k = mod(i, BLOTCHES);
  const rng = createRng(10100 + k * 11);
  const x = i * STEP;
  glaze(ctx, x + (rng() - 0.5) * 2, 11.5 + (rng() - 0.5) * 2, 4.6, 7.5, 0, HOG_PAINT.ochre, 0.4);
  glaze(ctx, x + STEP / 2 + (rng() - 0.5) * 6, 19.5 + rng() * 1.5, 10, 3.2, 0, HOG_PAINT.grey, 0.3);
  glaze(ctx, x + STEP / 2 + (rng() - 0.5) * 8, 4.5 + rng() * 1.5, 8, 2.6, 0, HOG_PAINT.sand, 0.32);
}

/** Paints one period of the back into [0, PERIOD] × [0, SNAKE_W]. */
function paintTile(ctx: CanvasRenderingContext2D, ink: string, f: number): void {
  const boil = f * 1000;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, TOP_EDGE - 0.6, PERIOD, BOTTOM_EDGE - TOP_EDGE + 1.2);
  ctx.clip();
  ctx.fillStyle = PAPER_FILL;
  ctx.fillRect(0, 0, PERIOD, SNAKE_W);
  ctx.globalAlpha = 0.94;
  ctx.fillStyle = hogCrossWash(ctx, 0);
  ctx.fillRect(0, 0, PERIOD, SNAKE_W);
  ctx.globalAlpha = 1;
  for (let i = -1; i <= BLOTCHES; i++) groundGlazes(ctx, i);
  speckle(ctx, 0, PERIOD, 0, 10200, 260, true, HOG_PAINT.blotch);
  for (let i = -1; i <= BLOTCHES; i++) for (const b of flank(i)) paintHogBlotch(ctx, b.shape, b.seed + boil, ink, 0.95, 0.22);
  for (let i = -1; i <= BLOTCHES; i++) {
    const b = dorsal(i);
    paintHogBlotch(ctx, b.shape, b.seed + boil, ink, 1.25);
  }
  keeledScales(ctx, 0, PERIOD, 0, SCALE_LEN, 0.4, PERIOD);
  speckle(ctx, 0, PERIOD, 0, 10300, 480, true);
  hogModel(ctx, 0, PERIOD, 0);
  flankHatch(ctx, 0, PERIOD, 60, 0, 10400 + boil, ink, 0.4, true);
  ctx.restore();
  periodicLine(ctx, PERIOD, -2, PERIOD + 2, TOP_EDGE, 1.15, ink, 0.95, 10500 + boil);
  periodicLine(ctx, PERIOD, -2, PERIOD + 2, BOTTOM_EDGE, 1.85, ink, 1, 10550 + boil);
  periodicLine(ctx, PERIOD, -2, PERIOD + 2, BOTTOM_EDGE - 0.55, 0.6, ink, 0.3, 10590 + boil);
}

function drawStrip(d: Draw, length: number): void {
  layTile(d.pen.ctx, length, (tile) => paintTile(tile, d.ink, d.f));
}

export const HOGNOSE_ART: SnakeArt | undefined = {
  period: PERIOD,
  drawStrip: (d, length) => drawStrip(d, Math.min(length, stripLength(PERIOD))),
  drawBelly: (d, length) => drawBelly(d, Math.min(length, stripLength(PERIOD))),
  head: HOG_HEAD,
  tongue: HOG_TONGUE,
  snout: HOG_SNOUT,
  colours: { base: HOG_PAINT.ground, mark: HOG_PAINT.blotch, belly: HOG_PAINT.belly },
};
