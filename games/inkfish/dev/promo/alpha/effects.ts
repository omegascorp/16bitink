import { VIDEO } from '../short';
import { rewindAt } from './story';

/** Tape running back to 2003: a ⏪ at the top left, and faint streaks rolling down the picture. */
const CHALK = '#e6edf6';
const HALO = '#050914';

export function drawRewind(ctx: CanvasRenderingContext2D, t: number): void {
  const amount = rewindAt(t);
  if (amount <= 0) return;
  ctx.save();
  ctx.fillStyle = CHALK;
  for (let i = 0; i < 3; i++) {
    const y = ((t * 1400 + i * 640) % (VIDEO.height + 200)) - 100;
    ctx.globalAlpha = 0.08 * amount;
    ctx.fillRect(0, y, VIDEO.width, 10 + i * 6);
  }
  const x = 150;
  const y = 380;
  const h = 76;
  ctx.globalAlpha = amount * (0.85 + 0.15 * Math.sin(t * 38));
  ctx.lineJoin = 'round';
  ctx.lineWidth = 12;
  ctx.strokeStyle = HALO;
  ctx.fillStyle = CHALK;
  for (const pass of ['halo', 'fill'] as const) {
    for (const dx of [0, h * 0.62]) {
      ctx.beginPath();
      ctx.moveTo(x + dx, y);
      ctx.lineTo(x + dx + h * 0.66, y - h / 2);
      ctx.lineTo(x + dx + h * 0.66, y + h / 2);
      ctx.closePath();
      if (pass === 'halo') ctx.stroke();
      else ctx.fill();
    }
  }
  ctx.restore();
}
