import { createRng } from '../../logic/rng';
import type { Draw } from '../kit';
import { PAPER_FILL } from '../palette';
import { blotchShape, flankHatch, glaze, periodicLine } from '../snakes/cornPaint';
import { SNAKE_W, stripLength, type SnakeArt } from '../types';
import { layTile, mod } from './barrensSnakePaint';
import { SPIDER_HEAD, SPIDER_SNOUT, SPIDER_TONGUE } from './mountainsSnakeHead';
import { BOTTOM_EDGE, fleck, paintBar, roughScales, TOP_EDGE, VIPER_PAINT, VIPER_PERIOD, viperCrossWash, viperModel } from './mountainsSnakePaint';

/**
 * The spider-tailed horned viper (Pseudocerastes urarachnoides, chapter 7),
 * seen from above: a stout, rough-scaled viper the grey-buff of the Zagros
 * limestone, its back crossed by dark grey-brown bars (each a little
 * staggered where its two halves meet down the spine, ragged at the edges,
 * haloed paler), small dark spots low on the flanks between them, the
 * ground flecked like weathered rock, every scale strongly keeled. The
 * tail tip's spider (a bulb fringed with long scales) is drawn by the
 * chapter's view (mountainsView.ts), so it can wave.
 *
 * As the hognose's, the strip is one period painted once on a tile (the
 * features crossing the tile's ends drawn at both ends from the same seed)
 * and the tile laid end to end, so x = PERIOD + a is pixel for pixel x = a.
 */
const PERIOD = VIPER_PERIOD;
const BARS = 6;
const STEP = PERIOD / BARS;
/** A scale's length along the body; it divides the period. */
const SCALE_LEN = 3;
const V = VIPER_PAINT;

type Mark = { shape: ReturnType<typeof blotchShape>; seed: number; rim: number; halo: number };

/** Cross-bar i (any integer), the same as bar i + BARS one period along: two ragged halves, upper and lower, a little out of step at the spine. */
function bar(i: number): Mark[] {
  const k = mod(i, BARS);
  const rng = createRng(15100 + k * 23);
  const cx = i * STEP + STEP / 2 + (rng() - 0.5) * 2.4;
  const lag = (rng() - 0.5) * 3.2;
  const w = 4.2 + rng() * 1.3;
  const up = blotchShape(cx - lag / 2, 7.8, w + (rng() - 0.5) * 0.8, 6, 15200 + k, { rough: 0.24, pow: 2.5, lobe: 0.1, n: 44 });
  const down = blotchShape(cx + lag / 2, 16, w + (rng() - 0.5) * 0.8, 6.2, 15300 + k, { rough: 0.24, pow: 2.5, lobe: 0.1, n: 44 });
  return [
    { shape: up, seed: 15400 + k, rim: 1.05, halo: 0.42 },
    { shape: down, seed: 15450 + k, rim: 1.1, halo: 0.36 },
  ];
}

/** The spots in the gap before bar i: a small one low on the far flank, a fainter one high on the near flank, and a stray dark scale or two. */
function spots(i: number): Mark[] {
  const k = mod(i, BARS);
  const rng = createRng(15500 + k * 17);
  const x = i * STEP + (rng() - 0.5) * 3;
  const low = blotchShape(x + (rng() - 0.5) * 2, SNAKE_W - 2.6, 2.4 + rng() * 0.8, 2, 15600 + k, { rough: 0.2, pow: 2.4, n: 24 });
  const high = blotchShape(x + (rng() - 0.5) * 2, 2.5, 1.9 + rng() * 0.6, 1.4, 15700 + k, { rough: 0.2, pow: 2.4, n: 22 });
  const sx = x + (rng() - 0.5) * 5;
  const sy = 9 + rng() * 6;
  const stray = blotchShape(sx, sy, 0.9 + rng() * 0.4, 0.7, 15800 + k, { rough: 0.15, pow: 2.2, n: 14 });
  return [
    { shape: low, seed: 15900 + k, rim: 0.8, halo: 0.2 },
    { shape: high, seed: 15950 + k, rim: 0.6, halo: 0.12 },
    { shape: stray, seed: 16000 + k, rim: 0.4, halo: 0 },
  ];
}

/** The ground between the bars: warmed buff here, cooled grey there, unevenly, as a wash dries on rough paper. */
function groundGlazes(ctx: CanvasRenderingContext2D, i: number): void {
  const k = mod(i, BARS);
  const rng = createRng(16100 + k * 11);
  const x = i * STEP;
  glaze(ctx, x + (rng() - 0.5) * 3, 11.5 + (rng() - 0.5) * 3, 4.4, 8, 0, V.buff, 0.32);
  glaze(ctx, x + STEP / 2 + (rng() - 0.5) * 8, 19.5 + rng() * 1.5, 9, 3, 0, V.cool, 0.3);
  glaze(ctx, x + (rng() - 0.5) * 6, 4.5 + rng() * 1.5, 6, 2.4, 0, V.stone, 0.4);
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
  ctx.fillStyle = viperCrossWash(ctx, 0);
  ctx.fillRect(0, 0, PERIOD, SNAKE_W);
  ctx.globalAlpha = 1;
  for (let i = -1; i <= BARS; i++) groundGlazes(ctx, i);
  fleck(ctx, 0, PERIOD, 0, 16200, 320, true, V.fleck);
  for (let i = -1; i <= BARS; i++) for (const m of spots(i)) paintBar(ctx, m.shape, m.seed + boil, ink, m.rim, m.halo);
  for (let i = -1; i <= BARS; i++) for (const m of bar(i)) paintBar(ctx, m.shape, m.seed + boil, ink, m.rim, m.halo);
  roughScales(ctx, 0, PERIOD, 0, SCALE_LEN, 0.62, PERIOD);
  fleck(ctx, 0, PERIOD, 0, 16300, 420, true);
  viperModel(ctx, 0, PERIOD, 0);
  flankHatch(ctx, 0, PERIOD, 60, 0, 16400 + boil, ink, 0.4, true);
  ctx.restore();
  periodicLine(ctx, PERIOD, -2, PERIOD + 2, TOP_EDGE, 1.1, ink, 0.95, 16500 + boil);
  periodicLine(ctx, PERIOD, -2, PERIOD + 2, BOTTOM_EDGE, 1.8, ink, 1, 16550 + boil);
  periodicLine(ctx, PERIOD, -2, PERIOD + 2, BOTTOM_EDGE - 0.55, 0.6, ink, 0.3, 16590 + boil);
}

function drawStrip(d: Draw, length: number): void {
  layTile(d.pen.ctx, length, (tile) => paintTile(tile, d.ink, d.f));
}

export const SPIDERTAIL_ART: SnakeArt | undefined = {
  period: PERIOD,
  drawStrip: (d, length) => drawStrip(d, Math.min(length, stripLength(PERIOD))),
  head: SPIDER_HEAD,
  tongue: SPIDER_TONGUE,
  snout: SPIDER_SNOUT,
  colours: { base: V.ground, mark: V.bar, belly: V.belly },
};
