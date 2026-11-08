import { INK, type Pt } from '../../../../src/art/pen';
import { path } from '../../seal/art/paint';

/**
 * Ink for the pelican short's painted animals: thin lines whose weight is set
 * in screen pixels (so they hold up at every zoom), with a slow wobble that
 * changes with the line-boil frame, as the game's pen lines do.
 */

/** Screen px per local unit under the current transform. */
export function unitPx(ctx: CanvasRenderingContext2D): number {
  const m = ctx.getTransform();
  return 1 / (Math.hypot(m.a, m.b) || 1);
}

/** The points nudged by a smooth wobble of `amp` local units, different on each boil frame. */
export function wobble(pts: readonly Pt[], amp: number, boil: number): Pt[] {
  const s = boil * 2.37 + 0.6;
  return pts.map((p, i) => ({
    x: p.x + amp * (0.6 * Math.sin(i * 0.41 + s * 3.1) + 0.4 * Math.sin(i * 0.17 + s * 5.3)),
    y: p.y + amp * (0.6 * Math.cos(i * 0.37 + s * 2.3) + 0.4 * Math.sin(i * 0.23 + s * 4.1)),
  }));
}

/** An ink line through `pts`, `w` screen px wide. */
export function inkLine(ctx: CanvasRenderingContext2D, pts: readonly Pt[], w: number, alpha: number, boil: number, closed = false, colour = INK): void {
  if (pts.length < 2) return;
  const px = unitPx(ctx);
  const line = wobble(pts, 0.55 * px, boil);
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.globalAlpha = alpha;
  ctx.lineWidth = w * px;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (closed) path(ctx, line);
  else {
    ctx.beginPath();
    line.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  }
  ctx.stroke();
  ctx.restore();
}

/** Fills a shape with a fill style. */
export function fillShape(ctx: CanvasRenderingContext2D, shape: readonly Pt[], fill: string | CanvasGradient, alpha = 1): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = fill;
  path(ctx, shape);
  ctx.fill();
  ctx.restore();
}

/** Runs `paint` clipped to a shape. */
export function within(ctx: CanvasRenderingContext2D, shape: readonly Pt[], paint: () => void): void {
  ctx.save();
  path(ctx, shape);
  ctx.clip();
  paint();
  ctx.restore();
}

/** A small seeded random stream (the same strokes every frame). */
export function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

/** A cubic Bezier as points. */
export function cubic(a: Pt, b: Pt, c: Pt, d: Pt, n = 16): Pt[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const u = i / n;
    const v = 1 - u;
    return {
      x: v * v * v * a.x + 3 * v * v * u * b.x + 3 * v * u * u * c.x + u * u * u * d.x,
      y: v * v * v * a.y + 3 * v * v * u * b.y + 3 * v * u * u * c.y + u * u * u * d.y,
    };
  });
}

/** Both edges of a tapered band along `line`, as one closed shape, `w0` wide at the start and `w1` at the end. */
export function band(line: readonly Pt[], w0: number, w1: number): { readonly shape: Pt[]; readonly left: Pt[]; readonly right: Pt[] } {
  const left: Pt[] = [];
  const right: Pt[] = [];
  line.forEach((p, i) => {
    const a = line[Math.max(0, i - 1)]!;
    const b = line[Math.min(line.length - 1, i + 1)]!;
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const w = (w0 + (w1 - w0) * (i / (line.length - 1))) / 2;
    const n = { x: -(b.y - a.y) / len, y: (b.x - a.x) / len };
    left.push({ x: p.x + n.x * w, y: p.y + n.y * w });
    right.push({ x: p.x - n.x * w, y: p.y - n.y * w });
  });
  return { shape: [...left, ...[...right].reverse()], left, right };
}
