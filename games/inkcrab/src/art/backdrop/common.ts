import type { Pt } from '../pen';
import { type Draw, makeDraw } from '../kit';

/** World px across one tile of a layer. */
export const BACKDROP_W = 1024;

/** Faint ink for distant things. */
export const FAR = 0.5;

/**
 * Draws a whole layer three times, a tile-width apart, each with the same
 * seed, so anything crossing an edge reappears identically on the other
 * side and the layer wraps without a seam.
 */
export function tiled(d: Draw, seed: number, draw: (d: Draw) => void): void {
  const { ctx } = d.pen;
  for (const dx of [-BACKDROP_W, 0, BACKDROP_W]) {
    ctx.save();
    ctx.translate(dx, 0);
    draw(makeDraw(ctx, seed, d.f, d.g, d.ink));
    ctx.restore();
  }
}

/** A vertical wash that fades from `alpha` at y0 to `alpha1` at y1, across the full tile. */
export function band(d: Draw, y0: number, y1: number, color: string, alpha: number, alpha1 = alpha): void {
  const { ctx } = d.pen;
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, withAlpha(color, alpha));
  g.addColorStop(1, withAlpha(color, alpha1));
  ctx.save();
  ctx.fillStyle = g;
  ctx.fillRect(-BACKDROP_W, y0, BACKDROP_W * 3, y1 - y0);
  ctx.restore();
}

/** Erases the bottom `h` px of a layer, fading in, so nothing shows under the sand. */
export function fadeBottom(d: Draw, height: number, h: number): void {
  const { ctx } = d.pen;
  const fade = ctx.createLinearGradient(0, height - h, 0, height);
  fade.addColorStop(0, 'rgba(0,0,0,0)');
  fade.addColorStop(1, 'rgba(0,0,0,1)');
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = fade;
  ctx.fillRect(-BACKDROP_W, height - h, BACKDROP_W * 3, h);
  ctx.restore();
}

function withAlpha(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/**
 * A closed outline with its straight sides kept straight: each edge is
 * filled in with points so the pen's smoothing can only round the corners
 * a little, as a ruled line drawn freehand would.
 */
export function edges(pts: readonly Pt[], step = 1.2): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]!;
    const b = pts[(i + 1) % pts.length]!;
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / step));
    for (let k = 0; k < n; k++) out.push({ x: a.x + ((b.x - a.x) * k) / n, y: a.y + ((b.y - a.y) * k) / n });
  }
  out.push(pts[0]!);
  return out;
}
