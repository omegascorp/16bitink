import { INK, PAPER, RED } from '../../../src/art/palette';
import { CAPTION_FONT, drawTextLine, INK_ON_PAPER, type TextInk } from '../captions';
import { clamp01, lerp, VIDEO } from '../short';

/**
 * The field notebook's plain page and the pen marks the short writes on
 * it: labels with leader lines, a dashed arrow, a tally, a burst
 * of ink, and words written out left to right.
 */
export interface P {
  readonly x: number;
  readonly y: number;
}

/** Plain paper, as everywhere in the game (no ruled lines). */
export function drawPage(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
}

/** A word or two in the handwriting, centred on (x, y). */
export function label(ctx: CanvasRenderingContext2D, text: string, at: P, size: number, alpha: number, weight: 500 | 700 = 700, ink: TextInk = INK_ON_PAPER): void {
  drawTextLine(ctx, text, at.x, at.y, size, weight, alpha, ink);
}

/** A thin ink leader from a label to what it names, with a dot on the end. */
export function leader(ctx: CanvasRenderingContext2D, from: P, to: P, alpha: number): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = INK;
  ctx.fillStyle = INK;
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  const mid = { x: lerp(from.x, to.x, 0.5) + (to.y - from.y) * 0.12, y: lerp(from.y, to.y, 0.5) - (to.x - from.x) * 0.12 };
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.quadraticCurveTo(mid.x, mid.y, to.x, to.y);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(to.x, to.y, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** A dashed arrow from a to b, `u` 0 .. 1 of it drawn, its dashes crawling with time `t`. */
export function dashedArrow(ctx: CanvasRenderingContext2D, a: P, b: P, u: number, alpha: number, t: number, width = 6): void {
  if (u <= 0 || alpha <= 0) return;
  const tip = { x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u) };
  const ang = Math.atan2(b.y - a.y, b.x - a.x);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = INK;
  ctx.lineCap = 'round';
  ctx.lineWidth = width;
  ctx.setLineDash([18, 14]);
  ctx.lineDashOffset = -t * 40;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(tip.x, tip.y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  for (const s of [-1, 1]) {
    ctx.moveTo(tip.x, tip.y);
    ctx.lineTo(tip.x - 26 * Math.cos(ang + s * 0.5), tip.y - 26 * Math.sin(ang + s * 0.5));
  }
  ctx.stroke();
  ctx.restore();
}

/** A tally of five: four upright strokes and the slash, each `strokes[k]` 0 .. 1 drawn. */
export function tally(ctx: CanvasRenderingContext2D, at: P, strokes: readonly number[]): void {
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineCap = 'round';
  ctx.lineWidth = 9;
  const h = 96;
  strokes.forEach((u, k) => {
    if (u <= 0) return;
    const [a, b] = k < 4
      ? [{ x: at.x + k * 30 - 45 + (k % 2) * 2, y: at.y - h / 2 }, { x: at.x + k * 30 - 45 - (k % 2) * 2, y: at.y + h / 2 }]
      : [{ x: at.x - 70, y: at.y + 30 }, { x: at.x + 70, y: at.y - 32 }];
    if (k === 4) ctx.strokeStyle = RED;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(lerp(a.x, b.x, u), lerp(a.y, b.y, u));
    ctx.stroke();
  });
  ctx.restore();
}

/** A burst of ink: a ring and short rays flying out, `u` 0 .. 1 through it. */
export function burst(ctx: CanvasRenderingContext2D, at: P, r: number, u: number): void {
  if (u <= 0 || u >= 1) return;
  const fade = 1 - u;
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineCap = 'round';
  ctx.globalAlpha = fade;
  ctx.lineWidth = 8 * fade + 1;
  ctx.beginPath();
  ctx.arc(at.x, at.y, r * (0.4 + 0.8 * u), 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + 0.2;
    const r0 = r * (0.7 + 0.9 * u);
    ctx.beginPath();
    ctx.moveTo(at.x + Math.cos(a) * r0, at.y + Math.sin(a) * r0);
    ctx.lineTo(at.x + Math.cos(a) * (r0 + 40 * fade), at.y + Math.sin(a) * (r0 + 40 * fade));
    ctx.stroke();
  }
  ctx.restore();
}

/** A line written out left to right, `u` 0 .. 1 of it (by width), with the pen's nib at the end while writing. */
export function written(ctx: CanvasRenderingContext2D, text: string, at: P, size: number, u: number, alpha = 1, ink: TextInk = INK_ON_PAPER): void {
  if (u <= 0 || alpha <= 0) return;
  ctx.save();
  ctx.font = `700 ${size}px ${CAPTION_FONT}`;
  const w = ctx.measureText(text).width + size * 0.3;
  const left = at.x - w / 2;
  ctx.beginPath();
  ctx.rect(left, at.y - size * 1.3, w * clamp01(u), size * 1.8);
  ctx.clip();
  drawTextLine(ctx, text, at.x, at.y, size, 700, alpha, ink);
  ctx.restore();
  if (u < 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(left + w * u, at.y - size * 0.25, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
