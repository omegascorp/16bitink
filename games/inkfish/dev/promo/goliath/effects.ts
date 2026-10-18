import { createRng } from '../../../src/logic/rng';
import { VIDEO } from '../short';
import { CHALK, INK_BG } from './scene';
import type { Bubble, Pt, View } from './story';
import { toScreen } from './story';

/**
 * The gulp's effects in pale chalk on the dark water (after ../gape/effects.ts):
 * the comic snap of the jaws, water rushing into the open mouth (turned to
 * the way the mouth faces), the bubbles, and the ⏪ of a rewind.
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
export function drawBubbles(ctx: CanvasRenderingContext2D, v: View, bubbles: readonly Bubble[]): void {
  ctx.save();
  ctx.strokeStyle = CHALK;
  for (const b of bubbles) {
    const p = toScreen(v, b);
    const r = b.r * v.zoom;
    ctx.globalAlpha = b.alpha;
    ctx.lineWidth = Math.max(1.5, 3 * v.zoom);
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = Math.max(1, 2 * v.zoom);
    ctx.beginPath();
    ctx.arc(p.x, p.y, r * 0.6, -2.4, -1.5);
    ctx.stroke();
  }
  ctx.restore();
}

/** Tape running back: a ⏪ at the top left, and faint streaks rolling down the picture. `amount` 0..1. */
export function drawRewind(ctx: CanvasRenderingContext2D, amount: number, t: number): void {
  if (amount <= 0) return;
  ctx.save();
  // Streaks rolling down, as on a tape being rewound.
  ctx.fillStyle = CHALK;
  for (let i = 0; i < 3; i++) {
    const y = ((t * 1400 + i * 640) % (VIDEO.height + 200)) - 100;
    ctx.globalAlpha = 0.07 * amount;
    ctx.fillRect(0, y, VIDEO.width, 10 + i * 6);
  }
  const x = 150;
  const y = 380;
  const h = 76;
  const flicker = 0.85 + 0.15 * Math.sin(t * 38);
  ctx.globalAlpha = amount * flicker;
  ctx.lineJoin = 'round';
  ctx.lineWidth = 12;
  ctx.strokeStyle = INK_BG;
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
