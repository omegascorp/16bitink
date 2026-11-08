import { INK, type Pt } from '../../../../src/art/pen';
import { path, type Stops } from '../../seal/art/paint';

/** One feather and the tail and wings built from them: the pigeon's plumage (./pigeon.ts). */

export interface Plumage {
  /** Back, flank and belly washes. */
  readonly back: string;
  readonly flank: string;
  readonly belly: string;
  /** Breast and head, darker slate. */
  readonly slate: string;
  /** The pale wing coverts and the long grey flight feathers. */
  readonly covert: string;
  readonly flight: string;
}

export const PLUMAGES: readonly Plumage[] = [
  { back: '#b9c5d1', flank: '#a3b1c1', belly: '#8796aa', slate: '#5a6a84', covert: '#c6d0da', flight: '#7f8ea2' },
  { back: '#a2afc0', flank: '#8c9bb0', belly: '#74849c', slate: '#4a5873', covert: '#afbccb', flight: '#6a798f' },
  { back: '#c9d1da', flank: '#b5c0cc', belly: '#98a5b6', slate: '#66758c', covert: '#d6dde4', flight: '#8d9bae' },
];

/** A leaf-shaped feather from `root` to `tip`, `w` wide, with its shaft. */
export function feather(ctx: CanvasRenderingContext2D, root: Pt, tip: Pt, w: number, stops: Stops, px: number): void {
  const [dx, dy] = [tip.x - root.x, tip.y - root.y];
  const len = Math.hypot(dx, dy) || 1;
  const [nx, ny] = [-dy / len, dx / len];
  const at = (u: number, v: number): Pt => ({ x: root.x + dx * u + nx * v, y: root.y + dy * u + ny * v });
  const [a, b, c, d] = [at(0.55, w * 0.5), at(0.92, w * 0.42), at(0.92, -w * 0.42), at(0.55, -w * 0.5)];
  const leaf = (): void => {
    ctx.beginPath();
    ctx.moveTo(root.x, root.y);
    ctx.quadraticCurveTo(at(0.2, w * 0.5).x, at(0.2, w * 0.5).y, a.x, a.y);
    ctx.quadraticCurveTo(b.x, b.y, tip.x, tip.y);
    ctx.quadraticCurveTo(c.x, c.y, d.x, d.y);
    ctx.quadraticCurveTo(at(0.2, -w * 0.5).x, at(0.2, -w * 0.5).y, root.x, root.y);
    ctx.closePath();
  };
  const g = ctx.createLinearGradient(root.x, root.y, tip.x, tip.y);
  for (const [s, colour] of stops) g.addColorStop(s, colour);
  ctx.fillStyle = g;
  leaf();
  ctx.fill();
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.globalAlpha = 0.42;
  ctx.lineWidth = px * 0.9;
  leaf();
  ctx.stroke();
  ctx.globalAlpha = 0.22;
  ctx.strokeStyle = '#f2f5f8';
  ctx.beginPath();
  ctx.moveTo(at(0.08, 0).x, at(0.08, 0).y);
  ctx.lineTo(at(0.94, 0).x, at(0.94, 0).y);
  ctx.stroke();
  ctx.restore();
}

/** The fan of the tail: grey feathers with a dark band near the tip; `fan` 0 narrow .. 1 wide open. */
export function paintTail(ctx: CanvasRenderingContext2D, pl: Plumage, fan: number, lift: number, px: number): void {
  const root = { x: -27, y: 4 };
  const n = 9;
  const stops: Stops = [[0, pl.flank], [0.56, pl.flight], [0.7, pl.flight], [0.76, '#2a303b'], [0.9, '#242a34'], [0.95, '#6b7686'], [1, '#8d98a6']];
  // From the outside in, so the middle feathers lie on top.
  const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => Math.abs(b - (n - 1) / 2) - Math.abs(a - (n - 1) / 2));
  for (const i of order) {
    const v = i / (n - 1) - 0.5;
    const a = Math.PI - 0.1 - lift + v * (0.5 + 0.75 * fan);
    const len = 47 - 4 * Math.abs(v) * 2;
    feather(ctx, root, { x: root.x + Math.cos(a) * len, y: root.y - Math.sin(a) * len }, 13, stops, px);
  }
}

const WRIST = 25;

interface WingLook {
  readonly pl: Plumage;
  /** 0.2 half open .. 1 thrown right open. */
  readonly open: number;
  /** Wing angle, radians from +x, negative up. */
  readonly angle: number;
  /** The wing on the bird's far side, in shade. */
  readonly far: boolean;
  readonly px: number;
}

/** The spread wing feather by feather: primaries, secondaries with the two black bars, rows of coverts. */
export function paintWing(ctx: CanvasRenderingContext2D, root: Pt, w: WingLook): void {
  const { pl, open, angle, far, px } = w;
  const wrist = { x: root.x + Math.cos(angle) * WRIST, y: root.y + Math.sin(angle) * WRIST };
  const primary: Stops = [[0, pl.flank], [0.6, pl.flight], [1, '#39424f']];
  const secondary: Stops = [[0, pl.covert], [0.42, pl.covert], [0.47, '#11141a'], [0.62, '#11141a'], [0.67, pl.flank], [0.8, pl.flight], [0.84, '#11141a'], [0.97, '#11141a'], [1, '#2a303a']];
  ctx.save();
  if (far) ctx.globalAlpha = 0.92;
  // Trailing secondaries first, leading primaries last.
  const secs = 9;
  for (let i = 0; i < secs; i++) {
    const u = i / (secs - 1);
    const from = { x: root.x + (wrist.x - root.x) * (0.1 + 0.9 * u), y: root.y + (wrist.y - root.y) * (0.1 + 0.9 * u) };
    const a = angle - 1.65 * open + (0.62 + 0.08 * u) * open * (1 + u * 0.5) - 0.3;
    const len = 36 + 6 * u;
    feather(ctx, from, { x: from.x + Math.cos(a - 0.8 + u * 0.5) * len, y: from.y + Math.sin(a - 0.8 + u * 0.5) * len }, 12, secondary, px);
  }
  const prims = 10;
  for (let i = 0; i < prims; i++) {
    const u = i / (prims - 1);
    const a = angle - (0.62 - 0.72 * u) * (0.45 + 0.55 * open) * 1.45 - 0.45;
    const len = (46 + 20 * Math.sin(Math.PI * (0.25 + 0.6 * u))) * (0.72 + 0.28 * open);
    feather(ctx, wrist, { x: wrist.x + Math.cos(a) * len, y: wrist.y + Math.sin(a) * len }, 10, primary, px);
  }
  // The coverts: rows of small pale feathers over the arm.
  for (let row = 2; row >= 0; row--) {
    const count = 7 - row;
    for (let i = 0; i < count; i++) {
      const u = (i + 0.3) / count;
      const from = { x: root.x + (wrist.x - root.x) * u, y: root.y + (wrist.y - root.y) * u };
      const a = angle - 1.25 - 0.1 * row + 0.5 * u;
      const len = 11 + row * 6;
      feather(ctx, from, { x: from.x + Math.cos(a) * len, y: from.y + Math.sin(a) * len }, 7 + row, [[0, pl.covert], [1, pl.back]], px);
    }
  }
  ctx.restore();
}

/** The folded wing's closed outline: shoulder, back edge, the long tip, the lower edge. */
export const FOLDED: readonly Pt[] = [
  { x: 19, y: -11 }, { x: 8, y: -18 }, { x: -10, y: -13 }, { x: -30, y: -3 }, { x: -50, y: 9 }, { x: -60, y: 15 }, { x: -44, y: 16 }, { x: -24, y: 16 }, { x: -2, y: 14 }, { x: 14, y: 6 },
];

/** A closed shape filled and left for the caller to ink. */
export function fillShape(ctx: CanvasRenderingContext2D, shape: readonly Pt[], fill: string | CanvasGradient): void {
  ctx.fillStyle = fill;
  path(ctx, shape);
  ctx.fill();
}
