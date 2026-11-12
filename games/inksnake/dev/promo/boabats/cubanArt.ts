import { createRng } from '../../../src/logic/rng';
import type { Draw } from '../../../src/art/kit';
import { PAPER_FILL } from '../../../src/art/palette';
import { Pen, pathOf, type Pt, withScratch } from '../../../src/art/pen';
import { blotchShape, flankHatch, glaze, grain, modelOver, periodicLine, scaleRows } from '../../../src/art/snakes/cornPaint';
import { CORN } from '../../../src/art/snakes/corn';
import { SNAKE_W, stripLength, type SnakeArt } from '../../../src/art/types';
import { rgba } from '../../../src/art/wash';

/**
 * The Cuban boa's back (Chilabothrus angulifer), on the same 24-wide strip
 * as the game's snakes and painted as heartbeat/boaArt.ts paints the boa
 * constrictor: a brown-to-tan ground, heavier and darker than a boa
 * constrictor's, peppered dark; down the back a chain of dark, irregular
 * blotches set off-centre in turn so they read as a zigzag of saddles, each
 * with a lighter tan rim and a warmer heart; and dark irregular flank
 * blotches between them. No cream bow ties, no net, no Burmese map.
 */
const PERIOD = 132;
const SADDLES = 6;
const STEP = PERIOD / SADDLES;
const SCALE_LEN = 2.4;
const TOP_EDGE = 1.2;
const BOTTOM_EDGE = SNAKE_W - 1.2;
const LINE = '#1e130c';

const PAINT = {
  wash: ['#8c7052', '#775d42', '#644c35', '#4c3a28', '#30231a'],
  saddle: '#2a1a10',
  saddleLit: '#4e3420',
  saddleDeep: '#150c07',
  rim: '#a08466',
  flank: '#2e1e14',
  pepper: '#2e2016',
} as const;

const mod = (i: number, n: number): number => ((i % n) + n) % n;

function crossWash(ctx: CanvasRenderingContext2D): CanvasGradient {
  const g = ctx.createLinearGradient(0, 0, 0, SNAKE_W);
  [0, 0.2, 0.48, 0.78, 1].forEach((at, i) => g.addColorStop(at, PAINT.wash[i]!));
  return g;
}

/** Saddle i: an irregular dark blotch, pushed to one side then the other down the back (the zigzag). */
function saddleShape(i: number): Pt[] {
  const k = mod(i, SADDLES);
  const rng = createRng(5100 + k * 23);
  const side = k % 2 === 0 ? 1 : -1;
  const cx = i * STEP + STEP / 2 + (rng() - 0.5) * 3;
  const cy = 12 + side * (1.6 + rng() * 1.2);
  return blotchShape(cx, cy, 6.6 + rng() * 3.2, 6.2 + rng() * 2.4, 5200 + k, { rough: 0.34, pow: 1.7, notch: 0.26, lobe: 0.4, n: 60 });
}

const around = (shape: readonly Pt[], k: number): Pt[] => {
  const c = shape.reduce((s, p) => ({ x: s.x + p.x / shape.length, y: s.y + p.y / shape.length }), { x: 0, y: 0 });
  return shape.map((p) => ({ x: c.x + (p.x - c.x) * k, y: c.y + (p.y - c.y) * k }));
};

function paintSaddle(ctx: CanvasRenderingContext2D, shape: readonly Pt[], seed: number, ink: string): void {
  const pen = new Pen(ctx, seed, 0.35);
  const c = around(shape, 0)[0]!;
  pen.fill(around(shape, 1.12), PAINT.rim, 0.22);
  pen.fill(shape, PAINT.saddle, 0.96);
  pen.clipped(shape, () => {
    glaze(ctx, c.x, c.y - 1, 6.5, 4, 0, PAINT.saddleLit, 0.7);
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.strokeStyle = rgba(PAINT.saddleDeep, 0.85);
    ctx.lineWidth = 1.5;
    pathOf(ctx, shape);
    ctx.stroke();
    ctx.restore();
  });
  pen.hair([...shape, shape[0]!], 0.3, ink, 0.3);
}

/** Dark, irregular flank blotches between the saddles, half turned away over each edge. */
function paintFlanks(ctx: CanvasRenderingContext2D, i: number, seed: number): void {
  const k = mod(i, SADDLES);
  const rng = createRng(5400 + k * 17);
  const x = i * STEP + (rng() - 0.5) * 3;
  for (const y of [2.8, SNAKE_W - 2.6]) {
    const mark = blotchShape(x, y, 4.4 + rng() * 1.6, 2.6 + rng() * 0.8, 5500 + k + Math.round(y), { rough: 0.26, pow: 1.6, n: 30 });
    new Pen(ctx, seed + k, 0.35).fill(mark, PAINT.flank, 0.9);
  }
}

function pepper(ctx: CanvasRenderingContext2D): void {
  const rng = createRng(5600);
  ctx.save();
  ctx.fillStyle = rgba(PAINT.pepper, 0.38);
  for (let i = 0; i < 520; i++) {
    ctx.beginPath();
    ctx.arc(rng() * PERIOD, rng() * SNAKE_W, 0.12 + rng() * 0.32, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function paintTile(ctx: CanvasRenderingContext2D, ink: string, f: number): void {
  const boil = f * 1000;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, TOP_EDGE - 0.6, PERIOD, BOTTOM_EDGE - TOP_EDGE + 1.2);
  ctx.clip();
  ctx.fillStyle = PAPER_FILL;
  ctx.fillRect(0, 0, PERIOD, SNAKE_W);
  ctx.globalAlpha = 0.97;
  ctx.fillStyle = crossWash(ctx);
  ctx.fillRect(0, 0, PERIOD, SNAKE_W);
  ctx.globalAlpha = 1;
  pepper(ctx);
  for (let i = -1; i <= SADDLES; i++) paintFlanks(ctx, i, 5700 + boil);
  for (let i = -1; i <= SADDLES; i++) paintSaddle(ctx, saddleShape(i), 5800 + mod(i, SADDLES) + boil, ink);
  scaleRows(ctx, 0, PERIOD, 0, SCALE_LEN, 0.4, PERIOD);
  grain(ctx, 0, PERIOD, 0, 5900, 560, true);
  modelOver(ctx, 0, PERIOD, 0);
  flankHatch(ctx, 0, PERIOD, 66, 0, 5950 + boil, ink, 0.14, true);
  ctx.restore();
  periodicLine(ctx, PERIOD, -2, PERIOD + 2, TOP_EDGE, 0.5, ink, 0.9, 5960 + boil);
  periodicLine(ctx, PERIOD, -2, PERIOD + 2, BOTTOM_EDGE, 0.8, ink, 1, 5970 + boil);
}

function drawStrip(d: Draw, length: number): void {
  const { ctx } = d.pen;
  const res = Math.abs(ctx.getTransform().a) || 1;
  withScratch(Math.round(PERIOD * res), Math.round(SNAKE_W * res), (tctx, tile) => {
    tctx.scale(res, res);
    paintTile(tctx, LINE, d.f);
    for (let x = 0; x < Math.min(length, stripLength(PERIOD)); x += PERIOD) ctx.drawImage(tile, x, 0, PERIOD, SNAKE_W);
  });
}

/** The strip, in the shape bakeStrip takes (the head is cubanHead.ts). */
export const CUBAN_BODY: SnakeArt = { ...CORN, period: PERIOD, drawStrip };
