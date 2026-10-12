import { curveAt, type Key, VIDEO } from '../short';

/**
 * The little 3D the fangtooth short needs: the fish is a model in its own
 * space (centimetres; x forward to the snout, y up, z out of its left side),
 * placed in front of a fixed camera that looks down -z. Turning it towards
 * the camera, lunging at it and the X-ray's slow turn are all real
 * perspective, so the seam and the turns need no tricks.
 */
export interface V3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export const v3 = (x: number, y: number, z: number): V3 => ({ x, y, z });

/** Where the fish is and how it holds itself. */
export interface FishPose {
  /** Where its model origin is, camera space, cm (z negative: in front of the camera). */
  readonly x: number;
  readonly y: number;
  readonly z: number;
  /** Turn about the vertical, radians: 0 faces screen right (left side to us), π/2 faces the camera. */
  readonly yaw: number;
  /** Nose up, radians. */
  readonly pitch: number;
  /** 0 shut .. 1 gaping (JAW_MAX). */
  readonly jaw: number;
  /** Tail sway: phase (radians) and size (cm at the tail tip). */
  readonly beat: number;
  readonly sway: number;
  /** Fin flutter phase, radians. */
  readonly flutter: number;
}

/** Screen px per cm at 1 cm from the camera. */
export const FOCAL = 1500;
/** Where the camera's axis meets the screen: a little above the middle, clear of the captions. */
export const AIM = { x: VIDEO.width / 2, y: 700 } as const;

/** A point of the fish's model, in camera space. */
export function toCamera(p: FishPose, v: V3): V3 {
  // Pitch about the fish's z, then yaw about the vertical, then place it.
  const cp = Math.cos(p.pitch);
  const sp = Math.sin(p.pitch);
  const x1 = v.x * cp - v.y * sp;
  const y1 = v.x * sp + v.y * cp;
  const cy = Math.cos(p.yaw);
  const sy = Math.sin(p.yaw);
  return { x: p.x + x1 * cy - v.z * sy, y: p.y + y1, z: p.z + x1 * sy + v.z * cy };
}

/** A direction of the fish's model (no translation), in camera space. */
export function dirToCamera(p: FishPose, v: V3): V3 {
  return toCamera({ ...p, x: 0, y: 0, z: 0 }, v);
}

export interface Screen {
  readonly x: number;
  readonly y: number;
  /** Distance in front of the camera, cm (bigger is farther). */
  readonly depth: number;
  /** Screen px per cm there. */
  readonly scale: number;
}

const NEAR = 0.5;

export function project(c: V3): Screen {
  const depth = Math.max(NEAR, -c.z);
  const scale = FOCAL / depth;
  return { x: AIM.x + c.x * scale, y: AIM.y - c.y * scale, depth, scale };
}

/**
 * Where to put the fish so that its model point `focus` sits `dist` cm in
 * front of the camera, shifted on screen by (dx, dy) px: how the "camera"
 * moves, while the camera itself stays put.
 */
export function framed(focus: V3, dist: number, dx: number, dy: number, yaw: number, pitch: number): V3 {
  const at = toCamera({ x: 0, y: 0, z: 0, yaw, pitch, jaw: 0, beat: 0, sway: 0, flutter: 0 }, focus);
  const k = dist / FOCAL;
  return { x: dx * k - at.x, y: -dy * k - at.y, z: -dist - at.z };
}

/**
 * A value keyed through the loop that comes round smoothly: the keys are in
 * [0, period) and the curve runs on from the last key into the first one as
 * if it came again a period later. Keys without a rate ease in and out
 * (rate 0), so holds hold and moves start and stop gently.
 */
export function looped(keys: readonly Key[], period: number): (t: number) => number {
  const eased = keys.map((k) => ({ ...k, rate: k.rate ?? 0 }));
  const ext = [
    ...eased.slice(-2).map((k) => ({ ...k, t: k.t - period })),
    ...eased,
    ...eased.slice(0, 2).map((k) => ({ ...k, t: k.t + period })),
  ];
  return (t: number) => curveAt(ext, ((t % period) + period) % period).at;
}

/** Linear interpolation through (x, y) points sorted by x, smoothed by Catmull-Rom. */
export function profile(points: readonly (readonly [number, number])[]): (x: number) => number {
  const keys: Key[] = points.map(([x, y]) => ({ t: x, at: y }));
  return (x: number) => curveAt(keys, x).at;
}
