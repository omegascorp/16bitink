import { createRng } from '../../../src/logic/rng';
import { makePaper } from '../backdrop';
import { VIDEO } from '../short';
import { cycles } from './story';

/**
 * The water every underwater scene sits in: the game's paper under a wash
 * (cold navy by default, any two colours for the warm and eerie beats),
 * marine snow that drifts or streaks, soft shafts of light from above, the
 * dark closing in at the edges, and flat washes for a beat's mood.
 */

export const makeSheet = (): HTMLCanvasElement => makePaper();

/** A wash colour, [r, g, b]. */
export type Rgb = readonly [number, number, number];

export const mixRgb = (a: Rgb, b: Rgb, u: number): Rgb => [0, 1, 2].map((i) => a[i]! + (b[i]! - a[i]!) * u) as unknown as Rgb;
export const css = (c: Rgb, alpha = 1): string => `rgba(${c.map((v) => Math.round(v)).join(',')},${alpha})`;

/** Cold open water: navy fading to near black below. */
export const COLD_TOP: Rgb = [16, 30, 62];
export const COLD_MID: Rgb = [8, 15, 36];
export const COLD_BOTTOM: Rgb = [2, 5, 13];

/** Paper under a wash, `top` at the top, `mid` at 55%, `bottom` at the bottom. */
export function drawWater(ctx: CanvasRenderingContext2D, sheet: HTMLCanvasElement, top: Rgb, mid: Rgb, bottom: Rgb): void {
  ctx.drawImage(sheet, 0, 0);
  const g = ctx.createLinearGradient(0, 0, 0, VIDEO.height);
  g.addColorStop(0, css(top, 0.94));
  g.addColorStop(0.55, css(mid, 0.95));
  g.addColorStop(1, css(bottom, 0.97));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
}

const SNOW = (() => {
  const rng = createRng(2003);
  return Array.from({ length: 170 }, () => ({ x: rng() * VIDEO.width, y: rng() * VIDEO.height, r: 0.9 + rng() * 2.2, phase: rng() * Math.PI * 2, depth: 0.4 + rng() * 0.6 }));
})();

/**
 * Marine snow. `rise` px scrolls it up (the camera falling past it), `streak`
 * px stretches each flake into a line (fast falls); otherwise it drifts in
 * whole cycles a loop.
 */
export function drawSnow(ctx: CanvasRenderingContext2D, t: number, colour: string, alpha: number, rise = 0, streak = 0): void {
  if (alpha <= 0) return;
  const H = VIDEO.height;
  ctx.save();
  ctx.fillStyle = colour;
  ctx.strokeStyle = colour;
  ctx.lineCap = 'round';
  for (const m of SNOW) {
    const par = 0.45 + 0.55 * m.depth;
    const x = m.x + 14 * Math.sin(cycles(1, t) + m.phase);
    const y = ((((m.y - rise * par + 10 * Math.sin(cycles(2, t) + m.phase)) % H) + H) % H);
    ctx.globalAlpha = alpha * (0.12 + 0.2 * m.depth);
    const len = streak * par;
    if (len > m.r * 2) {
      ctx.lineWidth = m.r * 1.1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + len);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(x, y, m.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

const RAYS = [{ x: 0.12, w: 90, lean: 0.3 }, { x: 0.34, w: 150, lean: 0.26 }, { x: 0.57, w: 110, lean: 0.23 }, { x: 0.8, w: 170, lean: 0.19 }, { x: 1.0, w: 100, lean: 0.16 }] as const;

/** Soft shafts of light slanting down from `top` (screen y), swaying, `strength` 0 .. 1. */
export function drawRays(ctx: CanvasRenderingContext2D, t: number, strength: number, top = -150, colour = '205,225,240', len = 1700): void {
  if (strength <= 0.01) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  RAYS.forEach((r, i) => {
    const a = r.lean + 0.03 * Math.sin(cycles(2, t) + i * 1.7);
    const x0 = r.x * VIDEO.width;
    const g = ctx.createLinearGradient(x0, top, x0 - Math.sin(a) * len, top + Math.cos(a) * len);
    g.addColorStop(0, `rgba(${colour},${(0.14 * strength).toFixed(3)})`);
    g.addColorStop(1, `rgba(${colour},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x0 - r.w / 2, top);
    ctx.lineTo(x0 + r.w / 2, top);
    ctx.lineTo(x0 + r.w / 2 - Math.sin(a) * len + r.w * 0.6, top + Math.cos(a) * len);
    ctx.lineTo(x0 - r.w / 2 - Math.sin(a) * len - r.w * 0.6, top + Math.cos(a) * len);
    ctx.closePath();
    ctx.fill();
  });
  ctx.restore();
}

/** The dark closing in at the edges. */
export function drawVignette(ctx: CanvasRenderingContext2D, strength = 0.6, colour = '1,4,10'): void {
  const g = ctx.createRadialGradient(VIDEO.width / 2, 760, 380, VIDEO.width / 2, 820, 1250);
  g.addColorStop(0, `rgba(${colour},0)`);
  g.addColorStop(1, `rgba(${colour},${strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
}

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

/** A soft round glow (screen blend), for the tag and the warm water. */
export function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rgb: string, alpha: number): void {
  if (alpha <= 0.005) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${rgb},${alpha.toFixed(3)})`);
  g.addColorStop(0.4, `rgba(${rgb},${(alpha * 0.45).toFixed(3)})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.restore();
}
