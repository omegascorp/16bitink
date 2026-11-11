import { createRng } from '../../../src/logic/rng';
import { CORN } from '../../../src/art/snakes/corn';
import { glaze, periodicLine, scaleRows } from '../../../src/art/snakes/cornPaint';
import type { Draw } from '../../../src/art/kit';
import { PAPER_FILL } from '../../../src/art/palette';
import { Pen, type Pt, withScratch } from '../../../src/art/pen';
import { SNAKE_W, stripLength, type SnakeArt } from '../../../src/art/types';
import { rgba } from '../../../src/art/wash';

/**
 * The Burmese python's skin seen side on, for the strip the promo lays
 * along a body (sprites.ts drawBody): the back at the strip's top edge (lit),
 * the belly at its bottom. A warm buff-tan ground; along the back a chain of
 * big chocolate-brown saddles edged in black, the tan showing between them
 * as a pale irregular net (the giraffe look); a row of smaller dark flank
 * blotches with paler hearts set in the gaps; the cream belly plates along
 * the bottom; small scales and a faint sheen. Painted once and laid end to
 * end, as reticArt.ts does.
 */
export const BURM = {
  buff: '#d8b77c', tan: '#c09a5e', low: '#94744a', deep: '#4f3a22', brown: '#6b4426', brownLit: '#8a5c34', brownDeep: '#432a16',
  edge: '#16100a', pale: '#ead6a6', belly: '#ece0bc', bellyLine: '#a8955e', sheen: '#c9d2e0', line: '#1a130c',
} as const;

const PERIOD = 80;
const UNITS = 2;
const STEP = PERIOD / UNITS;
const mod = (i: number, n: number): number => ((i % n) + n) % n;

function crossWash(ctx: CanvasRenderingContext2D): CanvasGradient {
  const g = ctx.createLinearGradient(0, 0, 0, SNAKE_W);
  g.addColorStop(0, '#e8cc92');
  g.addColorStop(0.25, BURM.buff);
  g.addColorStop(0.55, BURM.tan);
  g.addColorStop(0.82, BURM.low);
  g.addColorStop(1, BURM.deep);
  return g;
}

/** A soft, lumpy blotch: a rounded box (centre, half width, half height) with wobbled sides. */
function blotch(cx: number, cy: number, hw: number, hh: number, seed: number, n = 28): Pt[] {
  const rng = createRng(seed);
  const bumps = [rng(), rng(), rng(), rng(), rng()];
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const c = Math.cos(a);
    const s = Math.sin(a);
    // A squarish superellipse, nudged in and out.
    const sq = (v: number): number => Math.sign(v) * Math.abs(v) ** 0.62;
    const k = 1 + 0.12 * Math.sin(a * 3 + bumps[0]! * 6) + 0.08 * Math.sin(a * 5 + bumps[1]! * 6);
    return { x: cx + sq(c) * hw * k, y: cy + sq(s) * hh * k };
  });
}

function rim(ctx: CanvasRenderingContext2D, pts: readonly Pt[], w: number, colour: string, alpha: number): void {
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.strokeStyle = rgba(colour, alpha);
  ctx.lineWidth = w;
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

/** One unit: the big dorsal saddle, and the flank blotch in the gap after it. */
function paintUnit(ctx: CanvasRenderingContext2D, i: number, seed: number): void {
  const k = mod(i, UNITS);
  const rng = createRng(7100 + k * 41);
  const cx = i * STEP + STEP / 2 + (rng() - 0.5) * 2;
  const pen = new Pen(ctx, seed + k, 0.3);
  // The saddle over the back, reaching down the upper flank.
  const s = blotch(cx, 4.6, 14.2 + rng() * 1.2, 8.4, 7200 + k);
  pen.fill(s, BURM.brown, 0.98);
  pen.clipped(s, () => {
    glaze(ctx, cx - 2, 1.5, 11, 3.6, 0, BURM.brownLit, 0.7);
    glaze(ctx, cx + 3, 10, 12, 3, 0, BURM.brownDeep, 0.6);
  });
  rim(ctx, s, 1.5, BURM.edge, 0.95);
  // A thin pale edge round it: the tan ground lit just outside the black.
  rim(ctx, s.map((p) => ({ x: cx + (p.x - cx) * 1.09, y: 4.6 + (p.y - 4.6) * 1.12 })), 0.7, BURM.pale, 0.55);
  // The flank blotch, lower and offset into the gap, its heart paler.
  const fx = cx + STEP / 2 + (rng() - 0.5) * 3;
  const f = blotch(fx, 15.4, 7.6, 3.9, 7300 + k, 22);
  pen.fill(f, BURM.brown, 0.96);
  pen.clipped(f, () => glaze(ctx, fx, 15.6, 4.6, 2, 0, BURM.tan, 0.75));
  rim(ctx, f, 1.15, BURM.edge, 0.9);
  // Small dark flecks low on the flank.
  for (let j = 0; j < 3; j++) pen.fill(blotch(cx - 12 + j * 12 + (rng() - 0.5) * 3, 19.4, 1.8, 0.9, 7400 + k * 3 + j, 12), BURM.brownDeep, 0.6);
}

function paintBelly(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.fillStyle = BURM.belly;
  ctx.fillRect(0, 20.8, PERIOD, SNAKE_W - 20.8);
  ctx.strokeStyle = rgba(BURM.bellyLine, 0.75);
  ctx.lineWidth = 0.3;
  for (let x = 0; x <= PERIOD; x += 3.2) {
    ctx.beginPath();
    ctx.moveTo(x, 21);
    ctx.quadraticCurveTo(x + 0.9, 22.3, x + 0.3, 23.6);
    ctx.stroke();
  }
  const g = ctx.createLinearGradient(0, 20.8, 0, SNAKE_W);
  g.addColorStop(0, rgba(BURM.deep, 0.25));
  g.addColorStop(0.4, rgba(BURM.deep, 0));
  g.addColorStop(1, rgba(BURM.deep, 0.35));
  ctx.fillStyle = g;
  ctx.fillRect(0, 20.8, PERIOD, SNAKE_W - 20.8);
  ctx.restore();
}

/** Light and shade over the pattern: the round of the body, a gloss band along the back. */
function modelOver(ctx: CanvasRenderingContext2D): void {
  const g = ctx.createLinearGradient(0, 0, 0, SNAKE_W);
  g.addColorStop(0, rgba(PAPER_FILL, 0.18));
  g.addColorStop(0.14, rgba(PAPER_FILL, 0.24));
  g.addColorStop(0.32, rgba(PAPER_FILL, 0));
  g.addColorStop(0.62, rgba(BURM.deep, 0.08));
  g.addColorStop(0.84, rgba(BURM.deep, 0.3));
  g.addColorStop(1, rgba(BURM.deep, 0.15));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, PERIOD, SNAKE_W);
  const s = ctx.createLinearGradient(0, 1.5, 0, 7);
  s.addColorStop(0, rgba(BURM.sheen, 0));
  s.addColorStop(0.5, rgba(BURM.sheen, 0.16));
  s.addColorStop(1, rgba(BURM.sheen, 0));
  ctx.fillStyle = s;
  ctx.fillRect(0, 1.5, PERIOD, 5.5);
}

function grainDots(ctx: CanvasRenderingContext2D, seed: number): void {
  const rng = createRng(seed);
  for (let i = 0; i < 560; i++) {
    const x = rng() * PERIOD;
    const y = 1 + rng() * 22;
    ctx.fillStyle = rng() < 0.15 ? rgba(PAPER_FILL, 0.2) : rgba(BURM.deep, 0.08 + 0.12 * rng());
    for (const k of [-PERIOD, 0, PERIOD]) {
      ctx.beginPath();
      ctx.arc(x + k, y, 0.18 + rng() * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function paintTile(ctx: CanvasRenderingContext2D, f: number): void {
  const boil = f * 1000;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0.4, PERIOD, SNAKE_W - 0.8);
  ctx.clip();
  ctx.fillStyle = PAPER_FILL;
  ctx.fillRect(0, 0, PERIOD, SNAKE_W);
  ctx.globalAlpha = 0.97;
  ctx.fillStyle = crossWash(ctx);
  ctx.fillRect(0, 0, PERIOD, SNAKE_W);
  ctx.globalAlpha = 1;
  for (let i = -1; i <= UNITS; i++) paintUnit(ctx, i, 7600 + boil);
  paintBelly(ctx);
  scaleRows(ctx, 0, PERIOD, 0, 2.4, 0.3, PERIOD);
  grainDots(ctx, 7700);
  modelOver(ctx);
  ctx.restore();
  periodicLine(ctx, PERIOD, -2, PERIOD + 2, 0.9, 0.55, BURM.line, 0.95, 7800 + boil);
  periodicLine(ctx, PERIOD, -2, PERIOD + 2, SNAKE_W - 0.9, 0.7, BURM.line, 1, 7900 + boil);
}

/** The strip with the back along its top edge (`under` false) or along its bottom edge (`under` true). */
const stripOf = (under: boolean) => (d: Draw, length: number): void => {
  const { ctx } = d.pen;
  const res = Math.abs(ctx.getTransform().a) || 1;
  withScratch(Math.round(PERIOD * res), Math.round(SNAKE_W * res), (tctx, tile) => {
    tctx.scale(res, res);
    if (under) {
      tctx.translate(0, SNAKE_W);
      tctx.scale(1, -1);
    }
    paintTile(tctx, d.f);
    for (let x = 0; x < Math.min(length, stripLength(PERIOD)); x += PERIOD) ctx.drawImage(tile, x, 0, PERIOD, SNAKE_W);
  });
};

/** For bakeStrip: a body whose head is on the right wants the back on the strip's top edge, one whose head is on the left the bottom. */
export const BURM_HEAD_RIGHT: SnakeArt = { ...CORN, period: PERIOD, drawStrip: stripOf(false) };
export const BURM_HEAD_LEFT: SnakeArt = { ...CORN, period: PERIOD, drawStrip: stripOf(true) };
