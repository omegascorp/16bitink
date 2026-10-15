import { INK } from '../../../src/art/palette';
import { CAPTION_FONT, drawTextLine, INK_ON_PAPER, type TextInk } from '../captions';
import { clamp01 } from '../short';

/** Sketchbook labels: written on left to right, or pointing at something with a leader line. */

/** A line of handwriting, written on from the left: `u` 0 .. 1 of it there. */
export function writeOn(
  ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, weight: 500 | 700, u: number, colours: TextInk = INK_ON_PAPER, alpha = 1,
): void {
  if (u <= 0 || alpha <= 0) return;
  ctx.save();
  ctx.font = `${weight} ${size}px ${CAPTION_FONT}`;
  const w = ctx.measureText(text).width + size * 0.3;
  ctx.beginPath();
  ctx.rect(x - w / 2, y - size * 1.3, w * clamp01(u), size * 1.8);
  ctx.clip();
  drawTextLine(ctx, text, x, y, size, weight, alpha * clamp01(u * 4), colours);
  ctx.restore();
}

/** How wide a line of handwriting is. */
export function textWidth(ctx: CanvasRenderingContext2D, text: string, size: number, weight: 500 | 700): number {
  ctx.save();
  ctx.font = `${weight} ${size}px ${CAPTION_FONT}`;
  const w = ctx.measureText(text).width;
  ctx.restore();
  return w;
}

/** A hand-drawn line from a to b, `u` of it drawn. */
export function inkLine(
  ctx: CanvasRenderingContext2D, ax: number, ay: number, bx: number, by: number, u: number, width: number, colour: string = INK, alpha = 1,
): void {
  if (u <= 0 || alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.quadraticCurveTo((ax + bx) / 2, (ay + by) / 2 + width * 0.6, ax + (bx - ax) * clamp01(u), ay + (by - ay) * clamp01(u));
  ctx.stroke();
  ctx.restore();
}

/** A label with a leader line to what it names (`to`), drawn out from the label. */
export function callout(
  ctx: CanvasRenderingContext2D, text: string, x: number, y: number, to: { readonly x: number; readonly y: number }, alpha: number, size = 64, colours: TextInk = INK_ON_PAPER,
): void {
  if (alpha <= 0) return;
  const from = { x, y: to.y > y ? y + size * 0.25 : y - size * 0.8 };
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = colours.halo;
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(from.x + (dx / len) * 10, from.y + (dy / len) * 10);
  ctx.lineTo(to.x - (dx / len) * 8, to.y - (dy / len) * 8);
  ctx.stroke();
  ctx.strokeStyle = colours.fill;
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = colours.fill;
  ctx.beginPath();
  ctx.arc(to.x - (dx / len) * 8, to.y - (dy / len) * 8, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  drawTextLine(ctx, text, x, y, size, 700, alpha, colours);
}
