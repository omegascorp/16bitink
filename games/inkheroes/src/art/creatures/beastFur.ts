import { createRng } from '../../logic/rng';
import { bezier, cub, pt, ribbon, type Draw } from '../kit';
import type { Pt } from '../pen';

/**
 * Fur and hair for the beasts: outlines broken into tufts where a coat
 * grows long (a ruff, a brush of a tail, a hide's ragged hem), and fields
 * of short directional pen strokes laid the way the coat grows. Every
 * placement comes from a fixed seed so the shapes stay put between
 * line-boil frames; only the pen's own wobble changes.
 */

/** A polyline resampled at roughly even spacing. */
export function resample(pts: readonly Pt[], step: number): Pt[] {
  const out: Pt[] = [pts[0]!];
  let carry = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    const l = Math.hypot(b.x - a.x, b.y - a.y);
    let s = step - carry;
    while (s <= l) {
      out.push(pt(a.x + ((b.x - a.x) * s) / l, a.y + ((b.y - a.y) * s) / l));
      s += step;
    }
    carry = l - (s - step);
  }
  const last = pts[pts.length - 1]!;
  const end = out[out.length - 1]!;
  if (Math.hypot(last.x - end.x, last.y - end.y) > step * 0.3) out.push(last);
  return out;
}

export interface TuftOpts {
  /** How far a tuft's tip stands out. */
  readonly len: number;
  /** Distance between tufts along the edge. */
  readonly every: number;
  /** Which way the hairs lean (added to the tip, scaled by len). */
  readonly rake: Pt;
  /** 1 if the outside is to the left of travel (screen coords), -1 if to the right. */
  readonly side: 1 | -1;
  readonly seed: number;
  /** Chance of leaving a stretch smooth instead of tufting it (0..1). */
  readonly skip?: number;
}

/**
 * An edge broken into tufts, raked one way, as a pen draws a shaggy coat:
 * each lock swells out from its base and curls to a point, some stretches
 * left smooth and the sizes varied so it never reads as a saw.
 */
export function tufted(edge: readonly Pt[], o: TuftOpts): Pt[] {
  const rng = createRng(o.seed);
  const base = resample(edge, o.every);
  const out: Pt[] = [];
  for (let i = 0; i < base.length - 1; i++) {
    const a = base[i]!;
    const b = base[i + 1]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const l = Math.hypot(dx, dy) || 1;
    const nx = (dy / l) * o.side;
    const ny = (-dx / l) * o.side;
    const k = o.len * (0.45 + rng() * 0.9);
    const t = 0.6 + rng() * 0.35;
    const flat = rng() < (o.skip ?? 0);
    out.push(a);
    if (flat) continue;
    // Swell out of the base, then the curled tip.
    out.push(pt(a.x + dx * t * 0.45 + nx * k * 0.45, a.y + dy * t * 0.45 + ny * k * 0.45));
    out.push(pt(a.x + dx * t + (nx + o.rake.x) * k, a.y + dy * t + (ny + o.rake.y) * k));
  }
  out.push(base[base.length - 1]!);
  return out;
}

function inside(poly: readonly Pt[], x: number, y: number): boolean {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]!;
    const b = poly[j]!;
    if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) hit = !hit;
  }
  return hit;
}

export interface FurOpts {
  /** Hair direction (radians) at a point: the way the coat lies. */
  readonly flow: (x: number, y: number) => number;
  readonly count: number;
  readonly len: number;
  readonly width: number;
  readonly color: string;
  readonly alpha: number;
  readonly seed: number;
  /** 0..1 chance of keeping a hair at a point (thins it where the light falls). */
  readonly keep?: (x: number, y: number) => number;
  /** Bend of each hair, as a fraction of its length. */
  readonly curl?: number;
}

/** Short pen hairs over a shape, laid along the coat's flow, clipped to it. */
export function fur(d: Draw, clip: readonly Pt[], o: FurOpts): void {
  const rng = createRng(o.seed);
  const xs = clip.map((p) => p.x);
  const ys = clip.map((p) => p.y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const curl = o.curl ?? 0.18;
  const hairs: Pt[][] = [];
  for (let i = 0; i < o.count * 3 && hairs.length < o.count; i++) {
    const x = x0 + rng() * (x1 - x0);
    const y = y0 + rng() * (y1 - y0);
    const r = rng();
    const bend = (rng() - 0.5) * 2 * curl;
    const lk = 0.6 + rng() * 0.7;
    if (!inside(clip, x, y) || (o.keep && r > o.keep(x, y))) continue;
    const a = o.flow(x, y);
    const l = o.len * lk;
    const cx = Math.cos(a);
    const cy = Math.sin(a);
    const mid = pt(x + cx * l * 0.5 - cy * l * bend, y + cy * l * 0.5 + cx * l * bend);
    hairs.push([pt(x, y), mid, pt(x + cx * l, y + cy * l)]);
  }
  d.pen.clipped(clip, () => {
    for (const h of hairs) d.pen.hair(h, o.width, o.color, o.alpha);
  });
}

/**
 * Locks of fur along an edge: little clumps of two or three strokes
 * flicked out from inside the shape towards the edge, the marks that make
 * a ruff or a brush read as a mass of hair.
 */
export function locks(d: Draw, edge: readonly Pt[], o: { every: number; len: number; rake: Pt; side: 1 | -1; width: number; color: string; alpha: number; seed: number }): void {
  const rng = createRng(o.seed);
  const pts = resample(edge, o.every);
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]!;
    const b = pts[i + 1]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const l = Math.hypot(dx, dy) || 1;
    const nx = (dy / l) * o.side;
    const ny = (-dx / l) * o.side;
    const n = 2 + Math.floor(rng() * 2);
    for (let k = 0; k < n; k++) {
      const t = rng();
      const depth = o.len * (0.7 + rng() * 0.6);
      const root = pt(a.x + dx * t - nx * depth, a.y + dy * t - ny * depth);
      const tip = pt(a.x + dx * t + o.rake.x * depth * 0.5 - nx * depth * 0.1, a.y + dy * t + o.rake.y * depth * 0.5 - ny * depth * 0.1);
      const mid = pt((root.x + tip.x) / 2 + o.rake.x * depth * 0.25, (root.y + tip.y) / 2 + o.rake.y * depth * 0.25);
      d.pen.hair([root, mid, tip], o.width, o.color, o.alpha * (0.7 + rng() * 0.3));
    }
  }
}

/** A chain of cubic segments from `start`: each segment is [control, control, end]. */
export function chain(start: Pt, ...segs: readonly (readonly [Pt, Pt, Pt])[]): Pt[] {
  const out: Pt[] = [start];
  let from = start;
  for (const [c0, c1, end] of segs) {
    out.push(...cub(from, c0, c1, end, 10).slice(1));
    from = end;
  }
  return out;
}

/**
 * A limb as one smooth tapered shape through its joints (no capsule seams):
 * the corners are rounded with quadratic curves and the width eases from
 * one joint's to the next.
 */
export function limb(joints: readonly Pt[], widths: readonly number[]): Pt[] {
  const mid = (a: Pt, b: Pt): Pt => pt((a.x + b.x) / 2, (a.y + b.y) / 2);
  const spine: Pt[] = [joints[0]!];
  for (let i = 1; i < joints.length - 1; i++) spine.push(...bezier(mid(joints[i - 1]!, joints[i]!), joints[i]!, mid(joints[i]!, joints[i + 1]!), 8));
  spine.push(joints[joints.length - 1]!);
  const at: number[] = [0];
  for (let i = 1; i < joints.length; i++) at.push(at[i - 1]! + Math.hypot(joints[i]!.x - joints[i - 1]!.x, joints[i]!.y - joints[i - 1]!.y));
  const total = at[at.length - 1]!;
  const width = (u: number): number => {
    const s = u * total;
    let i = 0;
    while (i < at.length - 2 && s > at[i + 1]!) i++;
    const k = Math.max(0, Math.min(1, (s - at[i]!) / (at[i + 1]! - at[i]! || 1)));
    const e = k * k * (3 - 2 * k);
    return widths[i]! + (widths[i + 1]! - widths[i]!) * e;
  };
  const r = ribbon(resample(spine, 1), width);
  const cap = (c: Pt, w: number, from: Pt): Pt[] => {
    const a = Math.atan2(from.y - c.y, from.x - c.x);
    return Array.from({ length: 7 }, (_, i) => pt(c.x + Math.cos(a + Math.PI / 2 + (i / 6) * Math.PI) * (w / 2), c.y + Math.sin(a + Math.PI / 2 + (i / 6) * Math.PI) * (w / 2)));
  };
  return [...r.top, ...cap(joints[joints.length - 1]!, widths[widths.length - 1]!, joints[joints.length - 2]!).slice(1, -1), ...[...r.bot].reverse(), ...cap(joints[0]!, widths[0]!, joints[1]!).slice(1, -1)];
}
