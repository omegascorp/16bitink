import { INK, PAPER } from '../../../src/art/pen';
import { CAPTION_FONT, drawTextLine, INK_ON_PAPER, type TextInk } from '../captions';
import { clamp01, smooth } from '../short';
import type { TextBox } from './layout';

/**
 * The hand lettering: Caveat, with a halo, shrunk to fit its box so nothing
 * runs off the frame; and words that pop on as they're said.
 */

export const PAPER_ON_INK: TextInk = { fill: PAPER, halo: '#06101c' };
export const YELLOW = '#ffcf33';
export const RED = '#d8312b';
export const YELLOW_ON_INK: TextInk = { fill: YELLOW, halo: '#140d02' };
export const RED_ON_PAPER: TextInk = { fill: RED, halo: PAPER };
export { INK_ON_PAPER };

/** The size `text` must be drawn at to fit `maxWidth`. */
export function fitSize(ctx: CanvasRenderingContext2D, text: string, size: number, weight: 500 | 700, maxWidth: number): number {
  ctx.save();
  ctx.font = `${weight} ${size}px ${CAPTION_FONT}`;
  const w = ctx.measureText(text).width;
  ctx.restore();
  return w > maxWidth ? (size * maxWidth) / w : size;
}

/** One line in its box, shrunk to fit. */
export function drawText(ctx: CanvasRenderingContext2D, text: string, box: TextBox, weight: 500 | 700, alpha: number, ink: TextInk = PAPER_ON_INK): void {
  if (alpha <= 0) return;
  const size = fitSize(ctx, text, box.size, weight, box.maxWidth);
  if (!box.left) {
    drawTextLine(ctx, text, box.x, box.y, size, weight, alpha, ink);
    return;
  }
  ctx.save();
  ctx.font = `${weight} ${size}px ${CAPTION_FONT}`;
  const w = ctx.measureText(text).width;
  ctx.restore();
  drawTextLine(ctx, text, box.x + w / 2, box.y, size, weight, alpha, ink);
}

/** A word popping on at `at` (a quick overshoot), centred at (x, y), optionally tilted; held until `until`. */
export function drawPop(
  ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, t: number, at: number, until: number, ink: TextInk = PAPER_ON_INK, tilt = 0, maxWidth = 1500,
): void {
  const u = (t - at) / 0.22;
  if (u <= 0 || t > until + 0.3) return;
  const alpha = Math.min(clamp01(u * 2), 1 - smooth((t - until) / 0.3));
  const k = u >= 1 ? 1 : 0.5 + 0.5 * u + 0.35 * Math.sin(Math.PI * u);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  ctx.scale(k, k);
  drawText(ctx, text, { x: 0, y: 0, size, maxWidth }, 700, alpha, ink);
  ctx.restore();
}

/** A hand-drawn arrow from a to b in ink with a paper halo. */
export function drawArrow(ctx: CanvasRenderingContext2D, ax: number, ay: number, bx: number, by: number, alpha: number, colour = PAPER, width = 6): void {
  if (alpha <= 0) return;
  const a = Math.atan2(by - ay, bx - ax);
  const head = 10 + width * 3;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const [colour2, w] of [[colour === PAPER ? '#06101c' : PAPER, width + 6], [colour, width]] as const) {
    ctx.strokeStyle = colour2;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.quadraticCurveTo((ax + bx) / 2 + (by - ay) * 0.12, (ay + by) / 2 - (bx - ax) * 0.12, bx, by);
    ctx.moveTo(bx - head * Math.cos(a - 0.45), by - head * Math.sin(a - 0.45));
    ctx.lineTo(bx, by);
    ctx.lineTo(bx - head * Math.cos(a + 0.45), by - head * Math.sin(a + 0.45));
    ctx.stroke();
  }
  ctx.restore();
}

/** A paper card with an inked edge and a soft shadow. */
export function drawCard(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, alpha: number, fill = PAPER): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 8;
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 18);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.restore();
}
