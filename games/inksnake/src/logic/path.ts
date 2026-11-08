/** A point on the board (board px). */
export interface Pt {
  readonly x: number;
  readonly y: number;
}

/**
 * A track: a smooth curve through a level's control points, resampled to
 * even steps so a marble's place on it is just its distance from the start
 * (arc length, `s`).
 */
export interface Path {
  readonly pts: readonly Pt[];
  /** Distance from the start to each point. */
  readonly cum: readonly number[];
  readonly length: number;
}

/** Distance between samples, board px. */
const STEP = 4;

/** A Catmull-Rom curve through `control`, resampled every STEP px. */
export function buildPath(control: readonly Pt[]): Path {
  if (control.length < 2) throw new Error('A track needs at least two points');
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
  const last = dense[dense.length - 1]!;
  const tail = pts[pts.length - 1]!;
  const rest = Math.hypot(last.x - tail.x, last.y - tail.y);
  if (rest > 0.01) {
    pts.push(last);
    cum.push(cum[cum.length - 1]! + rest);
  }
  return { pts, cum, length: cum[cum.length - 1]! };
}

/** Index of the sample at or before distance `s`. */
function indexAt(p: Path, s: number): number {
  let lo = 0;
  let hi = p.cum.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (p.cum[mid]! <= s) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

/** Where on the board distance `s` along the track is (clamped to its ends). */
export function pointAt(p: Path, s: number): Pt {
  if (s <= 0) return p.pts[0]!;
  if (s >= p.length) return p.pts[p.pts.length - 1]!;
  const i = indexAt(p, s);
  const a = p.pts[i]!;
  const b = p.pts[Math.min(i + 1, p.pts.length - 1)]!;
  const span = p.cum[Math.min(i + 1, p.cum.length - 1)]! - p.cum[i]!;
  const t = span > 0 ? (s - p.cum[i]!) / span : 0;
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/** The direction of travel at distance `s`, radians. */
export function angleAt(p: Path, s: number): number {
  const i = Math.min(indexAt(p, Math.max(0, Math.min(p.length, s))), p.pts.length - 2);
  const a = p.pts[i]!;
  const b = p.pts[i + 1]!;
  return Math.atan2(b.y - a.y, b.x - a.x);
}

/** Distances along the track where the segment a→b crosses it. */
export function crossings(p: Path, a: Pt, b: Pt): number[] {
  const out: number[] = [];
  const minX = Math.min(a.x, b.x);
  const maxX = Math.max(a.x, b.x);
  const minY = Math.min(a.y, b.y);
  const maxY = Math.max(a.y, b.y);
  for (let i = 0; i + 1 < p.pts.length; i++) {
    const c = p.pts[i]!;
    const d = p.pts[i + 1]!;
    if (Math.max(c.x, d.x) < minX || Math.min(c.x, d.x) > maxX || Math.max(c.y, d.y) < minY || Math.min(c.y, d.y) > maxY) continue;
    const t = segmentHit(a, b, c, d);
    if (t !== null) out.push(p.cum[i]! + (p.cum[i + 1]! - p.cum[i]!) * t);
  }
  return out;
}

/** Where along c→d (0..1) the segment a→b crosses it, or null. */
function segmentHit(a: Pt, b: Pt, c: Pt, d: Pt): number | null {
  const rx = b.x - a.x;
  const ry = b.y - a.y;
  const sx = d.x - c.x;
  const sy = d.y - c.y;
  const den = rx * sy - ry * sx;
  if (Math.abs(den) < 1e-9) return null;
  const qx = c.x - a.x;
  const qy = c.y - a.y;
  const t = (qx * sy - qy * sx) / den;
  const u = (qx * ry - qy * rx) / den;
  return t >= 0 && t <= 1 && u >= 0 && u < 1 ? u : null;
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
