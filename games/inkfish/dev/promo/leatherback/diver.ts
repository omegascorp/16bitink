import type { Pt } from '../../../src/art/pen';
import { smoothClosed } from './paint';
import { cycles } from './story';

/**
 * A scuba diver's silhouette for scale, swimming right: mask, regulator,
 * tank on the back, long fins kicking, a trail of bubbles. Drawn round the
 * middle of the body at (x, y); `len` its length head to fin tip (a person
 * of about 1.75 m with fins).
 */

const SIL = '#0a1620';
const RIM = 'rgba(170,205,225,0.55)';

export function drawDiver(ctx: CanvasRenderingContext2D, x: number, y: number, len: number, t: number, alpha: number): void {
  if (alpha <= 0.01) return;
  const k = len / 600;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.scale(k, k);
  // Legs and fins, kicking in turn.
  for (const [phase, dy] of [[0, -6], [Math.PI, 6]] as const) {
    const a = 0.18 * Math.sin(cycles(14, t) + phase);
    ctx.save();
    ctx.translate(-120, dy);
    ctx.rotate(a);
    const leg = smoothClosed([{ x: 10, y: -20 }, { x: -120, y: -16 }, { x: -170, y: -10 }, { x: -170, y: 12 }, { x: -110, y: 18 }, { x: 10, y: 22 }], 3);
    fill(ctx, leg, SIL);
    ctx.translate(-168, 0);
    ctx.rotate(a * 1.6);
    const fin = smoothClosed([{ x: 0, y: -14 }, { x: -130, y: -30 }, { x: -150, y: -6 }, { x: -150, y: 10 }, { x: -125, y: 26 }, { x: 0, y: 14 }], 3);
    fill(ctx, fin, '#0d1d2a');
    ctx.restore();
  }
  // The body, the tank on its back, the head with the mask, an arm along the side.
  fill(ctx, smoothClosed([{ x: 150, y: -34 }, { x: 40, y: -40 }, { x: -120, y: -28 }, { x: -130, y: 24 }, { x: 30, y: 38 }, { x: 150, y: 30 }], 4), SIL);
  fill(ctx, smoothClosed([{ x: 120, y: -40 }, { x: 120, y: -78 }, { x: -60, y: -80 }, { x: -70, y: -52 }, { x: -50, y: -38 }], 3), '#13232f');
  fill(ctx, smoothClosed([{ x: 150, y: -36 }, { x: 205, y: -46 }, { x: 236, y: -20 }, { x: 228, y: 18 }, { x: 190, y: 30 }, { x: 150, y: 26 }], 3), SIL);
  fill(ctx, smoothClosed([{ x: 208, y: -30 }, { x: 236, y: -26 }, { x: 240, y: 2 }, { x: 214, y: 4 }], 2), 'rgba(120,170,190,0.45)');
  fill(ctx, smoothClosed([{ x: 120, y: 20 }, { x: 170, y: 40 }, { x: 240, y: 52 }, { x: 250, y: 64 }, { x: 166, y: 58 }, { x: 110, y: 40 }], 3), SIL);
  // Rim light along the back, from the surface.
  ctx.strokeStyle = RIM;
  ctx.lineWidth = 3 / k;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-120, -30);
  ctx.quadraticCurveTo(20, -86, 120, -80);
  ctx.moveTo(150, -40);
  ctx.quadraticCurveTo(200, -52, 232, -24);
  ctx.stroke();
  ctx.restore();
  // Bubbles rising from the regulator, a whole number of trips a loop.
  ctx.save();
  ctx.globalAlpha = alpha * 0.8;
  ctx.strokeStyle = 'rgba(220,240,245,0.8)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 7; i++) {
    const f = (((t * 9) / 18 + i / 7) % 1 + 1) % 1;
    const bx = x + (238 + 14 * Math.sin(f * 9 + i)) * k;
    const by = y + (10 - f * 420) * k;
    ctx.beginPath();
    ctx.arc(bx, by, (4 + 7 * f) * k, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function fill(ctx: CanvasRenderingContext2D, pts: readonly Pt[], colour: string): void {
  ctx.fillStyle = colour;
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
}
