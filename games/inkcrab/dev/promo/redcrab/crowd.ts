import { createRng } from '../../../src/logic/rng';
import { clamp01, lerp } from '../short';
import { depthScale, groundPoint, underwater, WORLD } from './layout';
import {
  builtAt, cameraAt, LOOP_S, MOTHERS, motherWalkAt, mothersAt, nightAt, shakeAt, surgeAt,
} from './story';

/**
 * The march: a crowd of red crabs walking left to right from the forest to
 * the sea, once round the island strip per loop, so each one is back where
 * it started at the loop point. They come out of the shadow under the trees
 * and fade as they walk into the sea, so none is ever seen to jump. Lanes
 * squeeze together over the crab bridge, and the bridge lifts them.
 */
export const START_X = -150;
export const END_X = WORLD.shore + 260;
/** Once round in a loop: about 200 px a second, a brisk march. */
const TRACK = END_X - START_X;
export const SPEED = TRACK / LOOP_S;

export interface Walker {
  /** Where it is in the loop, as a share of the track at t = 0. */
  readonly phase: number;
  readonly depth: number;
  readonly size: number;
  /** A sway back and forth along its way: `cycles` whole cycles a loop, so it comes round too. */
  readonly sway: number;
  readonly cycles: number;
  readonly turn: number;
  /** When it leaves the beach at night (0 first .. 1 last): the crowd thins one by one rather than all fading together. */
  readonly stay: number;
}

/** A pose on screen: the ground point (x, y), its size, see-through-ness, tilt, and which way the boil runs. */
export interface Pose {
  readonly x: number;
  readonly y: number;
  readonly depth: number;
  readonly scale: number;
  readonly alpha: number;
  readonly tilt: number;
  readonly boil: number;
}

export const CROWD_SIZE = 320;

/** The crowd, sorted far to near so it can be drawn in order (the funnel keeps that order). */
export const CROWD: readonly Walker[] = (() => {
  const rng = createRng(2611);
  return Array.from({ length: CROWD_SIZE }, (_, i): Walker => ({
    // Evenly spread round the track, with a little jitter, so the river has no gaps.
    phase: (i + 0.6 * rng()) / CROWD_SIZE,
    depth: rng(),
    size: 0.85 + 0.3 * rng(),
    sway: 10 + 30 * rng(),
    cycles: 2 + Math.floor(rng() * 4),
    turn: rng() * Math.PI * 2,
    stay: rng(),
  })).sort((a, b) => a.depth - b.depth);
})();

/** Its world x at loop time t. */
export function walkerX(w: Walker, t: number): number {
  const along = (((w.phase + t / LOOP_S) % 1) + 1) % 1;
  return START_X + along * TRACK + w.sway * Math.sin((2 * Math.PI * w.cycles * t) / LOOP_S + w.turn);
}

/** Fades in out of the forest's shade and out into the sea. */
function presence(x: number, depth: number, surge: number): number {
  // Clear of the sway (up to 40 px) at both ends, so it is out of sight as it wraps round.
  return clamp01((x - START_X - 45) / 160) * (1 - underwater(x, depth, surge));
}

/** A crab on the ground at world x, depth, as seen at loop time t (the camera applied). */
export function poseAt(x: number, depth: number, size: number, t: number, boil: number): Pose {
  const g = groundPoint(x, depth, builtAt(t));
  return {
    x: x - cameraAt(t),
    y: g.y,
    depth: g.depth,
    scale: size * depthScale(g.depth),
    alpha: presence(x, depth, surgeAt(t)),
    tilt: g.slope,
    boil,
  };
}

/** Most of the crowd is in the sea by the time the moon is up: the beach empties, one crab after another, for the mothers. */
export const crowdShownAt = (w: Walker, t: number): number => clamp01((w.stay + 0.3 - 1.3 * nightAt(t)) / 0.3);

export function walkerPose(w: Walker, i: number, t: number): Pose {
  const pose = poseAt(walkerX(w, t), w.depth, w.size, t, i % 3);
  return { ...pose, alpha: pose.alpha * crowdShownAt(w, t) };
}

/** The red crab the narrator names, near the front and keeping pace with the camera. */
export const leadPose = (t: number): Pose =>
  poseAt(cameraAt(t) + 470 + 18 * Math.sin((2 * Math.PI * 4 * t) / LOOP_S), 0.97, 1.08, t, 0);

/** The hermit crab from the game, tagging along with the march near the front. */
export const hermitPose = (t: number): Pose =>
  poseAt(cameraAt(t) + 235 + 14 * Math.sin((2 * Math.PI * 3 * t) / LOOP_S + 1), 0.93, 1, t, 1);

/** A mother: down the beach to the waterline, rocking as she shakes out her eggs, then into the sea. */
export function motherPose(i: number, t: number): Pose {
  const m = MOTHERS[i]!;
  const walk = motherWalkAt(i, t);
  const x = walk <= 1 ? lerp(m.x - 260, m.x, walk) : lerp(m.x, m.x + 170, walk - 1);
  const pose = poseAt(x, m.depth, 1.5, t, i);
  const rock = 0.12 * shakeAt(t) * Math.sin(2 * Math.PI * 7 * t + i);
  // In the shallows she stays in full view (the eggs are the point); wading off, she fades.
  return { ...pose, alpha: mothersAt(t) * (1 - 0.8 * clamp01(walk - 1)), tilt: rock - 0.18 * shakeAt(t) };
}
