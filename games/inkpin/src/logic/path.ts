/** A point (world px). */
export interface Pt {
  readonly x: number;
  readonly y: number;
}

/**
 * A trail: a smooth curve through control points, resampled to even steps,
 * so a place on it is just its distance from the start (`s`).
 */
export interface Path {
  readonly pts: readonly Pt[];
  /** Distance from the start to each point. */
  readonly cum: readonly number[];
  readonly length: number;
}

/** Distance between samples, px. */
const STEP = 4;

/** A Catmull-Rom curve through `control`, resampled every STEP px. */
export function buildPath(control: readonly Pt[]): Path {
  if (control.length < 2) throw new Error('A path needs at least two points');
  const dense = catmullRom(control);
  const pts: Pt[] = [dense[0]!];
  const cum: number[] = [0];
  let carried = 0;
  for (let i = 1; i < dense.length; i++) {
    const a = dense[i - 1]!;
    const b = dense[i]!;
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    let along = STEP - carried;
    while (along <= seg) {
      const t = along / seg;
      pts.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
      cum.push(cum[cum.length - 1]! + STEP);
      along += STEP;
    }
    carried = seg - (along - STEP);
  }
  return { pts, cum, length: cum[cum.length - 1]! };
}

/** Where distance `s` along the path is (clamped to its ends). */
export function pointAt(p: Path, s: number): Pt {
  if (s <= 0) return p.pts[0]!;
  if (s >= p.length) return p.pts[p.pts.length - 1]!;
  let lo = 0;
  let hi = p.cum.length - 1;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (p.cum[m]! <= s) lo = m;
    else hi = m;
  }
  const a = p.pts[lo]!;
  const b = p.pts[hi]!;
  const t = (s - p.cum[lo]!) / Math.max(1e-6, p.cum[hi]! - p.cum[lo]!);
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/** The distance along the path of its sample nearest to `q`. */
export function nearestS(p: Path, q: Pt): number {
  let best = 0;
  let bestD = Infinity;
  p.pts.forEach((r, i) => {
    const d = (r.x - q.x) ** 2 + (r.y - q.y) ** 2;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  });
  return p.cum[best] ?? 0;
}

/** Catmull-Rom through the points, about every 2 px. */
function catmullRom(points: readonly Pt[]): Pt[] {
  const n = points.length;
  if (n === 2) return [...points];
  const at = (i: number): Pt => points[Math.max(0, Math.min(n - 1, i))]!;
  const out: Pt[] = [];
  for (let i = 0; i < n - 1; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const steps = Math.max(1, Math.ceil(Math.hypot(p2.x - p1.x, p2.y - p1.y) / 2));
    for (let k = 0; k < steps; k++) {
      const t = k / steps;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push({
        x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y: 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
      });
    }
  }
  out.push(points[n - 1]!);
  return out;
}
