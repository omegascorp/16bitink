import { INK, type Pt } from '../../../../src/art/pen';
import { createRng } from '../../../../src/logic/rng';
import { curve, dab, path, screenScale, smoothLoop, softLine, taper } from '../../seal/art/paint';

/**
 * A plump spotted seal facing us, tail first into the orca's mouth: the head
 * big and round in front, no ear flaps, huge wet eyes showing their whites in
 * terror, a pale muzzle with a dark nose and long white whiskers, its mouth
 * open in a yell, the fore flippers flung out to grip the orca's lower teeth,
 * the fat body running back into the dark of the throat behind it. Silver-grey with dark spots, painted like the animals
 * in ../../foodchain/art. Own units: the head 300 wide, its middle at 0,0.
 */

export interface SealFrontLook {
  /** Flipper wave phase, radians. */
  readonly beat: number;
  /** How hard it sweats, 0 .. 1 (a drop or two flying off). */
  readonly sweat: number;
}

const FUR_DARK = '#4a4f57';
const FUR = '#8e949a';
const FUR_PALE = '#d6d3ca';

const BODY: readonly Pt[] = smoothLoop([
  { x: 0, y: -272 }, { x: 118, y: -236 }, { x: 196, y: -120 }, { x: 214, y: 30 }, { x: 160, y: 136 }, { x: 0, y: 160 },
  { x: -160, y: 136 }, { x: -214, y: 30 }, { x: -196, y: -120 }, { x: -118, y: -236 },
], 6);
const HEAD: readonly Pt[] = smoothLoop([
  { x: 0, y: -132 }, { x: 96, y: -116 }, { x: 150, y: -40 }, { x: 150, y: 44 }, { x: 96, y: 118 }, { x: 0, y: 140 },
  { x: -96, y: 118 }, { x: -150, y: 44 }, { x: -150, y: -40 }, { x: -96, y: -116 },
], 6);

/** A fixed scatter of spots, irregular dark blotches with a paler ring. */
interface Spot { readonly x: number; readonly y: number; readonly r: number; readonly a: number; readonly k: number }

function scatter(seed: number, count: number, x0: number, x1: number, y0: number, y1: number, r0: number, r1: number): Spot[] {
  const rng = createRng(seed);
  return Array.from({ length: count }, () => ({ x: x0 + rng() * (x1 - x0), y: y0 + rng() * (y1 - y0), r: r0 + rng() * (r1 - r0), a: rng() * 3, k: 0.6 + rng() * 0.3 }));
}

const BODY_SPOTS = scatter(11, 42, -205, 205, -262, 150, 8, 19);
const HEAD_SPOTS = scatter(23, 26, -140, 140, -128, 60, 4, 9);

function spots(ctx: CanvasRenderingContext2D, list: readonly Spot[], colour: string, alpha: number): void {
  ctx.fillStyle = colour;
  ctx.globalAlpha = alpha;
  for (const s of list) {
    ctx.beginPath();
    ctx.ellipse(s.x, s.y, s.r, s.r * s.k, s.a, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function body(ctx: CanvasRenderingContext2D, lw: number): void {
  path(ctx, BODY);
  const g = ctx.createLinearGradient(0, -300, 0, 150);
  g.addColorStop(0, '#2c2d36');
  g.addColorStop(0.4, FUR_DARK);
  g.addColorStop(0.75, FUR);
  g.addColorStop(1, FUR_PALE);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  dab(ctx, -120, -60, 120, '214,220,226', 0.34);
  dab(ctx, 150, 0, 110, '32,34,42', 0.4);
  spots(ctx, BODY_SPOTS, '#272a30', 0.72);
  ctx.restore();
  path(ctx, BODY);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3 * lw;
  ctx.stroke();
}

/** A fore flipper flung out and down, tapering to claws hooked over the teeth. */
function foreFlipper(ctx: CanvasRenderingContext2D, s: 1 | -1, beat: number, lw: number): void {
  ctx.save();
  ctx.translate(s * 176, 62);
  ctx.rotate(s * (-0.62 + 0.08 * Math.sin(beat)));
  const shape = smoothLoop([{ x: -34, y: -24 }, { x: 40, y: -30 }, { x: 56, y: 60 }, { x: 44, y: 130 }, { x: 8, y: 172 }, { x: -30, y: 142 }, { x: -44, y: 60 }], 6);
  path(ctx, shape);
  const g = ctx.createLinearGradient(-44, 0, 56, 30);
  g.addColorStop(0, '#a4a9ae');
  g.addColorStop(0.45, '#6d7379');
  g.addColorStop(1, '#34383f');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  spots(ctx, [{ x: -8, y: 34, r: 10, a: 1, k: 0.7 }, { x: 20, y: 70, r: 8, a: 2, k: 0.8 }, { x: -18, y: 92, r: 7, a: 0, k: 0.7 }], '#272a30', 0.7);
  for (const x of [-14, 4, 22]) softLine(ctx, curve({ x, y: 96 }, { x: x * 0.9 + 2, y: 128 }, { x: x * 0.5 + 4, y: 158 }, 6), 5, '#22252b', 0.4);
  ctx.restore();
  path(ctx, shape);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.8 * lw;
  ctx.stroke();
  for (const x of [-20, -2, 16, 32]) {
    const tip = 164 - Math.abs(x - 6) * 0.6;
    taper(ctx, curve({ x, y: tip - 12 }, { x: x + 1, y: tip + 8 }, { x: x - 3, y: tip + 20 }, 6), 9, 1.6, '#1e1a17', 1);
  }
  ctx.restore();
}

function eye(ctx: CanvasRenderingContext2D, s: 1 | -1, lw: number): void {
  const [x, y, r] = [s * 74, -30, 37];
  ctx.fillStyle = '#f7f2e6';
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * 1.1, s * 0.12, 0, Math.PI * 2);
  ctx.fill();
  // Terror: a small dark iris staring straight at us, white all round it.
  const [ix, iy] = [x - s * 3, y + 3];
  const g = ctx.createRadialGradient(ix - 4, iy - 5, 1, ix, iy, 21);
  g.addColorStop(0, '#3e2c22');
  g.addColorStop(0.55, '#140d0a');
  g.addColorStop(1, '#040303');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(ix, iy, 21, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.98)';
  ctx.beginPath();
  ctx.ellipse(ix - 7, iy - 8, 6.5, 5.5, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3 * lw;
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * 1.1, s * 0.12, 0, Math.PI * 2);
  ctx.stroke();
  // The dark socket round it, then the brow: climbing steeply to the middle, the look of pure dread.
  softLine(ctx, curve({ x: x + s * 44, y: y + 18 }, { x: x + s * 50, y: y - 34 }, { x: x - s * 4, y: y - 48 }, 8), 12, '#23252c', 0.5);
  taper(ctx, curve({ x: s * 122, y: -52 }, { x: s * 84, y: -82 }, { x: s * 22, y: -116 }, 8), 3, 15, '#24262d', 0.95);
}

function muzzle(ctx: CanvasRenderingContext2D, beat: number, lw: number): void {
  // The yell: wide open, the corners dragged down, a dark throat and the tongue low in it.
  const gape = 58 + 5 * Math.sin(beat * 2);
  ctx.beginPath();
  ctx.moveTo(-58, 62);
  ctx.quadraticCurveTo(0, 40, 58, 62);
  ctx.bezierCurveTo(70, 100, 44, 74 + gape * 1.2, 0, 74 + gape * 1.2);
  ctx.bezierCurveTo(-44, 74 + gape * 1.2, -70, 100, -58, 62);
  ctx.closePath();
  ctx.fillStyle = '#1c1016';
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3 * lw;
  ctx.stroke();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = '#cf7788';
  ctx.beginPath();
  ctx.ellipse(0, 76 + gape * 1.16, 34, gape * 0.44, 0, 0, Math.PI * 2);
  ctx.fill();
  for (const s of [-1, 1]) {
    taper(ctx, [{ x: s * 26, y: 74 }, { x: s * 25, y: 84 }, { x: s * 24, y: 96 }], 9, 1, '#f6efdf', 1);
  }
  ctx.restore();
  // The pale whisker pads, side by side over the mouth.
  for (const s of [-1, 1] as const) {
    ctx.beginPath();
    ctx.ellipse(s * 42, 42, 50, 34, s * 0.16, 0, Math.PI * 2);
    const g = ctx.createRadialGradient(s * 34, 30, 6, s * 42, 42, 54);
    g.addColorStop(0, '#f3efe5');
    g.addColorStop(0.7, FUR_PALE);
    g.addColorStop(1, '#a6a9a8');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = 'rgba(27,26,31,0.5)';
    ctx.lineWidth = 1.6 * lw;
    ctx.stroke();
    for (let i = 0; i < 9; i++) {
      ctx.fillStyle = '#3a3a3e';
      ctx.beginPath();
      ctx.arc(s * (22 + (i % 3) * 21 + (i > 5 ? 6 : 0)), 28 + Math.floor(i / 3) * 14, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // The nose: dark and wet, a V of nostrils.
  ctx.beginPath();
  ctx.moveTo(-28, -2);
  ctx.quadraticCurveTo(0, -14, 28, -2);
  ctx.quadraticCurveTo(24, 22, 0, 30);
  ctx.quadraticCurveTo(-24, 22, -28, -2);
  ctx.closePath();
  ctx.fillStyle = '#1b1719';
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.2 * lw;
  ctx.stroke();
  ctx.fillStyle = 'rgba(232,240,248,0.75)';
  ctx.beginPath();
  ctx.ellipse(-7, 0, 10, 3.5, -0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#04040a';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(s * 12, 13, 5, 7.5, s * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** The fur's lie round the head: short pale and dark strokes, so it reads as wet fur, not a flat disc. */
function fur(ctx: CanvasRenderingContext2D): void {
  const rng = createRng(47);
  ctx.lineCap = 'round';
  for (let i = 0; i < 90; i++) {
    const a = rng() * Math.PI * 2;
    const r = 60 + rng() * 80;
    const [x, y] = [Math.cos(a) * r, Math.sin(a) * r * 0.92 - 4];
    const out = Math.atan2(y, x) + (rng() - 0.5) * 0.5;
    ctx.strokeStyle = rng() < 0.5 ? 'rgba(236,240,240,0.26)' : 'rgba(26,28,34,0.26)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(out) * 14, y + Math.sin(out) * 14);
    ctx.stroke();
  }
}

function whiskers(ctx: CanvasRenderingContext2D, beat: number): void {
  for (const s of [-1, 1] as const) {
    for (let i = 0; i < 6; i++) {
      const y = 26 + i * 9;
      const sway = 4 * Math.sin(beat * 2 + i);
      const pts = curve({ x: s * 60, y }, { x: s * (150 + i * 4), y: y - 18 + i * 8 }, { x: s * (236 - i * 9), y: y + 2 + i * 24 + sway }, 10);
      taper(ctx, pts, 4, 0.8, '#fffdf4', 0.95);
    }
  }
}

function head(ctx: CanvasRenderingContext2D, look: SealFrontLook, lw: number): void {
  path(ctx, HEAD);
  const g = ctx.createRadialGradient(-50, -70, 20, 0, 0, 190);
  g.addColorStop(0, '#c4c7c8');
  g.addColorStop(0.55, FUR);
  g.addColorStop(1, '#585c63');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  dab(ctx, 110, 50, 80, '30,32,40', 0.4);
  dab(ctx, -96, 86, 60, '30,32,40', 0.3);
  fur(ctx);
  spots(ctx, HEAD_SPOTS, '#2b2d33', 0.66);
  ctx.restore();
  path(ctx, HEAD);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.2 * lw;
  ctx.stroke();
  eye(ctx, -1, lw);
  eye(ctx, 1, lw);
  muzzle(ctx, look.beat, lw);
  whiskers(ctx, look.beat);
}

function sweat(ctx: CanvasRenderingContext2D, amount: number, beat: number): void {
  if (amount < 0.05) return;
  for (const [x, y, r] of [[-176, -120, 15], [182, -96, 12]] as const) {
    const lift = 9 * Math.sin(beat * 2 + x);
    ctx.fillStyle = `rgba(214,240,252,${(0.9 * amount).toFixed(3)})`;
    ctx.beginPath();
    ctx.moveTo(x, y - r * 1.5 + lift);
    ctx.quadraticCurveTo(x + r, y + lift, x, y + r + lift);
    ctx.quadraticCurveTo(x - r, y + lift, x, y - r * 1.5 + lift);
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.6 / screenScale(ctx);
    ctx.stroke();
  }
}

/** The seal at (x, y) in the current units, `size` times its own size. */
export function drawSealFront(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, rot: number, look: SealFrontLook): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(size, size);
  const lw = 1 / screenScale(ctx);
  ctx.lineJoin = 'round';
  body(ctx, lw);
  head(ctx, look, lw);
  foreFlipper(ctx, -1, look.beat, lw);
  foreFlipper(ctx, 1, look.beat + 1.3, lw);
  sweat(ctx, look.sweat, look.beat);
  ctx.restore();
}
