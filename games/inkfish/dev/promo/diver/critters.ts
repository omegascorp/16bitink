import { INK, Pen, type Pt } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';
import { toScreen, type View } from './story';

/** Bubbles from the diver's regulator, and the shoal of sand lance the humpback is feeding on. */

const BUBBLE_N = 16;
/** Seconds a bubble takes to rise; 21 / 2.1 is a whole number of cycles a loop. */
const BUBBLE_PERIOD = 2.1;

/** A stream of bubbles rising from `from` (world), `amount` 0 .. 1 (how many are blown). */
export function drawBubbles(ctx: CanvasRenderingContext2D, v: View, from: Pt, t: number, amount = 1, rise = 520): void {
  if (amount <= 0.01) return;
  ctx.save();
  for (let i = 0; i < BUBBLE_N; i++) {
    if (i / BUBBLE_N > amount) continue;
    const ph = (t / BUBBLE_PERIOD + i / BUBBLE_N) % 1;
    const sway = 18 * Math.sin(ph * 9 + i * 1.7);
    const world = { x: from.x + sway + ph * 40, y: from.y - ph * rise };
    // Bubbles pop at the surface: none above the waterline.
    if (world.y < 4) continue;
    const p = toScreen(v, world);
    const r = (4 + 11 * ph + (i % 3) * 1.5) * v.zoom;
    ctx.globalAlpha = 0.9 * Math.min(1, ph * 8) * (1 - ph * 0.5);
    ctx.fillStyle = 'rgba(200,236,232,0.22)';
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(232,248,244,0.95)';
    ctx.lineWidth = Math.max(1.5, 2.4 * v.zoom);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.arc(p.x - r * 0.35, p.y - r * 0.35, r * 0.22, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

const FISH_N = 90;
const FISH_PERIOD = 1.05;
const SHOAL = (() => {
  const rng = createRng(31);
  return Array.from({ length: FISH_N }, () => ({ side: (rng() - 0.5) * 2, depth: rng(), ph: rng(), len: 26 + rng() * 10, wob: rng() * 6 }));
})();

function drawFish(pen: Pen, at: Pt, heading: number, len: number, tail: number): void {
  const c = Math.cos(heading);
  const s = Math.sin(heading);
  const p = (x: number, y: number): Pt => ({ x: at.x + x * c - y * s, y: at.y + x * s + y * c });
  const body = [p(len * 0.5, 0), p(len * 0.2, -len * 0.14), p(-len * 0.25, -len * 0.1), p(-len * 0.45, 0), p(-len * 0.25, len * 0.1), p(len * 0.2, len * 0.14)];
  pen.fill(body, '#c4d6d6', 1);
  pen.fill([p(len * 0.5, 0), p(len * 0.2, -len * 0.14), p(-len * 0.25, -len * 0.1), p(-len * 0.45, 0), p(-len * 0.2, -len * 0.02), p(len * 0.2, -len * 0.04)], '#4b6a72', 0.9);
  pen.fill([p(-len * 0.42, 0), p(-len * 0.72, -len * 0.18 + tail), p(-len * 0.66, len * 0.18 + tail)], '#8da6a8', 1);
  pen.closed(body, 1.6, INK);
  pen.dot(p(len * 0.34, -len * 0.03).x, p(len * 0.34, -len * 0.03).y, 1.8, INK, 1);
}

/**
 * The shoal streaming into the mouth at `mouth` (world), coming from the
 * direction `dir` (a unit vector, away from the mouth), `amount` 0 .. 1.
 */
export function drawShoal(ctx: CanvasRenderingContext2D, v: View, mouth: Pt, dir: Pt, t: number, amount: number, boil: number): void {
  if (amount <= 0.01) return;
  const pen = new Pen(ctx, 3100 + boil * 977, 0.4);
  const side = { x: -dir.y, y: dir.x };
  ctx.save();
  ctx.globalAlpha = Math.min(1, amount);
  for (const f of SHOAL) {
    const ph = (t / FISH_PERIOD + f.ph) % 1;
    const dist = 80 + 900 * (1 - ph);
    const spread = (60 + dist * 0.5) * f.side;
    const w = { x: mouth.x + dir.x * dist + side.x * spread, y: mouth.y + dir.y * dist + side.y * spread };
    const s = toScreen(v, w);
    const head = Math.atan2(mouth.y - w.y, mouth.x - w.x);
    drawFish(pen, s, head, f.len * v.zoom, 3 * Math.sin(ph * 40 + f.wob));
  }
  ctx.restore();
}
