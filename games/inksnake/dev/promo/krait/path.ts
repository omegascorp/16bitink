import type { Pt } from '../sprites';

/**
 * A route through the reef, board px, measured along its length: the krait's
 * head travels along it and its body lies along the stretch behind the head,
 * as the game lays the body along the trail the head has left. Before its
 * start and past its end the route runs on straight.
 */
export interface Route {
  readonly length: number;
  at(s: number): Pt;
  /** The heading (radians) at s. */
  heading(s: number): number;
}

/** A smooth curve through `knots` (Catmull-Rom), resampled every ~`step` px along its length. */
export function route(knots: readonly Pt[], step = 1.5): Route {
  const dense: Pt[] = [];
  for (let i = 0; i + 1 < knots.length; i++) {
    const p0 = knots[Math.max(0, i - 1)]!;
    const p1 = knots[i]!;
    const p2 = knots[i + 1]!;
    const p3 = knots[Math.min(knots.length - 1, i + 2)]!;
    const n = Math.max(4, Math.ceil(Math.hypot(p2.x - p1.x, p2.y - p1.y) / 2));
    for (let k = 0; k < n; k++) {
      const t = k / n;
      const t2 = t * t;
      const t3 = t2 * t;
      const c = (a: number, b: number, d: number, e: number): number => 0.5 * (2 * b + (-a + d) * t + (2 * a - 5 * b + 4 * d - e) * t2 + (-a + 3 * b - 3 * d + e) * t3);
      dense.push({ x: c(p0.x, p1.x, p2.x, p3.x), y: c(p0.y, p1.y, p2.y, p3.y) });
    }
  }
  dense.push(knots[knots.length - 1]!);
  // Cumulative length, then evenly spaced samples.
  const cum = [0];
  for (let i = 1; i < dense.length; i++) cum.push(cum[i - 1]! + Math.hypot(dense[i]!.x - dense[i - 1]!.x, dense[i]!.y - dense[i - 1]!.y));
  const total = cum[cum.length - 1]!;
  const count = Math.max(2, Math.ceil(total / step) + 1);
  const pts: Pt[] = [];
  let j = 0;
  for (let i = 0; i < count; i++) {
    const s = (i / (count - 1)) * total;
    while (j < cum.length - 2 && cum[j + 1]! < s) j++;
    const u = (s - cum[j]!) / (cum[j + 1]! - cum[j]! || 1);
    pts.push({ x: dense[j]!.x + (dense[j + 1]!.x - dense[j]!.x) * u, y: dense[j]!.y + (dense[j + 1]!.y - dense[j]!.y) * u });
  }
  const gap = total / (count - 1);
  const dirAt = (i: number): Pt => {
    const a = pts[Math.max(0, i - 1)]!;
    const b = pts[Math.min(pts.length - 1, i + 1)]!;
    const l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    return { x: (b.x - a.x) / l, y: (b.y - a.y) / l };
  };
  const startDir = dirAt(0);
  const endDir = dirAt(pts.length - 1);
  const at = (s: number): Pt => {
    if (s <= 0) return { x: pts[0]!.x + startDir.x * s, y: pts[0]!.y + startDir.y * s };
    if (s >= total) return { x: pts[pts.length - 1]!.x + endDir.x * (s - total), y: pts[pts.length - 1]!.y + endDir.y * (s - total) };
    const f = s / gap;
    const i = Math.floor(f);
    const u = f - i;
    const a = pts[i]!;
    const b = pts[Math.min(pts.length - 1, i + 1)]!;
    return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
  };
  const heading = (s: number): number => {
    const a = at(s - 2);
    const b = at(s + 2);
    return Math.atan2(b.y - a.y, b.x - a.x);
  };
  return { length: total, at, heading };
}
