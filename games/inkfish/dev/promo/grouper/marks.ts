import { INK, PAPER, type Pt } from '../../../src/art/pen';
import { CAPTION_FONT, drawTextLine, INK_ON_PAPER, type TextInk } from '../captions';
import { clamp01, lerp, smooth } from '../short';

/**
 * The notes inked over the reef: the red pointing arrow, labels with leader
 * lines, the ring round the hiding spot, the head shake's lines, the "let's
 * hunt" bubble and the struck-through "dumb?".
 */

export const RED = '#c8412c';
export const SPOKEN: TextInk = { fill: RED, halo: PAPER };

/** A fat red arrow from `from` towards `to`, `drawn` 0 .. 1 of it, inked round. */
export function drawArrow(ctx: CanvasRenderingContext2D, from: Pt, to: Pt, drawn: number, alpha: number): void {
  if (drawn <= 0 || alpha <= 0) return;
  const len = Math.hypot(to.x - from.x, to.y - from.y) * smooth(drawn);
  const a = Math.atan2(to.y - from.y, to.x - from.x);
  const head = Math.min(46, len * 0.6);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(from.x, from.y);
  ctx.rotate(a);
  ctx.beginPath();
  ctx.moveTo(0, -7);
  ctx.lineTo(len - head, -9);
  ctx.lineTo(len - head, -26);
  ctx.lineTo(len, 0);
  ctx.lineTo(len - head, 26);
  ctx.lineTo(len - head, 9);
  ctx.lineTo(0, 7);
  ctx.closePath();
  ctx.lineJoin = 'round';
  ctx.strokeStyle = PAPER;
  ctx.lineWidth = 12;
  ctx.stroke();
  ctx.fillStyle = RED;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.restore();
}

/** Labels stay this far inside the frame's edges. */
const MARGIN = { left: 40, right: 1040 } as const;

/** A label in ink handwriting, with a leader line to what it names; slid sideways if need be to sit wholly inside the margins. */
export function drawCallout(ctx: CanvasRenderingContext2D, text: string, spot: Pt, to: Pt | null, alpha: number, size = 64, colours: TextInk = INK_ON_PAPER): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.font = `700 ${size}px ${CAPTION_FONT}`;
  const half = ctx.measureText(text).width / 2 + size * 0.08;
  ctx.restore();
  const at = { x: Math.max(MARGIN.left + half, Math.min(MARGIN.right - half, spot.x)), y: spot.y };
  if (to) {
    const from = { x: at.x, y: to.y > at.y ? at.y + size * 0.25 : at.y - size * 0.8 };
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.hypot(dx, dy) || 1;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.lineCap = 'round';
    ctx.strokeStyle = PAPER;
    ctx.lineWidth = 9;
    const line = (): void => {
      ctx.beginPath();
      ctx.moveTo(from.x + (dx / len) * 10, from.y + (dy / len) * 10);
      ctx.lineTo(to.x - (dx / len) * 12, to.y - (dy / len) * 12);
      ctx.stroke();
    };
    line();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4;
    line();
    ctx.restore();
  }
  drawTextLine(ctx, text, at.x, at.y, size, 700, alpha, colours);
}

/** A dashed ring round `at`, drawn round as `drawn` runs 0 → 1. */
export function drawRing(ctx: CanvasRenderingContext2D, at: Pt, rx: number, ry: number, drawn: number, alpha: number): void {
  if (drawn <= 0 || alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineCap = 'round';
  ctx.setLineDash([18, 12]);
  for (const [width, colour] of [[11, PAPER], [5, RED]] as const) {
    ctx.strokeStyle = colour;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.ellipse(at.x, at.y, rx, ry, -0.05, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * smooth(drawn));
    ctx.stroke();
  }
  ctx.restore();
}

/** Shake lines: three short arcs either side of the head (at `head`, the fish `len` long), flicking with the shimmy. */
export function drawShakeLines(ctx: CanvasRenderingContext2D, head: Pt, len: number, alpha: number, shake: number): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = INK;
  ctx.lineCap = 'round';
  ctx.lineWidth = 5;
  for (const side of [-1, 1]) {
    for (let k = 0; k < 3; k++) {
      const r = len * (0.2 + 0.07 * k) + 6 * side * shake;
      const a = side < 0 ? Math.PI : 0;
      ctx.beginPath();
      ctx.arc(head.x, head.y - len * 0.02, r, a - 0.45 + 0.08 * k, a + 0.45 - 0.08 * k);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** A speech bubble centred at `at`, its tail pointing to `speaker`, popped to `s` of its size. */
export function drawBubble(ctx: CanvasRenderingContext2D, at: Pt, speaker: Pt, text: string, s: number): void {
  if (s <= 0) return;
  const w = 360;
  const h = 140;
  const tip = { x: (speaker.x - at.x) / s, y: (speaker.y - at.y) / s };
  const tail = (inset: number): void => {
    const end = { x: lerp(0, tip.x, 0.6), y: lerp(h / 2, tip.y, 0.6) };
    ctx.beginPath();
    ctx.moveTo(-30 + inset, h / 2 - 20);
    ctx.lineTo(end.x, end.y - inset * 1.5);
    ctx.lineTo(24 - inset, h / 2 - 20);
    ctx.closePath();
  };
  ctx.save();
  ctx.globalAlpha = clamp01(s * 3);
  ctx.translate(at.x, at.y);
  ctx.scale(s, s);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = INK;
  ctx.fillStyle = '#fbf8f1';
  ctx.lineWidth = 5;
  // The tail's outline, the bubble over it, then the tail filled in over the bubble's edge.
  tail(0);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h / 2, w, h, 60);
  ctx.fill();
  ctx.stroke();
  tail(4);
  ctx.fill();
  ctx.restore();
  drawTextLine(ctx, text, at.x, at.y + 24 * s, 84 * s, 700, clamp01(s * 3));
}

/** A word with a red stroke struck through it, `strike` 0 .. 1 of the way across. */
export function drawStruck(ctx: CanvasRenderingContext2D, text: string, at: Pt, size: number, alpha: number, strike: number): void {
  if (alpha <= 0) return;
  drawTextLine(ctx, text, at.x, at.y, size, 700, alpha);
  if (strike <= 0) return;
  ctx.save();
  ctx.font = `700 ${size}px ${CAPTION_FONT}`;
  const half = ctx.measureText(text).width / 2 + 24;
  const x0 = at.x - half;
  const x1 = lerp(x0, at.x + half, smooth(strike));
  const y = at.y - size * 0.3;
  ctx.globalAlpha = alpha;
  ctx.lineCap = 'round';
  for (const [width, colour] of [[20, PAPER], [11, RED]] as const) {
    ctx.strokeStyle = colour;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(x0, y + 10);
    ctx.lineTo(x1, y + 10 - (x1 - x0) * 0.08);
    ctx.stroke();
  }
  ctx.restore();
}
