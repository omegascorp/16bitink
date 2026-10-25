import type { Rng } from '../../logic/rng';
import { capsule, closed, type Draw, pt } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { mix } from '../wash';
import { ellipseAt, skinWash } from '../critters/preyKit';

/**
 * Painting helpers shared by the Pine Barrens' critters: points inside a
 * shape, arcs, raised bumps (a toad's warts, a lizard's keeled scales),
 * banded limbs and toes. Board px, light from the upper left.
 */

/** Whether p lies inside a closed polygon (even-odd). */
export function inside(poly: readonly Pt[], p: Pt): boolean {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]!;
    const b = poly[j]!;
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) hit = !hit;
  }
  return hit;
}

/** Up to n random points inside a shape, at least `gap` apart, placed by rng. */
export function scatter(rng: Rng, shape: readonly Pt[], n: number, gap: number, keep: (p: Pt) => boolean = () => true): Pt[] {
  const xs = shape.map((p) => p.x);
  const ys = shape.map((p) => p.y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const out: Pt[] = [];
  for (let tries = 0; tries < n * 6 && out.length < n; tries++) {
    const p = pt(x0 + rng() * (x1 - x0), y0 + rng() * (y1 - y0));
    if (!inside(shape, p) || !keep(p)) continue;
    if (out.some((q) => Math.hypot(q.x - p.x, q.y - p.y) < gap)) continue;
    out.push(p);
  }
  return out;
}

/** Points on an ellipse's rim from angle a0 to a1. */
export function arcPts(c: Pt, rx: number, ry: number, a0: number, a1: number, n = 6, rot = 0): Pt[] {
  const cs = Math.cos(rot);
  const sn = Math.sin(rot);
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / n;
    const x = Math.cos(a) * rx;
    const y = Math.sin(a) * ry;
    return pt(c.x + x * cs - y * sn, c.y + x * sn + y * cs);
  });
}

/**
 * A raised bump on skin: its cast shadow down-right, the bump's own wash,
 * a pale catch-light at its upper left and a fine line round its shadow side.
 */
export function bump(d: Draw, c: Pt, r: number, colour: string, hi: string, deep: string, line = 0.22): void {
  const { pen } = d;
  const b = ellipseAt(c.x, c.y, r, r * 0.86, 0.4, 10);
  pen.fill(b.map((p) => pt(p.x + r * 0.32, p.y + r * 0.45)), deep, 0.4);
  pen.fill(b, colour, 0.92);
  pen.dot(c.x - r * 0.32, c.y - r * 0.36, r * 0.38, hi, 0.75);
  pen.hair(arcPts(c, r, r * 0.86, -0.5, 2.3, 5), line, d.ink, 0.55);
}

/** A limb segment a → b: washed and rounded, banded across with darker stripes, a lit line along its top, inked. */
export function bandedLimb(d: Draw, a: Pt, b: Pt, w0: number, w1: number, wash: string, deep: string, band: string, bands: number, line = 0.4): Pt[] {
  const { pen } = d;
  const shape = capsule(a, b, w0, w1);
  skinWash(d, shape, wash, deep);
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const u = pt((b.x - a.x) / len, (b.y - a.y) / len);
  const n = pt(-u.y, u.x);
  pen.clipped(shape, () => {
    for (let i = 0; i < bands; i++) {
      const t = (i + 0.6) / (bands + 0.3);
      const c = pt(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
      const half = (w0 + (w1 - w0) * t) * 0.75;
      const k = len * 0.08;
      pen.fill([pt(c.x - u.x * k + n.x * half, c.y - u.y * k + n.y * half), pt(c.x + u.x * k + n.x * half, c.y + u.y * k + n.y * half), pt(c.x + u.x * k * 1.3 - n.x * half, c.y + u.y * k * 1.3 - n.y * half), pt(c.x - u.x * k * 0.8 - n.x * half, c.y - u.y * k * 0.8 - n.y * half)], band, 0.55);
    }
    pen.hair([pt(a.x - n.x * w0 * 0.22, a.y - n.y * w0 * 0.22), pt(b.x - n.x * w1 * 0.22, b.y - n.y * w1 * 0.22)], Math.min(w0, w1) * 0.22, PAPER_FILL, 0.3);
  });
  pen.stroke(closed(shape), line, d.ink, 0.95, false);
  return shape;
}

/** Toes fanned round `ang` from `base` (one length each), slim capsules washed and inked, their tips darker. */
export function digits(d: Draw, base: Pt, ang: number, spread: number, lens: readonly number[], w: number, wash: string, deep: string, tip: string, line = 0.28): Pt[] {
  const { pen } = d;
  const n = lens.length;
  return lens.map((l, i) => {
    const a = ang + (n > 1 ? (i / (n - 1) - 0.5) * spread : 0);
    const end = pt(base.x + Math.cos(a) * l, base.y + Math.sin(a) * l);
    const toe = capsule(base, end, w, w * 0.7);
    skinWash(d, toe, wash, deep);
    pen.stroke(closed(toe), line, d.ink, 0.9, false);
    pen.dot(end.x, end.y, w * 0.36, tip, 0.9);
    return end;
  });
}

/** `colour` lifted towards paper by t: a lit tone of a wash. */
export const lit = (colour: string, t: number): string => mix(colour, PAPER_FILL, t);
