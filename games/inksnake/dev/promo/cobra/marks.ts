import { INK, PAPER, RED } from '../../../src/art/palette';
import { drawTextLine, PAPER_ON_DARK } from '../captions';
import type { Pt } from '../sprites';

/**
 * The short's marks over the painting: a name with its length (metres big,
 * feet under), a small place-and-year tag, a clock whose hand runs round,
 * and the flash of the bite.
 */
const HALO = '#0b1a2a';

const popOf = (show: number): number => (show < 1 ? 0.7 + 0.3 * show + 0.12 * Math.sin(show * Math.PI) : 1);

/** An animal's name, small, over its length in metres, with the feet under. */
export function drawLength(ctx: CanvasRenderingContext2D, name: string, metric: string, us: string, c: Pt, show: number): void {
  if (show <= 0) return;
  const a = Math.min(1, show * 1.4);
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.scale(popOf(show), popOf(show));
  drawTextLine(ctx, name, 0, -70, 58, 700, a, PAPER_ON_DARK);
  drawTextLine(ctx, metric, 0, 0, 92, 700, a, { fill: '#ffd98a', halo: HALO });
  drawTextLine(ctx, us, 0, 60, 58, 700, a, PAPER_ON_DARK);
  ctx.restore();
}

/** A small tag (the place and year), fading in. */
export function drawTag(ctx: CanvasRenderingContext2D, text: string, c: Pt, size: number, alpha: number): void {
  drawTextLine(ctx, text, c.x, c.y, size, 700, alpha, PAPER_ON_DARK);
}

/** A clock face, its long hand gone `turns` times round from twelve (the short hand with it), `label` under. */
export function drawClock(ctx: CanvasRenderingContext2D, c: Pt, r: number, turns: number, show: number, label: string, from = 0): void {
  if (show <= 0) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, show * 1.4);
  ctx.translate(c.x, c.y);
  ctx.scale(popOf(show), popOf(show));
  ctx.fillStyle = PAPER;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // The time gone, a wedge of red behind the hands.
  const swept = Math.min(1, turns) * Math.PI * 2;
  if (swept > 0) {
    ctx.fillStyle = 'rgba(179,50,43,0.22)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, r * 0.86, -Math.PI / 2 + from * Math.PI * 2, -Math.PI / 2 + from * Math.PI * 2 + swept);
    ctx.closePath();
    ctx.fill();
  }
  ctx.lineCap = 'round';
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.lineWidth = i % 3 === 0 ? 7 : 4;
    ctx.beginPath();
    ctx.moveTo(Math.sin(a) * r * 0.78, -Math.cos(a) * r * 0.78);
    ctx.lineTo(Math.sin(a) * r * 0.9, -Math.cos(a) * r * 0.9);
    ctx.stroke();
  }
  const hand = (a: number, len: number, w: number, colour: string): void => {
    ctx.strokeStyle = colour;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.sin(a) * len, -Math.cos(a) * len);
    ctx.stroke();
  };
  hand((from + turns / 12) * Math.PI * 2, r * 0.48, 11, INK);
  hand((from + turns) * Math.PI * 2, r * 0.74, 7, RED);
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(0, 0, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  drawTextLine(ctx, label, c.x, c.y + r + 70, 72, 700, Math.min(1, show * 1.4), PAPER_ON_DARK);
}

/** The bite: a burst of short ink strokes round where the fangs went in, fanned over the top and turned by `spin`. */
export function drawBite(ctx: CanvasRenderingContext2D, c: Pt, k: number, spin = 0, size = 1): void {
  if (k <= 0) return;
  ctx.save();
  ctx.lineCap = 'round';
  for (const [w, colour] of [[14, HALO], [6, '#fff3c4']] as const) {
    ctx.globalAlpha = Math.min(1, k * 1.6);
    ctx.strokeStyle = colour;
    ctx.lineWidth = w;
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI * 0.95 + (i / 6) * Math.PI * 0.9 + spin;
      const r0 = (60 + 20 * (1 - k)) * size;
      const r1 = r0 + 46 * k * size;
      ctx.beginPath();
      ctx.moveTo(c.x + Math.cos(a) * r0, c.y + Math.sin(a) * r0);
      ctx.lineTo(c.x + Math.cos(a) * r1, c.y + Math.sin(a) * r1);
      ctx.stroke();
    }
  }
  ctx.restore();
}
