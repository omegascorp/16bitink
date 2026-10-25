import { createRng } from '../../logic/rng';
import type { Draw } from '../kit';
import { PAPER_FILL } from '../palette';
import { blotchShape, flankHatch, glaze, periodicLine } from '../snakes/cornPaint';
import { SNAKE_W, stripLength, type SnakeArt } from '../types';
import { BOTTOM_EDGE, HOG_PERIOD, hogModel, keeledScales, layTile, mod, TOP_EDGE } from './barrensSnakePaint';
import { SIDE_HEAD, SIDE_SNOUT, SIDE_TONGUE } from './dunesSnakeHeadArt';
import { paintSideBlotch, paleSpot, pepper, SIDE_PAINT, sideCrossWash } from './dunesSnakePaint';

/**
 * The sidewinder (Crotalus cerastes, chapter 3), seen from above: a small
 * rattlesnake the colour of the sand, pale cream to pinkish buff, a row of
 * soft tan-brown blotches down the back with cream flecks between them,
 * small brown spots in rows down both flanks, the skin peppered with fine
 * grains, the keeled scales rough and matte.
 *
 * As the hognose's, the strip is one period painted once on a tile (the
 * features crossing the tile's ends drawn at both ends from the same seed)
 * and the tile laid end to end, so x = PERIOD + a is pixel for pixel x = a.
 */
const PERIOD = HOG_PERIOD;
const BLOTCHES = 6;
const STEP = PERIOD / BLOTCHES;
/** A scale's length along the body; it divides the period. */
const SCALE_LEN = 2.4;

type Blotch = { shape: ReturnType<typeof blotchShape>; seed: number };

/** Dorsal blotch i (any integer), the same as blotch i + BLOTCHES one period along: a soft squarish oval, a little wider than long. */
function dorsal(i: number): Blotch {
  const k = mod(i, BLOTCHES);
  const rng = createRng(21100 + k * 19);
  const cx = i * STEP + STEP / 2 + (rng() - 0.5) * 2.4;
  const cy = 12 + (rng() - 0.5) * 1.2;
  const rx = 4.4 + (rng() - 0.5) * 1.4;
  const ry = 5.2 + (rng() - 0.5) * 1.1;
  return { shape: blotchShape(cx, cy, rx, ry, 21200 + k, { rough: 0.22, pow: 2.5, notch: 0.12, lobe: 0.1, n: 44 }), seed: 21300 + k };
}

/** The flank spots round dorsal blotch i: a row high on each flank in the gap before it, and a row low on each side beside it. */
function flank(i: number): Blotch[] {
  const k = mod(i, BLOTCHES);
  const rng = createRng(21400 + k * 13);
  const x = i * STEP + (rng() - 0.5) * 2;
  const sx = i * STEP + STEP / 2 + (rng() - 0.5) * 2;
  const opts = { rough: 0.2, pow: 2.4, n: 22 } as const;
  return [
    { shape: blotchShape(x + (rng() - 0.5) * 1.5, 5.4, 2.4 + rng() * 0.6, 1.7, 21500 + k, opts), seed: 21600 + k },
    { shape: blotchShape(x + (rng() - 0.5) * 1.5, SNAKE_W - 5.2, 2.6 + rng() * 0.6, 1.9, 21700 + k, opts), seed: 21800 + k },
    { shape: blotchShape(sx, 1.2, 2, 1.3, 21900 + k, opts), seed: 22000 + k },
    { shape: blotchShape(sx + 0.6, SNAKE_W - 1.1, 2.2, 1.4, 22100 + k, opts), seed: 22200 + k },
  ];
}

/** The ground between the marks, unevenly dried: warm pink in places, cooler grey low on the flanks, bleached pale along the back. */
function groundGlazes(ctx: CanvasRenderingContext2D, i: number): void {
  const k = mod(i, BLOTCHES);
  const rng = createRng(22300 + k * 11);
  const x = i * STEP;
  glaze(ctx, x + STEP / 2 + (rng() - 0.5) * 8, 9 + rng() * 6, 9 + rng() * 4, 6, 0, SIDE_PAINT.pink, 0.16 + rng() * 0.12);
  glaze(ctx, x + (rng() - 0.5) * 6, 19.5 + rng() * 1.5, 9, 3, 0, SIDE_PAINT.grey, 0.22);
  glaze(ctx, x + (rng() - 0.5) * 4, 7 + rng() * 2, 6, 2.4, 0, SIDE_PAINT.pale, 0.35);
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
  ctx.fillStyle = sideCrossWash(ctx, 0);
  ctx.fillRect(0, 0, PERIOD, SNAKE_W);
  ctx.globalAlpha = 1;
  for (let i = -1; i <= BLOTCHES; i++) groundGlazes(ctx, i);
  pepper(ctx, 0, PERIOD, 0, 22400, 520, true);
  for (let i = -1; i <= BLOTCHES; i++) for (const b of flank(i)) paintSideBlotch(ctx, b.shape, b.seed + boil, ink, 0.7, 0.2);
  for (let i = -1; i <= BLOTCHES; i++) {
    const r = createRng(22500 + mod(i, BLOTCHES));
    paleSpot(ctx, i * STEP + (r() - 0.5) * 1.5, 12 + (r() - 0.5) * 1.5, 1.6, 1.4);
    const b = dorsal(i);
    paintSideBlotch(ctx, b.shape, b.seed + boil, ink, 1.05);
  }
  keeledScales(ctx, 0, PERIOD, 0, SCALE_LEN, 0.5, PERIOD);
  pepper(ctx, 0, PERIOD, 0, 22600, 380, true);
  hogModel(ctx, 0, PERIOD, 0, SIDE_PAINT.shadow, 0.2);
  flankHatch(ctx, 0, PERIOD, 60, 0, 22700 + boil, ink, 0.36, true);
  ctx.restore();
  periodicLine(ctx, PERIOD, -2, PERIOD + 2, TOP_EDGE, 1.1, ink, 0.95, 22800 + boil);
  periodicLine(ctx, PERIOD, -2, PERIOD + 2, BOTTOM_EDGE, 1.8, ink, 1, 22850 + boil);
  periodicLine(ctx, PERIOD, -2, PERIOD + 2, BOTTOM_EDGE - 0.55, 0.6, ink, 0.3, 22890 + boil);
}

function drawStrip(d: Draw, length: number): void {
  layTile(d.pen.ctx, length, (tile) => paintTile(tile, d.ink, d.f));
}

/** The sidewinder (chapter 3), painted. */
export const SIDEWINDER_ART: SnakeArt | undefined = {
  period: PERIOD,
  drawStrip: (d, length) => drawStrip(d, Math.min(length, stripLength(PERIOD))),
  head: SIDE_HEAD,
  tongue: SIDE_TONGUE,
  snout: SIDE_SNOUT,
  colours: { base: SIDE_PAINT.ground, mark: SIDE_PAINT.blotch, belly: SIDE_PAINT.belly },
};
