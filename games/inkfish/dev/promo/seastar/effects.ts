import { INK, Pen } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';
import { VIDEO } from '../short';
import { type Pt, pt } from './geom';
import { rewindAt } from './story';

/** The short's overlays: the ⏪, strain lines, digesting bubbles, the slurp, the sparkle, the sheet of paper. */

const CHALK = '#e6edf6';
const HALO = '#050914';

/** Tape running back: a ⏪ at the top left, and faint streaks rolling down the picture (screen px). */
export function drawRewind(ctx: CanvasRenderingContext2D, t: number): void {
  const amount = rewindAt(t);
  if (amount <= 0) return;
  ctx.save();
  ctx.fillStyle = CHALK;
  for (let i = 0; i < 3; i++) {
    const y = ((t * 1400 + i * 640) % (VIDEO.height + 200)) - 100;
    ctx.globalAlpha = 0.08 * amount;
    ctx.fillRect(0, y, VIDEO.width, 10 + i * 6);
  }
  const x = 150;
  const y = 380;
  const h = 76;
  ctx.globalAlpha = amount * (0.85 + 0.15 * Math.sin(t * 38));
  ctx.lineJoin = 'round';
  ctx.lineWidth = 12;
  ctx.strokeStyle = HALO;
  ctx.fillStyle = CHALK;
  for (const pass of ['halo', 'fill'] as const) {
    for (const dx of [0, h * 0.62]) {
      ctx.beginPath();
      ctx.moveTo(x + dx, y);
      ctx.lineTo(x + dx + h * 0.66, y - h / 2);
      ctx.lineTo(x + dx + h * 0.66, y + h / 2);
      ctx.closePath();
      if (pass === 'halo') ctx.stroke();
      else ctx.fill();
    }
  }
  ctx.restore();
}

/** Effort ticks flicking out round a point (scene px), `amount` 0 .. 1. */
export function drawStrain(ctx: CanvasRenderingContext2D, at: Pt, amount: number, t: number, boil: number, outward: number): void {
  if (amount <= 0.02) return;
  const pen = new Pen(ctx, 55 + boil * 7, 0.6);
  const flick = 0.7 + 0.3 * Math.sin(t * 40);
  for (let i = 0; i < 4; i++) {
    const a = outward + (i - 1.5) * 0.42;
    const r0 = 70 + 8 * Math.sin(t * 33 + i);
    const r1 = r0 + 34 * flick;
    pen.stroke([pt(at.x + Math.cos(a) * r0, at.y + Math.sin(a) * r0), pt(at.x + Math.cos(a) * r1, at.y + Math.sin(a) * r1)], 5, '#fbe9c8', 0.9 * amount, false);
    pen.stroke([pt(at.x + Math.cos(a) * r0, at.y + Math.sin(a) * r0), pt(at.x + Math.cos(a) * r1, at.y + Math.sin(a) * r1)], 2, INK, 0.7 * amount, false);
  }
}

const BUBBLES = (() => {
  const rng = createRng(77);
  return Array.from({ length: 18 }, () => ({ dx: (rng() - 0.5) * 300, start: rng() * 1.6, speed: 130 + rng() * 120, r: 5 + rng() * 9, wob: rng() * 6 }));
})();

/** Digesting bubbles rising from the shell (scene px), from `t0`; `alpha` fades them. */
export function drawBubbles(ctx: CanvasRenderingContext2D, from: Pt, t: number, t0: number, alpha: number): void {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.lineWidth = 2.4;
  for (const b of BUBBLES) {
    const age = (t - t0 - b.start + 3.2) % 1.6;
    if (age < 0) continue;
    const x = from.x + b.dx + 8 * Math.sin(age * 7 + b.wob);
    const y = from.y - age * b.speed;
    const a = alpha * Math.min(1, age * 4) * (1 - age / 1.6);
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(255,240,210,0.25)';
    ctx.strokeStyle = '#f7ecd6';
    ctx.beginPath();
    ctx.arc(x, y, b.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x - b.r * 0.35, y - b.r * 0.35, b.r * 0.25, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Speed lines rushing up into the mouth as it slurps (scene px), `amount` 0 .. 1. */
export function drawSlurp(ctx: CanvasRenderingContext2D, mouth: Pt, amount: number, boil: number): void {
  if (amount <= 0.02) return;
  const pen = new Pen(ctx, 33 + boil * 5, 0.8);
  for (let i = 0; i < 7; i++) {
    const a = Math.PI / 2 + (i - 3) * 0.28;
    const r0 = 110;
    const r1 = 230 + (i % 2) * 50;
    const p0 = pt(mouth.x + Math.cos(a) * r0, mouth.y + Math.sin(a) * r0);
    const p1 = pt(mouth.x + Math.cos(a) * r1, mouth.y + Math.sin(a) * r1);
    pen.stroke([p1, p0], 6, '#fbe9c8', 0.85 * amount, false);
    pen.stroke([p1, p0], 2.4, INK, 0.7 * amount, false);
  }
}

/** A four-pointed twinkle (scene px). */
export function drawSparkle(ctx: CanvasRenderingContext2D, at: Pt, size: number, alpha: number): void {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#2a2a3a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? size : size * 0.22;
    const p = pt(at.x + Math.cos(a) * r, at.y + Math.sin(a) * r);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/**
 * A sheet of notebook paper slid edge-first into the crack, for scale (scene
 * px): it stands in the gape like a card in a slot, its bottom edge along the
 * crack at `at`; `slide` 0 (up out of it) .. 1 (in). The caller clips away
 * what's behind the front valve.
 */
export function drawPaper(ctx: CanvasRenderingContext2D, at: Pt, slide: number, alpha: number, boil: number): void {
  if (alpha <= 0.01) return;
  const pen = new Pen(ctx, 707 + boil * 3, 0.5);
  const k = 1 - slide;
  const angle = -0.06 + 0.12 * k;
  const W = 200;
  const H = 210;
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  // The bottom edge's middle sits in the crack; the sheet stands up from it.
  const ox = at.x + 95 + 40 * k;
  const oy = at.y + 14 - 340 * k;
  const P = (u: number, v: number): Pt => pt(ox + (u - W / 2) * c + v * s, oy + (u - W / 2) * s - v * c);
  const sheet = [P(0, 0), P(W, 0), P(W, H), P(0, H)];
  ctx.save();
  ctx.globalAlpha = alpha;
  pen.fill(sheet.map((p) => pt(p.x + 8, p.y + 10)), '#000000', 0.3);
  pen.fill(sheet, '#fbf6e8', 1);
  for (let v = 28; v < H; v += 28) pen.hair([P(4, v), P(W - 4, v)], 1.6, '#7da6d6', 0.65);
  pen.hair([P(48, 2), P(48, H - 2)], 1.8, '#d6646a', 0.75);
  pen.stroke([...sheet, sheet[0]!], 2.4, INK, 0.9);
  ctx.restore();
}
