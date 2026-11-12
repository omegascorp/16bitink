import { INK, PAPER } from '../../../src/art/pen';
import { CAPTION_FONT } from '../captions';
import { smooth } from '../short';
import { drawCard, drawText, INK_ON_PAPER, PAPER_ON_INK, RED, YELLOW, YELLOW_ON_INK } from '../swallowyou/text';
import { BARS_Y, W } from './layout';
import { STEPS, STEP_ORDER, type StepId } from './species';

/**
 * The readouts, all flat and simple: the counter top right ("N%" and "OF ITS
 * LENGTH"), two length bars under the fish (the eater's is 100%, the meal's
 * under it, sliding left to line up), a stamp per step, a name card top left, the
 * ladder strip along the top and a claim card for the "not measured" stops.
 */

const clamp01 = (x: number): number => Math.max(0, Math.min(1, x));

/** The counter: `value` percent, its label, and a shake as it lands. */
export function drawCounter(ctx: CanvasRenderingContext2D, value: number, suffix: string, alpha: number, shake = 0): void {
  if (alpha <= 0) return;
  const jitter = shake > 0 ? Math.sin(shake * 60) * 8 * shake : 0;
  drawText(ctx, `${Math.round(value)}%${suffix}`, { x: 1660 + jitter, y: 150, size: 150, maxWidth: 520 }, 700, alpha, YELLOW_ON_INK);
  drawText(ctx, 'THE MEAL vs. ITS OWN LENGTH', { x: 1660, y: 245, size: 38, maxWidth: 520 }, 700, alpha, PAPER_ON_INK);
}

/** One length bar from x0, `w` px long, with its label at the left. */
function bar(ctx: CanvasRenderingContext2D, x0: number, y: number, w: number, colour: string, label: string, alpha: number): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(6,16,28,0.55)';
  ctx.fillRect(x0 - 4, y - 18, w + 8, 36);
  ctx.fillStyle = colour;
  ctx.fillRect(x0, y - 13, w, 26);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.strokeRect(x0, y - 13, w, 26);
  ctx.restore();
  drawText(ctx, label, { x: x0 + 12, y: y + 52, size: 36, maxWidth: 900, left: true }, 700, alpha, PAPER_ON_INK);
}

export interface Bars {
  /** The eater's span on screen (tail to nose), and the meal's. */
  readonly eater: { readonly x0: number; readonly x1: number };
  readonly meal: { readonly x0: number; readonly x1: number };
  /** 0 the meal's bar under the meal .. 1 slid under the eater's, left ends lined up. */
  readonly compare: number;
  readonly grow: number;
}

export function drawBars(ctx: CanvasRenderingContext2D, b: Bars, eaterLabel: string, mealLabel: string, alpha: number): void {
  if (alpha <= 0) return;
  const ew = (b.eater.x1 - b.eater.x0) * b.grow;
  const mw = (b.meal.x1 - b.meal.x0) * b.grow;
  bar(ctx, b.eater.x0, BARS_Y, ew, PAPER, eaterLabel, alpha);
  const mx = b.meal.x0 + (b.eater.x0 - b.meal.x0) * smooth(b.compare);
  bar(ctx, mx, BARS_Y + 100, mw, YELLOW, mealLabel, alpha);
}

export type StampKind = 'MEASURED' | 'ESTIMATED' | 'REPORTED' | 'NOT MEASURED' | 'MYTH';

const STAMP_INK: Readonly<Record<StampKind, string>> = {
  MEASURED: YELLOW,
  ESTIMATED: PAPER,
  REPORTED: PAPER,
  'NOT MEASURED': '#b9bfc8',
  MYTH: RED,
};

/** A rubber stamp slammed on at `at` (big, then thumping down), held after. */
export function drawStamp(ctx: CanvasRenderingContext2D, kind: StampKind, x: number, y: number, size: number, t: number, at: number, alpha = 1): void {
  const u = (t - at) / 0.2;
  if (u <= 0 || alpha <= 0) return;
  const k = u >= 1 ? 1 : 1.8 - 0.8 * smooth(u);
  const colour = STAMP_INK[kind];
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.12);
  ctx.scale(k, k);
  ctx.globalAlpha = alpha * clamp01(u * 3);
  ctx.font = `700 ${size}px ${CAPTION_FONT}`;
  const w = Math.max(size * 3, ctx.measureText(kind).width + size * 0.9);
  ctx.strokeStyle = colour;
  ctx.lineWidth = size * 0.1;
  ctx.beginPath();
  ctx.roundRect(-w / 2, -size * 0.75, w, size * 1.5, size * 0.2);
  ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.12);
  ctx.scale(k, k);
  drawText(ctx, kind, { x: 0, y: 0, size, maxWidth: size * 8 }, 700, alpha * clamp01(u * 3), { fill: colour, halo: INK });
  ctx.restore();
}

/** The name card, top left: the eater's name and two lines of numbers. */
export function drawNameCard(ctx: CanvasRenderingContext2D, name: string, us: string, metric: string, alpha: number): void {
  if (alpha <= 0) return;
  const slide = (1 - alpha) * -60;
  drawCard(ctx, 60 + slide, 160, 760, 190, alpha);
  drawText(ctx, name, { x: 92 + slide, y: 215, size: 52, maxWidth: 700, left: true }, 700, alpha, INK_ON_PAPER);
  drawText(ctx, us, { x: 92 + slide, y: 275, size: 38, maxWidth: 700, left: true }, 700, alpha, INK_ON_PAPER);
  drawText(ctx, metric, { x: 92 + slide, y: 322, size: 32, maxWidth: 700, left: true }, 500, alpha, INK_ON_PAPER);
}

/** The ladder strip along the top: every step done so far, its percentage under its name. */
export function drawLadder(ctx: CanvasRenderingContext2D, done: (id: StepId) => number, alpha: number): void {
  if (alpha <= 0) return;
  STEP_ORDER.forEach((id, i) => {
    const a = alpha * done(id);
    if (a <= 0) return;
    const s = STEPS[id];
    const x = 150 + i * 270;
    drawText(ctx, s.short, { x, y: 52, size: 42, maxWidth: 240 }, 700, a, PAPER_ON_INK);
    drawText(ctx, `${s.pct}%${s.suffix}`, { x, y: 108, size: 58, maxWidth: 240 }, 700, a, YELLOW_ON_INK);
    if (i > 0) drawText(ctx, '›', { x: x - 135, y: 84, size: 60, maxWidth: 40 }, 700, a, PAPER_ON_INK);
  });
}

/** A claim in a paper card, centred at x, for the "not measured" stops. */
export function drawClaim(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, alpha: number): void {
  if (alpha <= 0) return;
  const w = 980;
  drawCard(ctx, x - w / 2, y - 70, w, 140, alpha);
  drawText(ctx, text, { x, y, size: 64, maxWidth: w - 60 }, 700, alpha, INK_ON_PAPER);
}

export const fadeIn = (t: number, at: number, s = 0.3): number => smooth((t - at) / s);
export const window01 = (t: number, from: number, to: number, s = 0.3): number => fadeIn(t, from, s) * (1 - smooth((t - to) / s));
export { W };
