import { INK } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';
import { VIDEO } from '../short';
import { LOOP_S } from './story';

/**
 * The reef: sand, a patch reef of coral in the middle (the "small reef"
 * the young fish gather over), and soft corals and sea fans either side,
 * swaying a whole number of times a loop.
 */

export const FLOOR_Y = 1075;
/** The patch reef's middle and size. */
export const PATCH = { x: 540, y: 1000, rx: 250, ry: 95 } as const;
const SAND = '#e9dbb0';

const path = (ctx: CanvasRenderingContext2D, pts: readonly { x: number; y: number }[]): void => {
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
};

/** A lumpy mound of coral: a wobbly dome, filled, inked, with polyp dots or brain grooves. */
function mound(ctx: CanvasRenderingContext2D, cx: number, base: number, rx: number, ry: number, fill: string, seed: number, grooves: boolean): void {
  const rng = createRng(seed);
  const pts = Array.from({ length: 28 }, (_, i) => {
    const a = Math.PI + (i / 27) * Math.PI;
    const r = 1 + 0.07 * (rng() - 0.5) + 0.05 * Math.sin(i * 1.7);
    return { x: cx + Math.cos(a) * rx * r, y: base + Math.sin(a) * ry * r };
  });
  path(ctx, pts);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.save();
  ctx.clip();
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = 2;
  if (grooves) {
    for (let k = 0; k < 7; k++) {
      ctx.beginPath();
      const y0 = base - ry * (0.15 + k * 0.12);
      for (let x = cx - rx; x <= cx + rx; x += 10) ctx.lineTo(x, y0 + 7 * Math.sin(x / 16 + k * 2));
      ctx.stroke();
    }
  } else {
    ctx.fillStyle = INK;
    for (let k = 0; k < rx * ry * 0.004; k++) {
      ctx.beginPath();
      ctx.arc(cx + (rng() - 0.5) * 2 * rx, base - rng() * ry, 2 + rng() * 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** Branching coral: forked inked twigs from a root. */
function branches(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, colour: string, seed: number): void {
  const rng = createRng(seed);
  const twig = (px: number, py: number, angle: number, len: number, depth: number): void => {
    const qx = px + Math.cos(angle) * len;
    const qy = py + Math.sin(angle) * len;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(qx, qy);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4 + depth * 3.5;
    ctx.stroke();
    ctx.strokeStyle = colour;
    ctx.lineWidth = 1 + depth * 3.5;
    ctx.stroke();
    if (depth <= 0) return;
    for (const turn of [-0.45, 0.4]) twig(qx, qy, angle + turn + (rng() - 0.5) * 0.3, len * 0.72, depth - 1);
  };
  ctx.lineCap = 'round';
  twig(x, y, -Math.PI / 2 - 0.35, size, 3);
  twig(x, y, -Math.PI / 2 + 0.3, size * 0.9, 3);
}

/** Sand, the patch reef, and the corals that don't move, made once. */
export function makeReef(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = VIDEO.width;
  canvas.height = VIDEO.height;
  const ctx = canvas.getContext('2d')!;
  const rng = createRng(1985);
  const edge = (x: number): number => FLOOR_Y + 10 * Math.sin(x / 80) + 5 * Math.sin(x / 27 + 1);
  ctx.beginPath();
  ctx.moveTo(0, VIDEO.height);
  for (let x = 0; x <= VIDEO.width; x += 8) ctx.lineTo(x, edge(x));
  ctx.lineTo(VIDEO.width, VIDEO.height);
  ctx.closePath();
  ctx.fillStyle = SAND;
  ctx.globalAlpha = 0.8;
  ctx.fill();
  ctx.globalAlpha = 0.85;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = INK;
  for (let i = 0; i < 380; i++) {
    const x = rng() * VIDEO.width;
    ctx.globalAlpha = 0.2 + 0.3 * rng();
    ctx.beginPath();
    ctx.arc(x, edge(x) + 14 + rng() * (VIDEO.height - FLOOR_Y), 1 + rng() * 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  branches(ctx, 95, FLOOR_Y + 15, 85, '#e5a3b8', 7);
  mound(ctx, 980, FLOOR_Y + 20, 150, 120, '#b9a6d6', 11, false);
  // The patch reef: a big brain coral with smaller heads round it.
  mound(ctx, PATCH.x - 180, FLOOR_Y + 15, 120, 85, '#e6b26a', 21, false);
  mound(ctx, PATCH.x + 175, FLOOR_Y + 15, 115, 95, '#9fc28a', 23, false);
  mound(ctx, PATCH.x, FLOOR_Y + 10, 165, 150, '#d9c07a', 25, true);
  branches(ctx, PATCH.x + 95, FLOOR_Y - 40, 60, '#f0b48a', 29);
  return canvas;
}

interface Frond {
  readonly x: number;
  readonly h: number;
  readonly phase: number;
  readonly colour: string;
}

const FRONDS: readonly Frond[] = [
  { x: 200, h: 230, phase: 0, colour: '#c9564a' },
  { x: 240, h: 170, phase: 1.3, colour: '#d77a5a' },
  { x: 830, h: 210, phase: 2.2, colour: '#8a6bb8' },
  { x: 870, h: 150, phase: 0.7, colour: '#a07fcb' },
];
/** The soft corals sway this many times a loop. */
export const SWAYS = 4;

/** Soft corals: tall, tapering fronds bending in the current. */
export function drawFronds(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.lineCap = 'round';
  for (const f of FRONDS) {
    const sway = 0.28 * Math.sin((2 * Math.PI * SWAYS * t) / LOOP_S + f.phase);
    let x = f.x;
    let y = FLOOR_Y + 20;
    const pts = [{ x, y }];
    for (let k = 1; k <= 10; k++) {
      const a = -Math.PI / 2 + sway * (k / 10) * 1.4;
      x += Math.cos(a) * (f.h / 10);
      y += Math.sin(a) * (f.h / 10);
      pts.push({ x, y });
    }
    for (const [w, colour] of [[16, INK], [10, f.colour]] as const) {
      ctx.strokeStyle = colour;
      ctx.lineWidth = w;
      ctx.beginPath();
      pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.stroke();
    }
    // Little polyps along it.
    ctx.fillStyle = '#fbe9d8';
    for (const p of pts.slice(2)) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}
