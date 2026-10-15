import { INK } from '../../../src/art/pen';
import { drawPaper } from '../../../src/art/propArt';
import { createRng } from '../../../src/logic/rng';
import { FRAME } from './frame';
import { cameraAt, cameraSpeed, darknessAt, LINE_M, metresAt, RECORD_M, toScreen, yAt } from './world';

/** The water around the dive: paper, the depth's colour, sunlight, the surface, marine snow and the line at 8,200 m. */

const W = FRAME.width;
const H = FRAME.height;
export const PALE = '#dfe8ff';
export const LINE_RED = '#c8372d';

/** A full-frame sheet of the game's sketchbook paper. */
export function makePaper(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const tile = document.createElement('canvas');
  tile.width = tile.height = 512;
  drawPaper(tile.getContext('2d')!, 512);
  ctx.save();
  ctx.scale(2, 2);
  ctx.fillStyle = ctx.createPattern(tile, 'repeat')!;
  ctx.fillRect(0, 0, W / 2, H / 2);
  ctx.restore();
  return canvas;
}

type Rgba = readonly [number, number, number, number];

/** The water's colour over the paper by depth: a blue wash near the top, nearly opaque night in the deep. */
const WATER: readonly (readonly [number, Rgba])[] = [
  [0, [70, 120, 170, 0.12]],
  [15, [60, 115, 160, 0.2]],
  [50, [55, 100, 150, 0.32]],
  [120, [45, 85, 140, 0.48]],
  [200, [35, 66, 122, 0.66]],
  [600, [20, 40, 90, 0.86]],
  [1000, [11, 33, 80, 0.93]],
  [2500, [8, 19, 47, 0.96]],
  [4000, [6, 12, 32, 0.97]],
  [6000, [4, 8, 23, 0.98]],
  [RECORD_M, [2, 4, 13, 0.985]],
];

export function waterAt(metres: number): Rgba {
  if (metres <= WATER[0]![0]) return WATER[0]![1];
  for (let i = 1; i < WATER.length; i++) {
    const [m1, c1] = WATER[i]!;
    if (metres <= m1) {
      const [m0, c0] = WATER[i - 1]!;
      const u = (metres - m0) / (m1 - m0);
      return c0.map((v, k) => v + (c1[k]! - v) * u) as unknown as Rgba;
    }
  }
  return WATER[WATER.length - 1]![1];
}

export const css = (c: Rgba, alpha = c[3]): string => `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${alpha.toFixed(3)})`;

/** The darkness of the water behind screen height y. */
export const darkBehind = (y: number, t: number): number => darknessAt(metresAt(y + cameraAt(t) - H / 2));

/** The water over the paper: a gradient down the screen sampled from depth, cut sharp at the surface. */
export function drawWater(ctx: CanvasRenderingContext2D, t: number): void {
  const surface = toScreen(0, t);
  if (surface >= H) return;
  const top = Math.max(0, surface);
  const gradient = ctx.createLinearGradient(0, top, 0, H);
  const camera = cameraAt(t);
  const samples = 10;
  for (let i = 0; i <= samples; i++) {
    const y = top + ((H - top) * i) / samples;
    gradient.addColorStop(i / samples, css(waterAt(metresAt(y + camera - H / 2))));
  }
  ctx.fillStyle = gradient;
  ctx.fillRect(0, top, W, H - top);
}

/** Sunlight slanting down from the surface, fading with depth. Fixed to the water, so they scroll with it. */
const RAYS = [
  { x: 240, w: 80, lean: 0.25 }, { x: 560, w: 130, lean: 0.22 }, { x: 880, w: 70, lean: 0.27 }, { x: 1180, w: 150, lean: 0.2 },
  { x: 1460, w: 90, lean: 0.24 }, { x: 1720, w: 120, lean: 0.21 },
];
const RAY_LENGTH = yAt(200) + 400;

export function drawRays(ctx: CanvasRenderingContext2D, t: number): void {
  const surface = toScreen(0, t);
  if (surface + RAY_LENGTH < 0) return;
  ctx.save();
  RAYS.forEach((r, k) => {
    const shimmer = 0.75 + 0.25 * Math.sin(t * (0.4 + 0.13 * k) + k);
    const g = ctx.createLinearGradient(0, surface, 0, surface + RAY_LENGTH);
    g.addColorStop(0, `rgba(255,255,250,${(0.3 * shimmer).toFixed(3)})`);
    g.addColorStop(0.35, `rgba(255,255,250,${(0.12 * shimmer).toFixed(3)})`);
    g.addColorStop(1, 'rgba(255,255,250,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(r.x - r.w * 0.3, surface);
    ctx.lineTo(r.x + r.w * 0.3, surface);
    ctx.lineTo(r.x + r.w + r.lean * RAY_LENGTH * 0.25, surface + RAY_LENGTH);
    ctx.lineTo(r.x - r.w + r.lean * RAY_LENGTH * 0.25, surface + RAY_LENGTH);
    ctx.closePath();
    ctx.fill();
  });
  ctx.restore();
}

/** The sky and the sea's surface: a sun, the waterline in ink with little waves. */
export function drawSurface(ctx: CanvasRenderingContext2D, t: number): void {
  const y = toScreen(0, t);
  if (y < -40 || y > H + 50) return;
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const sun = { x: 1330, y: y - 140 };
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.8;
  ctx.beginPath();
  ctx.arc(sun.x, sun.y, 50, 0, Math.PI * 2);
  ctx.stroke();
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2 + 0.2;
    ctx.beginPath();
    ctx.moveTo(sun.x + Math.cos(a) * 68, sun.y + Math.sin(a) * 68);
    ctx.lineTo(sun.x + Math.cos(a) * (k % 2 ? 86 : 96), sun.y + Math.sin(a) * (k % 2 ? 86 : 96));
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  const roll = t * 0.9;
  for (let x = -10; x <= W + 10; x += 8) {
    const wy = y + 7 * Math.sin(x * 0.018 + roll) + 3 * Math.sin(x * 0.047 - roll * 2);
    if (x === -10) ctx.moveTo(x, wy);
    else ctx.lineTo(x, wy);
  }
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.55;
  for (const [wx, dy] of [[160, 40], [430, 70], [700, 36], [980, 80], [1250, 50], [1480, 66], [1780, 42]] as const) {
    ctx.beginPath();
    for (let k = 0; k <= 6; k++) {
      const px = wx - 30 + k * 10;
      const py = y + dy + Math.sin(k * 1.4 + roll) * 4;
      if (k === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/** Marine snow fixed in the water: ink specks in the light, pale motes in the dark; streaks when the camera rushes. */
interface Mote { readonly x: number; readonly y: number; readonly r: number; readonly phase: number }

export function makeSnow(): readonly Mote[] {
  const rng = createRng(808);
  return Array.from({ length: 2600 }, () => ({ x: rng() * W, y: 40 + rng() * 17800, r: 1 + rng() * 2.2, phase: rng() * Math.PI * 2 }));
}

/** `extra` adds motes falling (marine snow is food from above): 0 none .. 1 a steady fall. */
export function drawSnow(ctx: CanvasRenderingContext2D, snow: readonly Mote[], t: number, extra = 0): void {
  const speed = cameraSpeed(t);
  const streak = Math.max(0, Math.min(260, (Math.abs(speed) - 1500) / 14));
  const fall = extra * 26 * t;
  ctx.save();
  ctx.lineCap = 'round';
  for (const m of snow) {
    const wy = m.y + (m.r < 1.6 ? fall : fall * 0.6);
    const y = toScreen(wy, t);
    if (y < -streak - 10 || y > H + streak + 10) continue;
    const dark = darknessAt(metresAt(wy));
    const x = m.x + 10 * Math.sin(t * 0.25 + m.phase);
    const colour = dark > 0.5 ? PALE : INK;
    ctx.globalAlpha = dark > 0.5 ? 0.22 + 0.3 * dark : 0.2;
    if (streak > 3) {
      ctx.strokeStyle = colour;
      ctx.lineWidth = m.r * 1.3;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y - Math.sign(speed) * streak);
      ctx.stroke();
    } else {
      ctx.fillStyle = colour;
      ctx.beginPath();
      ctx.arc(x, y, m.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** The line no fish should cross, ~8,200 m: a red dash drawn across from the left over `draw` (0 .. 1), with its depth. */
export function drawLine(ctx: CanvasRenderingContext2D, t: number, draw: number, glow = 0): void {
  if (draw <= 0) return;
  const y = toScreen(yAt(LINE_M), t);
  if (y < -40 || y > H + 40) return;
  ctx.save();
  if (glow > 0) {
    const g = ctx.createLinearGradient(0, y - 60, 0, y + 60);
    g.addColorStop(0, 'rgba(200,55,45,0)');
    g.addColorStop(0.5, `rgba(200,55,45,${(0.35 * glow).toFixed(3)})`);
    g.addColorStop(1, 'rgba(200,55,45,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, y - 60, W * draw, 120);
  }
  ctx.strokeStyle = LINE_RED;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.setLineDash([30, 22]);
  ctx.beginPath();
  ctx.moveTo(0, y);
  // A pencil line drawn by hand: the slightest wobble.
  for (let x = 0; x <= W * draw; x += 40) ctx.lineTo(x, y + 2.5 * Math.sin(x * 0.013));
  ctx.stroke();
  ctx.restore();
}

/** A lander's lamp: a cone of pale light from (x, y) towards `dir` radians, `reach` px long, `strength` 0 .. 1. */
export function drawLamp(ctx: CanvasRenderingContext2D, x: number, y: number, dir: number, reach: number, strength: number): void {
  if (strength <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const spread = 0.42;
  const g = ctx.createRadialGradient(x, y, 10, x, y, reach);
  g.addColorStop(0, `rgba(190,215,255,${(0.42 * strength).toFixed(3)})`);
  g.addColorStop(0.55, `rgba(140,175,245,${(0.16 * strength).toFixed(3)})`);
  g.addColorStop(1, 'rgba(120,160,240,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, reach, dir - spread, dir + spread);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
