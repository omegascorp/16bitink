import { createRng } from '../../logic/rng';
import type { Draw } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { blotchShape, flankHatch, glaze, periodicLine } from '../snakes/cornPaint';
import { SNAKE_W, stripLength, type SnakeArt } from '../types';
import { BOTTOM_EDGE, HOG_PERIOD, hogModel, keeledScales, layTile, mod, speckle, TOP_EDGE } from './barrensSnakePaint';
import { EGG_HEAD, EGG_SNOUT, EGG_TONGUE } from './savannaSnakeHead';
import { chevronShape, dustGlazes, EGG_PAINT, eggCrossWash, paintEggMark } from './savannaSnakePaint';

/**
 * The common egg-eater (Dasypeltis scabra, chapter 4), seen from above: a
 * slender snake the dull grey-brown of savanna dust, a row of dark
 * chocolate chevrons down the back, each pointing forward and finely edged
 * paler (the rhombic night adder's marks, which it copies), pale fawn
 * between them, narrow dark bars low on each flank in the gaps, the
 * strongly keeled scales matte and rough.
 *
 * As the hognose's, the strip is one period painted once on a tile (the
 * features crossing the tile's ends drawn at both ends from the same seed)
 * and the tile laid end to end, so x = PERIOD + a is pixel for pixel x = a.
 */
const PERIOD = HOG_PERIOD;
const MARKS = 6;
const STEP = PERIOD / MARKS;
/** A scale's length along the body; it divides the period. */
const SCALE_LEN = 2.4;

const E = EGG_PAINT;

interface Mark {
  readonly shape: Pt[];
  readonly seed: number;
}

/** Dorsal chevron i (any integer), the same as chevron i + MARKS one period along. */
function chevron(i: number): Mark {
  const k = mod(i, MARKS);
  const rng = createRng(14100 + k * 17);
  const cx = i * STEP + STEP / 2 + (rng() - 0.5) * 2;
  const w = 7.6 + (rng() - 0.5) * 1.2;
  const reach = 8.4 + (rng() - 0.5) * 1;
  return { shape: chevronShape(cx, w, reach, 14200 + k, 12 + (rng() - 0.5) * 0.6, 0.34, 0.5), seed: 14300 + k };
}

/** The narrow dark bars low on each flank in the gap before chevron i, and a small spot higher up beside each. */
function flankMarks(i: number): Mark[] {
  const k = mod(i, MARKS);
  const rng = createRng(14400 + k * 13);
  const x = i * STEP + (rng() - 0.5) * 1.6;
  const bar = (y: number, ry: number, seed: number): Pt[] => blotchShape(x + (rng() - 0.5) * 1.4, y, 2 + rng() * 0.5, ry, seed, { rough: 0.16, pow: 2.4, n: 22 });
  const spot = (y: number, seed: number): Pt[] => blotchShape(x + STEP * 0.5 + (rng() - 0.5) * 2, y, 1.1 + rng() * 0.4, 0.9, seed, { rough: 0.2, pow: 2.2, n: 16 });
  return [
    { shape: bar(2, 3.2, 14500 + k), seed: 14550 + k },
    { shape: bar(SNAKE_W - 2, 3.6, 14600 + k), seed: 14650 + k },
    { shape: spot(1.1, 14700 + k), seed: 14750 + k },
    { shape: spot(SNAKE_W - 1.1, 14800 + k), seed: 14850 + k },
  ];
}

/** The pale fawn saddle between two chevrons on the midline, where the adder's pattern is lightest. */
function paleSaddle(ctx: CanvasRenderingContext2D, i: number): void {
  const k = mod(i, MARKS);
  const rng = createRng(14900 + k * 7);
  const x = i * STEP + (rng() - 0.5) * 1.5;
  glaze(ctx, x, 12 + (rng() - 0.5), 3.6, 5.6, 0, E.edging, 0.42);
  glaze(ctx, x + 0.6, 12, 2, 3, 0, PAPER_FILL, 0.18);
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
  ctx.globalAlpha = 0.95;
  ctx.fillStyle = eggCrossWash(ctx, 0);
  ctx.fillRect(0, 0, PERIOD, SNAKE_W);
  ctx.globalAlpha = 1;
  for (let i = -1; i <= MARKS; i++) dustGlazes(ctx, i * STEP, STEP, createRng(15000 + mod(i, MARKS) * 11));
  speckle(ctx, 0, PERIOD, 0, 15100, 300, true, E.mark);
  for (let i = -1; i <= MARKS + 1; i++) paleSaddle(ctx, i);
  for (let i = -1; i <= MARKS; i++) for (const m of flankMarks(i)) paintEggMark(ctx, m.shape, m.seed + boil, ink, 0.7, 0.3);
  for (let i = -1; i <= MARKS; i++) {
    const m = chevron(i);
    paintEggMark(ctx, m.shape, m.seed + boil, ink, 1.05, 0.75);
  }
  keeledScales(ctx, 0, PERIOD, 0, SCALE_LEN, 0.55, PERIOD);
  speckle(ctx, 0, PERIOD, 0, 15200, 420, true, E.shadow);
  hogModel(ctx, 0, PERIOD, 0, E.shadow, 0.16);
  flankHatch(ctx, 0, PERIOD, 60, 0, 15300 + boil, ink, 0.38, true);
  ctx.restore();
  periodicLine(ctx, PERIOD, -2, PERIOD + 2, TOP_EDGE, 1.1, ink, 0.95, 15400 + boil);
  periodicLine(ctx, PERIOD, -2, PERIOD + 2, BOTTOM_EDGE, 1.8, ink, 1, 15450 + boil);
  periodicLine(ctx, PERIOD, -2, PERIOD + 2, BOTTOM_EDGE - 0.55, 0.6, ink, 0.3, 15490 + boil);
}

function drawStrip(d: Draw, length: number): void {
  layTile(d.pen.ctx, length, (tile) => paintTile(tile, d.ink, d.f));
}

/** The African egg-eater (chapter 4). */
export const EGGEATER_ART: SnakeArt | undefined = {
  period: PERIOD,
  drawStrip: (d, length) => drawStrip(d, Math.min(length, stripLength(PERIOD))),
  head: EGG_HEAD,
  tongue: EGG_TONGUE,
  snout: EGG_SNOUT,
  colours: { base: E.ground, mark: E.mark, belly: E.belly },
};
