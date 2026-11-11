import type { Pt } from './path';

/**
 * The thumbstick for touch screens, in CSS px. Its base stays put on its
 * ring in the lower-left corner: the pull is measured from the ring's
 * centre, not from where the thumb landed, so a thumb that slips off the
 * glass for a moment and lands again pulls the same way it did. The pull
 * aims the gecko (or runs it along its branch); spitting is the Spit
 * button's job, so letting go never spits.
 */
export const STICK = {
  /** Pull from the centre that reads as full, and where the knob stops. */
  radius: 60,
  /** Fraction of `radius` ignored round the centre: a thumb resting there leaves the aim alone. */
  deadZone: 0.22,
  /** The knob's radius. */
  knob: 24,
  /** How far from the ring's centre a thumb still takes the stick (the rest of the board stays tap-to-aim). */
  reach: 112,
} as const;

/** Whether a touch at `at` lands on the stick resting at `rest`. */
export function inStickReach(at: Pt, rest: Pt): boolean {
  return Math.hypot(at.x - rest.x, at.y - rest.y) <= STICK.reach;
}

/** The pull (dx, dy) clamped to the rim: where the knob draws, from the centre. */
export function knobOffset(dx: number, dy: number): Pt {
  const d = Math.hypot(dx, dy);
  if (d <= STICK.radius) return { x: dx, y: dy };
  return { x: (dx / d) * STICK.radius, y: (dy / d) * STICK.radius };
}

/** Whether a pull of (dx, dy) is out of the dead zone. */
export function pulled(dx: number, dy: number): boolean {
  return Math.hypot(dx, dy) > STICK.radius * STICK.deadZone;
}

/**
 * The board direction a pull of (dx, dy) on screen asks for, radians, or
 * null inside the dead zone. `turn` is how far the board is turned on screen.
 */
export function stickAngle(dx: number, dy: number, turn: number): number | null {
  if (!pulled(dx, dy)) return null;
  return Math.atan2(dy, dx) - turn;
}

/** A sideways pull this far past the dead zone runs the gecko flat out, as a share of `radius`. */
const RUN_FULL = 0.75;

/**
 * Rail levels: how hard a pull asks the gecko to run along its branch,
 * −1 (left) to 1 (right) in board terms. Only the pull along the branch
 * counts, so a thumb that drifts up or down as it slides keeps running.
 */
export function stickRun(dx: number, dy: number, turn: number): number {
  // The pull along the board's x axis, as the board lies on screen.
  const along = dx * Math.cos(turn) + dy * Math.sin(turn);
  const dead = STICK.radius * STICK.deadZone;
  if (Math.abs(along) <= dead) return 0;
  const run = (Math.abs(along) - dead) / (STICK.radius * RUN_FULL - dead);
  return Math.sign(along) * Math.min(1, run);
}
