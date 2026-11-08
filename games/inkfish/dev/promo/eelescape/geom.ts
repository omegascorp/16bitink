import type { Pt } from '../../../src/art/pen';

/** Small geometry helpers: smooth curves through control points, tracks measured by arc length, tubes round a centre line. */

export const lerpPt = (a: Pt, b: Pt, u: number): Pt => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u });

export const dist = (a: Pt, b: Pt): number => Math.hypot(b.x - a.x, b.y - a.y);

/** `p` turned by `angle` (radians) round `about`. */
export function rotateAbout(p: Pt, about: Pt, angle: number): Pt {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const dx = p.x - about.x;
  const dy = p.y - about.y;
  return { x: about.x + dx * c - dy * s, y: about.y + dx * s + dy * c };
}

/** A Catmull-Rom curve through the points, `per` points a segment; the control points are at indices i·per. */
export function smoothCurve(pts: readonly Pt[], per = 8, closed = false): Pt[] {
  const n = pts.length;
  const at = (i: number): Pt => (closed ? pts[((i % n) + n) % n]! : pts[Math.max(0, Math.min(n - 1, i))]!);
  const segs = closed ? n : n - 1;
  const out: Pt[] = [];
  for (let i = 0; i < segs; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    for (let k = 0; k < per; k++) {
      const u = k / per;
      const u2 = u * u;
      const u3 = u2 * u;
      const f = (a: number, b: number, c: number, d: number): number =>
        0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u2 + (-a + 3 * b - 3 * c + d) * u3);
      out.push({ x: f(p0.x, p1.x, p2.x, p3.x), y: f(p0.y, p1.y, p2.y, p3.y) });
    }
  }
  if (!closed) out.push(pts[n - 1]!);
  return out;
}

/** A path measured by arc length, with s = 0 at one of its control points. Beyond its ends it runs on straight. */
export interface Track {
  readonly pts: readonly Pt[];
  readonly cum: readonly number[];
  /** Arc length of the s = 0 point from the start. */
  readonly zero: number;
  /** Arc length of each control point, relative to s = 0. */
  readonly marks: readonly number[];
}

const PER = 10;

export function makeTrack(ctrl: readonly Pt[], zeroIndex: number): Track {
  const pts = smoothCurve(ctrl, PER);
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1]! + dist(pts[i - 1]!, pts[i]!));
  const zero = cum[zeroIndex * PER]!;
  return { pts, cum, zero, marks: ctrl.map((_, i) => cum[i * PER]! - zero) };
}

/** The point at arc length s (from the zero point) and the unit direction of travel there. */
export function trackAt(track: Track, s: number): { readonly p: Pt; readonly dir: Pt } {
  const { pts, cum } = track;
  const a = s + track.zero;
  const last = pts.length - 1;
  const unit = (p: Pt, q: Pt): Pt => {
    const d = dist(p, q) || 1;
    return { x: (q.x - p.x) / d, y: (q.y - p.y) / d };
  };
  if (a <= 0) {
    const dir = unit(pts[0]!, pts[1]!);
    return { p: { x: pts[0]!.x + dir.x * a, y: pts[0]!.y + dir.y * a }, dir };
  }
  if (a >= cum[last]!) {
    const dir = unit(pts[last - 1]!, pts[last]!);
    const over = a - cum[last]!;
    return { p: { x: pts[last]!.x + dir.x * over, y: pts[last]!.y + dir.y * over }, dir };
  }
  let lo = 0;
  let hi = last;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (cum[mid]! <= a) lo = mid;
    else hi = mid;
  }
  const seg = cum[hi]! - cum[lo]! || 1;
  return { p: lerpPt(pts[lo]!, pts[hi]!, (a - cum[lo]!) / seg), dir: unit(pts[lo]!, pts[hi]!) };
}

/**
 * Points along a track from arc length `from` to `to` (n of them), each
 * pushed sideways by `side(s, f)` px (f = 0 at `from`, 1 at `to`): a body
 * lying along the path, wriggling.
 */
export function alongTrack(track: Track, from: number, to: number, n: number, side: (s: number, f: number) => number): Pt[] {
  return Array.from({ length: n }, (_, i) => {
    const f = i / (n - 1);
    const s = from + (to - from) * f;
    const { p, dir } = trackAt(track, s);
    const o = side(s, f);
    return { x: p.x - dir.y * o, y: p.y + dir.x * o };
  });
}

/** A closed outline round a centre line, `half(f)` px either side (f = 0 .. 1 along it). */
export function tube(line: readonly Pt[], half: (f: number) => number): { readonly left: Pt[]; readonly right: Pt[] } {
  const left: Pt[] = [];
  const right: Pt[] = [];
  line.forEach((p, i) => {
    const a = line[Math.max(0, i - 1)]!;
    const b = line[Math.min(line.length - 1, i + 1)]!;
    const d = dist(a, b) || 1;
    const w = half(i / (line.length - 1));
    const nx = -(b.y - a.y) / d;
    const ny = (b.x - a.x) / d;
    left.push({ x: p.x + nx * w, y: p.y + ny * w });
    right.push({ x: p.x - nx * w, y: p.y - ny * w });
  });
  return { left, right };
}

/** Whether p is inside the polygon (even-odd). */
export function inside(poly: readonly Pt[], p: Pt): boolean {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]!;
    const b = poly[j]!;
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) hit = !hit;
  }
  return hit;
}
