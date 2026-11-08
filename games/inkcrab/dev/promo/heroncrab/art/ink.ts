import type { Pt } from '../../../../src/art/pen';
import { trace } from '../../crabbird/art/paint';

/**
 * Brushwork for the heron short's painted animals, in the manner of InkFish's
 * pelican and great white: washes in gradients, soft airbrushed light and
 * shade, and thin ink whose weight is set in screen pixels (so it holds up at
 * every zoom), wobbling a little with the line-boil frame.
 */
export const INK_LINE = '#22253f';

/** Screen px per local unit under the current transform, inverted: one screen px in local units. */
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
export function inkLine(ctx: CanvasRenderingContext2D, pts: readonly Pt[], w: number, alpha: number, boil: number, closed = false, colour = INK_LINE): void {
  if (pts.length < 2 || alpha <= 0) return;
  const px = unitPx(ctx);
  const line = wobble(pts, 0.6 * px, boil);
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.globalAlpha *= alpha;
  ctx.lineWidth = w * px;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  trace(ctx, line, closed);
  ctx.stroke();
  ctx.restore();
}

/** Fills a shape. */
export function fillShape(ctx: CanvasRenderingContext2D, shape: readonly Pt[], fill: string | CanvasGradient, alpha = 1): void {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = fill;
  trace(ctx, shape);
  ctx.fill();
  ctx.restore();
}

/** Runs `paint` clipped to a shape. */
export function within(ctx: CanvasRenderingContext2D, shape: readonly Pt[], paint: () => void): void {
  ctx.save();
  trace(ctx, shape);
  ctx.clip();
  paint();
  ctx.restore();
}

/** A soft round dab of colour (`rgb` as "r,g,b"). */
export function dab(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rgb: string, alpha: number, squash = 1): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, squash);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  g.addColorStop(0, `rgba(${rgb},${alpha})`);
  g.addColorStop(0.55, `rgba(${rgb},${alpha * 0.45})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(-r, -r, 2 * r, 2 * r);
  ctx.restore();
}

/** A soft airbrushed line: stacked strokes, widest and faintest first. */
export function softLine(ctx: CanvasRenderingContext2D, pts: readonly Pt[], width: number, colour: string, alpha: number, layers = 5): void {
  if (pts.length < 2) return;
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  trace(ctx, pts, false);
  for (let i = 0; i < layers; i++) {
    ctx.globalAlpha = (alpha / layers) * 1.4;
    ctx.lineWidth = width * (1 - i / layers);
    ctx.stroke();
  }
  ctx.restore();
}

/** Both edges of a tapered band along `line`, as one closed shape, `w0` wide at the start and `w1` at the end. */
export function band(line: readonly Pt[], w0: number, w1: number): { readonly shape: Pt[]; readonly left: Pt[]; readonly right: Pt[] } {
  const left: Pt[] = [];
  const right: Pt[] = [];
  line.forEach((p, i) => {
    const a = line[Math.max(0, i - 1)]!;
    const b = line[Math.min(line.length - 1, i + 1)]!;
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const w = (w0 + (w1 - w0) * (i / Math.max(1, line.length - 1))) / 2;
    const n = { x: -(b.y - a.y) / len, y: (b.x - a.x) / len };
    left.push({ x: p.x + n.x * w, y: p.y + n.y * w });
    right.push({ x: p.x - n.x * w, y: p.y - n.y * w });
  });
  return { shape: [...left, ...[...right].reverse()], left, right };
}

/** A tapered filled stroke (a streak, a hair). */
export function taper(ctx: CanvasRenderingContext2D, pts: readonly Pt[], w0: number, w1: number, colour: string, alpha: number): void {
  if (pts.length < 2) return;
  fillShape(ctx, band(pts, w0, w1).shape, colour, alpha);
}

/** A quadratic curve as points. */
export function curve(a: Pt, c: Pt, b: Pt, n = 10): Pt[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const u = i / n;
    const v = 1 - u;
    return { x: v * v * a.x + 2 * u * v * c.x + u * u * b.x, y: v * v * a.y + 2 * u * v * c.y + u * u * b.y };
  });
}

/** Rotates a point about another. */
export function turn(p: Pt, about: Pt, a: number): Pt {
  const [c, s] = [Math.cos(a), Math.sin(a)];
  const [dx, dy] = [p.x - about.x, p.y - about.y];
  return { x: about.x + dx * c - dy * s, y: about.y + dx * s + dy * c };
}

/** A teardrop (round end at `at`, the point running off along `angle`), `r` across. */
export function teardrop(at: Pt, r: number, angle: number, len = 2.2): Pt[] {
  const [c, s] = [Math.cos(angle), Math.sin(angle)];
  const local: Pt[] = [];
  for (let i = 0; i <= 16; i++) {
    const a = Math.PI * 0.5 + (i / 16) * Math.PI;
    local.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
  }
  local.push({ x: r * len, y: 0 });
  return local.map((p) => ({ x: at.x + p.x * c - p.y * s, y: at.y + p.x * s + p.y * c }));
}
