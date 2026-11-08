/**
 * The contract for creature drawings. A drawer paints one creature in local
 * units: origin on the ground between its feet, facing right (+x), up is −y.
 * It must stay inside x −56..56 and y −104..12 (a little room below for its
 * shadow), in every pose. Battle and map sprites are baked from it at
 * CREATURE_RES and flipped for the right-hand army.
 *
 * `seed` steadies the pen's wobble; `f` (0..2) is the line-boil frame:
 * the pen is seeded `seed + f` so lines shimmer slightly between frames.
 *
 * `pose` says what the creature is doing and how far through it (see Pose).
 * Left out, it is the first idle frame. The pose moves the body itself:
 * legs stride, arms and weapons swing, wings beat, cloaks and tails follow.
 */
export type CreatureDrawer = (ctx: CanvasRenderingContext2D, seed: number, f: number, pose?: Pose) => void;

/**
 * - `idle`: standing ready, alive: breathing (chest and shoulders rise and
 *   fall), the weapon tip and head drift a little, cloth, tails and plumes
 *   stir. Small motions (1–3 units), a seamless loop: t = 1 is t = 0.
 * - `walk`: travelling, a seamless loop of one full stride: legs alternate,
 *   arms swing against them, the body rises and dips. Horses and wolves run
 *   their own gaits; flyers beat their wings in the air (they never walk in
 *   battle), with their feet tucked.
 * - `attack`: one strike, start to finish, not a loop: t = 0 is the idle
 *   stance, ~0.3 the wind-up (weight back, weapon drawn back), 0.5 the
 *   moment of contact or release (the arrow leaving the string, the spell
 *   leaving the hand), ~0.75 the follow-through, t = 1 back to the stance.
 *   Shooters and casters attack with their shot or spell.
 */
export type PoseKind = 'idle' | 'walk' | 'attack';

export interface Pose {
  readonly kind: PoseKind;
  /** How far through the motion, 0..1. */
  readonly t: number;
}

/** Frames baked for each pose: loops at t = i / n, the attack at t = i / (n − 1). */
export const POSE_FRAMES: Readonly<Record<PoseKind, number>> = { idle: 6, walk: 6, attack: 5 };

/** The attack frame that lands the blow (or looses the shot): t = 0.5. */
export const STRIKE_FRAME = 2;

/** The pose of frame `i` of `kind`. */
export function poseAt(kind: PoseKind, i: number): Pose {
  const n = POSE_FRAMES[kind];
  return { kind, t: kind === 'attack' ? i / (n - 1) : i / n };
}

export const IDLE: Pose = { kind: 'idle', t: 0 };

/** The baked frame, in units: the origin sits at (FRAME_W / 2, GROUND_Y). */
export const FRAME_W = 120;
export const FRAME_H = 124;
export const GROUND_Y = 112;
/** Texture px per unit. */
export const CREATURE_RES = 2;
