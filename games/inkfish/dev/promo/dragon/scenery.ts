import { PAPER } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';
import type { TextInk } from '../captions';
import { VIDEO } from '../short';
import { type Camera, cycles, LOOP_S, type Mood, moodAt, type Pt, SURFACE_Y, toScreen } from './story';

/**
 * The open sea round the blue dragon: the sky over the surface, the
 * surface seen from just below it, sunlight slanting down into the blue,
 * drifting specks, and the colour of each mood (the water itself changes
 * with the beat: deep blue, violet, sunlit, a dark teal, near black, red,
 * bright).
 */

export const INK_BG = '#05091a';
export const SPOKEN = '#f5c84a';
export const CHALK = '#e2ecf7';
export const PAPER_ON_INK: TextInk = { fill: PAPER, halo: INK_BG };

interface Palette {
  readonly skyTop: string;
  readonly skyLow: string;
  readonly waterTop: string;
  readonly waterMid: string;
  readonly waterLow: string;
  /** Strength of the sunbeams. */
  readonly rays: number;
  /** The dark at the edges. */
  readonly vignette: number;
}

const PALETTES: Readonly<Record<Mood, Palette>> = {
  shock: { skyTop: '#27416b', skyLow: '#5b82b0', waterTop: '#1f5ea8', waterMid: '#0d2a66', waterLow: '#030820', rays: 0.06, vignette: 0.7 },
  cheeky: { skyTop: '#4b4392', skyLow: '#9a86d0', waterTop: '#4652b8', waterMid: '#24186a', waterLow: '#0b0628', rays: 0.08, vignette: 0.55 },
  calm: { skyTop: '#6fb2e4', skyLow: '#d6eef8', waterTop: '#3fb0dc', waterMid: '#1866a8', waterLow: '#06265a', rays: 0.2, vignette: 0.3 },
  tension: { skyTop: '#1b2a36', skyLow: '#33495a', waterTop: '#1a4a58', waterMid: '#0a2430', waterLow: '#01070c', rays: 0.03, vignette: 0.9 },
  dramatic: { skyTop: '#121a3a', skyLow: '#283766', waterTop: '#142c66', waterMid: '#07123a', waterLow: '#01030c', rays: 0.03, vignette: 0.85 },
  danger: { skyTop: '#3a0c16', skyLow: '#8a2a2e', waterTop: '#6a1a2c', waterMid: '#2e0814', waterLow: '#080104', rays: 0.04, vignette: 0.85 },
  laugh: { skyTop: '#7cc4ee', skyLow: '#e8f7fc', waterTop: '#4cc0e8', waterMid: '#1a78b8', waterLow: '#0a3a76', rays: 0.16, vignette: 0.2 },
};

const rgbOf = (hex: string): readonly [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const mixHex = (a: string, b: string, u: number): string => {
  const [p, q] = [rgbOf(a), rgbOf(b)];
  return `rgb(${p.map((v, i) => Math.round(v + (q[i]! - v) * u)).join(',')})`;
};
type Mixed = { readonly [K in keyof Palette]: Palette[K] extends number ? number : string };

/** The palette now, faded between the last mood and this one. */
export function paletteAt(t: number): Mixed {
  const { from, to, u } = moodAt(t);
  const a = PALETTES[from];
  const b = PALETTES[to];
  return {
    skyTop: mixHex(a.skyTop, b.skyTop, u),
    skyLow: mixHex(a.skyLow, b.skyLow, u),
    waterTop: mixHex(a.waterTop, b.waterTop, u),
    waterMid: mixHex(a.waterMid, b.waterMid, u),
    waterLow: mixHex(a.waterLow, b.waterLow, u),
    rays: a.rays + (b.rays - a.rays) * u,
    vignette: a.vignette + (b.vignette - a.vignette) * u,
  };
}

/** Where the surface is on screen. */
export const surfaceOnScreen = (cam: Camera): number => toScreen(cam, { x: 0, y: SURFACE_Y }).y;

/** The surface's ripple, world px from SURFACE_Y at world x (whole cycles a loop, so it loops). */
export const rippleAt = (x: number, t: number): number => 5 * Math.sin(x * 0.011 + cycles(6, t)) + 3 * Math.sin(x * 0.027 - cycles(9, t) + 1.3);

/** Sky above, water below, both in the mood's colours. */
export function drawSea(ctx: CanvasRenderingContext2D, cam: Camera, t: number): void {
  const p = paletteAt(t);
  const sy = surfaceOnScreen(cam);
  if (sy > 0) {
    const sky = ctx.createLinearGradient(0, sy - 900 * cam.zoom, 0, sy);
    sky.addColorStop(0, p.skyTop);
    sky.addColorStop(1, p.skyLow);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, VIDEO.width, Math.min(VIDEO.height, sy + 20));
  }
  const top = Math.max(-200, sy);
  const water = ctx.createLinearGradient(0, sy, 0, sy + 1700 * cam.zoom);
  water.addColorStop(0, p.waterTop);
  water.addColorStop(0.3, p.waterMid);
  water.addColorStop(1, p.waterLow);
  ctx.fillStyle = water;
  ctx.beginPath();
  ctx.moveTo(0, VIDEO.height);
  for (let x = 0; x <= VIDEO.width; x += 20) {
    const wx = cam.x + (x - VIDEO.width / 2) / cam.zoom;
    ctx.lineTo(x, Math.max(top, toScreen(cam, { x: wx, y: SURFACE_Y + rippleAt(wx, t) }).y));
  }
  ctx.lineTo(VIDEO.width, VIDEO.height);
  ctx.closePath();
  ctx.fill();
  drawRays(ctx, cam, t, p.rays);
}

const RAYS = (() => {
  const rng = createRng(2024);
  return Array.from({ length: 11 }, (_, i) => ({ x: -500 + i * 230 + rng() * 120, w: 50 + rng() * 120, sway: rng() * Math.PI * 2, a: 0.6 + rng() * 0.6 }));
})();

/** Sunbeams slanting down from the surface, swaying a little. */
function drawRays(ctx: CanvasRenderingContext2D, cam: Camera, t: number, strength: number): void {
  if (strength <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const r of RAYS) {
    const x0 = r.x + 30 * Math.sin(cycles(1, t) + r.sway);
    const a = toScreen(cam, { x: x0, y: SURFACE_Y });
    const b = toScreen(cam, { x: x0 - 520, y: SURFACE_Y + 1900 });
    const w = r.w * cam.zoom;
    const g = ctx.createLinearGradient(0, a.y, 0, b.y);
    g.addColorStop(0, `rgba(210,240,255,${(strength * r.a).toFixed(3)})`);
    g.addColorStop(1, 'rgba(210,240,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(a.x - w / 2, a.y);
    ctx.lineTo(a.x + w / 2, a.y);
    ctx.lineTo(b.x + w * 1.4, b.y);
    ctx.lineTo(b.x - w * 1.4, b.y);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** The surface seen from just under it: a bright, rippling film. Drawn over whatever floats in it. */
export function drawSurface(ctx: CanvasRenderingContext2D, cam: Camera, t: number): void {
  const pts: Pt[] = [];
  for (let x = -20; x <= VIDEO.width + 20; x += 16) {
    const wx = cam.x + (x - VIDEO.width / 2) / cam.zoom;
    pts.push(toScreen(cam, { x: wx, y: SURFACE_Y + rippleAt(wx, t) }));
  }
  if (pts.every((p) => p.y < -40 || p.y > VIDEO.height + 40)) return;
  ctx.save();
  // The film's glow just under it.
  const sy = surfaceOnScreen(cam);
  const g = ctx.createLinearGradient(0, sy, 0, sy + 70 * cam.zoom);
  g.addColorStop(0, 'rgba(230,248,255,0.32)');
  g.addColorStop(1, 'rgba(230,248,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, sy - 10, VIDEO.width, 80 * cam.zoom + 10);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = CHALK;
  for (const [w, a, dy] of [[5, 0.8, 0], [2, 0.35, 9]] as const) {
    ctx.globalAlpha = a;
    ctx.lineWidth = Math.max(1.5, w * cam.zoom);
    ctx.beginPath();
    pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y + dy * cam.zoom) : ctx.lineTo(p.x, p.y + dy * cam.zoom)));
    ctx.stroke();
  }
  ctx.restore();
}

const SPECKS = (() => {
  const rng = createRng(909);
  return Array.from({ length: 120 }, () => ({ x: rng() * VIDEO.width, y: rng() * VIDEO.height, r: 0.8 + rng() * 1.8, phase: rng() * Math.PI * 2, a: 0.1 + rng() * 0.25 }));
})();

/** Plankton drifting under the surface (each speck sways once a loop and drifts one lap up). */
export function drawSpecks(ctx: CanvasRenderingContext2D, cam: Camera, t: number): void {
  const loop = t / LOOP_S;
  const sy = surfaceOnScreen(cam);
  ctx.save();
  ctx.fillStyle = '#e8f4ff';
  for (const s of SPECKS) {
    const x = s.x + 14 * Math.sin(2 * Math.PI * loop + s.phase);
    const y = (((s.y - VIDEO.height * loop) % VIDEO.height) + VIDEO.height) % VIDEO.height;
    if (y < sy + 12) continue;
    ctx.globalAlpha = s.a;
    ctx.beginPath();
    ctx.arc(x, y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Everything behind the slug dimmed, so its see-through body stands out. */
export function drawDim(ctx: CanvasRenderingContext2D, amount: number): void {
  if (amount <= 0) return;
  ctx.save();
  ctx.globalAlpha = amount;
  ctx.fillStyle = '#01060a';
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  ctx.restore();
}

/** The dark closing in at the edges, as strong as the mood wants. */
export function drawVignette(ctx: CanvasRenderingContext2D, t: number): void {
  const k = paletteAt(t).vignette;
  const g = ctx.createRadialGradient(VIDEO.width / 2, 800, 380, VIDEO.width / 2, 840, 1250);
  g.addColorStop(0, 'rgba(1,2,8,0)');
  g.addColorStop(1, `rgba(1,2,8,${(0.8 * k).toFixed(3)})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
}

/** The danger beat's red: the whole picture tinted (multiplied) red, and the flash on "WORSE". */
export function drawRed(ctx: CanvasRenderingContext2D, danger: number, flash: number): void {
  if (danger <= 0 && flash <= 0) return;
  ctx.save();
  if (danger > 0) {
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = 0.3 * danger;
    ctx.fillStyle = '#ff6a5a';
    ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  }
  if (flash > 0) {
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = flash;
    ctx.fillStyle = '#ff2a1e';
    ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  }
  ctx.restore();
}
