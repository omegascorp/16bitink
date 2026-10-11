import { closed, type Draw, oval, pt } from '../kit';
import type { Pt } from '../pen';

/** Shared by the shell drawings (shellArt.ts and its per-beach files). */
export const DARK = '#2a2228';

/** The dark hole the crab lives in, with a lip. */
export function mouth(d: Draw, shape: readonly Pt[], lip = 1.3): void {
  d.pen.fill(shape, DARK, 0.82);
  d.pen.stroke(closed(shape), lip, d.ink, 1, false);
}

/** An ellipse turned by `a` radians about its centre. */
export function tilted(x: number, y: number, rx: number, ry: number, a: number, n = 28): Pt[] {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return oval(0, 0, rx, ry, n).map((p) => pt(x + p.x * c - p.y * s, y + p.x * s + p.y * c));
}

/** Shears points about the line y = `cy` by `k`: leans an opening back or forward. */
export const leaning = (cy: number, k: number) => (p: Pt): Pt => pt(p.x + (p.y - cy) * k, p.y);
