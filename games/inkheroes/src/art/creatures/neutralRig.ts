import { makeDraw, normals, pt, TAU } from '../kit';
import type { Pt } from '../pen';

/**
 * The rig for the neutral monsters (goblin, skeleton, bandit): the small
 * maths that turns a Pose into joint positions. Each drawer keeps its rest
 * pose as painted, and these place the parts: two-bone limbs solved from
 * hip to foot (or shoulder to hand), a foot's path through a stride, an
 * attack's beats, and the lag of hanging cloth.
 */

export const wave = (t: number, phase = 0): number => Math.sin(TAU * (t + phase));

/** 0 at t = 0, 1 halfway, back to 0: one breath a loop. */
export const breath = (t: number): number => (1 - Math.cos(TAU * t)) / 2;

/** A blip that peaks at `at` and is gone `w` either side (wraps round the loop): a twitch, a flick. */
export function pulse(t: number, at: number, w: number): number {
  const d = Math.abs(((t - at + 1.5) % 1) - 0.5);
  return Math.max(0, 1 - d / w);
}

const ease = (u: number): number => u * u * (3 - 2 * u);

/** The attack's beats: rest (0), wind-up (0.25), contact (0.5), follow-through (0.75), rest (1). */
export const BEATS = [0, 0.25, 0.5, 0.75, 1] as const;
export type Beats = readonly [number, number, number, number, number];

/** A value keyed on the attack's beats, eased between them. */
export function beat(t: number, v: Beats): number {
  const u = Math.max(0, Math.min(1, t));
  for (let i = 1; i < BEATS.length; i++) {
    if (u <= BEATS[i]!) {
      const k = (u - BEATS[i - 1]!) / (BEATS[i]! - BEATS[i - 1]!);
      return v[i - 1]! + (v[i]! - v[i - 1]!) * ease(k);
    }
  }
  return v[4];
}

/** A point keyed on the attack's beats. */
export const beatPt = (t: number, v: readonly [Pt, Pt, Pt, Pt, Pt]): Pt =>
  pt(beat(t, [v[0].x, v[1].x, v[2].x, v[3].x, v[4].x]), beat(t, [v[0].y, v[1].y, v[2].y, v[3].y, v[4].y]));

/** `p` turned by `a` about `c`. */
export function turn(p: Pt, c: Pt, a: number): Pt {
  const [cs, sn] = [Math.cos(a), Math.sin(a)];
  const x = p.x - c.x;
  const y = p.y - c.y;
  return pt(c.x + x * cs - y * sn, c.y + x * sn + y * cs);
}

/** A rigid move: turn by `a` about `o`, then shift by (dx, dy). */
export interface Xf {
  readonly o: Pt;
  readonly a: number;
  readonly dx: number;
  readonly dy: number;
}

export const xf = (o: Pt, a = 0, dx = 0, dy = 0): Xf => ({ o, a, dx, dy });

export function place(x: Xf, p: Pt): Pt {
  const r = turn(p, x.o, x.a);
  return pt(r.x + x.dx, r.y + x.dy);
}

/** Runs `draw` with the canvas moved by `x`, so parts painted in rest coordinates land where the pose puts them. */
export function within(ctx: CanvasRenderingContext2D, x: Xf, draw: () => void): void {
  if (x.a === 0 && x.dx === 0 && x.dy === 0) {
    draw();
    return;
  }
  ctx.save();
  ctx.translate(x.o.x + x.dx, x.o.y + x.dy);
  ctx.rotate(x.a);
  ctx.translate(-x.o.x, -x.o.y);
  draw();
  ctx.restore();
}

/** A two-bone limb measured off the rest drawing: its bone lengths and which way the middle joint bends. */
export interface Chain {
  readonly l1: number;
  readonly l2: number;
  readonly bend: 1 | -1;
}

export function chainOf(a: Pt, b: Pt, c: Pt): Chain {
  const cross = (c.x - a.x) * (b.y - a.y) - (c.y - a.y) * (b.x - a.x);
  return { l1: Math.hypot(b.x - a.x, b.y - a.y), l2: Math.hypot(c.x - b.x, c.y - b.y), bend: cross >= 0 ? 1 : -1 };
}

/** The middle joint (knee, elbow) of `ch` reaching from `a` to `c`; out of reach, the limb goes straight. */
export function joint(ch: Chain, a: Pt, c: Pt, bend: number = ch.bend): Pt {
  const dx = c.x - a.x;
  const dy = c.y - a.y;
  const dd = Math.hypot(dx, dy) || 1e-6;
  const d = Math.max(Math.abs(ch.l1 - ch.l2) + 0.01, Math.min(ch.l1 + ch.l2 - 0.01, dd));
  const x = (ch.l1 * ch.l1 - ch.l2 * ch.l2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, ch.l1 * ch.l1 - x * x));
  const [ux, uy] = [dx / dd, dy / dd];
  return pt(a.x + ux * x - uy * h * bend, a.y + uy * x + ux * h * bend);
}

/** The middle joint that hangs lower (an elbow drops, it doesn't poke up). */
export function lowJoint(ch: Chain, a: Pt, c: Pt): Pt {
  const p = joint(ch, a, c, 1);
  const q = joint(ch, a, c, -1);
  return p.y >= q.y ? p : q;
}

/** A foot through one stride: x along the ground from the hip, y its lift, `tilt` its toe (+ down). */
export interface Step {
  readonly x: number;
  readonly y: number;
  readonly tilt: number;
}

/**
 * Where a foot is at `u` (0..1) through its stride: planted and sliding
 * back from +reach to −reach for the first half, then lifted (up to `lift`)
 * and carried forward, toe down as it leaves and up as it reaches.
 */
export function step(u: number, reach: number, lift: number): Step {
  const w = ((u % 1) + 1) % 1;
  if (w < 0.5) return { x: reach * (1 - 4 * w), y: 0, tilt: 0 };
  const s = (w - 0.5) / 0.5;
  return { x: -reach + 2 * reach * ease(s), y: -lift * Math.sin(Math.PI * s), tilt: 0.32 * Math.cos(Math.PI * s) };
}

/** Body rise and dip through a stride: lowest as a foot comes down (t = 0, 0.5), highest passing (0.25, 0.75). */
export const strideBob = (t: number): number => (1 - Math.cos(TAU * 2 * t)) / 2;

/**
 * Cloth hung from `top` to `bottom` (y), swung by `s`: nothing moves at
 * the top and the hem moves all of `s`, so a cloak or a rag trails its body.
 */
export function hang(pts: readonly Pt[], top: number, bottom: number, s: Pt): Pt[] {
  if (s.x === 0 && s.y === 0) return [...pts];
  return pts.map((p) => {
    const k = Math.max(0, Math.min(1, (p.y - top) / (bottom - top)));
    const w = Math.pow(k, 1.3);
    return pt(p.x + s.x * w, p.y + s.y * w);
  });
}

/**
 * Speed lines along a weapon's path at the blow: three fine, tapering pen
 * strokes, the middle one strongest. Drawn over the finished sprite (not
 * inside it) so the silhouette pass doesn't outline them.
 */
export function smear(ctx: CanvasRenderingContext2D, seed: number, f: number, path: readonly Pt[], w: number, alpha: number): void {
  if (alpha <= 0.02 || path.length < 3) return;
  const d = makeDraw(ctx, seed + f + 7, f, 0);
  const n = normals(path);
  for (const [off, k, from] of [[0, 1, 0], [-1.8, 0.55, 0.3], [1.8, 0.45, 0.45]] as const) {
    const i0 = Math.floor((path.length - 1) * from);
    const line = path.slice(i0).map((p, i) => pt(p.x + n[i + i0]!.x * off, p.y + n[i + i0]!.y * off));
    d.pen.stroke(line, w * k, d.ink, alpha * k, false);
  }
}
