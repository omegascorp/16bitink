import { pt } from '../../../src/art/kit';
import { HIGHLIGHT, PAPER, RED } from '../../../src/art/palette';
import type { Pt } from '../../../src/art/pen';
import { PAPER_ON_DARK } from '../captions';
import { clamp01 } from '../short';
import { DEPTH, LEG, makeBlocks, SIDE, type BlockSprites } from './blockArt';
import {
  bigAt, BLOCKS, cellAt, SMALL_CELL_AT, dropAt, DROPS, eightMark, eightPop, fourMark, fourPop, legsLit, puzzledMark, puzzledPop, smallCellAt, squashAt, tilesAt, trembleAt, twoMark,
} from './lesson';
import { drawHighlight, drawPart, drawPopLabel } from './marks';
import { wrap } from './story';

/**
 * "Double an animal's size, and it gets EIGHT times heavier… but its legs
 * only FOUR times stronger!": the block deer doubles, its body fills with
 * eight blocks, thump by thump; then its legs' cross-sections are drawn out
 * beside them: one square for the small deer's leg, only four for the big
 * one's, under eight times the weight.
 */
/** Screen px per drawing unit of the small deer. */
const UNIT = BLOCKS.side / SIDE;
/** Where the body's front-bottom-left corner sits, from the deer's ground point (units). */
const BODY = { x: -SIDE / 2, y: -LEG.h } as const;
/** The legs' front-left corners (units, from the ground point): front pair, then the back pair set into the depth. */
const LEGS: readonly Pt[] = [pt(-SIDE / 2, -LEG.h), pt(SIDE / 2 - LEG.w, -LEG.h)];
const BACK = 0.75;
/** The cross-section tiles: where they sit (screen) and how big a cell is. */
const TILES = { small: { x: 165, y: 700 }, big: { x: 470, y: 870 }, cell: 58 } as const;

interface Deer {
  readonly x: number;
  readonly k: number;
  readonly squash: number;
  readonly shiver: number;
}

/** A point of the deer (units from its ground point) on screen. */
const at = (deer: Deer, ux: number, uy: number): Pt => pt(deer.x + ux * UNIT * deer.k, BLOCKS.ground + uy * UNIT * deer.k * (1 - deer.squash));

function drawLegs(ctx: CanvasRenderingContext2D, s: BlockSprites, deer: Deer, boil: number, back: boolean): void {
  for (const leg of LEGS) {
    const p = at(deer, leg.x + (back ? DEPTH.x * BACK : 0), leg.y + LEG.h + (back ? DEPTH.y * BACK : 0));
    drawPart(ctx, s.leg, boil, p.x + deer.shiver, p.y, UNIT * deer.k, 0, 1 - deer.squash);
  }
}

/** The body: one block, an empty dashed outline (the doubled deer before its blocks land), or the eight blocks that fill it. */
function drawBody(ctx: CanvasRenderingContext2D, s: BlockSprites, deer: Deer, t: number, boil: number, filled: boolean): void {
  const base = at(deer, BODY.x, BODY.y);
  if (filled) {
    drawPart(ctx, s.cube, boil, base.x, base.y, UNIT * deer.k);
    return;
  }
  outline(ctx, base, SIDE * UNIT * deer.k);
  const half = SIDE / 2;
  DROPS.map((d, n) => ({ d, n, drop: dropAt(t, n) }))
    .filter((c) => c.drop !== null)
    .sort((a, b) => b.d.d - a.d.d || a.d.j - b.d.j || a.d.i - b.d.i)
    .forEach(({ d, drop }) => {
      const ux = d.i * half + d.d * DEPTH.x * 0.5;
      const uy = -d.j * half + d.d * DEPTH.y * 0.5;
      drawPart(ctx, s.cube, boil, base.x + ux * UNIT * deer.k, base.y + uy * UNIT * deer.k - drop!, UNIT * deer.k * 0.5);
    });
}

/** A dashed outline of the body's block, waiting to be filled. */
function outline(ctx: CanvasRenderingContext2D, base: Pt, side: number): void {
  const dx = (DEPTH.x / SIDE) * side;
  const dy = (DEPTH.y / SIDE) * side;
  ctx.save();
  ctx.strokeStyle = PAPER;
  ctx.globalAlpha = 0.75;
  ctx.lineWidth = 4;
  ctx.setLineDash([14, 10]);
  ctx.beginPath();
  const pts = [[0, 0], [side, 0], [side, -side], [0, -side], [0, 0]];
  pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(base.x + x!, base.y + y!) : ctx.lineTo(base.x + x!, base.y + y!)));
  ctx.moveTo(base.x, base.y - side);
  ctx.lineTo(base.x + dx, base.y - side + dy);
  ctx.lineTo(base.x + side + dx, base.y - side + dy);
  ctx.lineTo(base.x + side, base.y - side);
  ctx.moveTo(base.x + side + dx, base.y - side + dy);
  ctx.lineTo(base.x + side + dx, base.y + dy);
  ctx.lineTo(base.x + side, base.y);
  ctx.stroke();
  ctx.restore();
}

function drawDeer(ctx: CanvasRenderingContext2D, s: BlockSprites, deer: Deer, t: number, boil: number, filled: boolean): void {
  drawLegs(ctx, s, deer, boil, true);
  drawBody(ctx, s, deer, t, boil, filled);
  drawLegs(ctx, s, deer, boil, false);
  const head = at(deer, SIDE / 2 - 2, -LEG.h - SIDE + 6);
  drawPart(ctx, s.head, boil, head.x, head.y, UNIT * deer.k);
}

/** A leg's cross-section: `n`×`n` squares drawn out at (x, y), each filled with the highlighter as it's counted. */
function drawTile(ctx: CanvasRenderingContext2D, c: Pt, n: number, alpha: number, fill: (k: number) => number): void {
  const size = TILES.cell * n;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(c.x - size / 2, c.y - size / 2);
  for (let k = 0; k < n * n; k++) {
    const f = fill(k);
    ctx.fillStyle = HIGHLIGHT;
    ctx.globalAlpha = alpha * 0.85 * f;
    ctx.fillRect((k % n) * TILES.cell + 3, Math.floor(k / n) * TILES.cell + 3, TILES.cell - 6, TILES.cell - 6);
  }
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = PAPER;
  ctx.lineWidth = 5;
  ctx.strokeRect(0, 0, size, size);
  ctx.lineWidth = 2.5;
  for (let k = 1; k < n; k++) {
    ctx.beginPath();
    ctx.moveTo(k * TILES.cell, 0);
    ctx.lineTo(k * TILES.cell, size);
    ctx.moveTo(0, k * TILES.cell);
    ctx.lineTo(size, k * TILES.cell);
    ctx.stroke();
  }
  ctx.restore();
}

/** A dashed lead from a leg out to its cross-section. */
function lead(ctx: CanvasRenderingContext2D, a: Pt, b: Pt, alpha: number): void {
  ctx.save();
  ctx.globalAlpha = alpha * 0.8;
  ctx.strokeStyle = PAPER;
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
  ctx.restore();
}

function drawLegMarks(ctx: CanvasRenderingContext2D, small: Deer, big: Deer, t: number): void {
  const lit = legsLit(t);
  for (const deer of [small, big]) {
    for (const leg of LEGS) {
      const top = at(deer, leg.x + LEG.w / 2, leg.y);
      const foot = at(deer, leg.x + LEG.w / 2, 0);
      drawHighlight(ctx, [top, foot], LEG.w * UNIT * deer.k + 14, lit);
    }
  }
  const tiles = tilesAt(t);
  if (tiles <= 0) return;
  lead(ctx, at(small, LEGS[0]!.x + LEG.w / 2, -LEG.h / 2), pt(TILES.small.x, TILES.small.y + TILES.cell / 2), tiles);
  lead(ctx, at(big, LEGS[0]!.x + LEG.w / 2, -LEG.h / 2), pt(TILES.big.x + TILES.cell, TILES.big.y), tiles);
  drawTile(ctx, TILES.small, 1, tiles, () => smallCellAt(t));
  drawTile(ctx, TILES.big, 2, tiles, (k) => cellAt(t, k));
}

export function makeBlockScene(): (ctx: CanvasRenderingContext2D, t: number, boil: number) => void {
  const s = makeBlocks(10);
  return (ctx, t, boil) => {
    const w = wrap(t);
    const small: Deer = { x: BLOCKS.small, k: 1, squash: 0, shiver: 0 };
    const b = bigAt(t);
    const big: Deer = { x: b.x, k: b.k, squash: squashAt(t), shiver: 3 * trembleAt(t) * Math.sin(w * 53) };
    drawLegMarks(ctx, small, big, t);
    drawDeer(ctx, s, small, t, boil, true);
    if (b.k > 1.001) drawDeer(ctx, s, big, t, boil, false);
    const red = { fill: RED, halo: PAPER_ON_DARK.halo };
    drawPopLabel(ctx, '×2', 470, 760, 110, clamp01(twoMark(t) * 3), twoMark(t));
    drawPopLabel(ctx, '×8 weight', 470, 650, 100, eightPop(t), eightMark(t), red);
    drawPopLabel(ctx, '×1', TILES.small.x, TILES.small.y - 50, 64, (w - SMALL_CELL_AT) / 0.3, tilesAt(t));
    drawPopLabel(ctx, '×4 strength', 470, 1005, 76, fourPop(t), fourMark(t));
    const head = at(big, SIDE / 2 + 4, -LEG.h - SIDE - 12);
    drawPopLabel(ctx, '?!', head.x + 40, head.y - 10, 120, puzzledPop(t), puzzledMark(t));
  };
}
