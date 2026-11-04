import type { Pt } from '../../../../src/art/pen';

export type { Pt };

/** The ink every thin line is drawn in. */
export const LINE = '#12141c';

/** A repeatable pseudo-random number in 0 .. 1. */
export function hash(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/** Points nudged a hair differently on each of the line-boil frames, so the ink shimmers like the game's. */
export function boiled(pts: readonly Pt[], boil: number, amp: number, seed = 0): Pt[] {
  return pts.map((p, i) => ({ x: p.x + (hash(i * 3.1 + seed + boil * 17.3) - 0.5) * 2 * amp, y: p.y + (hash(i * 5.7 + seed + boil * 11.9 + 9) - 0.5) * 2 * amp }));
}

/** A smooth closed path through the points (quadratic curves between midpoints). */
export function smoothClosed(ctx: CanvasRenderingContext2D, pts: readonly Pt[]): void {
  const n = pts.length;
  const mid = (a: Pt, b: Pt): Pt => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  ctx.beginPath();
  const start = mid(pts[n - 1]!, pts[0]!);
  ctx.moveTo(start.x, start.y);
  for (let i = 0; i < n; i++) {
    const m = mid(pts[i]!, pts[(i + 1) % n]!);
    ctx.quadraticCurveTo(pts[i]!.x, pts[i]!.y, m.x, m.y);
  }
  ctx.closePath();
}

/** A smooth open path through the points. */
export function smoothOpen(ctx: CanvasRenderingContext2D, pts: readonly Pt[]): void {
  ctx.beginPath();
  ctx.moveTo(pts[0]!.x, pts[0]!.y);
  for (let i = 1; i < pts.length - 1; i++) {
    const m = { x: (pts[i]!.x + pts[i + 1]!.x) / 2, y: (pts[i]!.y + pts[i + 1]!.y) / 2 };
    ctx.quadraticCurveTo(pts[i]!.x, pts[i]!.y, m.x, m.y);
  }
  const last = pts[pts.length - 1]!;
  ctx.lineTo(last.x, last.y);
}

export function lin(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, stops: readonly (readonly [number, string])[]): CanvasGradient {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [at, colour] of stops) g.addColorStop(at, colour);
  return g;
}

/** A soft round wash: an ellipse of colour (`rgb` as "r,g,b") fading to nothing at its edge. */
export function blob(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rot: number, rgb: string, alpha: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(rx, ry);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  g.addColorStop(0, `rgba(${rgb},${alpha})`);
  g.addColorStop(0.55, `rgba(${rgb},${alpha * 0.45})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** A round-capped line through the points. */
export function ink(ctx: CanvasRenderingContext2D, pts: readonly Pt[], width: number, colour = LINE, alpha = 1, closed = false): void {
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.lineWidth = width;
  ctx.strokeStyle = colour;
  ctx.globalAlpha = alpha;
  if (closed) smoothClosed(ctx, pts);
  else smoothOpen(ctx, pts);
  ctx.stroke();
  ctx.restore();
}

/** Points spaced evenly along a straight line. */
export const along = (a: Pt, b: Pt, n: number): Pt[] => Array.from({ length: n }, (_, i) => ({ x: a.x + ((b.x - a.x) * i) / (n - 1), y: a.y + ((b.y - a.y) * i) / (n - 1) }));

export const mixPt = (a: Pt, b: Pt, u: number): Pt => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u });

/** Turns a point about another. */
export function spin(p: Pt, about: Pt, a: number): Pt {
  const [c, s] = [Math.cos(a), Math.sin(a)];
  const [dx, dy] = [p.x - about.x, p.y - about.y];
  return { x: about.x + dx * c - dy * s, y: about.y + dx * s + dy * c };
}
