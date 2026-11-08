import { createRng } from '../../../src/logic/rng';
import { drawTextLine } from '../captions';
import { SPOKEN, INK_BG, CHALK } from './scene';
import type { Pt } from './story';

/**
 * The effects in pale chalk on the dark water (the snap and the suction from
 * ../goliath/effects.ts): the comic snap of the jaws, water rushing into the
 * open mouth, the boing of a bump, a frozen shark's shiver, and the "!"s.
 */

/** The snap: fat wedges bursting from the shut mouth at `at` (screen px), facing `heading` radians, `size` the fish's length on screen; `u` 0 → 1 over the burst. */
export function drawChomp(ctx: CanvasRenderingContext2D, at: Pt, heading: number, size: number, u: number): void {
  if (u < 0 || u > 1) return;
  const grow = 1 - (1 - u) ** 3;
  const r0 = size * (0.05 + 0.08 * grow);
  const r1 = size * (0.12 + 0.13 * grow);
  ctx.save();
  ctx.fillStyle = CHALK;
  ctx.globalAlpha = u < 0.6 ? 1 : (1 - u) / 0.4;
  for (let k = 0; k < 9; k++) {
    const a = heading + (k / 8 - 0.5) * Math.PI * 1.3;
    const w = size * 0.012 * (1 - u * 0.7) * (k % 2 ? 0.7 : 1);
    const len = k % 2 ? 0.75 : 1;
    const d = { x: Math.cos(a), y: Math.sin(a) };
    const pt = (r: number, side: number): [number, number] => [at.x + d.x * r - d.y * side, at.y + d.y * r + d.x * side];
    ctx.beginPath();
    ctx.moveTo(...pt(r0, 0));
    ctx.lineTo(...pt(r0 + (r1 - r0) * len * 0.35, w));
    ctx.lineTo(...pt(r0 + (r1 - r0) * len, 0));
    ctx.lineTo(...pt(r0 + (r1 - r0) * len * 0.35, -w));
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

const STREAKS = (() => {
  const rng = createRng(53);
  return Array.from({ length: 16 }, (_, k) => ({
    angle: ((k + 0.2 + rng() * 0.6) / 16 - 0.5) * 1.9,
    phase: rng(),
    reach: 0.7 + rng() * 0.45,
    speck: k % 3 === 2,
  }));
})();

/** Water streaming into the open mouth at `mouth` (screen px), which faces `heading` radians; `size` the fish's length on screen; `pull` 0..1, `clock` drives the flow. */
export function drawSuction(ctx: CanvasRenderingContext2D, mouth: Pt, heading: number, size: number, pull: number, clock: number): void {
  if (pull <= 0) return;
  const far = size * 0.6;
  ctx.save();
  ctx.strokeStyle = CHALK;
  ctx.fillStyle = CHALK;
  ctx.lineCap = 'round';
  for (const s of STREAKS) {
    const flow = (s.phase + clock * 7) % 1;
    const d = far * s.reach * (1 - flow) ** 1.6;
    const near = d / far;
    const fade = Math.min(1, near * 6) * Math.min(1, (1 - flow) * 5);
    if (fade <= 0.02) continue;
    const angle = heading + s.angle * (0.55 + 0.45 * near);
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    ctx.globalAlpha = 0.6 * pull * fade;
    if (s.speck) {
      ctx.beginPath();
      ctx.arc(mouth.x + dx * d, mouth.y + dy * d, Math.max(1.5, size * 0.006 * (0.4 + near)), 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    const len = size * (0.035 + 0.07 * near) * (1 + flow);
    const wave = size * 0.006 * (0.5 + near);
    ctx.lineWidth = Math.max(1.5, size * 0.004 * (0.5 + near));
    ctx.beginPath();
    for (let i = 0; i <= 6; i++) {
      const along = d + (len * i) / 6;
      const side = Math.sin(i * 1.4 + s.phase * 6) * wave;
      const x = mouth.x + dx * along - dy * side;
      const y = mouth.y + dy * along + dx * side;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/** The gulp's bubbles, world px, as chalk rings with a glint. */

/** Boing: springy arcs bouncing out from `at` (screen px), `size` px, `u` 0 → 1. */
export function drawBoing(ctx: CanvasRenderingContext2D, at: Pt, size: number, u: number): void {
  if (u < 0 || u > 1) return;
  ctx.save();
  ctx.strokeStyle = CHALK;
  ctx.lineCap = 'round';
  ctx.globalAlpha = u < 0.5 ? 1 : (1 - u) / 0.5;
  ctx.lineWidth = Math.max(3, size * 0.035);
  for (let k = 0; k < 3; k++) {
    const r = size * (0.35 + 0.25 * k) * (0.6 + 0.6 * (1 - (1 - u) ** 3));
    const wob = 0.18 * Math.sin(u * 28 + k) * (1 - u);
    ctx.beginPath();
    ctx.arc(at.x, at.y, r, -Math.PI * (0.85 + wob), -Math.PI * (0.15 - wob));
    ctx.stroke();
  }
  ctx.restore();
}

/** A frozen fish's shiver: little zigzags either side of `at`, `size` px, `amount` 0..1, `clock` s. */
export function drawShiver(ctx: CanvasRenderingContext2D, at: Pt, size: number, amount: number, clock: number): void {
  if (amount <= 0.01) return;
  ctx.save();
  ctx.strokeStyle = CHALK;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(2.5, size * 0.012);
  ctx.globalAlpha = amount * (0.75 + 0.25 * Math.sin(clock * 40));
  for (const side of [-1, 1]) {
    for (const dy of [-0.12, 0.05]) {
      const x0 = at.x + side * size * 0.62;
      const y0 = at.y + dy * size;
      ctx.beginPath();
      for (let i = 0; i <= 4; i++) {
        const x = x0 + side * i * size * 0.025;
        const y = y0 + (i % 2 ? -1 : 1) * size * 0.03 + i * size * 0.02;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }
  // A drop of sweat off its head.
  const drop = { x: at.x - size * 0.42, y: at.y - size * 0.2 + size * 0.06 * ((clock * 1.5) % 1) };
  ctx.fillStyle = '#bfe3f2';
  ctx.globalAlpha = amount * 0.9;
  ctx.beginPath();
  ctx.moveTo(drop.x, drop.y - size * 0.06);
  ctx.quadraticCurveTo(drop.x + size * 0.035, drop.y, drop.x, drop.y + size * 0.03);
  ctx.quadraticCurveTo(drop.x - size * 0.035, drop.y, drop.x, drop.y - size * 0.06);
  ctx.fill();
  ctx.restore();
}

/** A "!" popping up at `at` (screen px, its baseline), `size` px, `u` 0..1 (it overshoots as it pops). */
export function drawAlarm(ctx: CanvasRenderingContext2D, at: Pt, size: number, u: number): void {
  if (u <= 0.01) return;
  const pop = Math.min(1.25, u * 1.25);
  drawTextLine(ctx, '!', at.x, at.y, size * pop, 700, Math.min(1, u * 2), { fill: SPOKEN, halo: INK_BG });
}
