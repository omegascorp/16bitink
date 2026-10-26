/**
 * Plane and 3D helpers for the sea star short: points, smooth curves,
 * resampling, normals, and the tide pool's oblique projection (the camera
 * looks down a little, so what's nearer the viewer sits lower on screen).
 * Pure functions; nothing here draws.
 */

export interface Pt {
  readonly x: number;
  readonly y: number;
}

/** A point in the pool: x right, y up, z towards the viewer (scene px). */
export interface P3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export const pt = (x: number, y: number): Pt => ({ x, y });
export const add = (a: Pt, b: Pt): Pt => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: Pt, b: Pt): Pt => ({ x: a.x - b.x, y: a.y - b.y });
export const mul = (a: Pt, k: number): Pt => ({ x: a.x * k, y: a.y * k });
export const dist = (a: Pt, b: Pt): number => Math.hypot(b.x - a.x, b.y - a.y);
export const lerpPt = (a: Pt, b: Pt, u: number): Pt => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u });

/** The camera looks down at the pool this steeply (radians from level). */
export const PITCH = 0.85;
const CY = Math.cos(PITCH);
const SZ = Math.sin(PITCH);

/** Where the pool's origin (the middle of the mussel, on the rock) sits in scene px. */
export const ANCHOR = { x: 540, y: 1000 } as const;

/** A pool point on screen (scene px, before the camera). */
export const project = (p: P3): Pt => ({ x: ANCHOR.x + p.x, y: ANCHOR.y - p.y * CY + p.z * SZ });

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

/** Points round an ellipse, `steps` of them. */
export function ring(cx: number, cy: number, rx: number, ry: number, steps = 32, a0 = 0): Pt[] {
  return Array.from({ length: steps }, (_, i) => {
    const a = a0 + (i / steps) * Math.PI * 2;
    return { x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry };
  });
}

/** A camera: scene point `focus` lands on screen point `at`, scaled by `zoom`. */
export interface Cam {
  readonly zoom: number;
  readonly focus: Pt;
  readonly at: Pt;
}

export const toScreen = (cam: Cam, p: Pt): Pt => ({ x: cam.at.x + (p.x - cam.focus.x) * cam.zoom, y: cam.at.y + (p.y - cam.focus.y) * cam.zoom });

export function applyCam(ctx: CanvasRenderingContext2D, cam: Cam): void {
  ctx.translate(cam.at.x, cam.at.y);
  ctx.scale(cam.zoom, cam.zoom);
  ctx.translate(-cam.focus.x, -cam.focus.y);
}
