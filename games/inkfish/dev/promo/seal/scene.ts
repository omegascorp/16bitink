import { INK, PAPER, Pen, type Pt } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';
import { makePaper } from '../backdrop';
import { VIDEO } from '../short';
import { SURFACE_Y } from './story';

/**
 * The water the whole short swims in: bright blue at the top, deepening
 * towards the bottom (where the credit sits), sunbeams swaying, ambient
 * bubbles drifting up (whole cycles a loop, so the loop point matches), and
 * the underside of the surface for the view from below.
 */

export const RED = '#c8452c';
const penFor = (ctx: CanvasRenderingContext2D, seed: number, boil: number): Pen => new Pen(ctx, seed * 31 + boil * 977, 1.2);

/** Paper under a wash of bright water, dark and deep at the bottom. */
export function makeWater(): HTMLCanvasElement {
  const canvas = makePaper();
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 0, VIDEO.height);
  g.addColorStop(0, 'rgba(120,205,238,0.92)');
  g.addColorStop(0.35, 'rgba(52,150,214,0.9)');
  g.addColorStop(0.75, 'rgba(24,92,164,0.92)');
  g.addColorStop(1, 'rgba(10,40,92,0.96)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  return canvas;
}

/** Sunbeams slanting down, swaying a whole cycle a loop (`loop` 0 .. 1). */
export function drawRays(ctx: CanvasRenderingContext2D, loop: number): void {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 6; k++) {
    const sway = 50 * Math.sin(2 * Math.PI * (loop * (1 + (k % 2)) + k * 0.41));
    const x = 20 + k * 200 + sway;
    const g = ctx.createLinearGradient(0, 0, 0, 1500);
    g.addColorStop(0, 'rgba(255,250,225,0.2)');
    g.addColorStop(1, 'rgba(255,250,225,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - 40, 0);
    ctx.lineTo(x + 50, 0);
    ctx.lineTo(x + 330, 1500);
    ctx.lineTo(x + 90, 1500);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

const BUBBLES = (() => {
  const rng = createRng(4242);
  return Array.from({ length: 26 }, () => ({ x: rng() * VIDEO.width, r: 5 + rng() * 15, phase: rng(), cycles: 1 + Math.floor(rng() * 2), wob: rng() * 6.28 }));
})();

/** Ambient bubbles rising past, each a whole number of rises a loop. */
export function drawAmbient(ctx: CanvasRenderingContext2D, loop: number): void {
  ctx.save();
  for (const b of BUBBLES) {
    const ph = (b.phase + loop * b.cycles) % 1;
    const y = VIDEO.height + 40 - ph * (VIDEO.height + 80);
    const x = b.x + 22 * Math.sin(ph * 14 + b.wob);
    drawBubble(ctx, x, y, b.r, 0.8);
  }
  ctx.restore();
}

/** One bubble: a faint disc, a bright rim and a glint. */
export function drawBubble(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, alpha: number): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(220,244,252,0.2)';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(236,250,255,0.95)';
  ctx.lineWidth = Math.max(1.6, r * 0.14);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.arc(x - r * 0.35, y - r * 0.35, r * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** A burst of bubbles from `from`, `age` seconds after it starts: the seal's burp. */
export function drawBurp(ctx: CanvasRenderingContext2D, from: Pt, age: number): void {
  if (age < 0 || age > 1.6) return;
  const rng = createRng(909);
  for (let i = 0; i < 14; i++) {
    const delay = rng() * 0.3;
    const u = age - delay;
    if (u < 0) continue;
    const r = 10 + rng() * 26;
    const drift = (rng() - 0.3) * 90;
    const rise = 220 + rng() * 260;
    drawBubble(ctx, from.x + drift * u + 14 * Math.sin(u * 9 + i), from.y - rise * u, r * (0.5 + 0.5 * Math.min(1, u * 4)), Math.min(1, 2.4 - 1.5 * u));
  }
}

/** The surface seen from below: warm sky light above a wobbly inked line, ripples catching it. */
export function surfaceLine(x: number, loop: number): number {
  return SURFACE_Y + 7 * Math.sin(x / 70 - 2 * Math.PI * 3 * loop) + 4 * Math.sin(x / 31 + 2 * Math.PI * 2 * loop);
}

export function drawSky(ctx: CanvasRenderingContext2D, loop: number, boil: number): void {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(VIDEO.width, 0);
  for (let x = VIDEO.width; x >= 0; x -= 12) ctx.lineTo(x, surfaceLine(x, loop));
  ctx.closePath();
  const g = ctx.createLinearGradient(0, 0, 0, SURFACE_Y);
  g.addColorStop(0, 'rgba(168,214,236,1)');
  g.addColorStop(1, 'rgba(255,246,218,1)');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
  const pen = penFor(ctx, 3, boil);
  const line: Pt[] = [];
  for (let x = -20; x <= VIDEO.width + 20; x += 24) line.push({ x, y: surfaceLine(x, loop) });
  pen.stroke(line, 3.4, INK, 0.85);
  pen.hair(line.map((p) => ({ x: p.x, y: p.y + 10 })), 1.4, INK, 0.25);
  const rng = createRng(77);
  for (let k = 0; k < 20; k++) {
    const x = rng() * VIDEO.width;
    const w = 20 + rng() * 34;
    const y = surfaceLine(x, loop) - 12 - rng() * 150;
    pen.hair([{ x: x - w / 2, y: y + 3 }, { x, y }, { x: x + w / 2, y: y + 3 }], 1.5, '#6a9bb8', 0.5);
  }
}

/** A thick ruler: end caps and a bar drawn left to right by `u` (0 .. 1). */
export function drawBar(ctx: CanvasRenderingContext2D, x0: number, x1: number, y: number, u: number, boil: number, colour = INK): void {
  if (u <= 0) return;
  const pen = penFor(ctx, 41, boil);
  const end = x0 + (x1 - x0) * u;
  pen.stroke([{ x: x0, y }, { x: end, y }], 9, PAPER);
  pen.stroke([{ x: x0, y }, { x: end, y }], 5.5, colour);
  for (const x of u >= 0.995 ? [x0, x1] : [x0]) pen.stroke([{ x, y: y - 22 }, { x, y: y + 22 }], 6, colour);
}

/** A red "=" with a paper halo. */
export function drawEquals(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, alpha: number): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineCap = 'round';
  for (const dy of [-w * 0.2, w * 0.2]) {
    ctx.strokeStyle = PAPER;
    ctx.lineWidth = 19;
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y + dy);
    ctx.lineTo(x + w / 2, y + dy);
    ctx.stroke();
    ctx.strokeStyle = RED;
    ctx.lineWidth = 10;
    ctx.stroke();
  }
  ctx.restore();
}

/** A tiny sweat drop on a big eye, as it rolls down. */
export function drawSweat(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, alpha: number): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#d6efff';
  ctx.strokeStyle = '#2d6fa8';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, y - size * 1.5);
  ctx.quadraticCurveTo(x + size, y, x, y + size * 0.8);
  ctx.quadraticCurveTo(x - size, y, x, y - size * 1.5);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/** Bubbles bursting at the bite and trailing off the seal: whole rises a loop, so the loop point matches. */
export function drawBiteBubbles(ctx: CanvasRenderingContext2D, from: Pt, loop: number): void {
  const rng = createRng(515);
  for (let i = 0; i < 12; i++) {
    const ph = (i / 12 + loop * 3) % 1;
    const r = 6 + rng() * 14;
    const dx = (rng() - 0.5) * 220;
    drawBubble(ctx, from.x + dx * ph + 14 * Math.sin(ph * 12 + i), from.y - 40 - 330 * ph, r * (0.5 + 0.6 * ph), Math.min(1, 3 * (1 - ph)));
  }
}

/** A few speed lines along a direction, trailing behind the seal's dive. */
export function drawMotionLines(ctx: CanvasRenderingContext2D, from: Pt, dir: Pt, loop: number): void {
  ctx.save();
  ctx.strokeStyle = 'rgba(240,252,255,0.75)';
  ctx.lineCap = 'round';
  ctx.lineWidth = 6;
  const n = { x: -dir.y, y: dir.x };
  for (let i = 0; i < 5; i++) {
    const side = (i - 2) * 60;
    const slide = ((loop * 4 + i * 0.2) % 1) * 140;
    const a = { x: from.x + n.x * side + dir.x * (90 + slide), y: from.y + n.y * side + dir.y * (90 + slide) };
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(a.x + dir.x * 120, a.y + dir.y * 120);
    ctx.stroke();
  }
  ctx.restore();
}

/** A burst of small bubbles flying out of the bite at each thrash (`age` 0 .. 1 through one thrash). */
export function drawBurst(ctx: CanvasRenderingContext2D, from: Pt, age: number): void {
  const rng = createRng(733);
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI / 2 + (rng() - 0.5) * 2.6;
    const speed = 110 + rng() * 120;
    const r = 4 + rng() * 9;
    const u = age;
    const d = speed * Math.sqrt(u);
    drawBubble(ctx, from.x + Math.cos(a) * d, from.y + Math.sin(a) * d - 60 * u * u, r * (0.6 + 0.6 * u), Math.max(0, 1 - u * 1.1));
  }
}
