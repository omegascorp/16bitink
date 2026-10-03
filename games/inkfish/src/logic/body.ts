/**
 * Collision shapes that match how fish look: a capsule (a segment from the
 * head to the tail stalk, swept by the body's half height) instead of a
 * circle as wide as the fish is long. A slim fish can't be bumped from above.
 */
export interface Capsule {
  readonly ax: number;
  readonly ay: number;
  readonly bx: number;
  readonly by: number;
  readonly r: number;
}

export interface BodyPose {
  readonly x: number;
  readonly y: number;
  /** Sprite rotation, radians. */
  readonly rotation: number;
  /** Facing left (sprite flipped). */
  readonly flipped: boolean;
  /** World units per texture px. */
  readonly scale: number;
}

/** Body proportions in texture px: half length (nose to tail stalk) and half height. */
export interface BodyShape {
  readonly hl: number;
  readonly hh: number;
}

/** Fins and outline wobble are left out, and the edge is slightly forgiving. */
const BODY_SLACK = 0.9;

export function capsuleOf(pose: BodyPose, shape: BodyShape): Capsule {
  const r = shape.hh * pose.scale * BODY_SLACK;
  // The segment stops one radius short of each end, so the capsule ends at nose and stalk.
  const half = Math.max(0, shape.hl * pose.scale - r);
  const dir = pose.flipped ? -1 : 1;
  const ux = Math.cos(pose.rotation) * dir;
  const uy = Math.sin(pose.rotation) * dir;
  return { ax: pose.x + ux * half, ay: pose.y + uy * half, bx: pose.x - ux * half, by: pose.y - uy * half, r };
}

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

/** Squared distance from a point to the segment a-b. */
function pointSegment2(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : clamp01(((px - ax) * dx + (py - ay) * dy) / len2);
  const ex = ax + dx * t - px;
  const ey = ay + dy * t - py;
  return ex * ex + ey * ey;
}

const cross = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number): number =>
  (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);

/** Squared distance between segments p and q (0 when they cross). */
function segmentSegment2(p: Capsule, q: Capsule): number {
  const d1 = cross(p.ax, p.ay, p.bx, p.by, q.ax, q.ay);
  const d2 = cross(p.ax, p.ay, p.bx, p.by, q.bx, q.by);
  const d3 = cross(q.ax, q.ay, q.bx, q.by, p.ax, p.ay);
  const d4 = cross(q.ax, q.ay, q.bx, q.by, p.bx, p.by);
  if (d1 * d2 < 0 && d3 * d4 < 0) return 0;
  return Math.min(
    pointSegment2(p.ax, p.ay, q.ax, q.ay, q.bx, q.by),
    pointSegment2(p.bx, p.by, q.ax, q.ay, q.bx, q.by),
    pointSegment2(q.ax, q.ay, p.ax, p.ay, p.bx, p.by),
    pointSegment2(q.bx, q.by, p.ax, p.ay, p.bx, p.by),
  );
}

/** Two bodies overlap. `factor` < 1 demands a deeper overlap (a bite, not a brush). */
export function capsulesTouch(a: Capsule, b: Capsule, factor = 1): boolean {
  const reach = (a.r + b.r) * factor;
  return segmentSegment2(a, b) < reach * reach;
}

/** A body overlaps a round thing (jellyfish, hook tip, item, ink drop). */
export function capsuleTouchesCircle(a: Capsule, x: number, y: number, r: number, factor = 1): boolean {
  const reach = (a.r + r) * factor;
  return pointSegment2(x, y, a.ax, a.ay, a.bx, a.by) < reach * reach;
}
