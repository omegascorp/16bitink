import { createRng } from '../../../src/logic/rng';
import type { Draw } from '../../../src/art/kit';
import { PAPER_FILL } from '../../../src/art/palette';
import { Pen, pathOf, type Pt, withScratch } from '../../../src/art/pen';
import { blotchShape, flankHatch, glaze, grain, modelOver, periodicLine, scaleRows } from '../../../src/art/snakes/cornPaint';
import { CORN } from '../../../src/art/snakes/corn';
import { SNAKE_W, stripLength, type SnakeArt } from '../../../src/art/types';
import { rgba } from '../../../src/art/wash';

/**
 * The boa constrictor's back for the close shots, on the same 24-wide strip
 * as the game's snakes: a dusty tan ground peppered with dark, a row of big
 * dark brown saddles pinched at the middle like bow ties, each edged in
 * cream with a paler heart, dark diamonds with pale centres down the flanks;
 * and, for the tail, the species' mark: rust-red saddles on cream. One
 * period painted once and laid end to end, as corn.ts does.
 */
const PERIOD = 120;
const SADDLES = 4;
const STEP = PERIOD / SADDLES;
const SCALE_LEN = 2.5;
const TOP_EDGE = 1.2;
const BOTTOM_EDGE = SNAKE_W - 1.2;
/** A boa's line: dark brown, not the game's ballpoint blue, thin at this size. */
const LINE = '#2a1810';

export interface BoaPaint {
  readonly wash: readonly string[];
  readonly saddle: string;
  readonly saddleLit: string;
  readonly saddleDeep: string;
  readonly edge: string;
  readonly flank: string;
  readonly pepper: string;
}

export const BODY_PAINT: BoaPaint = {
  wash: ['#e8d6b0', '#d6c198', '#c2aa80', '#a68c66', '#7c6448'],
  saddle: '#3b2418', saddleLit: '#6d4a30', saddleDeep: '#1f120c', edge: '#f0e4c6', flank: '#46301f', pepper: '#4b3524',
};

export const TAIL_PAINT: BoaPaint = {
  wash: ['#e0cca4', '#d0ba90', '#bda37a', '#9d8460', '#725c44'],
  saddle: '#74241a', saddleLit: '#96402a', saddleDeep: '#34100c', edge: '#e6d6b0', flank: '#5a2016', pepper: '#5a2a1a',
};

const mod = (i: number, n: number): number => ((i % n) + n) % n;

function crossWash(ctx: CanvasRenderingContext2D, paint: BoaPaint): CanvasGradient {
  const g = ctx.createLinearGradient(0, 0, 0, SNAKE_W);
  [0, 0.18, 0.46, 0.76, 1].forEach((at, i) => g.addColorStop(at, paint.wash[i]!));
  return g;
}

function saddleShape(i: number): Pt[] {
  const k = mod(i, SADDLES);
  const rng = createRng(3100 + k * 19);
  const cx = i * STEP + STEP / 2 + (rng() - 0.5) * 2.2;
  const cy = 12 + (rng() - 0.5) * 0.8;
  return blotchShape(cx, cy, 10.2 + (rng() - 0.5) * 1.2, 10.6, 3200 + k, { rough: 0.17, pow: 2.5, notch: 0.34, lobe: 0.2, n: 56 });
}

const around = (shape: readonly Pt[], k: number): Pt[] => {
  const c = shape.reduce((s, p) => ({ x: s.x + p.x / shape.length, y: s.y + p.y / shape.length }), { x: 0, y: 0 });
  return shape.map((p) => ({ x: c.x + (p.x - c.x) * k, y: c.y + (p.y - c.y) * k }));
};

/** A saddle: its cream edge, the dark laid in, a paler heart, the pigment pooled at the drying edge. */
function paintSaddle(ctx: CanvasRenderingContext2D, shape: readonly Pt[], paint: BoaPaint, seed: number, ink: string): void {
  const pen = new Pen(ctx, seed, 0.35);
  const c = around(shape, 0);
  const at = c[0]!;
  pen.fill(around(shape, 1.13), paint.edge, 0.85);
  pen.fill(shape, paint.saddle, 0.97);
  pen.clipped(shape, () => {
    glaze(ctx, at.x, at.y, 8.5, 5.4, 0, paint.saddleLit, 0.75);
    glaze(ctx, at.x - 1, at.y - 3, 5, 2.4, 0, paint.saddleLit, 0.5);
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.strokeStyle = rgba(paint.saddleDeep, 0.8);
    ctx.lineWidth = 1.6;
    pathOf(ctx, shape);
    ctx.stroke();
    ctx.restore();
  });
  pen.hair([...shape, shape[0]!], 0.3, ink, 0.35);
}

/** The flank marks in the gap before saddle i: dark diamonds with pale centres, half turned away over the edge. */
function paintFlanks(ctx: CanvasRenderingContext2D, i: number, paint: BoaPaint, seed: number): void {
  const k = mod(i, SADDLES);
  const rng = createRng(3400 + k * 13);
  const x = i * STEP + (rng() - 0.5) * 2;
  for (const y of [2.6, SNAKE_W - 2.4]) {
    const mark = blotchShape(x, y, 4.8, 2.9, 3500 + k + Math.round(y), { rough: 0.14, pow: 1.5, n: 26 });
    const pen = new Pen(ctx, seed + k, 0.35);
    pen.fill(mark, paint.flank, 0.92);
    pen.fill(around(mark, 0.3), paint.edge, 0.35);
  }
}

function pepper(ctx: CanvasRenderingContext2D, paint: BoaPaint): void {
  const rng = createRng(3600);
  ctx.save();
  ctx.fillStyle = rgba(paint.pepper, 0.32);
  for (let i = 0; i < 420; i++) {
    ctx.beginPath();
    ctx.arc(rng() * PERIOD, rng() * SNAKE_W, 0.12 + rng() * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function paintTile(ctx: CanvasRenderingContext2D, paint: BoaPaint, ink: string, f: number): void {
  const boil = f * 1000;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, TOP_EDGE - 0.6, PERIOD, BOTTOM_EDGE - TOP_EDGE + 1.2);
  ctx.clip();
  ctx.fillStyle = PAPER_FILL;
  ctx.fillRect(0, 0, PERIOD, SNAKE_W);
  ctx.globalAlpha = 0.96;
  ctx.fillStyle = crossWash(ctx, paint);
  ctx.fillRect(0, 0, PERIOD, SNAKE_W);
  ctx.globalAlpha = 1;
  pepper(ctx, paint);
  for (let i = -1; i <= SADDLES; i++) paintFlanks(ctx, i, paint, 3700 + boil);
  for (let i = -1; i <= SADDLES; i++) paintSaddle(ctx, saddleShape(i), paint, 3800 + mod(i, SADDLES) + boil, ink);
  scaleRows(ctx, 0, PERIOD, 0, SCALE_LEN, 0.42, PERIOD);
  grain(ctx, 0, PERIOD, 0, 3900, 520, true);
  modelOver(ctx, 0, PERIOD, 0);
  flankHatch(ctx, 0, PERIOD, 60, 0, 3950 + boil, ink, 0.32, true);
  ctx.restore();
  periodicLine(ctx, PERIOD, -2, PERIOD + 2, TOP_EDGE, 0.5, ink, 0.9, 3960 + boil);
  periodicLine(ctx, PERIOD, -2, PERIOD + 2, BOTTOM_EDGE, 0.8, ink, 1, 3970 + boil);
}

const stripOf = (paint: BoaPaint) => (d: Draw, length: number): void => {
  const { ctx } = d.pen;
  const res = Math.abs(ctx.getTransform().a) || 1;
  withScratch(Math.round(PERIOD * res), Math.round(SNAKE_W * res), (tctx, tile) => {
    tctx.scale(res, res);
    paintTile(tctx, paint, LINE, d.f);
    for (let x = 0; x < Math.min(length, stripLength(PERIOD)); x += PERIOD) ctx.drawImage(tile, x, 0, PERIOD, SNAKE_W);
  });
};

/** The strips, in the shape bakeStrip takes (only the strip is the boa's here; its head is boaHead.ts). */
export const BOA_BODY: SnakeArt = { ...CORN, period: PERIOD, drawStrip: stripOf(BODY_PAINT) };
export const BOA_TAIL: SnakeArt = { ...CORN, period: PERIOD, drawStrip: stripOf(TAIL_PAINT) };
