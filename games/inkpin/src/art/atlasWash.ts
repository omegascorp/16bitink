import type { Pen, Pt } from './pen';
import { rgba } from './wash';

/**
 * Watercolour for the Ink Atlas: rough blobs, glazes laid over each other
 * with a darker tide line where the pigment dried at the edge, and contour
 * hatching that follows a hill's shape. All randomness comes from the rng
 * passed in, so a shape painted by two bands of the page comes out the same.
 */

export type Rng = () => number;

/** About -1..1, bunched in the middle. */
export function gauss(rng: Rng): number {
  return (rng() + rng() + rng() - 1.5) / 1.5;
}

/** A rough closed loop around (cx, cy). */
export function blob(rng: Rng, cx: number, cy: number, rx: number, ry: number, n = 12, rough = 0.3): Pt[] {
  const off = rng() * Math.PI * 2;
  return Array.from({ length: n }, (_, i) => {
    const a = off + (i / n) * Math.PI * 2;
    const k = 1 + (rng() - 0.5) * rough;
    return { x: cx + Math.cos(a) * rx * k, y: cy + Math.sin(a) * ry * k };
  });
}

/** Midpoint displacement: every edge of a closed loop gets a new point pushed out or in along its normal. */
export function deform(rng: Rng, pts: readonly Pt[], depth: number, amount: number): Pt[] {
  let cur: readonly Pt[] = pts;
  for (let d = 0; d < depth; d++) {
    const next: Pt[] = [];
    for (let i = 0; i < cur.length; i++) {
      const a = cur[i]!;
      const b = cur[(i + 1) % cur.length]!;
      const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const g = gauss(rng) * amount * len;
      next.push(a, { x: (a.x + b.x) / 2 - ((b.y - a.y) / len) * g, y: (a.y + b.y) / 2 + ((b.x - a.x) / len) * g });
    }
    cur = next;
  }
  return [...cur];
}

/** A closed loop through the midpoints of `pts`, curving round each point: no corners. */
export function smoothTrace(ctx: CanvasRenderingContext2D, pts: readonly Pt[]): void {
  const n = pts.length;
  if (n < 3) return trace(ctx, pts);
  const mid = (a: Pt, b: Pt): Pt => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  ctx.beginPath();
  const start = mid(pts[n - 1]!, pts[0]!);
  ctx.moveTo(start.x, start.y);
  for (let i = 0; i < n; i++) {
    const p = pts[i]!;
    const m = mid(p, pts[(i + 1) % n]!);
    ctx.quadraticCurveTo(p.x, p.y, m.x, m.y);
  }
  ctx.closePath();
}

export function trace(ctx: CanvasRenderingContext2D, pts: readonly Pt[], closed = true): void {
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  if (closed) ctx.closePath();
}

/**
 * A watercolour wash over a shape: `layers` glazes, each a little
 * differently deformed, so the middle is deeper than the ragged edges, and a
 * faint tide line where the pigment pooled.
 */
export function wash(ctx: CanvasRenderingContext2D, rng: Rng, base: readonly Pt[], color: string, alpha: number, layers = 3, tide = 0.3): void {
  const core = deform(rng, base, 2, 0.22);
  ctx.save();
  ctx.fillStyle = color;
  ctx.globalAlpha = (alpha / layers) * 1.4;
  for (let l = 0; l < layers; l++) {
    smoothTrace(ctx, deform(rng, core, 1, 0.2));
    ctx.fill();
  }
  if (tide > 0) {
    ctx.globalAlpha = Math.min(1, alpha * tide * 1.6);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2;
    smoothTrace(ctx, core);
    ctx.stroke();
  }
  ctx.restore();
}

/** A wash with a soft gradient instead of a flat glaze, for glows and haze. */
export function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, alpha: number): void {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(color, alpha));
  g.addColorStop(0.6, rgba(color, alpha * 0.45));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

/**
 * Contour hatching on a hill's shaded side: arcs that echo the hill's
 * outline, stepping in towards its foot on the side turned from the light.
 */
export function contourHatch(pen: Pen, x: number, y: number, w: number, h: number, color: string, alpha: number, rng: Rng): void {
  const rows = Math.max(2, Math.round(h / 7));
  for (let k = 1; k <= rows; k++) {
    const t = k / (rows + 1);
    const arc: Pt[] = [];
    // Only the right (shaded) part of each contour, and shorter as they climb.
    const from = 0.48 + rng() * 0.08;
    const to = 0.95 - t * 0.2;
    for (let u = from; u <= to; u += 0.07) {
      const a = Math.PI * (1 + u);
      arc.push({ x: x + Math.cos(a) * w * (1 - t * 0.55), y: y + Math.sin(a) * h * (1 - t) });
    }
    if (arc.length > 1) pen.hair(arc, 0.8, color, alpha * (0.6 + rng() * 0.4));
  }
}
