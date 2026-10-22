import { BOIL_FRAMES } from '../../../src/art/textures';
import { makeCanvas } from '../../../src/art/pen';
import { CAPTION_FONT, drawTextLine, type TextInk } from '../captions';
import { VIDEO } from '../short';
import type { Sprite } from '../sprites';
import { wrap } from './beats';
import { chartAt, fivePop, GRID, LIT_ORDER, litCount, litTime, ofTotalAt, popAt } from './script';
import { type BirdSprites, drawBirdAt } from './songbird';
import { ICON_CROP } from './tiger';

/**
 * The chart for "Scientists found birds inside FORTY-ONE of a hundred and
 * five!": the 105 young tiger sharks of the study as little sharks in rows,
 * dark until 41 of them light up gold, one by one and faster and faster,
 * each with a little songbird showing inside it, a count climbing to 41
 * over them, and "of 105" beside it on "a hundred and five".
 */

const ICON_W = 96;
const ICON_H = (ICON_W * ICON_CROP.h) / ICON_CROP.w;
const PITCH = { x: 138, y: 46 } as const;
const TOP = 462;
export const GOLD = '#f5c84a';
const PAPER_ON_INK: TextInk = { fill: '#f4eddc', halo: '#03090a' };
const GOLD_ON_INK: TextInk = { fill: GOLD, halo: '#03090a' };

export interface ChartArt {
  /** Per boil frame: the shark dark, and lit. */
  readonly dark: readonly HTMLCanvasElement[];
  readonly lit: readonly HTMLCanvasElement[];
}

/** Shrinks a drawing in halves, so the little icon keeps its lines instead of aliasing. */
function shrink(src: HTMLCanvasElement, sx: number, sy: number, sw: number, sh: number, w: number, h: number): HTMLCanvasElement {
  let cur = src;
  let rect = { x: sx, y: sy, w: sw, h: sh };
  while (rect.w / 2 > w * 1.5) {
    const next = makeCanvas(Math.ceil(rect.w / 2), Math.ceil(rect.h / 2));
    next.ctx.imageSmoothingQuality = 'high';
    next.ctx.drawImage(cur, rect.x, rect.y, rect.w, rect.h, 0, 0, next.canvas.width, next.canvas.height);
    cur = next.canvas;
    rect = { x: 0, y: 0, w: next.canvas.width, h: next.canvas.height };
  }
  const out = makeCanvas(Math.ceil(w), Math.ceil(h));
  out.ctx.imageSmoothingQuality = 'high';
  out.ctx.drawImage(cur, rect.x, rect.y, rect.w, rect.h, 0, 0, out.canvas.width, out.canvas.height);
  return out.canvas;
}

export function makeChartArt(sprite: Sprite): ChartArt {
  const R = sprite.res;
  const lit = sprite.frames.map((f) => shrink(f, ICON_CROP.x * R, ICON_CROP.y * R, ICON_CROP.w * R, ICON_CROP.h * R, ICON_W, ICON_H));
  const dark = lit.map((src) => {
    const { canvas, ctx } = makeCanvas(src.width, src.height);
    ctx.drawImage(src, 0, 0);
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = 'rgba(36,58,60,0.86)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return canvas;
  });
  return { dark, lit };
}

/** Where shark i of the chart sits, screen px (its middle). */
export function cellOf(i: number): { readonly x: number; readonly y: number } {
  const col = i % GRID.cols;
  const row = Math.floor(i / GRID.cols);
  return { x: VIDEO.width / 2 + (col - (GRID.cols - 1) / 2) * PITCH.x + (row % 2 ? 10 : -10), y: TOP + row * PITCH.y };
}

const LIT_AT: ReadonlyMap<number, number> = new Map(LIT_ORDER.map((cell, k) => [cell, litTime(k)]));

export function drawChart(ctx: CanvasRenderingContext2D, art: ChartArt, birds: BirdSprites, t: number, boil: number): void {
  const shown = chartAt(t);
  if (shown <= 0) return;
  const u = wrap(t);
  ctx.save();
  // The sea behind, dimmed right down: this is the numbers' beat.
  ctx.fillStyle = `rgba(2,8,9,${(0.82 * shown).toFixed(3)})`;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  ctx.globalAlpha = shown;
  for (let i = 0; i < GRID.total; i++) {
    const since = u - popAt(i);
    if (since < 0) continue;
    const c = cellOf(i);
    const pop = since < 0.12 ? since / 0.12 : 1 + 0.12 * Math.max(0, 1 - (since - 0.12) / 0.1);
    const litAt = LIT_AT.get(i);
    const on = litAt !== undefined && u >= litAt ? u - litAt : -1;
    const bump = on >= 0 ? 1 + 0.4 * Math.exp(-on * 9) : 1;
    const k = Math.min(1.12, pop) * bump;
    const w = ICON_W * k;
    const h = ICON_H * k;
    if (on >= 0) {
      // A gold glow behind it, flaring as it comes on.
      const glow = ctx.createRadialGradient(c.x, c.y, 4, c.x, c.y, ICON_W * 0.75);
      glow.addColorStop(0, `rgba(245,200,74,${(0.5 + 0.4 * Math.exp(-on * 6)).toFixed(3)})`);
      glow.addColorStop(1, 'rgba(245,200,74,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(c.x - ICON_W, c.y - ICON_W, ICON_W * 2, ICON_W * 2);
      ctx.drawImage(art.lit[boil % BOIL_FRAMES]!, c.x - w / 2, c.y - h / 2, w, h);
      // The bird inside it: a light in its belly, the songbird in it.
      const belly = { x: c.x + 4 * k, y: c.y + 6 * k };
      ctx.fillStyle = 'rgba(255,236,170,0.75)';
      ctx.beginPath();
      ctx.ellipse(belly.x, belly.y, 20 * k, 11 * k, 0, 0, Math.PI * 2);
      ctx.fill();
      drawBirdAt(ctx, birds, 'mid', boil, belly.x, belly.y - 1 * k, 40 * k, 0, 1);
    } else {
      ctx.drawImage(art.dark[boil % BOIL_FRAMES]!, c.x - w / 2, c.y - h / 2, w, h);
    }
  }
  ctx.restore();
  // The count, and "of 105".
  const n = litCount(t);
  if (n > 0) {
    const of = ofTotalAt(t);
    const countSize = 150 * (1 + 0.15 * fivePop(t));
    ctx.save();
    ctx.font = `700 ${countSize}px ${CAPTION_FONT}`;
    const nw = ctx.measureText(String(n)).width;
    ctx.font = `700 96px ${CAPTION_FONT}`;
    const ow = ctx.measureText('of 105').width;
    ctx.restore();
    const gap = 44;
    const total = nw + (gap + ow) * of;
    const x0 = VIDEO.width / 2 - total / 2;
    drawTextLine(ctx, String(n), x0 + nw / 2, 400, countSize, 700, shown, GOLD_ON_INK);
    drawTextLine(ctx, 'of 105', x0 + nw + gap + ow / 2, 392, 96 * (1 + 0.2 * fivePop(t)), 700, shown * of, PAPER_ON_INK);
  }
}
