import { VIDEO } from '../short';
import type { Pt } from './story';

/**
 * Colour grades over the picture, one per mood: the dark closing in at the
 * edges, red creeping in for the tension, the colour draining out for the
 * eerie "gone", the dark swallowing everything but the hole, and the
 * snap's white flash.
 */

/** A flat colour over the frame with a blend mode. */
export function wash(ctx: CanvasRenderingContext2D, mode: GlobalCompositeOperation, colour: string, alpha: number): void {
  if (alpha <= 0.005) return;
  ctx.save();
  ctx.globalCompositeOperation = mode;
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.fillStyle = colour;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  ctx.restore();
}

/** The dark closing in at the edges. */
export function drawVignette(ctx: CanvasRenderingContext2D, strength: number, inner = 380, colour = '1,4,10'): void {
  const g = ctx.createRadialGradient(VIDEO.width / 2, 780, inner, VIDEO.width / 2, 840, 1250);
  g.addColorStop(0, `rgba(${colour},0)`);
  g.addColorStop(1, `rgba(${colour},${strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
}

/** Tension: a red tint and the edges pressing in. */
export function drawTension(ctx: CanvasRenderingContext2D, amount: number): void {
  if (amount <= 0.005) return;
  wash(ctx, 'multiply', 'rgb(255,150,140)', 0.55 * amount);
  wash(ctx, 'overlay', 'rgb(190,30,30)', 0.25 * amount);
  drawVignette(ctx, 0.6 * amount, 260, '30,0,4');
}

/** Eerie: the colour drained to a cold grey-green. */
export function drawEerie(ctx: CanvasRenderingContext2D, amount: number): void {
  if (amount <= 0.005) return;
  wash(ctx, 'saturation', 'rgb(128,128,128)', 0.8 * amount);
  wash(ctx, 'multiply', 'rgb(170,200,180)', 0.6 * amount);
}

/** The dark swallowing the picture, leaving a shrinking circle round `at` (screen px), 0 .. 1. */
export function drawDark(ctx: CanvasRenderingContext2D, at: Pt, amount: number): void {
  if (amount <= 0.005) return;
  const r = Math.max(1, 1400 * (1 - amount) ** 1.4);
  const g = ctx.createRadialGradient(at.x, at.y, r * 0.35, at.x, at.y, r);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(0,0,0,${Math.min(1, amount * 2.5).toFixed(3)})`);
  ctx.save();
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  ctx.restore();
  wash(ctx, 'source-over', '#000', amount ** 3);
}

/** The snap's white flash. */
export function drawFlash(ctx: CanvasRenderingContext2D, amount: number): void {
  wash(ctx, 'screen', '#fff4e0', amount);
}
