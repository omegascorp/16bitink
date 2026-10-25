import { INK, Pen, type Pt } from '../../../src/art/pen';
import { mix, smoothClosed } from './paint';
import type { JellyFace } from './story';

/**
 * A lion's mane jellyfish, the leatherback's favourite meal: an amber bell
 * with a scalloped rim, frilly orange oral arms and a veil of fine
 * tentacles. The one in the throat gets a face (it's comic, never gross).
 * Drawn round the middle of its rim at (x, y), `size` the bell's width.
 */

export interface JellyLook {
  readonly squash: number;
  readonly pulse: number;
  readonly tilt: number;
  /** Tentacles streaming: -1 up (sinking fast) .. 1 down (rising). */
  readonly trail: number;
  readonly face: JellyFace | null;
  readonly alpha: number;
}

const BELL = '#e8a35e';
const BELL_DEEP = '#b8602f';
const RIM = '#f6d29a';
const ARMS = '#d9653a';
const TENTACLE = '#f0b67c';

export function drawJelly(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, look: JellyLook, boil: number, seed = 1): void {
  if (look.alpha <= 0.01 || size < 2) return;
  const pen = new Pen(ctx, 811 * seed + boil * 977, Math.min(1.1, size / 140));
  const half = (size / 2) * look.squash * (1 + 0.06 * look.pulse);
  const h = (size * 0.46) / look.squash * (1 - 0.08 * look.pulse);
  const lw = Math.max(0.8, size / 110);
  ctx.save();
  ctx.globalAlpha = look.alpha;
  ctx.translate(x, y);
  ctx.rotate(look.tilt);
  // Tentacles: a fine veil, streaming against the motion.
  const stream = look.trail;
  for (let i = 0; i < 22; i++) {
    const u = i / 21;
    const x0 = (u - 0.5) * half * 1.8;
    const len = size * (0.9 + 0.5 * Math.sin(i * 2.3) ** 2);
    const pts: Pt[] = [];
    for (let k = 0; k <= 10; k++) {
      const v = k / 10;
      const sway = Math.sin(v * 4 + i * 1.1 + look.pulse * 2) * size * 0.05 * v;
      pts.push({ x: x0 * (1 + 0.25 * v) + sway, y: v * len * (1 - 1.7 * Math.max(0, -stream)) * (stream < 0 ? 1 : 1) + v * v * size * 0.15 * stream });
    }
    pen.hair(pts, lw * 0.7, TENTACLE, 0.55);
  }
  // Oral arms: frilly curtains hanging from under the bell.
  for (let k = -1; k <= 1; k++) {
    const pts: Pt[] = [];
    const len = size * (0.62 + 0.1 * (k === 0 ? 1 : 0)) * (1 - 0.6 * Math.max(0, -stream));
    for (let i = 0; i <= 12; i++) {
      const v = i / 12;
      const wob = Math.sin(v * 9 + k * 2 + look.pulse * 3) * size * 0.05;
      pts.push({ x: k * half * 0.32 + wob - size * 0.07, y: v * len });
    }
    for (let i = 12; i >= 0; i--) {
      const v = i / 12;
      const wob = Math.sin(v * 9 + k * 2 + 1.3 + look.pulse * 3) * size * 0.05;
      pts.push({ x: k * half * 0.32 + wob + size * 0.07, y: v * len });
    }
    const shape = smoothClosed(pts, 2);
    ctx.fillStyle = mix(ARMS, BELL_DEEP, 0.3 + 0.2 * Math.abs(k));
    ctx.beginPath();
    shape.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    ctx.fill();
    pen.stroke(shape, lw * 0.9, '#5a2414', 0.7);
  }
  // The bell: a dome, scalloped along the rim.
  const bell: Pt[] = [];
  for (let i = 0; i <= 24; i++) {
    const a = Math.PI + (i / 24) * Math.PI;
    bell.push({ x: Math.cos(a) * half, y: Math.sin(a) * h });
  }
  for (let i = 0; i <= 32; i++) {
    const u = i / 32;
    const dip = Math.abs(Math.sin(u * Math.PI * 8)) * size * 0.04;
    bell.push({ x: half - u * 2 * half, y: dip });
  }
  const g = ctx.createRadialGradient(-half * 0.25, -h * 0.7, size * 0.05, 0, -h * 0.2, half * 1.1);
  g.addColorStop(0, RIM);
  g.addColorStop(0.5, BELL);
  g.addColorStop(1, BELL_DEEP);
  ctx.fillStyle = g;
  ctx.beginPath();
  bell.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
  // Radial canals and the rim's paler band.
  for (let k = -3; k <= 3; k++) pen.hair([{ x: k * half * 0.12, y: -h * 0.92 }, { x: k * half * 0.28, y: -h * 0.4 }, { x: k * half * 0.3, y: -2 }], lw * 0.6, '#8a3a1c', 0.4);
  pen.hair(bell.slice(25).map((p) => ({ x: p.x, y: p.y - size * 0.05 })), lw * 1.6, RIM, 0.5);
  // A wet highlight on the dome.
  pen.hair([{ x: -half * 0.55, y: -h * 0.55 }, { x: -half * 0.3, y: -h * 0.85 }, { x: 0, y: -h * 0.95 }], lw * 2.2, '#fff6e6', 0.7);
  pen.stroke([...bell, bell[0]!], lw * 1.2, INK, 0.9);
  if (look.face) drawFace(ctx, pen, half, h, size, look.face, lw);
  ctx.restore();
}

/** Two eyes and a little mouth on the bell, by mood. */
function drawFace(ctx: CanvasRenderingContext2D, pen: Pen, half: number, h: number, size: number, face: JellyFace, lw: number): void {
  const ey = -h * 0.42;
  const ex = half * 0.3;
  const r = size * 0.06;
  for (const side of [-1, 1]) {
    const cx = side * ex;
    if (face === 'squish') {
      // Screwed-up eyes: > <
      pen.stroke([{ x: cx - side * r, y: ey - r }, { x: cx + side * r * 0.6, y: ey }, { x: cx - side * r, y: ey + r }], lw * 1.6, INK);
      continue;
    }
    const look = face === 'look' ? -0.5 : face === 'push' ? -0.7 : face === 'worried' ? -0.2 : 0;
    pen.dot(cx, ey, r * 1.05, '#fffaf0', 1);
    pen.dot(cx, ey + r * look * 0.5, r * 0.62, INK, 1);
    pen.dot(cx - r * 0.2, ey + r * look * 0.5 - r * 0.25, r * 0.2, '#fffaf0', 1);
    if (face === 'worried' || face === 'droop') {
      // Brows tipped up in the middle.
      pen.stroke([{ x: cx + side * r * 1.2, y: ey - r * 1.5 }, { x: cx - side * r * 0.9, y: ey - r * 2.1 }], lw * 1.3, INK);
    }
    if (face === 'droop') {
      // Half-closed lids.
      ctx.save();
      ctx.fillStyle = BELL;
      ctx.beginPath();
      ctx.ellipse(cx, ey - r * 0.5, r * 1.15, r * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      pen.stroke([{ x: cx - r * 1.1, y: ey - r * 0.1 }, { x: cx + r * 1.1, y: ey - r * 0.1 }], lw * 1.2, INK);
    }
    if (face === 'push') {
      // Effort: a little crease.
      pen.stroke([{ x: cx + side * r * 1.3, y: ey - r * 1.4 }, { x: cx - side * r * 0.6, y: ey - r * 1.1 }], lw * 1.3, INK);
    }
  }
  const my = -h * 0.18;
  if (face === 'push' || face === 'squish') pen.stroke([{ x: -r * 0.9, y: my }, { x: r * 0.9, y: my }], lw * 1.4, INK);
  else if (face === 'worried' || face === 'droop') pen.stroke([{ x: -r * 0.9, y: my + r * 0.3 }, { x: 0, y: my - r * 0.25 }, { x: r * 0.9, y: my + r * 0.3 }], lw * 1.3, INK);
  else pen.stroke([{ x: -r * 0.7, y: my - r * 0.1 }, { x: 0, y: my + r * 0.35 }, { x: r * 0.7, y: my - r * 0.1 }], lw * 1.3, INK);
  // Rosy cheeks.
  for (const side of [-1, 1]) pen.dot(side * ex * 1.55, ey + r * 1.6, r * 0.6, '#f07a6a', 0.35);
}
