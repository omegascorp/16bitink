import type { Pt } from './vec';

/**
 * Collision shapes on the ground, in native px relative to an origin.
 * Footprints from the world art manifest are polygons; trees and rocks may
 * be circles.
 */
export type Poly = { readonly kind: 'poly'; readonly pts: readonly (readonly [number, number])[] };
/** Several polygons (a world art footprint can be more than one: a house and its porch). */
export type Shape = { readonly kind: 'circle'; readonly r: number } | Poly | { readonly kind: 'multi'; readonly polys: readonly Poly[] };

export interface Bounds {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
}

export function rectShape(w: number, h: number, cx = 0, cy = 0): Shape {
  const x0 = cx - w / 2;
  const y0 = cy - h / 2;
  return { kind: 'poly', pts: [[x0, y0], [x0 + w, y0], [x0 + w, y0 + h], [x0, y0 + h]] };
}

export function shapeBounds(s: Shape, ox: number, oy: number): Bounds {
  if (s.kind === 'multi') {
    const bs = s.polys.map((p) => shapeBounds(p, ox, oy));
    return { x0: Math.min(...bs.map((b) => b.x0)), y0: Math.min(...bs.map((b) => b.y0)), x1: Math.max(...bs.map((b) => b.x1)), y1: Math.max(...bs.map((b) => b.y1)) };
  }
  if (s.kind === 'circle') return { x0: ox - s.r, y0: oy - s.r, x1: ox + s.r, y1: oy + s.r };
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of s.pts) {
    x0 = Math.min(x0, ox + x);
    y0 = Math.min(y0, oy + y);
    x1 = Math.max(x1, ox + x);
    y1 = Math.max(y1, oy + y);
  }
  return { x0, y0, x1, y1 };
}

export function pointInShape(s: Shape, ox: number, oy: number, px: number, py: number): boolean {
  if (s.kind === 'multi') return s.polys.some((p) => pointInShape(p, ox, oy, px, py));
  const x = px - ox;
  const y = py - oy;
  if (s.kind === 'circle') return x * x + y * y <= s.r * s.r;
  let inside = false;
  const pts = s.pts;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i]!;
    const [xj, yj] = pts[j]!;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function closestOnSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): Pt {
  const dx = bx - ax;
  const dy = by - ay;
  const l2 = dx * dx + dy * dy;
  const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2));
  return { x: ax + dx * t, y: ay + dy * t };
}

/**
 * How far to move a circle (cx, cy, r) so it no longer overlaps the shape,
 * or null when it doesn't overlap.
 */
export function pushOut(s: Shape, ox: number, oy: number, cx: number, cy: number, r: number): Pt | null {
  if (s.kind === 'multi') {
    // The deepest overlap wins; the next step resolves any other.
    let best: Pt | null = null;
    for (const p of s.polys) {
      const v = pushOut(p, ox, oy, cx, cy, r);
      if (v && (!best || Math.hypot(v.x, v.y) > Math.hypot(best.x, best.y))) best = v;
    }
    return best;
  }
  if (s.kind === 'circle') {
    const dx = cx - ox;
    const dy = cy - oy;
    const d = Math.hypot(dx, dy);
    const need = r + s.r;
    if (d >= need) return null;
    if (d < 1e-6) return { x: need, y: 0 };
    return { x: (dx / d) * (need - d), y: (dy / d) * (need - d) };
  }
  const x = cx - ox;
  const y = cy - oy;
  let best: Pt | null = null;
  let bestD = Infinity;
  const pts = s.pts;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const c = closestOnSegment(x, y, pts[j]![0], pts[j]![1], pts[i]![0], pts[i]![1]);
    const d = Math.hypot(x - c.x, y - c.y);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  if (!best) return null;
  const inside = pointInShape(s, 0, 0, x, y);
  if (!inside && bestD >= r) return null;
  const nx = bestD < 1e-6 ? 1 : (x - best.x) / bestD;
  const ny = bestD < 1e-6 ? 0 : (y - best.y) / bestD;
  // Inside: push back across the nearest edge; outside but touching: push off it.
  return inside ? { x: -nx * (bestD + r), y: -ny * (bestD + r) } : { x: nx * (r - bestD), y: ny * (r - bestD) };
}

/** Whether the segment a→b crosses the shape (or starts or ends in it). */
export function segmentHits(s: Shape, ox: number, oy: number, ax: number, ay: number, bx: number, by: number): boolean {
  if (s.kind === 'multi') return s.polys.some((p) => segmentHits(p, ox, oy, ax, ay, bx, by));
  if (pointInShape(s, ox, oy, bx, by) || pointInShape(s, ox, oy, ax, ay)) return true;
  if (s.kind === 'circle') {
    const c = closestOnSegment(ox, oy, ax, ay, bx, by);
    return Math.hypot(c.x - ox, c.y - oy) <= s.r;
  }
  const pts = s.pts;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    if (segmentsCross(ax, ay, bx, by, ox + pts[j]![0], oy + pts[j]![1], ox + pts[i]![0], oy + pts[i]![1])) return true;
  }
  return false;
}

function segmentsCross(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, dx: number, dy: number): boolean {
  const d1 = (dx - cx) * (ay - cy) - (dy - cy) * (ax - cx);
  const d2 = (dx - cx) * (by - cy) - (dy - cy) * (bx - cx);
  const d3 = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  const d4 = (bx - ax) * (dy - ay) - (by - ay) * (dx - ax);
  return d1 * d2 < 0 && d3 * d4 < 0;
}

/** Distance from a point to a segment. */
export function distToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const c = closestOnSegment(px, py, ax, ay, bx, by);
  return Math.hypot(px - c.x, py - c.y);
}
