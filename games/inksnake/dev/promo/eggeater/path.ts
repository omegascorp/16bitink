import { type Pt } from '../../../src/art/pen';
import { BODY_LEN } from './story';

/**
 * Where the egg-eater lies on the ground, and how a point on its round body
 * lands on the screen. The body is a tube along a path on the ground: from
 * the snout (s = 0, facing left) straight back along y = 0 (the neck, where
 * the egg goes down), then a U-turn towards the viewer and a loose S back
 * across the foreground to the tip of the tail. Path coordinates are world
 * units on the screen plane: x right, y down (further down = nearer).
 *
 * The camera looks a little down on the snake and a little from in front of
 * it, so a ring round the body (the lips round an egg) is seen as a narrow
 * ellipse that bows forward on the near side.
 */

/** Samples per unit of s in the lookup tables. */
export const FINE = 4;
/** The neck runs straight along the ground (y = 0) to here. */
export const STRAIGHT = 112;
/** Screen x moved per unit of depth towards the viewer (negative: near points shift towards the head). */
export const YAW = -0.4;
/** Screen y moved per unit of depth towards the viewer: how far the camera looks down. */
export const ELEV = 0.25;
/** Screen-plane y per unit of real depth along the ground, for the path's direction. */
const DEPTH = 0.4;
/** How much bigger the body is drawn per unit nearer (screen-plane y). */
const PERSP = 0.018;

/** The S-curve after the straight neck, as screen-plane points (Catmull-Rom). */
const CURVE: readonly Pt[] = [
  { x: STRAIGHT - 12, y: 0 }, { x: STRAIGHT, y: 0 }, { x: 125, y: 0.9 }, { x: 137, y: 3.9 }, { x: 144, y: 9.0 }, { x: 143, y: 14.6 }, { x: 135, y: 19.0 },
  { x: 119, y: 21.4 }, { x: 98, y: 21.8 }, { x: 77, y: 20.6 }, { x: 57, y: 18.0 }, { x: 38, y: 14.4 }, { x: 20, y: 12.5 },
  { x: 2, y: 13.8 }, { x: -14, y: 17.6 }, { x: -28, y: 21.2 }, { x: -44, y: 23.0 }, { x: -62, y: 22.6 }, { x: -82, y: 20.8 }, { x: -104, y: 19.6 }, { x: -126, y: 19 },
];

function catmull(pts: readonly Pt[], per: number): Pt[] {
  const out: Pt[] = [];
  for (let i = 1; i < pts.length - 2; i++) {
    const [p0, p1, p2, p3] = [pts[i - 1]!, pts[i]!, pts[i + 1]!, pts[i + 2]!];
    for (let k = 0; k < per; k++) {
      const t = k / per;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number): number =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push({ x: f(p0.x, p1.x, p2.x, p3.x), y: f(p0.y, p1.y, p2.y, p3.y) });
    }
  }
  out.push(pts[pts.length - 2]!);
  return out;
}

export interface Ground {
  /** The ground point under the body's axis (screen-plane world units). */
  readonly x: number;
  readonly y: number;
  /** The axis direction along the ground, as a unit vector in real (X, Z) ground space; Z towards the viewer. */
  readonly dx: number;
  readonly dz: number;
  /** Perspective: how much bigger than at y = 0. */
  readonly p: number;
}

const LUT: readonly Ground[] = (() => {
  const dense: Pt[] = [];
  for (let s = 0; s < STRAIGHT; s += 0.05) dense.push({ x: s, y: 0 });
  dense.push(...catmull(CURVE, 400));
  // Resample by arc length.
  const out: Ground[] = [];
  const n = BODY_LEN * FINE + 1;
  let j = 0;
  let acc = 0;
  for (let i = 0; i < n; i++) {
    const want = i / FINE;
    while (j < dense.length - 2) {
      const seg = Math.hypot(dense[j + 1]!.x - dense[j]!.x, dense[j + 1]!.y - dense[j]!.y);
      if (acc + seg >= want) break;
      acc += seg;
      j++;
    }
    const a = dense[j]!;
    const b = dense[j + 1]!;
    const seg = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const u = Math.min(1.5, (want - acc) / seg);
    const tx = (b.x - a.x) / seg;
    const tz = (b.y - a.y) / seg / DEPTH;
    const tl = Math.hypot(tx, tz) || 1;
    const y = a.y + (b.y - a.y) * u;
    out.push({ x: a.x + (b.x - a.x) * u, y, dx: tx / tl, dz: tz / tl, p: 1 + PERSP * y });
  }
  // Smooth the directions a little so the frame never twitches between samples.
  return out.map((g, i) => {
    let sx = 0;
    let sz = 0;
    for (let k = -6; k <= 6; k++) {
      const h = out[Math.max(0, Math.min(out.length - 1, i + k))]!;
      sx += h.dx;
      sz += h.dz;
    }
    const l = Math.hypot(sx, sz) || 1;
    return { ...g, dx: sx / l, dz: sz / l };
  });
})();

/** The ground frame at s (interpolated). */
export function groundAt(s: number): Ground {
  const f = Math.max(0, Math.min(LUT.length - 1, s * FINE));
  const i = Math.min(LUT.length - 2, Math.floor(f));
  const u = f - i;
  const a = LUT[i]!;
  const b = LUT[i + 1]!;
  const dx = a.dx + (b.dx - a.dx) * u;
  const dz = a.dz + (b.dz - a.dz) * u;
  const l = Math.hypot(dx, dz) || 1;
  // Before the snout the axis carries straight on.
  const before = Math.min(0, s);
  return { x: a.x + (b.x - a.x) * u + before, y: a.y + (b.y - a.y) * u, dx: dx / l, dz: dz / l, p: a.p + (b.p - a.p) * u };
}

/**
 * A point on the round body: `c` the height of its axis above the ground,
 * `r` its radius there, `th` the angle round it (0 the middle of the back,
 * ±π the middle of the belly; positive on the side towards the viewer while
 * the snake faces left).
 */
export function surfacePt(g: Ground, c: number, r: number, th: number): Pt {
  const sn = Math.sin(th) * r;
  const ox = -g.dz * sn;
  const oz = g.dx * sn;
  const ou = c + Math.cos(th) * r;
  return { x: g.x + g.p * (ox + YAW * oz), y: g.y + g.p * (ELEV * oz - ou) };
}

/** The angle round the body that faces the camera most squarely: the visible half is φ ± π/2. */
export function facing(g: Ground): number {
  return Math.atan2(-YAW * -g.dz + g.dx, ELEV);
}
