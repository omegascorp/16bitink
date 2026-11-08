import { INK } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';
import { VIDEO } from '../short';
import { cycles } from './story';

/**
 * Water for every scene: a deep wash over the paper, slanting shafts of
 * light, drifting specks, a vignette, rising bubbles, and colour grades that
 * set each beat's mood.
 */

export const INK_BG = '#050c12';

/** Paper washed with water, top colour to bottom colour. */
export function drawWash(ctx: CanvasRenderingContext2D, paper: HTMLCanvasElement, top: string, bottom: string, y0 = 0, y1: number = VIDEO.height): void {
  ctx.drawImage(paper, 0, 0);
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
}

const RAYS = [
  { x: -260, w: 150, slant: 300 },
  { x: 120, w: 90, slant: 330 },
  { x: 470, w: 190, slant: 260 },
  { x: 900, w: 120, slant: 300 },
  { x: 1300, w: 160, slant: 280 },
] as const;

/** Shafts of light from above, swaying (screen px), `alpha` their strength. */
export function drawRays(ctx: CanvasRenderingContext2D, t: number, alpha: number, top = 0, depth = 1600, tint = '200,230,225'): void {
  const g = ctx.createLinearGradient(0, top, 0, top + depth);
  g.addColorStop(0, `rgba(${tint},${alpha})`);
  g.addColorStop(1, `rgba(${tint},0)`);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = g;
  RAYS.forEach((r, i) => {
    const sway = 30 * Math.sin(cycles(1, t) + i * 1.3);
    ctx.beginPath();
    ctx.moveTo(r.x + sway, top);
    ctx.lineTo(r.x + r.w + sway, top);
    ctx.lineTo(r.x + r.w * 2.2 + r.slant, top + depth);
    ctx.lineTo(r.x + r.slant - r.w * 0.4, top + depth);
    ctx.closePath();
    ctx.fill();
  });
  ctx.restore();
}

const SPECKS = (() => {
  const rng = createRng(2010);
  return Array.from({ length: 70 }, () => ({ x: rng() * VIDEO.width, y: rng() * VIDEO.height, r: 1 + rng() * 2.4, phase: rng() * Math.PI * 2, alpha: 0.1 + rng() * 0.25, n: 1 + Math.floor(rng() * 2) }));
})();

/** Specks of marine snow hanging in the water, drifting a little (each a whole number of times a loop). */
export function drawSpecks(ctx: CanvasRenderingContext2D, t: number, colour = '#d8e8e4', k = 1): void {
  ctx.save();
  ctx.fillStyle = colour;
  for (const s of SPECKS) {
    ctx.globalAlpha = s.alpha * k;
    ctx.beginPath();
    ctx.arc(s.x + 14 * Math.sin(cycles(s.n, t) + s.phase), s.y + 10 * Math.cos(cycles(s.n, t) + s.phase * 1.7), s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** The dark closing in at the edges. */
export function drawVignette(ctx: CanvasRenderingContext2D, strength = 0.6, colour = '1,6,8'): void {
  const g = ctx.createRadialGradient(VIDEO.width / 2, 780, 380, VIDEO.width / 2, 820, 1250);
  g.addColorStop(0, `rgba(${colour},0)`);
  g.addColorStop(1, `rgba(${colour},${strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
}

/** A flat colour over the frame (a mood grade). */
export function drawGrade(ctx: CanvasRenderingContext2D, colour: string, alpha: number, mode: GlobalCompositeOperation = 'source-over'): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = mode;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = colour;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  ctx.restore();
}

export interface Bubble {
  readonly x: number;
  readonly y: number;
  readonly r: number;
}

/** Ink-ringed bubbles with a glint. */
export function drawBubbles(ctx: CanvasRenderingContext2D, bubbles: readonly Bubble[], colour = '#dfeeea', alpha = 0.75): void {
  ctx.save();
  ctx.lineWidth = 2;
  for (const b of bubbles) {
    if (b.r <= 0.5) continue;
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = colour;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = alpha * 0.9;
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.arc(b.x - b.r * 0.35, b.y - b.r * 0.35, Math.max(1, b.r * 0.22), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** A burst of bubbles from `at`, `age` seconds after release (rising, wobbling, spreading). */
export function bubbleBurst(at: { x: number; y: number }, age: number, count: number, seed: number, spread = 60, size = 9): Bubble[] {
  if (age < 0 || age > 2.2) return [];
  const rng = createRng(seed);
  return Array.from({ length: count }, () => {
    const dx = (rng() - 0.5) * spread;
    const speed = 160 + rng() * 220;
    const r = size * (0.4 + rng() * 0.8);
    const delay = rng() * 0.35;
    const a = Math.max(0, age - delay);
    return { x: at.x + dx * (0.4 + a) + 8 * Math.sin(a * 9 + dx), y: at.y - speed * a, r: a > 0 ? r * Math.min(1, a * 6) : 0 };
  });
}

/** The comic action lines: short ink strokes radiating from a point (u 0..1 over their life). */
export function drawBurst(ctx: CanvasRenderingContext2D, at: { x: number; y: number }, u: number, r0: number, r1: number, colour = INK, count = 9): void {
  if (u < 0 || u > 1) return;
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.lineCap = 'round';
  ctx.globalAlpha = u < 0.6 ? 1 : (1 - u) / 0.4;
  const grow = 1 - (1 - u) ** 3;
  for (let k = 0; k < count; k++) {
    const a = (k / count) * Math.PI * 2 + 0.3;
    const a0 = r0 + (r1 - r0) * grow * 0.4;
    const a1 = r0 + (r1 - r0) * grow;
    ctx.lineWidth = k % 2 ? 4 : 6;
    ctx.beginPath();
    ctx.moveTo(at.x + Math.cos(a) * a0, at.y + Math.sin(a) * a0);
    ctx.lineTo(at.x + Math.cos(a) * a1, at.y + Math.sin(a) * a1);
    ctx.stroke();
  }
  ctx.restore();
}
