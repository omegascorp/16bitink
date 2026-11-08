/** Plain 2D geometry for the rules: no Phaser, so it can be tested. */
export interface Pt {
  readonly x: number;
  readonly y: number;
}

export const TAU = Math.PI * 2;

export const pt = (x: number, y: number): Pt => ({ x, y });
export const dist = (a: Pt, b: Pt): number => Math.hypot(a.x - b.x, a.y - b.y);
export const dist2 = (a: Pt, b: Pt): number => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
export const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

/** An angle folded into -π..π. */
export function wrapAngle(a: number): number {
  const w = ((a + Math.PI) % TAU + TAU) % TAU - Math.PI;
  return w === -Math.PI ? Math.PI : w;
}

/** `from` turned towards `to` by at most `step` radians. */
export function turnTowards(from: number, to: number, step: number): number {
  const d = wrapAngle(to - from);
  return wrapAngle(from + clamp(d, -step, step));
}

/** Whether `p` lies inside the closed polygon of `poly`'s first `count` points (all by default; even-odd rule). */
export function inPolygon(p: Pt, poly: readonly Pt[], count = poly.length): boolean {
  let inside = false;
  for (let i = 0, j = count - 1; i < count; j = i++) {
    const a = poly[i]!;
    const b = poly[j]!;
    if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/** Area of a closed polygon (always positive). */
export function polygonArea(poly: readonly Pt[]): number {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i]!;
    const q = poly[(i + 1) % poly.length]!;
    a += p.x * q.y - q.x * p.y;
  }
  return Math.abs(a) / 2;
}

/** The point on segment ab nearest p. */
export function nearestOnSegment(p: Pt, a: Pt, b: Pt): Pt {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return a;
  const t = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / l2, 0, 1);
  return pt(a.x + dx * t, a.y + dy * t);
}

/** A solid thing on the board: a round one (a rock, a post) or a box (a bale, a crate, the coop). */
export type Shape =
  | { readonly kind: 'circle'; readonly x: number; readonly y: number; readonly r: number }
  | { readonly kind: 'rect'; readonly x: number; readonly y: number; readonly w: number; readonly h: number };

/**
 * Where a circle of radius `r` at `p` has to move to stop overlapping
 * `shape`, and the surface's outward normal there; null if it doesn't overlap.
 */
export function pushOut(p: Pt, r: number, shape: Shape): { readonly p: Pt; readonly n: Pt } | null {
  if (shape.kind === 'circle') {
    const d = dist(p, shape);
    const min = shape.r + r;
    if (d >= min) return null;
    const n = d > 1e-6 ? pt((p.x - shape.x) / d, (p.y - shape.y) / d) : pt(1, 0);
    return { p: pt(shape.x + n.x * min, shape.y + n.y * min), n };
  }
  const cx = clamp(p.x, shape.x, shape.x + shape.w);
  const cy = clamp(p.y, shape.y, shape.y + shape.h);
  const dx = p.x - cx;
  const dy = p.y - cy;
  const d = Math.hypot(dx, dy);
  if (d >= r) return null;
  if (d > 1e-6) {
    const n = pt(dx / d, dy / d);
    return { p: pt(cx + n.x * r, cy + n.y * r), n };
  }
  // The centre is inside the box: out through the nearest side.
  const sides = [
    { d: p.x - shape.x, n: pt(-1, 0), p: pt(shape.x - r, p.y) },
    { d: shape.x + shape.w - p.x, n: pt(1, 0), p: pt(shape.x + shape.w + r, p.y) },
    { d: p.y - shape.y, n: pt(0, -1), p: pt(p.x, shape.y - r) },
    { d: shape.y + shape.h - p.y, n: pt(0, 1), p: pt(p.x, shape.y + shape.h + r) },
  ];
  const best = sides.reduce((a, b) => (b.d < a.d ? b : a));
  return { p: best.p, n: best.n };
}

/** Whether a circle of radius `r` at `p` overlaps `shape`. */
export function overlaps(p: Pt, r: number, shape: Shape): boolean {
  return pushOut(p, r, shape) !== null;
}
