import { ellipse, type Pt } from './pen';

/** Geometry for the interface's paintings (as InkSnake's art kit). */
export const TAU = Math.PI * 2;

export const pt = (x: number, y: number): Pt => ({ x, y });
export const closed = (pts: readonly Pt[]): Pt[] => [...pts, pts[0]!];
export const oval = (x: number, y: number, rx: number, ry: number, n = 20): Pt[] => ellipse(x, y, rx, ry, n);

export function bezier(p0: Pt, c: Pt, p1: Pt, n = 12): Pt[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const u = 1 - t;
    return pt(u * u * p0.x + 2 * u * t * c.x + t * t * p1.x, u * u * p0.y + 2 * u * t * c.y + t * t * p1.y);
  });
}

/** Unit normal (to the left of travel) at each point of a polyline. */
export function normals(pts: readonly Pt[]): Pt[] {
  return pts.map((_, i) => {
    const a = pts[Math.max(0, i - 1)]!;
    const b = pts[Math.min(pts.length - 1, i + 1)]!;
    const d = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    return pt((b.y - a.y) / d, -(b.x - a.x) / d);
  });
}

/** `p` turned by `a` radians about `c`. */
export function rotate(p: Pt, c: Pt, a: number): Pt {
  const [cos, sin] = [Math.cos(a), Math.sin(a)];
  return pt(c.x + (p.x - c.x) * cos - (p.y - c.y) * sin, c.y + (p.x - c.x) * sin + (p.y - c.y) * cos);
}

/** Points along an arc about (cx, cy), from angle a0 to a1. */
export function arc(cx: number, cy: number, r: number, a0: number, a1: number, n = 16): Pt[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / n;
    return pt(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  });
}
