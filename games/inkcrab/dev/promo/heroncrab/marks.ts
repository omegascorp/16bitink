import type { Pt } from '../../../src/art/pen';
import { seeded, trace } from '../crabbird/art/paint';
import { drawTextLine } from '../captions';
import { inkLine } from './art/ink';

/** The comic marks: the star on the poked eye, the pinch marks, shake lines, splashes and drips. */

const TAU = Math.PI * 2;
const INK = '#22253f';
const HOT = '#e2412f';

function starPts(x: number, y: number, r0: number, r1: number, n: number, seed: number): Pt[] {
  const rnd = seeded(seed);
  return Array.from({ length: n * 2 }, (_, i) => {
    const a = (i / (n * 2)) * TAU + (rnd() - 0.5) * 0.14;
    const r = i % 2 === 0 ? r1 * (0.75 + rnd() * 0.4) : r0 * (0.85 + rnd() * 0.3);
    return { x: x + Math.cos(a) * r, y: y + Math.sin(a) * r };
  });
}

/** A comic hit star, ink-edged, yellow at heart; `u` 0 .. 1 over its life. */
export function drawHitStar(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, u: number, boil: number): void {
  if (u <= 0 || u >= 1) return;
  const grow = 1 - (1 - Math.min(1, u * 5)) ** 3;
  const fade = 1 - Math.max(0, (u - 0.6) / 0.4);
  const s = size * grow;
  ctx.save();
  ctx.globalAlpha *= fade;
  const outer = starPts(x, y, s * 0.42, s, 9, 11 + boil);
  ctx.fillStyle = '#fff6c8';
  trace(ctx, outer);
  ctx.fill();
  const inner = starPts(x, y, s * 0.26, s * 0.62, 9, 21 + boil);
  ctx.fillStyle = '#ffd24a';
  trace(ctx, inner);
  ctx.fill();
  ctx.restore();
  inkLine(ctx, outer, 3, fade, boil, true, INK);
  // Little flying strokes round it.
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * TAU + 0.3;
    const r0 = s * 1.1;
    inkLine(ctx, [{ x: x + Math.cos(a) * r0, y: y + Math.sin(a) * r0 }, { x: x + Math.cos(a) * (r0 + s * 0.35), y: y + Math.sin(a) * (r0 + s * 0.35) }], 4, fade, boil, false, INK);
  }
}

/** A big hand-inked "!". */
export function drawBang(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, alpha: number, tilt: number): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  drawTextLine(ctx, '!', 0, 0, size, 700, alpha, { fill: HOT, halo: '#fffaf0' });
  ctx.restore();
}

/** Short radiating pinch marks where a claw bites, `u` 0 .. 1. */
export function drawPinch(ctx: CanvasRenderingContext2D, at: Pt, size: number, u: number, boil: number): void {
  if (u <= 0 || u >= 1) return;
  const grow = Math.min(1, u * 4);
  const fade = 1 - u;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + 0.2;
    const r0 = size * (0.5 + 0.3 * grow);
    const r1 = size * (0.8 + 0.6 * grow);
    inkLine(ctx, [{ x: at.x + Math.cos(a) * r0, y: at.y + Math.sin(a) * r0 }, { x: at.x + Math.cos(a) * r1, y: at.y + Math.sin(a) * r1 }], 6, fade, boil, false, INK);
    inkLine(ctx, [{ x: at.x + Math.cos(a) * r0, y: at.y + Math.sin(a) * r0 }, { x: at.x + Math.cos(a) * r1, y: at.y + Math.sin(a) * r1 }], 2.4, fade, boil, false, '#ffe27a');
  }
}

/** Curved motion strokes either side of the head while it twists. */
export function drawShakeLines(ctx: CanvasRenderingContext2D, head: Pt, r: number, alpha: number, t: number, boil: number): void {
  if (alpha <= 0) return;
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const rr = r * (1.25 + i * 0.22);
      const a0 = (side > 0 ? -0.9 : Math.PI - 0.5) + 0.12 * Math.sin(t * 20 + i);
      const arc = Array.from({ length: 9 }, (_, k) => {
        const a = a0 + (k / 8) * 0.8 * (side > 0 ? 1 : -1) * -1;
        return { x: head.x + Math.cos(a) * rr, y: head.y + Math.sin(a) * rr };
      });
      inkLine(ctx, arc, 5 - i, alpha * (1 - i * 0.2), boil, false, INK);
    }
  }
}

/** A burst of water drops thrown up where something hits the water, `u` 0 .. 1 over its life. */
export function drawSplash(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, u: number, seed: number): void {
  if (u <= 0 || u >= 1) return;
  const rnd = seeded(seed);
  for (let i = 0; i < 16; i++) {
    const a = -Math.PI / 2 + (rnd() - 0.5) * 2.2;
    const v = size * (3.5 + rnd() * 4);
    const px = x + Math.cos(a) * v * u;
    const py = y + Math.sin(a) * v * u + size * 9 * u * u;
    if (py > y + 10) continue;
    const r = size * (0.06 + rnd() * 0.08) * (1 - u * 0.5);
    ctx.save();
    ctx.globalAlpha = 0.9 * (1 - u);
    ctx.fillStyle = '#f2f7f4';
    ctx.beginPath();
    ctx.ellipse(px, py, r, r * 1.3, a + Math.PI / 2, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(80,110,120,0.5)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();
  }
}

/** Falling drops of water. */
export function drawDrips(ctx: CanvasRenderingContext2D, drops: readonly Pt[]): void {
  ctx.save();
  for (const d of drops) {
    ctx.fillStyle = 'rgba(236,244,242,0.9)';
    ctx.beginPath();
    ctx.ellipse(d.x, d.y, 6, 10, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(70,90,100,0.6)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  ctx.restore();
}

/** Two little alarm strokes over a startled head. */
export function drawAlarm(ctx: CanvasRenderingContext2D, at: Pt, size: number, alpha: number, boil: number): void {
  if (alpha <= 0) return;
  const strokes: readonly (readonly [Pt, Pt])[] = [
    [{ x: -0.7, y: -0.3 }, { x: -1, y: -1 }],
    [{ x: -0.1, y: -0.55 }, { x: -0.05, y: -1.35 }],
    [{ x: 0.5, y: -0.35 }, { x: 0.85, y: -1.05 }],
  ];
  for (const [a, b] of strokes) {
    inkLine(ctx, [{ x: at.x + a.x * size, y: at.y + a.y * size }, { x: at.x + b.x * size, y: at.y + b.y * size }], 6, alpha, boil, false, INK);
  }
}
