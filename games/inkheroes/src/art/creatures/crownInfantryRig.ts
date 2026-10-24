import { pt, TAU, type Draw } from '../kit';
import type { Pt } from '../pen';
import { IDLE, type Pose } from './types';

/**
 * The Crown infantry's rig: how a pose places the joints. Each figure keeps
 * its painting in "body" units (the stance it was drawn in) and is posed by
 * a carriage (the upper body's lift, shift and lean about the hips), legs
 * solved from hip to foot, and arms solved from shoulder to hand, so the
 * same painted parts follow the joints, and whatever a hand holds follows it.
 */

export { TAU };

/** The pose, defaulting to the first idle frame, t wrapped into 0..1 for the loops. */
export function poseOf(pose?: Pose): Pose {
  const p = pose ?? IDLE;
  return p.kind === 'attack' ? { kind: p.kind, t: Math.max(0, Math.min(1, p.t)) } : { kind: p.kind, t: ((p.t % 1) + 1) % 1 };
}

/** A smooth 0 → 1. */
export const ease = (u: number): number => {
  const c = Math.max(0, Math.min(1, u));
  return c * c * (3 - 2 * c);
};

/** A value given at keys [t, v], eased between them. */
export function keyed(t: number, keys: readonly (readonly [number, number])[]): number {
  const first = keys[0]!;
  if (t <= first[0]) return first[1];
  for (let i = 1; i < keys.length; i++) {
    const [t0, v0] = keys[i - 1]!;
    const [t1, v1] = keys[i]!;
    if (t <= t1) return v0 + (v1 - v0) * ease((t - t0) / (t1 - t0));
  }
  return keys[keys.length - 1]![1];
}

/**
 * One attack channel: 0 at the stance, `wind` at the wind-up (t 0.3),
 * `hit` at contact (0.5), `follow` at the follow-through (0.75), 0 again at t 1.
 */
export const strike = (t: number, wind: number, hit: number, follow: number): number =>
  keyed(t, [[0, 0], [0.3, wind], [0.5, hit], [0.75, follow], [1, 0]]);

/** Interpolates two points. */
export const mixPt = (a: Pt, b: Pt, u: number): Pt => pt(a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u);

/** How the upper body is carried: lifted/shifted by (dx, dy) and leaned by `rot` (radians, + leans forward) about `pivot`. */
export interface Carriage {
  readonly dx: number;
  readonly dy: number;
  readonly rot: number;
  readonly pivot: Pt;
}

/** A body point, as the carriage puts it in the frame. */
export function carry(c: Carriage, p: Pt): Pt {
  const cs = Math.cos(c.rot);
  const sn = Math.sin(c.rot);
  const x = p.x - c.pivot.x;
  const y = p.y - c.pivot.y;
  return pt(c.pivot.x + c.dx + x * cs - y * sn, c.pivot.y + c.dy + x * sn + y * cs);
}

/** Runs `draw` in body units, under the carriage. */
export function carried(d: Draw, c: Carriage, draw: () => void): void {
  const ctx = d.pen.ctx;
  ctx.save();
  ctx.translate(c.pivot.x + c.dx, c.pivot.y + c.dy);
  ctx.rotate(c.rot);
  ctx.translate(-c.pivot.x, -c.pivot.y);
  draw();
  ctx.restore();
}

/** Runs `draw` moved by (dx, dy) and turned by `rot` about `about`. */
export function moved(d: Draw, dx: number, dy: number, rot: number, about: Pt, draw: () => void): void {
  const ctx = d.pen.ctx;
  ctx.save();
  ctx.translate(about.x + dx, about.y + dy);
  ctx.rotate(rot);
  ctx.translate(-about.x, -about.y);
  draw();
  ctx.restore();
}

/**
 * The middle joint of a two-bone limb from `a` to `b` (bone lengths l0, l1),
 * bent to one side: bend −1 puts it to the right of a → b travelling down
 * (a knee forward), +1 to the left (an elbow back). Out of reach, the limb
 * straightens and stretches a little rather than letting go.
 */
export function joint(a: Pt, b: Pt, l0: number, l1: number, bend: 1 | -1): Pt {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.hypot(dx, dy) || 1e-6;
  if (dist >= l0 + l1) return pt(a.x + (dx * l0) / (l0 + l1), a.y + (dy * l0) / (l0 + l1));
  const along = (l0 * l0 - l1 * l1 + dist * dist) / (2 * dist);
  const off = Math.sqrt(Math.max(0, l0 * l0 - along * along));
  const ux = dx / dist;
  const uy = dy / dist;
  // The normal (uy, −ux) lies to the right of a → b travelling down the screen; (−uy, ux) to its left.
  return pt(a.x + ux * along - bend * uy * off, a.y + uy * along + bend * ux * off);
}

/** A limb as drawn in the stance: its three points, whose bone lengths the solver keeps. */
export interface Bones {
  readonly a: Pt;
  readonly k: Pt;
  readonly b: Pt;
}

const dist = (p: Pt, q: Pt): number => Math.hypot(q.x - p.x, q.y - p.y);

/** The limb's middle joint for new ends, bent the way the stance bends it. */
export function solve(bones: Bones, a: Pt, b: Pt): Pt {
  const { a: a0, k: k0, b: b0 } = bones;
  const side = (b0.x - a0.x) * (k0.y - a0.y) - (b0.y - a0.y) * (k0.x - a0.x);
  return joint(a, b, dist(a0, k0), dist(k0, b0), side > 0 ? 1 : -1);
}

/** Where a foot is through a stride, u in 0..1: 0 the heel strike (forward), the stance to 0.5, then the swing. */
export interface Step {
  /** Forward of the foot's mid-stride place. */
  readonly x: number;
  /** Off the ground. */
  readonly lift: number;
  /** The foot's turn about the ankle (+ toe down). */
  readonly tilt: number;
}

export function step(u: number, reach: number, lift: number): Step {
  const v = ((u % 1) + 1) % 1;
  if (v < 0.5) return { x: reach * (1 - 4 * v), lift: 0, tilt: 0 };
  const s = (v - 0.5) * 2;
  return { x: -reach + 2 * reach * ease(s), lift: lift * Math.sin(Math.PI * s), tilt: 0.45 * Math.sin(Math.PI * s) * (0.55 - s) };
}

/** A leg: hip, knee and ankle in the frame, and how far the foot is lifted and turned. */
export interface Leg {
  readonly hip: Pt;
  readonly knee: Pt;
  readonly ankle: Pt;
  readonly lift: number;
  readonly tilt: number;
}

/**
 * A leg posed from its stance bones: the hip carried, the foot at `foot`
 * (the stance ankle's x moved by `x`, lifted by `lift`, turned by `tilt`).
 */
export function legOf(bones: Bones, c: Carriage, x: number, lift: number, tilt: number): Leg {
  const hip = carry(c, bones.a);
  const ankle = pt(bones.b.x + x, bones.b.y - lift);
  return { hip, knee: solve(bones, hip, ankle), ankle, lift, tilt };
}

/** Runs `draw` (a foot drawn standing on the ground at the stance ankle's x, `x0`) lifted and turned with the leg. */
export function footed(d: Draw, leg: Leg, x0: number, ankleY: number, draw: () => void): void {
  moved(d, leg.ankle.x - x0, -leg.lift, leg.tilt, pt(x0, ankleY), draw);
}

/** A walk's carriage: down a little on each footfall and up as the legs pass (two bobs a stride), a slight lean. */
export function walkCarriage(t: number, pivot: Pt, bob: number, lean: number, sink = 1): Carriage {
  const up = Math.sin(TAU * t) ** 2;
  return { dx: 0, dy: sink - bob * up, rot: lean, pivot };
}

/** An idle's carriage: breathing, the chest rising and falling once a loop. */
export function idleCarriage(t: number, pivot: Pt, breath: number): Carriage {
  return { dx: 0, dy: -breath * (0.5 - 0.5 * Math.cos(TAU * t)), rot: 0.006 * Math.sin(TAU * t), pivot };
}

/** A point turned about `c` by `a` radians. */
export function turn(p: Pt, c: Pt, a: number): Pt {
  const cs = Math.cos(a);
  const sn = Math.sin(a);
  return pt(c.x + (p.x - c.x) * cs - (p.y - c.y) * sn, c.y + (p.x - c.x) * sn + (p.y - c.y) * cs);
}
