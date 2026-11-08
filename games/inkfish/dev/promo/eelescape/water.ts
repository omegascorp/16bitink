import { createRng } from '../../../src/logic/rng';
import { makePaper } from '../backdrop';
import { VIDEO } from '../short';
import { cycles } from './story';

/**
 * The water every scene sits in (after alpha/sea.ts): the game's paper under
 * a wash of any three colours, specks of silt drifting in whole cycles a
 * loop, soft light from above, the dark closing in at the edges, and flat
 * washes and glows for each beat's mood.
 */

export const makeSheet = (): HTMLCanvasElement => makePaper();

/** A wash colour, [r, g, b]. */
export type Rgb = readonly [number, number, number];

export const mixRgb = (a: Rgb, b: Rgb, u: number): Rgb => [0, 1, 2].map((i) => a[i]! + (b[i]! - a[i]!) * u) as unknown as Rgb;
export const css = (c: Rgb, alpha = 1): string => `rgba(${c.map((v) => Math.round(v)).join(',')},${alpha})`;

/** Paper under a wash, `top` at the top, `mid` at 55%, `bottom` at the bottom. */
export function drawWater(ctx: CanvasRenderingContext2D, sheet: HTMLCanvasElement, top: Rgb, mid: Rgb, bottom: Rgb): void {
  ctx.drawImage(sheet, 0, 0);
  const g = ctx.createLinearGradient(0, 0, 0, VIDEO.height);
  g.addColorStop(0, css(top, 0.93));
  g.addColorStop(0.55, css(mid, 0.95));
  g.addColorStop(1, css(bottom, 0.97));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
}

const SPECKS = (() => {
  const rng = createRng(2024);
  return Array.from({ length: 150 }, () => ({ x: rng() * VIDEO.width, y: rng() * VIDEO.height, r: 0.9 + rng() * 2.4, phase: rng() * Math.PI * 2, depth: 0.4 + rng() * 0.6 }));
})();

/** Silt in the water, drifting in whole cycles a loop; `shift` moves it with the camera (parallax). */
export function drawSpecks(ctx: CanvasRenderingContext2D, t: number, colour: string, alpha: number, shift: { readonly x: number; readonly y: number } = { x: 0, y: 0 }): void {
  if (alpha <= 0) return;
  const W = VIDEO.width;
  const H = VIDEO.height;
  ctx.save();
  ctx.fillStyle = colour;
  for (const m of SPECKS) {
    const par = 0.3 + 0.5 * m.depth;
    const x = ((((m.x - shift.x * par + 16 * Math.sin(cycles(1, t) + m.phase)) % W) + W) % W);
    const y = ((((m.y - shift.y * par + 12 * Math.sin(cycles(2, t) + m.phase)) % H) + H) % H);
    ctx.globalAlpha = alpha * (0.1 + 0.2 * m.depth);
    ctx.beginPath();
    ctx.arc(x, y, m.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

const RAYS = [{ x: 0.1, w: 90, lean: 0.3 }, { x: 0.33, w: 150, lean: 0.26 }, { x: 0.58, w: 110, lean: 0.23 }, { x: 0.82, w: 170, lean: 0.19 }] as const;

/** Soft shafts of light slanting down from the top, swaying, `strength` 0 .. 1. */
export function drawRays(ctx: CanvasRenderingContext2D, t: number, strength: number, colour = '205,215,170'): void {
  if (strength <= 0.01) return;
  const top = -150;
  const len = 1700;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  RAYS.forEach((r, i) => {
    const a = r.lean + 0.03 * Math.sin(cycles(2, t) + i * 1.7);
    const x0 = r.x * VIDEO.width;
    const g = ctx.createLinearGradient(x0, top, x0 - Math.sin(a) * len, top + Math.cos(a) * len);
    g.addColorStop(0, `rgba(${colour},${(0.12 * strength).toFixed(3)})`);
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
export function drawVignette(ctx: CanvasRenderingContext2D, strength = 0.6, colour = '4,4,2'): void {
  const g = ctx.createRadialGradient(VIDEO.width / 2, 800, 380, VIDEO.width / 2, 860, 1250);
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

/** A soft round glow (screen blend). */
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

/** A four-pointed sparkle. */
export function sparkle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, colour: string, alpha: number): void {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = colour;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.22;
    if (i === 0) ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    else ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
