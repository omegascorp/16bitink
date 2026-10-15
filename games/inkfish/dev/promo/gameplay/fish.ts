import type { FishShape } from '../../../src/art/fishArt';
import type { Pose } from '../chain';
import { clamp01 } from '../short';
import type { PathPoint } from './zoomPath';

/**
 * Shared by the gameplay-highlight shorts (revenge/ is the first): fish
 * placed in a world the camera looks at, so the camera can pan and pull
 * back as you grow, the way the game's camera does.
 */

/** A fish in the world, before the camera: centre and length in world px, the rest as in Pose. */
export interface WorldFish {
  readonly shape: FishShape;
  readonly x: number;
  readonly y: number;
  readonly length: number;
  readonly facing: 1 | -1;
  readonly tilt: number;
  readonly beat: number;
  readonly effort: number;
}

export interface View {
  /** World point at the screen's focus, and screen px per world px. */
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
}

/** Seam time: a moment near the loop point as seconds from it (negative just before). */
export const seamTime = (t: number, loopS: number): number => (t >= loopS / 2 ? t - loopS : t);

/** Facing from a list of turns: [time, facing] in time order, the first from 0. */
export function facingAt(turns: readonly (readonly [number, 1 | -1])[], t: number): 1 | -1 {
  let f = turns[0]![1];
  for (const [at, to] of turns) if (t >= at) f = to;
  return f;
}

/** Nose up or down with the swim, from velocity; damped by the fish's size so slow drifts stay level (and so it scales with the world). */
export function tiltFrom(p: PathPoint, length: number): number {
  return Math.max(-0.85, Math.min(0.85, Math.atan2(-p.vy, Math.abs(p.vx) + 0.6 * length)));
}

/** A fish swimming along a path point. Give `beatHz` times the loop a whole number, so the tail is where it was at the seam. */
export function fishAt(shape: FishShape, p: PathPoint, length: number, facing: 1 | -1, beatHz: number, t: number): WorldFish {
  return {
    shape, x: p.x, y: p.y, length, facing,
    tilt: tiltFrom(p, length),
    beat: 2 * Math.PI * beatHz * t,
    effort: clamp01(Math.hypot(p.vx, p.vy) / (2.2 * length)),
  };
}

/** A world fish as a Pose (for mouthOf, suckedIn), still in world px. */
export const asPose = (f: WorldFish): Pose => ({ j: 0, age: 0, ...f });

/** A world fish where the camera shows it, `focus` being the screen point the view centres on. */
export function onScreen(f: WorldFish, v: View, focus: { readonly x: number; readonly y: number }): Pose {
  return { j: 0, age: 0, ...f, x: focus.x + v.zoom * (f.x - v.x), y: focus.y + v.zoom * (f.y - v.y), length: v.zoom * f.length };
}
