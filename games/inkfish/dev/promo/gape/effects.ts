import { createRng } from '../../../src/logic/rng';
import { mouthOf, type Pose } from '../chain';

/**
 * The bite's effects (../effects.ts), copied to draw in pale chalk on the
 * midnight zone's dark water instead of ink on paper: the comic snap, water
 * rushing into the open mouth, and the "!".
 */

/** Pale strokes on dark water, like the deep shorts' chalk. */
export const CHALK = '#e4e9f7';

/** The snap: fat wedges bursting from the shut mouth, comic-style, gone in a blink. `u` runs 0 → 1 over the burst. */
export function drawChomp(ctx: CanvasRenderingContext2D, pose: Pose, u: number): void {
  if (u < 0 || u > 1) return;
  const m = mouthOf(pose);
  const grow = 1 - (1 - u) ** 3;
  const r0 = pose.length * (0.05 + 0.08 * grow);
  const r1 = pose.length * (0.12 + 0.13 * grow);
  ctx.save();
  ctx.fillStyle = CHALK;
  ctx.globalAlpha = u < 0.6 ? 1 : (1 - u) / 0.4;
  for (let k = 0; k < 7; k++) {
    const a = (k / 6 - 0.5) * Math.PI * 1.15;
    const w = pose.length * 0.012 * (1 - u * 0.7) * (k % 2 ? 0.7 : 1);
    const len = k % 2 ? 0.75 : 1;
    const cos = Math.cos(a) * pose.facing;
    const sin = Math.sin(a);
    const at = (r: number, side: number): [number, number] => [m.x + cos * r - sin * side * pose.facing, m.y + sin * r + cos * side];
    ctx.beginPath();
    ctx.moveTo(...at(r0, 0));
    ctx.lineTo(...at(r0 + (r1 - r0) * len * 0.35, w));
    ctx.lineTo(...at(r0 + (r1 - r0) * len, 0));
    ctx.lineTo(...at(r0 + (r1 - r0) * len * 0.35, -w));
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

const STREAKS = (() => {
  const rng = createRng(53);
  return Array.from({ length: 13 }, (_, k) => ({
    angle: ((k + 0.2 + rng() * 0.6) / 13 - 0.5) * 1.7,
    phase: rng(),
    reach: 0.7 + rng() * 0.45,
    speck: k % 3 === 2,
  }));
})();

/** Water streaming into the open mouth at `mouth` (screen px), the fish facing `facing`, `size` its length on screen; `pull` 0..1, `clock` drives the flow. */
export function drawSuction(ctx: CanvasRenderingContext2D, mouth: { readonly x: number; readonly y: number }, facing: 1 | -1, size: number, pull: number, clock: number): void {
  if (pull <= 0) return;
  const far = size * 0.55;
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
    const angle = s.angle * (0.55 + 0.45 * near);
    const dx = facing * Math.cos(angle);
    const dy = Math.sin(angle);
    ctx.globalAlpha = 0.55 * pull * fade;
    const x0 = mouth.x + dx * d;
    const y0 = mouth.y + dy * d;
    if (s.speck) {
      ctx.beginPath();
      ctx.arc(x0, y0, Math.max(1.5, size * 0.006 * (0.4 + near)), 0, Math.PI * 2);
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
      const x = mouth.x + dx * along - dy * side * facing;
      const y = mouth.y + dy * along + Math.cos(angle) * side;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/** A hand-drawn "!" centred at (x, y), `h` tall, tilted by `rotation`, in chalk. */
export function drawExclaim(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, rotation: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.fillStyle = CHALK;
  ctx.beginPath();
  ctx.moveTo(-h * 0.11, -h * 0.5);
  ctx.quadraticCurveTo(0, -h * 0.62, h * 0.11, -h * 0.5);
  ctx.lineTo(h * 0.025, h * 0.18);
  ctx.lineTo(-h * 0.025, h * 0.18);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, h * 0.38, h * 0.075, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
