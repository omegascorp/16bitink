import { add, bezier, lerp, pt } from '../kit';
import type { Pt } from '../pen';

/**
 * Helpers for spired shells seen side-on, shared by the beaches' shell
 * drawings: a body is a ribbon round a spine from the apex (u 0) to the
 * front (u 1), and these find points, spiral lines and sutures on it.
 */
export interface Body {
  readonly spine: Pt[];
  readonly top: Pt[];
  readonly bot: Pt[];
  readonly shape: Pt[];
  readonly n: number;
}

export const at = (b: Body, u: number): number => Math.round(Math.min(1, Math.max(0, u)) * b.n);

/** The point `v` of the way from the spine out to the top outline (v > 0) or the bottom one (v < 0). */
export const off = (b: Body, i: number, v: number): Pt => lerp(b.spine[i]!, v >= 0 ? b.top[i]! : b.bot[i]!, Math.abs(v));

/** A spiral line along the shell at `v`, from u0 to u1. */
export function along(b: Body, v: number, u0 = 0, u1 = 1): Pt[] {
  const i0 = at(b, u0);
  return Array.from({ length: at(b, u1) - i0 + 1 }, (_, k) => off(b, i0 + k, v));
}

/** Unit direction of the spine at `i`, towards the front. */
export function tangent(b: Body, i: number): Pt {
  const p = b.spine[Math.max(0, i - 1)]!;
  const q = b.spine[Math.min(b.n, i + 1)]!;
  const l = Math.hypot(q.x - p.x, q.y - p.y) || 1;
  return pt((q.x - p.x) / l, (q.y - p.y) / l);
}

/** A line across the shell at `i` (a suture, rib or cord), bowed `bow` towards the front. */
export function across(b: Body, i: number, bow: number): Pt[] {
  const t = tangent(b, i);
  return bezier(b.top[i]!, add(b.spine[i]!, pt(t.x * bow, t.y * bow)), b.bot[i]!, 8);
}

/** Convex whorls: each swells between its sutures by `bulge` of the width; the body whorl, after the last, does not dip. */
export function swell(u: number, sutures: readonly number[], bulge: number): number {
  const k = sutures.findIndex((s) => u < s);
  if (k < 0) return 1;
  const s0 = k === 0 ? 0 : sutures[k - 1]!;
  return 1 - bulge + bulge * Math.sin((Math.PI * (u - s0)) / (sutures[k]! - s0));
}
