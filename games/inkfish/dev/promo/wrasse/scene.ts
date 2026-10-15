import { INK, type Pt } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';
import { makeBackdrop } from '../backdrop';
import { clamp01, lerp, smooth, VIDEO } from '../short';
import { LOOP_S, SAND_Y } from './story';

/**
 * The cleaning station: reef water, sand with a few corals, rising bubbles,
 * the hand-drawn mirror propped on the sand, puffs of sand, and the
 * scientists' pipette.
 */

const SAND = '#e6d6aa';
const CORAL = '#e98a7a';
const CORAL_B = '#b98fd0';
const WOOD = '#9a6a3c';
export const RED = '#d8402e';
export const GREEN = '#2f9a4f';
export const MARK_BROWN = '#7a4a22';

/** The mirror's glass and frame. */
export const GLASS = { x0: 652, x1: 916, y0: 784, y1: SAND_Y - 8 } as const;
const FRAME_W = 20;

const sandEdge = (x: number): number => SAND_Y + 8 * Math.sin(x / 80) + 4 * Math.sin(x / 27 + 1);

/** Water, sand and corals: everything that doesn't move, made once. */
export function makeStation(): HTMLCanvasElement {
  const canvas = makeBackdrop({ top: 'rgba(70,160,205,0.08)', bottom: 'rgba(40,120,170,0.3)' });
  const ctx = canvas.getContext('2d')!;
  const rng = createRng(4401);
  drawCoral(ctx, 95, 1, CORAL, 7);
  drawCoral(ctx, 1010, 0.8, CORAL_B, 8);
  drawCoral(ctx, 200, 0.55, CORAL_B, 9);
  ctx.beginPath();
  ctx.moveTo(0, VIDEO.height);
  for (let x = 0; x <= VIDEO.width; x += 8) ctx.lineTo(x, sandEdge(x));
  ctx.lineTo(VIDEO.width, VIDEO.height);
  ctx.closePath();
  ctx.fillStyle = SAND;
  ctx.globalAlpha = 0.8;
  ctx.fill();
  ctx.globalAlpha = 0.85;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let x = 0; x <= VIDEO.width; x += 8) (x === 0 ? ctx.moveTo(x, sandEdge(x)) : ctx.lineTo(x, sandEdge(x)));
  ctx.stroke();
  ctx.fillStyle = INK;
  for (let i = 0; i < 380; i++) {
    const x = rng() * VIDEO.width;
    const y = sandEdge(x) + 14 + rng() * (VIDEO.height - SAND_Y);
    ctx.globalAlpha = 0.25 + 0.35 * rng();
    ctx.beginPath();
    ctx.arc(x, y, 1 + rng() * 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  return canvas;
}

/** A branching coral growing up from the sand at x. */
function drawCoral(ctx: CanvasRenderingContext2D, x: number, size: number, wash: string, seed: number): void {
  const rng = createRng(seed);
  const branch = (from: Pt, angle: number, len: number, width: number, depth: number): void => {
    const to = { x: from.x + Math.cos(angle) * len, y: from.y + Math.sin(angle) * len };
    ctx.strokeStyle = INK;
    ctx.lineWidth = width + 5;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.strokeStyle = wash;
    ctx.lineWidth = width;
    ctx.stroke();
    if (depth <= 0) return;
    for (const turn of [-0.45, 0.4]) branch(to, angle + turn + (rng() - 0.5) * 0.3, len * (0.68 + rng() * 0.15), width * 0.75, depth - 1);
  };
  ctx.save();
  ctx.lineCap = 'round';
  branch({ x, y: sandEdge(x) + 6 }, -Math.PI / 2 + (rng() - 0.5) * 0.2, 120 * size, 22 * size, 3);
  ctx.restore();
}

/** Bubbles rising from the corals, each a whole number of times a loop. */
const BUBBLES = (() => {
  const rng = createRng(77);
  return Array.from({ length: 9 }, (_, i) => ({ x: i % 2 ? 1000 + rng() * 40 : 70 + rng() * 60, r: 5 + rng() * 8, phase: rng(), laps: 2 + (i % 3), wobble: rng() * 6 }));
})();

export function drawBubbles(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.5;
  for (const b of BUBBLES) {
    const u = (b.phase + (t / LOOP_S) * b.laps) % 1;
    const y = lerp(SAND_Y - 150, 250, u);
    const x = b.x + 12 * Math.sin(u * 14 + b.wobble);
    ctx.globalAlpha = 0.55 * Math.min(1, u * 8, (1 - u) * 6);
    ctx.beginPath();
    ctx.arc(x, y, b.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x - b.r * 0.35, y - b.r * 0.35, b.r * 0.25, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- the mirror

/** The strut behind it and the glass's silvery tint: drawn before the reflection. */
export function drawMirrorBack(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineCap = 'round';
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(GLASS.x1 - 30, GLASS.y0 + 40);
  ctx.lineTo(GLASS.x1 + 75, SAND_Y + 6);
  ctx.stroke();
  ctx.strokeStyle = WOOD;
  ctx.lineWidth = 7;
  ctx.stroke();
  const g = ctx.createLinearGradient(GLASS.x0, GLASS.y0, GLASS.x1, GLASS.y1);
  g.addColorStop(0, '#dcebf2');
  g.addColorStop(1, '#b9d3e2');
  ctx.fillStyle = g;
  ctx.fillRect(GLASS.x0, GLASS.y0, GLASS.x1 - GLASS.x0, GLASS.y1 - GLASS.y0);
  ctx.restore();
}

/** Clips to the glass, for the reflection. */
export function clipGlass(ctx: CanvasRenderingContext2D): void {
  ctx.beginPath();
  ctx.rect(GLASS.x0, GLASS.y0, GLASS.x1 - GLASS.x0, GLASS.y1 - GLASS.y0);
  ctx.clip();
}

/** The sheen over the reflection, the glint (`glint` 0 .. 1 sweeping across), and the wooden frame. */
export function drawMirrorFront(ctx: CanvasRenderingContext2D, glint: number): void {
  const w = GLASS.x1 - GLASS.x0;
  const h = GLASS.y1 - GLASS.y0;
  ctx.save();
  ctx.save();
  clipGlass(ctx);
  ctx.fillStyle = 'rgba(235,245,250,0.12)';
  ctx.fillRect(GLASS.x0, GLASS.y0, w, h);
  ctx.strokeStyle = '#ffffff';
  ctx.lineCap = 'round';
  // Two hatched glints, and a bright sweep as "mirror" is said.
  for (const [dx, lw] of [[40, 10], [72, 5]] as const) {
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(GLASS.x0 + dx, GLASS.y0 + 30);
    ctx.lineTo(GLASS.x0 + dx - 26, GLASS.y0 + 110);
    ctx.stroke();
  }
  if (glint > 0) {
    const x = GLASS.x0 - 80 + (w + 160) * smooth(glint);
    ctx.globalAlpha = 0.75 * Math.sin(Math.PI * clamp01(glint));
    ctx.lineWidth = 24;
    ctx.beginPath();
    ctx.moveTo(x + 60, GLASS.y0 - 10);
    ctx.lineTo(x - 60, GLASS.y1 + 10);
    ctx.stroke();
  }
  ctx.restore();
  ctx.lineJoin = 'round';
  ctx.strokeStyle = INK;
  ctx.lineWidth = FRAME_W + 8;
  ctx.strokeRect(GLASS.x0 - FRAME_W / 2, GLASS.y0 - FRAME_W / 2, w + FRAME_W, h + FRAME_W);
  ctx.strokeStyle = WOOD;
  ctx.lineWidth = FRAME_W;
  ctx.strokeRect(GLASS.x0 - FRAME_W / 2, GLASS.y0 - FRAME_W / 2, w + FRAME_W, h + FRAME_W);
  // Wood grain.
  ctx.strokeStyle = INK;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 1.5;
  for (const x of [GLASS.x0 - 12, GLASS.x0 - 5, GLASS.x1 + 6, GLASS.x1 + 13]) {
    ctx.beginPath();
    ctx.moveTo(x, GLASS.y0 + 10);
    ctx.lineTo(x + 2, GLASS.y1 - 10);
    ctx.stroke();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- the sand puffs

/** A puff of sand kicked up at `at`, `u` 0 .. 1 over its life: a cloud swelling and thinning, grains flying. */
export function drawPuff(ctx: CanvasRenderingContext2D, at: Pt, u: number, seed: number): void {
  if (u < 0 || u > 1) return;
  const rng = createRng(500 + seed);
  const grow = 1 - (1 - u) ** 2;
  ctx.save();
  ctx.globalAlpha = 1 - u;
  for (let k = 0; k < 5; k++) {
    const a = Math.PI + (k / 4) * Math.PI + (rng() - 0.5) * 0.3;
    const d = 20 + 50 * grow;
    const r = (14 + 10 * rng()) * (0.6 + 0.8 * grow);
    const x = at.x + Math.cos(a) * d;
    const y = at.y + Math.sin(a) * d * 0.6 - 10 * grow;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = SAND;
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.fillStyle = INK;
  for (let k = 0; k < 9; k++) {
    const a = Math.PI * (1.05 + 0.9 * rng());
    const d = 30 + 90 * grow * (0.6 + 0.6 * rng());
    ctx.beginPath();
    ctx.arc(at.x + Math.cos(a) * d, at.y + Math.sin(a) * d * 0.8, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- the pipette

/** Which way the pipette points, tip first: up and to the right, from the lower left. */
const PIPE_DIR = { x: 0.62, y: -0.78 } as const;
const PIPE_LEN = 300;

/** The scientists' pipette, its tip at `tip` once `reach` is 1, sliding in from far down-left; `squeeze` squashes its bulb. */
export function drawPipette(ctx: CanvasRenderingContext2D, tip: Pt, reach: number, squeeze: number): void {
  if (reach <= 0) return;
  const away = (1 - smooth(reach)) * 700;
  const p = { x: tip.x - PIPE_DIR.x * away, y: tip.y - PIPE_DIR.y * away };
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(Math.atan2(PIPE_DIR.y, PIPE_DIR.x));
  // Drawn along +x from the tip (0) back to the bulb (-PIPE_LEN).
  ctx.lineJoin = 'round';
  ctx.lineWidth = 4;
  ctx.strokeStyle = INK;
  const tube = (): void => {
    ctx.beginPath();
    ctx.moveTo(0, -3);
    ctx.lineTo(-70, -13);
    ctx.lineTo(-PIPE_LEN, -13);
    ctx.lineTo(-PIPE_LEN, 13);
    ctx.lineTo(-70, 13);
    ctx.lineTo(0, 3);
    ctx.closePath();
  };
  tube();
  ctx.fillStyle = 'rgba(240,248,252,0.92)';
  ctx.fill();
  // Brown dye in the tube.
  ctx.save();
  tube();
  ctx.clip();
  ctx.fillStyle = MARK_BROWN;
  ctx.fillRect(-170, -20, 170, 40);
  ctx.restore();
  tube();
  ctx.stroke();
  // The rubber bulb.
  const rx = 52 * (1 - 0.3 * squeeze);
  const ry = 30 * (1 + 0.25 * squeeze);
  ctx.beginPath();
  ctx.ellipse(-PIPE_LEN - rx + 6, 0, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = RED;
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
