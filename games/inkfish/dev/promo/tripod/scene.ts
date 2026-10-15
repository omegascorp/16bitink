import { createRng } from '../../../src/logic/rng';
import { VIDEO } from '../short';
import type { Pt } from './body';
import { FLOOR_Y, LOOP_S } from './story';

/** The abyssal floor: dark water in a submersible's light, the mud, marine snow, puffs of silt and the current's streaks. */

export const CHALK = '#d9dfe8';
export const NIGHT = '#060a16';
/** What the narrator is saying, and the numbers. */
export const SPOKEN = '#f5c84a';
/** Copepods are often a translucent orange-red down here. */
export const COPEPOD = '#f0a070';

/** Where the submersible's light falls: round the fish and the mud under it. */
const POOL = { x: 560, y: 760, r: 980 } as const;

/** Near-black water with a pool of light round the fish, and the mud below. */
export function makeBackdrop(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = VIDEO.width;
  canvas.height = VIDEO.height;
  const ctx = canvas.getContext('2d')!;
  const water = ctx.createLinearGradient(0, 0, 0, FLOOR_Y);
  water.addColorStop(0, '#060c1c');
  water.addColorStop(1, '#122036');
  ctx.fillStyle = water;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  const light = ctx.createRadialGradient(POOL.x, POOL.y, 0, POOL.x, POOL.y, POOL.r);
  light.addColorStop(0, 'rgba(120,150,180,0.55)');
  light.addColorStop(0.5, 'rgba(70,95,125,0.3)');
  light.addColorStop(1, 'rgba(40,60,90,0)');
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  drawMud(ctx);
  return canvas;
}

/** The surface of the mud, gently uneven. */
export const mudSurface = (x: number): number => FLOOR_Y + 7 * Math.sin(x * 0.011 + 0.6) + 4 * Math.sin(x * 0.029 + 2);

function drawMud(ctx: CanvasRenderingContext2D): void {
  const rng = createRng(77);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, VIDEO.height);
  for (let x = 0; x <= VIDEO.width; x += 6) ctx.lineTo(x, mudSurface(x));
  ctx.lineTo(VIDEO.width, VIDEO.height);
  ctx.closePath();
  const mud = ctx.createLinearGradient(0, FLOOR_Y - 10, 0, VIDEO.height);
  mud.addColorStop(0, '#5a5348');
  mud.addColorStop(0.25, '#3a352e');
  mud.addColorStop(1, '#14120f');
  ctx.fillStyle = mud;
  ctx.fill();
  ctx.clip();
  // The light falls on the mud round the fish too.
  const lit = ctx.createRadialGradient(POOL.x, FLOOR_Y, 0, POOL.x, FLOOR_Y, 620);
  lit.addColorStop(0, 'rgba(170,170,160,0.35)');
  lit.addColorStop(1, 'rgba(170,170,160,0)');
  ctx.fillStyle = lit;
  ctx.fillRect(0, FLOOR_Y - 20, VIDEO.width, 700);
  // Stipple, sparser as the light fades with depth into the mud.
  for (let i = 0; i < 900; i++) {
    const x = rng() * VIDEO.width;
    const y = FLOOR_Y + rng() ** 1.6 * (VIDEO.height - FLOOR_Y);
    ctx.globalAlpha = 0.25 + 0.35 * rng();
    ctx.fillStyle = rng() < 0.5 ? '#0d0b09' : '#8a8274';
    ctx.beginPath();
    ctx.arc(x, y, 0.8 + rng() * 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
  // Little burrow mounds and tracks, as on abyssal mud.
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = '#1a1713';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  for (const [x, y, w] of [[120, 1150, 44], [930, 1170, 54], [700, 1240, 36], [260, 1300, 50]] as const) {
    ctx.beginPath();
    ctx.ellipse(x, y, w, w * 0.22, 0, Math.PI, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y - w * 0.12, 3, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
  // The surface line, in chalk.
  ctx.save();
  ctx.strokeStyle = CHALK;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let x = 0; x <= VIDEO.width; x += 6) {
    if (x === 0) ctx.moveTo(x, mudSurface(x));
    else ctx.lineTo(x, mudSurface(x));
  }
  ctx.stroke();
  ctx.restore();
}

/** Marine snow, carried right by the current and sinking: one width and one water depth a loop, so it comes round. */
const SNOW = (() => {
  const rng = createRng(4711);
  return Array.from({ length: 140 }, () => ({ x: rng() * VIDEO.width, y: rng() * FLOOR_Y, r: 1 + rng() * 2.4, phase: rng() * Math.PI * 2, a: 0.3 + 0.5 * rng() }));
})();

export function drawSnow(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.fillStyle = '#e8eef8';
  for (const m of SNOW) {
    const x = (m.x + (VIDEO.width * t) / LOOP_S) % VIDEO.width;
    const y = (m.y + (FLOOR_Y * t) / LOOP_S) % FLOOR_Y;
    ctx.globalAlpha = m.a * Math.min(1, (FLOOR_Y - y) / 60);
    ctx.beginPath();
    ctx.arc(x, y + 6 * Math.sin((2 * Math.PI * 3 * t) / LOOP_S + m.phase), m.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** A puff of silt kicked up from the mud, `u` 0 .. 1 over its life. */
export function drawPuff(ctx: CanvasRenderingContext2D, x: number, spread: number, u: number): void {
  if (u <= 0 || u >= 1) return;
  const rng = createRng(Math.round(x));
  ctx.save();
  ctx.fillStyle = '#9a9282';
  const grow = 1 - (1 - u) ** 2;
  for (let i = 0; i < 9; i++) {
    const side = (i / 8 - 0.5) * 2;
    const px = x + side * spread * (0.3 + 0.7 * grow);
    const r = spread * (0.12 + 0.1 * rng()) * (0.6 + grow);
    const py = mudSurface(px) - r * 0.5 - 30 * grow * (1 - Math.abs(side));
    ctx.globalAlpha = 0.4 * (1 - u) * (0.6 + 0.4 * rng());
    ctx.beginPath();
    ctx.ellipse(px, py, r, r * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** The current streaming at the fish's face from the left: chalk arrows flowing in, `show` 0 .. 1. */
export function drawCurrent(ctx: CanvasRenderingContext2D, t: number, show: number, to: number): void {
  if (show <= 0) return;
  const rows = [470, 548, 626];
  ctx.save();
  ctx.strokeStyle = CHALK;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  rows.forEach((y, i) => {
    for (let k = 0; k < 2; k++) {
      const u = (t * 0.9 + i * 0.37 + k * 0.5) % 1;
      const head = -60 + u * (to + 60);
      const len = 150;
      ctx.globalAlpha = show * Math.min(1, u * 4) * Math.min(1, (1 - u) * 4);
      ctx.lineWidth = 5;
      ctx.beginPath();
      for (let s = 0; s <= 10; s++) {
        const x = head - len + (len * s) / 10;
        const yy = y + 7 * Math.sin(s * 0.9 + t * 6 + i);
        if (s === 0) ctx.moveTo(x, yy);
        else ctx.lineTo(x, yy);
      }
      ctx.stroke();
      const hy = y + 7 * Math.sin(10 * 0.9 + t * 6 + i);
      ctx.beginPath();
      ctx.moveTo(head - 20, hy - 14);
      ctx.lineTo(head, hy);
      ctx.lineTo(head - 20, hy + 14);
      ctx.stroke();
    }
  });
  ctx.restore();
}

/**
 * A copepod in ink: a teardrop body in segments, a thin tail with its little
 * fork, long feelers swept back, and the one red eye. `size` is its body
 * length in px; `heading` the way its head points.
 */
export function drawCopepod(ctx: CanvasRenderingContext2D, at: Pt, size: number, heading: number, t: number, outline: string, alpha = 1): void {
  if (alpha <= 0 || size <= 0) return;
  const s = size;
  const line = Math.max(1.2, s * 0.045);
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.rotate(heading);
  ctx.globalAlpha = alpha;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = outline;
  ctx.lineWidth = line;
  // Feelers: long, from the head, swept back, twitching.
  for (const side of [-1, 1]) {
    const twitch = 0.08 * Math.sin(t * 9 + side);
    ctx.beginPath();
    ctx.moveTo(s * 0.42, side * s * 0.08);
    ctx.quadraticCurveTo(s * 0.55, side * s * (0.55 + twitch), s * 0.05, side * s * (0.95 + twitch));
    ctx.stroke();
  }
  // The tail and its fork.
  ctx.beginPath();
  ctx.moveTo(-s * 0.2, 0);
  ctx.lineTo(-s * 0.62, 0);
  ctx.moveTo(-s * 0.62, 0);
  ctx.lineTo(-s * 0.78, -s * 0.08);
  ctx.moveTo(-s * 0.62, 0);
  ctx.lineTo(-s * 0.78, s * 0.08);
  ctx.stroke();
  // The body.
  ctx.beginPath();
  ctx.moveTo(s * 0.48, 0);
  ctx.bezierCurveTo(s * 0.46, -s * 0.2, s * 0.05, -s * 0.22, -s * 0.24, -s * 0.06);
  ctx.lineTo(-s * 0.24, s * 0.06);
  ctx.bezierCurveTo(s * 0.05, s * 0.22, s * 0.46, s * 0.2, s * 0.48, 0);
  ctx.closePath();
  ctx.fillStyle = COPEPOD;
  ctx.fill();
  ctx.stroke();
  if (s > 40) {
    // Segments and little legs, for the close-up.
    ctx.lineWidth = line * 0.6;
    for (const x of [0.22, 0.08, -0.06]) {
      ctx.beginPath();
      ctx.moveTo(s * x, -s * 0.19);
      ctx.quadraticCurveTo(s * (x - 0.04), 0, s * x, s * 0.19);
      ctx.stroke();
    }
    for (const x of [0.25, 0.15, 0.05, -0.05]) {
      ctx.beginPath();
      ctx.moveTo(s * x, s * 0.17);
      ctx.lineTo(s * (x - 0.07), s * (0.3 + 0.03 * Math.sin(t * 12 + x * 20)));
      ctx.stroke();
    }
  }
  ctx.fillStyle = '#d0302a';
  ctx.beginPath();
  ctx.arc(s * 0.36, 0, Math.max(1, s * 0.045), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** The snap of jaws in the dark: chalk strokes bursting forwards from the mouth, `u` 0 .. 1. */
export function drawSnap(ctx: CanvasRenderingContext2D, at: Pt, facing: number, size: number, u: number): void {
  if (u < 0 || u > 1) return;
  const grow = 1 - (1 - u) ** 3;
  ctx.save();
  ctx.strokeStyle = CHALK;
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(3, size * 0.07);
  ctx.globalAlpha = u < 0.5 ? 1 : (1 - u) / 0.5;
  for (let k = 0; k < 5; k++) {
    const a = (k / 4 - 0.5) * Math.PI * 0.9;
    const r0 = size * (0.35 + 0.45 * grow);
    const r1 = size * (0.6 + 0.7 * grow) * (k % 2 ? 0.75 : 1);
    const cx = Math.cos(a) * facing;
    const cy = Math.sin(a);
    ctx.beginPath();
    ctx.moveTo(at.x + cx * r0, at.y + cy * r0);
    ctx.lineTo(at.x + cx * r1, at.y + cy * r1);
    ctx.stroke();
  }
  ctx.restore();
}

/** Chalk speed lines streaming down under a rising body, `show` 0 .. 1. */
export function drawRiseLines(ctx: CanvasRenderingContext2D, under: Pt, width: number, show: number, t: number): void {
  if (show <= 0) return;
  ctx.save();
  ctx.strokeStyle = CHALK;
  ctx.lineCap = 'round';
  ctx.lineWidth = 5;
  for (let i = 0; i < 5; i++) {
    const x = under.x + (i / 4 - 0.5) * width;
    const u = (t * 2.6 + i * 0.37) % 1;
    const y = under.y + 30 + 90 * u;
    ctx.globalAlpha = show * (1 - u);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + 60);
    ctx.stroke();
  }
  ctx.restore();
}
