import type { Pt } from './path';

/**
 * The thumbstick for touch screens, in CSS px (as InkSnake's). A thumb that
 * lands near its resting ring in the lower-left corner sets the stick's base
 * there; the pull from that base aims the gecko, so a finger never has to
 * cover the marbles it aims at. Letting go spits; a quick tap swaps.
 */
export const STICK = {
  /** Pull from the base that reads as full, and where the knob stops. */
  radius: 56,
  /** Fraction of `radius` ignored round the base: a thumb let go in there spits nothing. */
  deadZone: 0.28,
  /** The knob's radius. */
  knob: 22,
  /** How far from the resting ring's centre a thumb still takes the stick (the rest of the board stays tap-to-aim). */
  reach: 104,
} as const;

/** A touch shorter than this, that barely moved, is a tap: ms and CSS px. */
export const TAP_MS = 240;
export const TAP_MOVE = 12;

/** Whether a touch at `at` lands on the stick resting at `rest`. */
export function inStickReach(at: Pt, rest: Pt): boolean {
  return Math.hypot(at.x - rest.x, at.y - rest.y) <= STICK.reach;
}

/** The pull (dx, dy) clamped to the rim: where the knob draws, from the base. */
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

/**
 * Rail levels: how hard a pull asks the gecko to run along its branch,
 * −1 (left) to 1 (right) in board terms, 0 inside the dead zone.
 */
export function stickRun(dx: number, dy: number, turn: number): number {
  const a = stickAngle(dx, dy, turn);
  if (a === null) return 0;
  const strength = Math.min(1, Math.hypot(dx, dy) / STICK.radius);
  const run = Math.cos(a) * strength;
  // A pull mostly up or down the screen's branch axis is a stop, not a crawl.
  return Math.abs(run) < 0.2 ? 0 : run;
}
