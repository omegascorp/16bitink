import { LOOP_S } from './story';

/** One bubble's rise through the frame; every period divides the loop, so the field closes at the seam. */
export interface Bubble {
  readonly x: number;
  readonly y: number;
  readonly r: number;
  readonly alpha: number;
}

const frac = (v: number): number => v - Math.floor(v);

interface Spread {
  readonly x0: number;
  readonly x1: number;
  readonly y0: number;
  readonly y1: number;
  readonly rMin: number;
  readonly rMax: number;
}

/** `n` bubbles rising through a box at time `t` (seconds, loop time). */
export function bubblesIn(t: number, n: number, seed: number, box: Spread): Bubble[] {
  return Array.from({ length: n }, (_, i) => {
    const a = frac(Math.sin((i + 1) * 12.9898 + seed) * 43758.5453);
    const b = frac(Math.sin((i + 1) * 78.233 + seed) * 12543.123);
    const c = frac(Math.sin((i + 1) * 37.719 + seed) * 9371.77);
    const cycles = 2 + Math.floor(c * 4);
    const u = frac((t / LOOP_S) * cycles + a);
    const x = box.x0 + (box.x1 - box.x0) * b + Math.sin(u * Math.PI * 2 * 2 + a * 6) * 14;
    return { x, y: box.y1 + (box.y0 - box.y1) * u, r: box.rMin + (box.rMax - box.rMin) * c, alpha: Math.min(1, u * 6, (1 - u) * 6) };
  });
}

/** Inked bubbles: a faint fill, a fine pale ring, a glint. */
export function drawBubbles(ctx: CanvasRenderingContext2D, bubbles: readonly Bubble[], strength = 1): void {
  ctx.save();
  for (const b of bubbles) {
    const a = b.alpha * strength;
    if (a <= 0) continue;
    ctx.globalAlpha = 0.14 * a;
    ctx.fillStyle = '#d8d2f0';
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.6 * a;
    ctx.strokeStyle = '#d8d2f0';
    ctx.lineWidth = Math.max(1.2, b.r * 0.12);
    ctx.stroke();
    ctx.globalAlpha = 0.9 * a;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(b.x - b.r * 0.35, b.y - b.r * 0.35, Math.max(1, b.r * 0.2), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
