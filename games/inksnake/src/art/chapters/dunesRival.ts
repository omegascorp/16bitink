import { createRng } from '../../logic/rng';
import type { Draw } from '../kit';
import { PAPER_FILL } from '../palette';
import { Pen } from '../pen';
import { flankHatch, glaze, periodicLine } from '../snakes/cornPaint';
import { SNAKE_W, stripLength, type SnakeArt } from '../types';
import { BOTTOM_EDGE, HOG_PERIOD, hogModel, layTile, mod, TOP_EDGE } from './barrensSnakePaint';
import { HOG_TONGUE } from './barrensSnakeHead';
import { KING_HEAD, KING_SNOUT } from './dunesRivalHead';
import { bandShape, creamWash, KING_PAINT, kingCrossWash, kingFlecks, smoothScales } from './dunesRivalPaint';

/**
 * The California kingsnake (Lampropeltis californiae), the Dunes' rival:
 * glossy black-brown crossed by clean cream bands that widen low on the
 * flanks, their edges stepping along the scale rows; smooth shining scales
 * with a blue-white sheen along the lit side. Kingsnakes resist rattlesnake
 * venom and eat other snakes. Painted on one tile and laid end to end, so
 * x = PERIOD + a is pixel for pixel x = a.
 */
const PERIOD = HOG_PERIOD;
const BANDS = 4;
const STEP = PERIOD / BANDS;
/** A scale's length along the body; it divides the period. */
const SCALE_LEN = 2.5;
const K = KING_PAINT;

/** Band i (any integer), the same as band i + BANDS one period along. */
function band(i: number): ReturnType<typeof bandShape> {
  const k = mod(i, BANDS);
  const rng = createRng(32100 + k * 17);
  return bandShape(i * STEP + STEP / 2 + (rng() - 0.5) * 3, 5.6 + rng() * 1.2, 8.6 + rng() * 1.4, SCALE_LEN, 32200 + k * 3);
}

/** The black between the bands, not quite even: browner here, deeper there, as a dark wash dries. */
function blackGlazes(ctx: CanvasRenderingContext2D, i: number): void {
  const k = mod(i, BANDS);
  const rng = createRng(32300 + k * 11);
  const x = i * STEP;
  glaze(ctx, x + (rng() - 0.5) * 6, 10 + rng() * 4, 9, 5, 0, '#3b2a22', 0.4);
  glaze(ctx, x + (rng() - 0.5) * 8, 18 + rng() * 2, 8, 3, 0, K.blackDeep, 0.35);
}

/** One band: paper, the cream's wash, its shade towards the flank, dark-tipped scales at its edges, a fine ink line round it. */
function paintBand(ctx: CanvasRenderingContext2D, i: number, ink: string, boil: number): void {
  const shape = band(i);
  const pen = new Pen(ctx, 32400 + mod(i, BANDS) + boil, 0.3);
  pen.fill(shape, PAPER_FILL, 1);
  ctx.save();
  ctx.globalAlpha = 0.93;
  pen.clipped(shape, () => {
    ctx.fillStyle = creamWash(ctx, 0);
    ctx.fillRect(-10, 0, PERIOD + 20, SNAKE_W);
  });
  ctx.restore();
  pen.clipped(shape, () => {
    const rng = createRng(32500 + mod(i, BANDS));
    const c = i * STEP + STEP / 2;
    glaze(ctx, c + (rng() - 0.5) * 3, 8 + rng() * 6, 4, 5, 0, K.creamWarm, 0.35);
    ctx.save();
    ctx.strokeStyle = 'rgba(36,29,26,0.35)';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    shape.forEach((p, j) => (j === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  });
  pen.hair([...shape, shape[0]!], 0.3, ink, 0.4);
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
  ctx.globalAlpha = 0.97;
  ctx.fillStyle = kingCrossWash(ctx, 0);
  ctx.fillRect(0, 0, PERIOD, SNAKE_W);
  ctx.globalAlpha = 1;
  for (let i = -1; i <= BANDS; i++) blackGlazes(ctx, i);
  for (let i = -1; i <= BANDS; i++) paintBand(ctx, i, ink, boil);
  smoothScales(ctx, 0, PERIOD, 0, SCALE_LEN, PERIOD, '#8a8078', 0.42, 0.65);
  kingFlecks(ctx, 0, PERIOD, 0, 32600, 260, true);
  hogModel(ctx, 0, PERIOD, 0, K.shadow, 0.32);
  flankHatch(ctx, 0, PERIOD, 60, 0, 32700 + boil, '#7a7a90', 0.3, true);
  ctx.restore();
  periodicLine(ctx, PERIOD, -2, PERIOD + 2, TOP_EDGE, 1.1, ink, 0.95, 32800 + boil);
  periodicLine(ctx, PERIOD, -2, PERIOD + 2, BOTTOM_EDGE, 1.8, ink, 1, 32850 + boil);
}

function drawStrip(d: Draw, length: number): void {
  layTile(d.pen.ctx, length, (tile) => paintTile(tile, d.ink, d.f));
}

/** The kingsnake (the Dunes' rival), painted. */
export const KINGSNAKE_ART: SnakeArt = {
  period: PERIOD,
  drawStrip: (d, length) => drawStrip(d, Math.min(length, stripLength(PERIOD))),
  head: KING_HEAD,
  tongue: HOG_TONGUE,
  snout: KING_SNOUT,
  colours: { base: K.black, mark: K.cream, belly: '#efe8d4' },
};
