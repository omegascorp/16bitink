import type { Pt } from './pen';

/**
 * Cheap batched marks for painting ground and foliage: many small dabs or
 * short strokes of one colour laid in a single path, so a chunk can carry
 * thousands of grass blades and leaf touches without the pen's cost.
 */
export const TAU = Math.PI * 2;

/** One small oval dab: centre and radii. */
export interface Dab {
  readonly x: number;
  readonly y: number;
  readonly rx: number;
  readonly ry: number;
}

/** Fills every dab in one path. */
export function dabs(ctx: CanvasRenderingContext2D, list: readonly Dab[], color: string, alpha: number): void {
  if (list.length === 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  for (const d of list) {
    ctx.moveTo(d.x + d.rx, d.y);
    ctx.ellipse(d.x, d.y, d.rx, d.ry, 0, 0, TAU);
  }
  ctx.fill();
  ctx.restore();
}

/** Strokes every segment (a pair of points) in one path, round-capped. */
export function strokes(ctx: CanvasRenderingContext2D, segs: readonly (readonly [Pt, Pt])[], color: string, alpha: number, width: number): void {
  if (segs.length === 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (const [a, b] of segs) {
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
  }
  ctx.stroke();
  ctx.restore();
}

/** Strokes an open polyline, round-joined. */
export function polyline(ctx: CanvasRenderingContext2D, pts: readonly Pt[], color: string, alpha: number, width: number): void {
  if (pts.length < 2) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();
  ctx.restore();
}

/** A soft round pool of colour fading to nothing at radius r. */
export function pool(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, alpha: number, core = 0.1): void {
  const n = parseInt(color.slice(1), 16);
  const rgb = `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
  const g = ctx.createRadialGradient(x, y, r * core, x, y, r);
  g.addColorStop(0, `rgba(${rgb},${alpha})`);
  g.addColorStop(0.55, `rgba(${rgb},${alpha * 0.55})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

/** A soft oval shadow on the ground (squashed pool). */
export function groundShade(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, color: string, alpha: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, ry / rx);
  pool(ctx, 0, 0, rx, color, alpha, 0.35);
  ctx.restore();
}

/**
 * Grass blades scattered over a box: dark blades, then fewer lit ones, a
 * stroke each, leaning a little; `n` dark blades.
 */
export function blades(ctx: CanvasRenderingContext2D, rng: () => number, x: number, y: number, w: number, h: number, n: number, dark: string, lit: string, len = 3.6): void {
  const mk = (count: number, scale: number): [Pt, Pt][] => Array.from({ length: count }, () => {
    const p = { x: x + rng() * w, y: y + rng() * h };
    const l = len * scale * (0.6 + rng() * 0.7);
    const lean = (rng() - 0.5) * l * 0.9;
    return [p, { x: p.x + lean, y: p.y - l }];
  });
  strokes(ctx, mk(n, 1), dark, 0.55, 0.75);
  strokes(ctx, mk(Math.round(n * 0.45), 0.8), lit, 0.5, 0.65);
}
