import { createRng } from '../../../src/logic/rng';
import { VIDEO } from '../short';
import { LOOP_S } from './beats';
import type { Pt } from './crew';
import type { Drop } from './story';

/**
 * The sea at dusk, side-on, in chalk and wash on dark blue: a stormy sky
 * over a dark sea, the rolling waterline, faint light shafts and drifting
 * specks under it, and the splashes, ripples, spray and bubbles of the
 * leaps. Everything but the sky is drawn in world px (the sea's surface at
 * y 0) under the camera's transform; `px` is one screen px in world px.
 */

export const NIGHT = '#050a1c';
export const CHALK = '#dbe4f5';
export const FOAM = '#eef4ff';
const TAU = Math.PI * 2;
/** The waterline rolls three times a loop. */
const ROLLS = 3;

/** The waterline's height at world x, time t. */
export function waterlineAt(x: number, t: number): number {
  const roll = (TAU * ROLLS * t) / LOOP_S;
  return 8 * Math.sin(x * 0.011 + roll) + 3.5 * Math.sin(x * 0.029 - 2 * roll) + 2 * Math.sin(x * 0.0047 + roll);
}

/** The sky and the deep below, in screen px, given where the surface is on screen (`surface` px down) and the zoom. */
export function drawBackdrop(ctx: CanvasRenderingContext2D, surface: number, zoom: number): void {
  const top = surface - 1700 * zoom;
  const sky = ctx.createLinearGradient(0, top, 0, surface);
  sky.addColorStop(0, '#03071a');
  sky.addColorStop(0.55, '#0b1634');
  sky.addColorStop(0.86, '#18264c');
  sky.addColorStop(0.97, '#2a3158');
  sky.addColorStop(1, '#3a3660');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIDEO.width, Math.max(0, Math.min(VIDEO.height, surface + 2)));
  if (surface < VIDEO.height) {
    const deep = ctx.createLinearGradient(0, surface, 0, surface + 1500 * zoom);
    deep.addColorStop(0, '#11285a');
    deep.addColorStop(0.35, '#0a1a40');
    deep.addColorStop(1, '#030a1e');
    ctx.fillStyle = deep;
    ctx.fillRect(0, Math.max(0, surface), VIDEO.width, VIDEO.height - Math.max(0, surface));
  }
}

/** Storm clouds: long soft banks, a shade darker than the sky with a faint lit rim, far off (they slide past slower than the sea). */
const CLOUDS = (() => {
  const rng = createRng(77);
  return Array.from({ length: 8 }, (_, i) => ({ x: -3000 + i * 560 + rng() * 260, y: -900 - rng() * 900, w: 520 + rng() * 520, h: 34 + rng() * 40 }));
})();

export function drawClouds(ctx: CanvasRenderingContext2D, camX: number, surface: number, zoom: number, t: number): void {
  ctx.save();
  ctx.filter = 'blur(10px)';
  for (const [i, c] of CLOUDS.entries()) {
    const x = (c.x + 40 * Math.sin((TAU * t) / LOOP_S + i) - camX * 0.35) * zoom * 0.7 + VIDEO.width / 2;
    const y = surface + c.y * zoom * 0.6;
    const w = c.w * zoom * 0.7;
    const h = c.h * (0.6 + 0.4 * zoom);
    if (x + w < -60 || x - w > VIDEO.width + 60 || y < -100 || y > surface - 30) continue;
    ctx.fillStyle = 'rgba(4,8,24,0.55)';
    ctx.beginPath();
    ctx.ellipse(x, y, w / 2, h, 0, 0, TAU);
    ctx.ellipse(x - w * 0.18, y - h * 0.55, w * 0.26, h * 0.8, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(120,140,200,0.10)';
    ctx.beginPath();
    ctx.ellipse(x - w * 0.12, y - h * 1.05, w * 0.3, h * 0.28, 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

/** Faint shafts of the last light, slanting down into the sea from the surface. */
const SHAFTS = (() => {
  const rng = createRng(19);
  return Array.from({ length: 14 }, (_, i) => ({ x: -3000 + i * 260 + rng() * 120, w: 40 + rng() * 70, phase: rng() * TAU }));
})();

export function drawShafts(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  for (const s of SHAFTS) {
    const a = 0.05 + 0.03 * Math.sin((TAU * 2 * t) / LOOP_S + s.phase);
    const g = ctx.createLinearGradient(0, 0, 0, 900);
    g.addColorStop(0, `rgba(150,180,240,${a})`);
    g.addColorStop(1, 'rgba(150,180,240,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(s.x, 0);
    ctx.lineTo(s.x + s.w, 0);
    ctx.lineTo(s.x + s.w + 260, 900);
    ctx.lineTo(s.x + 200, 900);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** Specks drifting in the sea: they stream past as the camera chases the mako. */
const SPECKS = (() => {
  const rng = createRng(4242);
  return Array.from({ length: 260 }, () => ({ x: -3300 + rng() * 3800, y: 30 + rng() * 1100, r: 1 + rng() * 2.2, phase: rng() * TAU }));
})();

export function drawSpecks(ctx: CanvasRenderingContext2D, t: number, px: number, streak: Pt): void {
  ctx.save();
  ctx.fillStyle = CHALK;
  ctx.strokeStyle = CHALK;
  ctx.lineCap = 'round';
  for (const s of SPECKS) {
    const x = s.x + 10 * Math.sin((TAU * t) / LOOP_S + s.phase);
    const y = s.y + 8 * Math.cos((TAU * 2 * t) / LOOP_S + s.phase);
    ctx.globalAlpha = 0.18 + 0.12 * Math.sin(s.phase * 3);
    if (Math.hypot(streak.x, streak.y) > 2) {
      // Blurred along the camera's motion when it races.
      ctx.lineWidth = s.r * 1.4 * px;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + streak.x, y + streak.y);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(x, y, s.r * px, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** Whatever is under the surface seen through water: a dark blue wash over it, deepening downwards. */
export function drawWash(ctx: CanvasRenderingContext2D, t: number, left: number, right: number): void {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(left, 2600);
  for (let x = left; x <= right; x += 10) ctx.lineTo(x, waterlineAt(x, t));
  ctx.lineTo(right, 2600);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, 0, 0, 1400);
  g.addColorStop(0, 'rgba(18,44,96,0.3)');
  g.addColorStop(0.3, 'rgba(10,28,70,0.42)');
  g.addColorStop(1, 'rgba(3,10,30,0.7)');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
}

/** The waterline in chalk, with "~" wavelets on the swell. */
const WAVELETS = (() => {
  const rng = createRng(808);
  return Array.from({ length: 34 }, (_, i) => ({ x: -3300 + i * 115 + rng() * 60, dy: 28 + rng() * 120, size: 0.6 + rng() * 0.6 }));
})();

export function drawWaterline(ctx: CanvasRenderingContext2D, t: number, left: number, right: number, px: number): void {
  const roll = (TAU * ROLLS * t) / LOOP_S;
  ctx.save();
  ctx.strokeStyle = CHALK;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = 3.2 * px;
  ctx.beginPath();
  for (let x = left; x <= right; x += 8) {
    if (x === left) ctx.moveTo(x, waterlineAt(x, t));
    else ctx.lineTo(x, waterlineAt(x, t));
  }
  ctx.stroke();
  ctx.lineWidth = 2 * px;
  for (const w of WAVELETS) {
    if (w.x < left - 80 || w.x > right + 80) continue;
    ctx.globalAlpha = 0.4 - 0.2 * (w.dy / 150);
    const len = 70 * w.size;
    ctx.beginPath();
    for (let k = 0; k <= 6; k++) {
      const x = w.x - len / 2 + (k / 6) * len;
      const y = w.dy + Math.sin(k * 1.4 + roll) * 4;
      if (k === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/** Spray thrown up where it breaks the surface: launch angle (from straight up), speed (px/s) and size. */
const SPLASH_DROPS = (() => {
  const rng = createRng(47);
  return Array.from({ length: 26 }, (_, k) => ({ angle: ((k + rng()) / 26 - 0.5) * 1.6, speed: 520 + rng() * 620, r: 4 + rng() * 8 }));
})();
const SPLASH_G = 2400;
const SPLASH_S = 1.2;

/** A splash at world x, `since` s after the mako broke the surface; `size` scales it. */
export function drawSplash(ctx: CanvasRenderingContext2D, x: number, since: number, size: number, px: number): void {
  if (since < 0 || since > SPLASH_S) return;
  const fade = 1 - Math.max(0, (since - 0.6) / (SPLASH_S - 0.6));
  ctx.save();
  ctx.strokeStyle = FOAM;
  ctx.fillStyle = FOAM;
  ctx.lineCap = 'round';
  ctx.globalAlpha = fade;
  // The crown: sheets of water thrown up either side, rising then collapsing.
  const lift = 190 * size * Math.sin(Math.PI * Math.min(1, since / 0.6));
  ctx.lineWidth = 4 * px;
  for (const side of [-1, 1]) {
    for (const spread of [0.45, 0.75, 1]) {
      const foot = x + side * 34 * size * spread;
      ctx.beginPath();
      ctx.moveTo(foot, 4);
      ctx.quadraticCurveTo(foot + side * 36 * size * spread, -lift * 0.7, foot + side * 86 * size * spread, -lift * spread);
      ctx.stroke();
    }
  }
  // A white heap of foam where it went through.
  ctx.globalAlpha = fade * 0.75;
  ctx.beginPath();
  ctx.ellipse(x, 0, 90 * size * (0.6 + 0.4 * Math.min(1, since * 3)), 26 * size * (1 - since / SPLASH_S), 0, Math.PI, TAU);
  ctx.fill();
  ctx.globalAlpha = fade;
  for (const d of SPLASH_DROPS) {
    const vx = Math.sin(d.angle) * d.speed * size;
    const vy = -Math.cos(d.angle) * d.speed * size;
    const dx = x + vx * since;
    const dy = vy * since + 0.5 * SPLASH_G * since * since;
    if (dy > 6) continue;
    drawDrop(ctx, dx, dy, d.r * size * (1 - 0.4 * since / SPLASH_S), vx, vy + SPLASH_G * since, px);
  }
  ctx.restore();
}

/** Water flung off the deck as the mako lands: a burst of drops up and out from `at`. */
const DECK_DROPS = (() => {
  const rng = createRng(91);
  return Array.from({ length: 30 }, (_, k) => ({ angle: ((k + rng()) / 30 - 0.5) * 2.4, speed: 380 + rng() * 520, r: 3 + rng() * 6 }));
})();

export function drawDeckSplash(ctx: CanvasRenderingContext2D, at: Pt, since: number, px: number): void {
  if (since < 0 || since > 1.1) return;
  ctx.save();
  ctx.strokeStyle = FOAM;
  ctx.fillStyle = FOAM;
  ctx.globalAlpha = 1 - Math.max(0, (since - 0.5) / 0.6);
  for (const d of DECK_DROPS) {
    const vx = Math.sin(d.angle) * d.speed;
    const vy = -Math.cos(d.angle) * d.speed;
    const dy = at.y + vy * since + 0.5 * SPLASH_G * since * since;
    if (dy > 0) continue;
    drawDrop(ctx, at.x + vx * since, dy, d.r, vx, vy + SPLASH_G * since, px);
  }
  // Comic impact lines bursting from under it.
  if (since < 0.3) {
    ctx.globalAlpha = 1 - since / 0.3;
    ctx.lineWidth = 5 * px;
    ctx.lineCap = 'round';
    for (let k = 0; k < 9; k++) {
      const a = Math.PI + (k / 8) * Math.PI;
      const r0 = 120 + 260 * since;
      const r1 = r0 + 70 * (k % 2 ? 0.7 : 1);
      ctx.beginPath();
      ctx.moveTo(at.x + Math.cos(a) * r0 * 1.4, at.y + Math.sin(a) * r0 * 0.8);
      ctx.lineTo(at.x + Math.cos(a) * r1 * 1.4, at.y + Math.sin(a) * r1 * 0.8);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** One drop of spray: a pale teardrop, drawn out along its flight while it's fast. */
function drawDrop(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, vx: number, vy: number, px: number): void {
  const speed = Math.hypot(vx, vy);
  const rr = Math.max(1.4 * px, r);
  const stretch = 1 + Math.min(2.2, speed / 700);
  const a = Math.atan2(vy, vx);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  ctx.beginPath();
  // Round at the front, tapering to a point behind.
  ctx.arc(0, 0, rr, -Math.PI / 2, Math.PI / 2);
  ctx.quadraticCurveTo(-rr * stretch * 0.9, rr * 0.5, -rr * stretch * 1.6, 0);
  ctx.quadraticCurveTo(-rr * stretch * 0.9, -rr * 0.5, 0, -rr);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** The spray streaming off the mako as it flies. */
export function drawSpray(ctx: CanvasRenderingContext2D, drops: readonly Drop[], px: number): void {
  ctx.save();
  ctx.strokeStyle = FOAM;
  ctx.fillStyle = FOAM;
  ctx.lineCap = 'round';
  for (const d of drops) {
    ctx.globalAlpha = 0.9 * d.alpha;
    drawDrop(ctx, d.x, d.y, d.r, d.vx, d.vy, px);
  }
  ctx.restore();
}

/** Rings spreading across the surface from a splash, flattened by perspective. */
export function drawRipples(ctx: CanvasRenderingContext2D, x: number, since: number, size: number, px: number): void {
  ctx.save();
  ctx.strokeStyle = CHALK;
  ctx.lineWidth = 2.4 * px;
  for (const delay of [0, 0.3, 0.6]) {
    const s = since - delay;
    if (s < 0 || s > 2.2) continue;
    const rx = (50 + 300 * (s / 2.2) ** 0.7) * size;
    ctx.globalAlpha = 0.55 * (1 - s / 2.2);
    ctx.beginPath();
    ctx.ellipse(x, 6, rx, rx * 0.08, 0, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
}

/** Bubbles rising where it went in. */
const BUBBLES = (() => {
  const rng = createRng(606);
  return Array.from({ length: 22 }, () => ({ dx: (rng() - 0.5) * 220, depth: 60 + rng() * 280, r: 4 + rng() * 10, rise: 160 + rng() * 220, phase: rng() * TAU }));
})();

export function drawBubbles(ctx: CanvasRenderingContext2D, x: number, since: number, px: number): void {
  if (since < 0 || since > 1.8) return;
  ctx.save();
  ctx.strokeStyle = CHALK;
  ctx.lineWidth = 1.8 * px;
  for (const b of BUBBLES) {
    const y = b.depth - b.rise * since;
    if (y < 8) continue;
    ctx.globalAlpha = 0.6 * (1 - since / 1.8) * Math.min(1, since * 6);
    const bx = x + b.dx * (0.4 + since) + 6 * Math.sin(since * 7 + b.phase);
    ctx.beginPath();
    ctx.arc(bx, y, b.r, 0, TAU);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(bx - b.r * 0.3, y - b.r * 0.3, b.r * 0.35, Math.PI * 1.05, Math.PI * 1.6);
    ctx.stroke();
  }
  ctx.restore();
}

/** Speed lines streaming off the mako as it races: `back` is the unit vector behind it, `strength` 0 .. 1. */
const STREAKS = (() => {
  const rng = createRng(2024);
  return Array.from({ length: 13 }, (_, i) => ({ side: (i / 12 - 0.5) * 1.1, len: 0.5 + rng() * 0.9, phase: rng(), start: rng() * 0.25 }));
})();

export function drawSpeedLines(ctx: CanvasRenderingContext2D, from: Pt, back: Pt, bodyLen: number, strength: number, t: number, px: number): void {
  if (strength <= 0.01) return;
  const normal = { x: -back.y, y: back.x };
  ctx.save();
  ctx.strokeStyle = CHALK;
  ctx.lineCap = 'round';
  for (const s of STREAKS) {
    const flicker = (s.phase + t * 3.1) % 1;
    const off = s.side * bodyLen * 0.32;
    const d0 = bodyLen * (0.2 + s.start + 0.25 * flicker);
    const d1 = d0 + bodyLen * s.len * strength;
    ctx.globalAlpha = 0.55 * strength * (1 - flicker * 0.6);
    ctx.lineWidth = (2 + 3 * (1 - Math.abs(s.side))) * px;
    ctx.beginPath();
    ctx.moveTo(from.x + back.x * d0 + normal.x * off, from.y + back.y * d0 + normal.y * off);
    ctx.lineTo(from.x + back.x * d1 + normal.x * off, from.y + back.y * d1 + normal.y * off);
    ctx.stroke();
  }
  ctx.restore();
}
