import { pt, type Draw } from '../kit';
import type { Pt } from '../pen';

/**
 * Rigging for the beasts (wolf, ogre): the parts are painted in their rest
 * places and moved into a pose by maps. A rigid part (a head, a club, a
 * whole upper body) is moved by an affine map applied to the canvas; a
 * part that bends (the wolf's flexing back) by a warp applied to its
 * points. Limbs are placed by two-bone IK from a socket on the body to a
 * paw or fist, bent the way the joint bends. Attacks are keyframed.
 */

/** Canvas-order affine [a, b, c, d, e, f]: x' = a·x + c·y + e, y' = b·x + d·y + f. */
export type Affine = readonly [number, number, number, number, number, number];

export const IDENT: Affine = [1, 0, 0, 1, 0, 0];

export const apply = (m: Affine, p: Pt): Pt => pt(m[0] * p.x + m[2] * p.y + m[4], m[1] * p.x + m[3] * p.y + m[5]);

/** `outer` after `inner`. */
export function compose(outer: Affine, inner: Affine): Affine {
  const [a, b, c, d, e, f] = outer;
  const [A, B, C, D, E, F] = inner;
  return [a * A + c * B, b * A + d * B, a * C + c * D, b * C + d * D, a * E + c * F + e, b * E + d * F + f];
}

/** Several maps, the last applied first (as written: chain(outer, …, inner)). */
export const chainOf = (...ms: readonly Affine[]): Affine => ms.reduce((acc, m) => compose(acc, m), IDENT);

export const translate = (dx: number, dy: number): Affine => [1, 0, 0, 1, dx, dy];

/** A turn of `a` radians about `c` (positive turns clockwise on screen). */
export function rotateAbout(c: Pt, a: number): Affine {
  const cs = Math.cos(a);
  const sn = Math.sin(a);
  return [cs, sn, -sn, cs, c.x - cs * c.x + sn * c.y, c.y - sn * c.x - cs * c.y];
}

export const scaleAbout = (c: Pt, sx: number, sy: number): Affine => [sx, 0, 0, sy, c.x - sx * c.x, c.y - sy * c.y];

/** Places a rest-space part at rest point `from`, moved to `to` and turned by `a` there. */
export const place = (from: Pt, to: Pt, a: number): Affine => compose(translate(to.x - from.x, to.y - from.y), rotateAbout(from, a));

/** Runs `draw` with the canvas moved by `m`: what it paints in rest space lands posed. */
export function posed(d: Draw, m: Affine, draw: () => void): void {
  const ctx = d.pen.ctx;
  ctx.save();
  ctx.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
  draw();
  ctx.restore();
}

/** The turn a warp applies near `p` (radians). */
export function turnAt(warp: (p: Pt) => Pt, p: Pt): number {
  const a = warp(p);
  const b = warp(pt(p.x + 1, p.y));
  return Math.atan2(b.y - a.y, b.x - a.x);
}

/** Point `p` turned by `a` about `c`. */
export function turn(p: Pt, c: Pt, a: number): Pt {
  const cs = Math.cos(a);
  const sn = Math.sin(a);
  return pt(c.x + (p.x - c.x) * cs - (p.y - c.y) * sn, c.y + (p.x - c.x) * sn + (p.y - c.y) * cs);
}

/**
 * Two-bone IK: the middle joint between `top` and `end` for bones `l1`, `l2`,
 * bowed out towards `toward` (a direction: back for an elbow, forward for a
 * knee). Out of reach, the limb straightens and `end` is pulled in.
 */
export function reach(top: Pt, end: Pt, l1: number, l2: number, toward: Pt): { mid: Pt; end: Pt } {
  const dx = end.x - top.x;
  const dy = end.y - top.y;
  const dist = Math.hypot(dx, dy) || 1e-6;
  const ux = dx / dist;
  const uy = dy / dist;
  const d = Math.max(Math.abs(l1 - l2) + 0.01, Math.min(l1 + l2 - 0.01, dist));
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  // The side of the top→end line the joint bows to.
  let nx = -uy;
  let ny = ux;
  if (nx * toward.x + ny * toward.y < 0) {
    nx = -nx;
    ny = -ny;
  }
  return { mid: pt(top.x + ux * a + nx * h, top.y + uy * a + ny * h), end: pt(top.x + ux * d, top.y + uy * d) };
}

export const clamp01 = (x: number): number => Math.max(0, Math.min(1, x));
export const smooth = (x: number): number => {
  const k = clamp01(x);
  return k * k * (3 - 2 * k);
};
export const frac = (x: number): number => x - Math.floor(x);
export const lerpN = (a: number, b: number, t: number): number => a + (b - a) * t;
/** A soft bump: 1 at `at`, 0 beyond `half` away, on a loop of 1. */
export function bump(t: number, at: number, half: number): number {
  const d = Math.abs(frac(t - at + 0.5) - 0.5);
  return d >= half ? 0 : 0.5 + 0.5 * Math.cos((Math.PI * d) / half);
}

/**
 * Keyframed numbers: each key is [t, values]; between keys the values ease
 * in and out, so each key is a held, readable pose.
 */
export function keyed<K extends string>(keys: readonly (readonly [number, Readonly<Record<K, number>>])[], t: number): Record<K, number> {
  let i = 0;
  while (i < keys.length - 2 && t > keys[i + 1]![0]) i++;
  const [t0, a] = keys[i]!;
  const [t1, b] = keys[i + 1]!;
  const k = smooth((t - t0) / (t1 - t0 || 1));
  const out = {} as Record<K, number>;
  for (const key of Object.keys(a) as K[]) out[key] = lerpN(a[key], b[key], k);
  return out;
}
