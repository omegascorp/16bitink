import { createRng } from '../../../src/logic/rng';
import { VIDEO } from '../short';
import { cycles } from './story';

/**
 * Open water for the underwater beats, one wash per mood: the game's paper
 * under a deep wash, shafts of light slanting down from the surface, marine
 * snow drifting, and the dark closing in at the edges.
 */

export interface Wash {
  readonly top: string;
  readonly mid: string;
  readonly bottom: string;
  /** The light shafts' colour and strength. */
  readonly ray: readonly [number, number, number];
  readonly rayAlpha: number;
  readonly snow: string;
}

/** Cold teal for the hook and the hull. */
export const HULL_WASH: Wash = { top: 'rgba(22,62,74,0.93)', mid: 'rgba(9,32,40,0.95)', bottom: 'rgba(3,10,14,0.97)', ray: [190, 232, 230], rayAlpha: 0.12, snow: '#d6ece8' };
/** Clear blue for the curious look at the shark. */
export const ALONE_WASH: Wash = { top: 'rgba(40,104,140,0.9)', mid: 'rgba(16,58,92,0.93)', bottom: 'rgba(6,22,40,0.96)', ray: [210, 236, 255], rayAlpha: 0.15, snow: '#e4f0ff' };
/** Dark and moody for the bite. */
export const DRILL_WASH: Wash = { top: 'rgba(24,40,62,0.94)', mid: 'rgba(10,20,34,0.96)', bottom: 'rgba(3,6,12,0.98)', ray: [200, 214, 240], rayAlpha: 0.09, snow: '#dfe6f4' };
/** Warm and bright for the smug grin. */
export const SMUG_WASH: Wash = { top: 'rgba(52,112,110,0.9)', mid: 'rgba(24,70,74,0.93)', bottom: 'rgba(10,32,38,0.96)', ray: [255, 236, 180], rayAlpha: 0.14, snow: '#fff4dc' };

export function drawWash(ctx: CanvasRenderingContext2D, paper: HTMLCanvasElement, w: Wash): void {
  ctx.drawImage(paper, 0, 0);
  const g = ctx.createLinearGradient(0, 0, 0, VIDEO.height);
  g.addColorStop(0, w.top);
  g.addColorStop(0.5, w.mid);
  g.addColorStop(1, w.bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
}

const RAYS = [
  { x: -120, w: 150, slant: 300 },
  { x: 260, w: 90, slant: 340 },
  { x: 560, w: 180, slant: 280 },
  { x: 940, w: 120, slant: 320 },
] as const;

/** Shafts of light from the surface, swaying a little (whole sways a loop), fading with depth. */
export function drawRays(ctx: CanvasRenderingContext2D, w: Wash, t: number, strength = 1): void {
  if (strength <= 0) return;
  const g = ctx.createLinearGradient(0, 0, 0, 1500);
  g.addColorStop(0, `rgba(${w.ray.join(',')},${(w.rayAlpha * strength).toFixed(3)})`);
  g.addColorStop(1, `rgba(${w.ray.join(',')},0)`);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  // Soft-edged, as light through water is.
  ctx.filter = 'blur(14px)';
  ctx.fillStyle = g;
  RAYS.forEach((r, i) => {
    const sway = 34 * Math.sin(cycles(1, t) + i * 1.4);
    ctx.beginPath();
    ctx.moveTo(r.x + sway, 0);
    ctx.lineTo(r.x + r.w + sway, 0);
    ctx.lineTo(r.x + r.w * 2.1 + r.slant, 1500);
    ctx.lineTo(r.x + r.slant - r.w * 0.4, 1500);
    ctx.closePath();
    ctx.fill();
  });
  ctx.restore();
}

const SNOW = (() => {
  const rng = createRng(1978);
  return Array.from({ length: 120 }, () => ({ x: rng() * VIDEO.width, y: rng() * VIDEO.height, r: 0.9 + rng() * 2.2, phase: rng() * Math.PI * 2, fall: 1 + Math.floor(rng() * 2), a: 0.12 + rng() * 0.25 }));
})();

/** Marine snow, sinking a whole number of screens a loop so it comes round. */
export function drawSnow(ctx: CanvasRenderingContext2D, w: Wash, t: number, alpha = 1): void {
  ctx.save();
  ctx.fillStyle = w.snow;
  const H = VIDEO.height + 40;
  for (const m of SNOW) {
    const y = (((m.y + (cycles(m.fall, t) / (2 * Math.PI)) * H) % H) + H) % H - 20;
    const x = m.x + 14 * Math.sin(cycles(2, t) + m.phase);
    ctx.globalAlpha = m.a * alpha;
    ctx.beginPath();
    ctx.arc(x, y, m.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** The dark closing in at the edges. */
export function drawVignette(ctx: CanvasRenderingContext2D, strength = 0.6): void {
  const g = ctx.createRadialGradient(VIDEO.width / 2, 820, 380, VIDEO.width / 2, 860, 1250);
  g.addColorStop(0, 'rgba(1,4,8,0)');
  g.addColorStop(1, `rgba(1,4,8,${strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
}

/** A flat wash over everything (the lights going down, a fade). */
export function drawFill(ctx: CanvasRenderingContext2D, colour: string, alpha: number): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.fillStyle = colour;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  ctx.restore();
}
