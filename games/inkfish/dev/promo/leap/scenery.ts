import { INK, PAPER } from '../../../src/art/pen';
import { ART_RES } from '../../../src/art/propArt';
import { drawShore, SHORE_SIZE } from '../../../src/art/shoreArt';
import { createRng } from '../../../src/logic/rng';
import { makePaper } from '../backdrop';
import { VIDEO } from '../short';
import { LOOP_S, SURFACE_Y, type Bubble, type FeatherPose } from './story';

/**
 * The open sea of the game's wreck chapter, side-on, in pen: a pale sky with
 * the sun in it (the gull flies at it after the miss), a lighthouse on the
 * horizon, the rolling waterline and the water's wash below it, and the
 * splashes, ripples, bubbles and feathers of the leaps. Adapted from the
 * birds short's scenery, at this short's waterline.
 */

/** Where the sun hangs: low on the left, under the captions. */
export const SUN = { x: 140, y: 600, r: 50 } as const;
/** The lighthouse on the horizon, right, scaled down: it's far away. */
const LIGHTHOUSE = { x: 990, scale: 0.85 } as const;

/** The waterline's height at x: a gentle roll, three times round per loop. */
export function waterlineAt(x: number, t: number): number {
  const roll = (2 * Math.PI * t * 3) / LOOP_S;
  return SURFACE_Y + 7 * Math.sin(x * 0.022 + roll) + 3 * Math.sin(x * 0.051 - roll * 2);
}

/** Paper, a warm wash of sky, the sun and the lighthouse: everything that never moves. */
export function makeScene(): HTMLCanvasElement {
  const canvas = makePaper();
  const ctx = canvas.getContext('2d')!;
  const sky = ctx.createLinearGradient(0, 0, 0, SURFACE_Y);
  sky.addColorStop(0, 'rgba(120,170,210,0.10)');
  sky.addColorStop(1, 'rgba(240,200,140,0.16)');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIDEO.width, SURFACE_Y);
  drawSun(ctx);
  drawLighthouse(ctx);
  return canvas;
}

function drawSun(ctx: CanvasRenderingContext2D): void {
  const rng = createRng(5);
  ctx.save();
  ctx.translate(SUN.x, SUN.y);
  ctx.fillStyle = 'rgba(240,190,90,0.45)';
  ctx.beginPath();
  ctx.arc(0, 0, SUN.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineCap = 'round';
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.8;
  ctx.beginPath();
  for (let k = 0; k <= 40; k++) {
    const a = (k / 40) * Math.PI * 2;
    const r = SUN.r + (rng() - 0.5) * 2.5;
    if (k === 0) ctx.moveTo(r * Math.cos(a), r * Math.sin(a));
    else ctx.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  ctx.stroke();
  // Short wavy rays, alternating long and short.
  ctx.lineWidth = 2.4;
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2 + 0.1;
    const r0 = SUN.r + 12;
    const r1 = SUN.r + (k % 2 ? 26 : 40);
    ctx.beginPath();
    ctx.moveTo(r0 * Math.cos(a), r0 * Math.sin(a));
    ctx.quadraticCurveTo(((r0 + r1) / 2) * Math.cos(a + 0.06), ((r0 + r1) / 2) * Math.sin(a + 0.06), r1 * Math.cos(a), r1 * Math.sin(a));
    ctx.stroke();
  }
  ctx.restore();
}

function drawLighthouse(ctx: CanvasRenderingContext2D): void {
  const { w, h } = SHORE_SIZE.lighthouse;
  const k = LIGHTHOUSE.scale;
  const art = document.createElement('canvas');
  art.width = w * ART_RES;
  art.height = h * ART_RES;
  drawShore(art.getContext('2d')!, 'lighthouse', 7);
  ctx.save();
  ctx.globalAlpha = 0.75;
  ctx.drawImage(art, LIGHTHOUSE.x - (w * k) / 2, SURFACE_Y + 4 - h * k, w * k, h * k);
  ctx.restore();
}

/** The sea below the waterline: a blue wash deepening downwards, over whatever is in it. */
export function drawWater(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-10, VIDEO.height);
  for (let x = -10; x <= VIDEO.width + 10; x += 8) ctx.lineTo(x, waterlineAt(x, t));
  ctx.lineTo(VIDEO.width + 10, VIDEO.height);
  ctx.closePath();
  const wash = ctx.createLinearGradient(0, SURFACE_Y, 0, VIDEO.height);
  wash.addColorStop(0, 'rgba(60,110,160,0.18)');
  wash.addColorStop(0.4, 'rgba(40,80,130,0.32)');
  wash.addColorStop(1, 'rgba(22,44,86,0.5)');
  ctx.fillStyle = wash;
  ctx.fill();
  ctx.restore();
}

const WAVELETS = [[330, 46], [560, 120], [800, 40], [960, 150], [140, 130], [700, 250], [240, 300], [900, 330]] as const;

/** The waterline in ink, with a few "~" current marks on the water below it, swaying a whole number of times a loop. */
export function drawWaterline(ctx: CanvasRenderingContext2D, t: number): void {
  const roll = (2 * Math.PI * t * 3) / LOOP_S;
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  for (let x = -10; x <= VIDEO.width + 10; x += 8) {
    if (x === -10) ctx.moveTo(x, waterlineAt(x, t));
    else ctx.lineTo(x, waterlineAt(x, t));
  }
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.4;
  WAVELETS.forEach(([wx, dy], i) => {
    const sway = 14 * Math.sin((2 * Math.PI * t) / LOOP_S * (1 + (i % 2)) + i);
    ctx.beginPath();
    for (let k = 0; k <= 6; k++) {
      const px = wx + sway - 30 + k * 10;
      const py = SURFACE_Y + dy + Math.sin(k * 1.4 + roll) * 4;
      if (k === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  });
  ctx.restore();
}

/** Spray thrown up where the fish breaks the surface: launch angle (from straight up), speed (px/s) and size. */
const DROPS = (() => {
  const rng = createRng(47);
  return Array.from({ length: 18 }, (_, k) => ({ angle: ((k + rng()) / 18 - 0.5) * 1.5, speed: 520 + rng() * 520, r: 4 + rng() * 7 }));
})();
const GRAVITY = 2400;
const SPLASH_S = 1.1;

/** A splash at x, `since` seconds after the fish broke the surface; `size` scales it. */
export function drawSplash(ctx: CanvasRenderingContext2D, x: number, since: number, size: number): void {
  if (since < 0 || since > SPLASH_S) return;
  const fade = 1 - Math.max(0, (since - 0.6) / (SPLASH_S - 0.6));
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.fillStyle = PAPER;
  ctx.lineCap = 'round';
  ctx.globalAlpha = fade;
  // The crown: a sheet of water thrown up either side, rising then collapsing.
  const lift = 150 * size * Math.sin(Math.PI * Math.min(1, since / 0.55));
  ctx.lineWidth = 3;
  for (const side of [-1, 1]) {
    for (const spread of [0.6, 1]) {
      const foot = x + side * 26 * size * spread;
      ctx.beginPath();
      ctx.moveTo(foot, SURFACE_Y + 4);
      ctx.quadraticCurveTo(foot + side * 30 * size * spread, SURFACE_Y - lift * 0.7, foot + side * 70 * size * spread, SURFACE_Y - lift * spread);
      ctx.stroke();
    }
  }
  // Droplets on ballistic arcs, each trailing a short streak while it's fast.
  ctx.lineWidth = 2;
  for (const d of DROPS) {
    const vx = Math.sin(d.angle) * d.speed * size;
    const vy = -Math.cos(d.angle) * d.speed * size;
    const px = x + vx * since;
    const py = SURFACE_Y + vy * since + 0.5 * GRAVITY * since * since;
    if (py > SURFACE_Y + 6) continue;
    const r = d.r * size * (1 - 0.4 * since / SPLASH_S);
    const vyNow = vy + GRAVITY * since;
    const speed = Math.hypot(vx, vyNow);
    if (speed > 300) {
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px - (vx / speed) * r * 3, py - (vyNow / speed) * r * 3);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

/** Rings spreading across the surface from a splash, flattened by perspective. */
export function drawRipples(ctx: CanvasRenderingContext2D, x: number, since: number, size: number): void {
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.2;
  for (const delay of [0, 0.3, 0.6]) {
    const s = since - delay;
    if (s < 0 || s > 2.2) continue;
    const rx = (40 + 260 * (s / 2.2) ** 0.7) * size;
    ctx.globalAlpha = 0.6 * (1 - s / 2.2);
    ctx.beginPath();
    ctx.ellipse(x, SURFACE_Y + 6, rx, rx * 0.09, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

/** Bubbles in pen: a paper-pale circle, inked, with a highlight. */
export function drawBubbles(ctx: CanvasRenderingContext2D, bubbles: readonly Bubble[]): void {
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  for (const b of bubbles) {
    ctx.globalAlpha = b.alpha;
    ctx.fillStyle = 'rgba(255,250,240,0.55)';
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.35, Math.PI * 1.05, Math.PI * 1.6);
    ctx.stroke();
  }
  ctx.restore();
}

/** A small gull feather in pen: a curved quill with a soft grey vane either side. */
export function drawFeather(ctx: CanvasRenderingContext2D, f: FeatherPose): void {
  const len = 80 * f.size;
  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.rotate(f.rotation);
  ctx.globalAlpha = f.alpha;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-len / 2, 0);
  ctx.quadraticCurveTo(-len * 0.1, -len * 0.26, len / 2, -len * 0.04);
  ctx.quadraticCurveTo(-len * 0.05, len * 0.2, -len * 0.35, len * 0.02);
  ctx.closePath();
  ctx.fillStyle = '#d7dce2';
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // The quill, and a couple of nicks in the vane.
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(-len * 0.62, len * 0.03);
  ctx.quadraticCurveTo(-len * 0.05, -len * 0.08, len / 2, -len * 0.04);
  ctx.stroke();
  ctx.lineWidth = 1.1;
  for (const u of [-0.1, 0.18]) {
    ctx.beginPath();
    ctx.moveTo(len * u, -len * 0.05);
    ctx.lineTo(len * (u + 0.06), -len * 0.17);
    ctx.stroke();
  }
  ctx.restore();
}
