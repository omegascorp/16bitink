/**
 * Plane geometry for the octopus short: points, smooth paths through
 * control points, resampling, and the curling arm shape every pose is built
 * from. Pure functions; nothing here draws.
 */

export interface Pt {
  readonly x: number;
  readonly y: number;
}

export const pt = (x: number, y: number): Pt => ({ x, y });
export const add = (a: Pt, b: Pt): Pt => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: Pt, b: Pt): Pt => ({ x: a.x - b.x, y: a.y - b.y });
export const mul = (a: Pt, k: number): Pt => ({ x: a.x * k, y: a.y * k });
export const dist = (a: Pt, b: Pt): number => Math.hypot(b.x - a.x, b.y - a.y);
export const lerpPt = (a: Pt, b: Pt, u: number): Pt => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u });

/** A placement: local px to screen px, turned by `angle` and scaled by `scale` about (x, y). */
export interface Place {
  readonly x: number;
  readonly y: number;
  readonly angle: number;
  readonly scale: number;
}

export function place(f: Place, p: Pt): Pt {
  const c = Math.cos(f.angle) * f.scale;
  const s = Math.sin(f.angle) * f.scale;
  return { x: f.x + p.x * c - p.y * s, y: f.y + p.x * s + p.y * c };
}

/** A Catmull-Rom curve through every control point, `per` points a span. */
export function spline(ctrl: readonly Pt[], per = 10): Pt[] {
  if (ctrl.length < 2) return [...ctrl];
  const out: Pt[] = [];
  for (let i = 0; i < ctrl.length - 1; i++) {
    const p0 = ctrl[Math.max(0, i - 1)]!;
    const p1 = ctrl[i]!;
    const p2 = ctrl[i + 1]!;
    const p3 = ctrl[Math.min(ctrl.length - 1, i + 2)]!;
    for (let k = 0; k < per; k++) {
      const t = k / per;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number): number =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push({ x: f(p0.x, p1.x, p2.x, p3.x), y: f(p0.y, p1.y, p2.y, p3.y) });
    }
  }
  out.push(ctrl[ctrl.length - 1]!);
  return out;
}

/** Total length of a polyline. */
export function lengthOf(path: readonly Pt[]): number {
  let total = 0;
  for (let i = 1; i < path.length; i++) total += dist(path[i - 1]!, path[i]!);
  return total;
}

/** A polyline resampled to `n` evenly spaced points. */
export function resample(path: readonly Pt[], n: number): Pt[] {
  if (path.length < 2) return Array.from({ length: n }, () => path[0] ?? pt(0, 0));
  const lengths = [0];
  for (let i = 1; i < path.length; i++) lengths.push(lengths[i - 1]! + dist(path[i - 1]!, path[i]!));
  const total = lengths[lengths.length - 1]!;
  let j = 1;
  return Array.from({ length: n }, (_, i) => {
    const at = (i / (n - 1)) * total;
    while (j < path.length - 1 && lengths[j]! < at) j++;
    const a = path[j - 1]!;
    const b = path[j]!;
    const u = (at - lengths[j - 1]!) / Math.max(1e-6, lengths[j]! - lengths[j - 1]!);
    return lerpPt(a, b, Math.max(0, Math.min(1, u)));
  });
}

/** Unit normals to the left of travel (up, for a path running right). */
export function normals(path: readonly Pt[]): Pt[] {
  return path.map((_, i) => {
    const a = path[Math.max(0, i - 1)]!;
    const b = path[Math.min(path.length - 1, i + 1)]!;
    const len = dist(a, b) || 1;
    return { x: (b.y - a.y) / len, y: -(b.x - a.x) / len };
  });
}

/** Two paths blended point for point (both resampled to `n`). */
export function blend(a: readonly Pt[], b: readonly Pt[], u: number, n = 48): Pt[] {
  if (u <= 0) return resample(a, n);
  if (u >= 1) return resample(b, n);
  const ra = resample(a, n);
  const rb = resample(b, n);
  return ra.map((p, i) => lerpPt(p, rb[i]!, u));
}

/**
 * A curling arm: from `root`, setting off along `heading` (radians, screen:
 * 0 right, π/2 down), turning `curl` radians in all by its tip (most of it
 * near the tip, like an octopus arm), with a travelling ripple.
 */
export function curlArm(root: Pt, heading: number, length: number, curl: number, ripple = 0, phase = 0, n = 32): Pt[] {
  const out: Pt[] = [root];
  let p = root;
  const step = length / n;
  for (let i = 1; i <= n; i++) {
    const s = i / n;
    const a = heading + curl * s * s * s * 1.0 + curl * 0.25 * s + ripple * s * Math.sin(phase - 5 * s);
    p = { x: p.x + Math.cos(a) * step, y: p.y + Math.sin(a) * step };
    out.push(p);
  }
  return out;
}

/** The arc-length share (0..1) of a path at the point nearest `target`. */
export function shareAt(path: readonly Pt[], target: Pt): number {
  let bestD = Infinity;
  let acc = 0;
  let at = 0;
  for (let i = 0; i < path.length; i++) {
    if (i > 0) acc += dist(path[i - 1]!, path[i]!);
    const d = dist(path[i]!, target);
    if (d < bestD) {
      bestD = d;
      at = acc;
    }
  }
  return at / Math.max(1e-6, lengthOf(path));
}
