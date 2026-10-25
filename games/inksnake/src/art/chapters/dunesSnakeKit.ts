import { closed, cub, type Draw, normals, pt } from '../kit';
import type { Pt } from '../pen';

/**
 * What the Dunes' two snake heads share (the sidewinder's and the
 * kingsnake's): the poses' warps of a shut head, outlines from their upper
 * halves, clipping, and the neck dissolving into the strip under it.
 */
export type HeadPose = 'shut' | 'open' | 'strike';

export const FRAME = 72;
/** Where the neck starts fading into the strip under it, and where it has gone. */
export const FADE_FROM = -22;
export const FADE_TO = -35;

interface Gape {
  readonly k: number;
  readonly push: number;
  readonly spread: number;
}
export const GAPE: Record<HeadPose, Gape> = {
  shut: { k: 1, push: 0, spread: 0 },
  open: { k: 0.74, push: 0, spread: 1 },
  strike: { k: 0.86, push: 3.2, spread: 0.55 },
};

export const ease = (t: number): number => {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
};

/** Points every ~`step` px along a polyline, so a warp bends it smoothly. */
export function dense(pts: readonly Pt[], step = 0.8): Pt[] {
  const out: Pt[] = [pts[0]!];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / step));
    for (let k = 1; k <= n; k++) out.push(pt(a.x + ((b.x - a.x) * k) / n, a.y + ((b.y - a.y) * k) / n));
  }
  return out;
}

export type Warp = (p: Pt) => Pt;

/** The pose's warp of the shut head: the snout shortened as it tips up to gape, the jaw corners pushed out, the head lunging on a stretched neck. */
export function warpOf(g: Gape, jawAt = -5): Warp {
  return (p) => {
    let x = p.x > 2 ? 2 + (p.x - 2) * g.k : p.x;
    x += g.push * ease((p.x + 30) / 22);
    const jaw = 1 + g.spread * 0.06 * Math.max(0, 1 - Math.abs(p.x - jawAt) / 9);
    return pt(x, p.y * jaw);
  };
}

export const mirror = (pts: readonly Pt[]): Pt[] => pts.map((p) => pt(p.x, -p.y));
/** A closed outline from its upper half traced back to front (the tip on the midline). */
export const bilateral = (upper: readonly Pt[]): Pt[] => [...upper, ...mirror(upper).reverse().slice(1)];

/** An upper outline pushed out by `by` along its normals (the tip straight forward). */
export function outward(upper: readonly Pt[], by: number): Pt[] {
  const n = normals(upper);
  return upper.map((p, i) => (p.y === 0 ? pt(p.x + by, 0) : pt(p.x + n[i]!.x * by, p.y + n[i]!.y * by)));
}

export function clipTo(ctx: CanvasRenderingContext2D, clip: readonly Pt[], paint: () => void): void {
  ctx.save();
  ctx.beginPath();
  clip.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.clip();
  paint();
  ctx.restore();
}

/** The back of the neck dissolved, so the strip under it shows through and the join never does. */
export function fadeNeck(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  const g = ctx.createLinearGradient(FADE_TO, 0, FADE_FROM, 0);
  g.addColorStop(0, 'rgba(0,0,0,1)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-FRAME / 2, -FRAME / 2, FADE_FROM + FRAME / 2, FRAME);
  ctx.restore();
}

/** The head's contour: the lit upper side lighter, the far side heavier, joined round the snout. */
export function contour(d: Draw, upper: readonly Pt[]): void {
  const tipAt = upper.length - 1;
  d.pen.stroke(upper.slice(0, tipAt).concat(mirror(upper.slice(tipAt - 6, tipAt)).reverse()), 1.15, d.ink, 0.95);
  d.pen.stroke(mirror(upper), 1.8, d.ink, 1);
}

/** A small scale's outline (a pointed oval, free edge towards +x) at c, len long and h high, turned by a. */
export function scaleAt(c: Pt, len: number, h: number, a = 0): Pt[] {
  const ca = Math.cos(a);
  const sa = Math.sin(a);
  const loc = cub(pt(-len * 0.45, -h), pt(len * 0.25, -h * 0.9), pt(len * 0.55, -h * 0.3), pt(len * 0.6, 0), 4)
    .concat(cub(pt(len * 0.6, 0), pt(len * 0.55, h * 0.3), pt(len * 0.25, h * 0.9), pt(-len * 0.45, h), 4).slice(1));
  return closed(loc.map((p) => pt(c.x + p.x * ca - p.y * sa, c.y + p.x * sa + p.y * ca)));
}
