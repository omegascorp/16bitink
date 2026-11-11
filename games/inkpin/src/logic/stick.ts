/**
 * The thumbstick for touch screens, in CSS px (as InkGecko's). A ring in the
 * lower-left corner says where it is; the pull of a thumb near it, from the
 * ring's centre (not from where the thumb landed), walks Nib (or, pushed
 * mostly up or down by a vine, climbs it).
 */
export const STICK = {
  /** Pull from the base that reads as full, and where the knob stops. */
  radius: 50,
  /** A pull shorter than this does nothing, so a resting thumb doesn't walk Nib. */
  dead: 14,
  /** The knob's radius. */
  knob: 20,
  /** How far from the resting ring's centre a thumb still takes the stick (the rest of the board is pins and looking around). */
  reach: 100,
} as const;

export interface Pt {
  readonly x: number;
  readonly y: number;
}

/** What the stick asks of Nib: walk left or right, or climb up or down a vine. */
export interface Steer {
  readonly dir: -1 | 0 | 1;
  readonly climb: -1 | 0 | 1;
}

export const STILL: Steer = { dir: 0, climb: 0 };

/** Whether a touch at `at` lands on the stick's ring itself (inside its rim), not just near it. */
export function onStickRing(at: Pt, rest: Pt): boolean {
  return Math.hypot(at.x - rest.x, at.y - rest.y) <= STICK.radius + 8;
}

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

/** The stick pulled by (dx, dy): mostly up or down by a vine climbs it, else left or right walks. */
export function steer(dx: number, dy: number, canClimb: boolean): Steer {
  if (canClimb && Math.abs(dy) > STICK.dead && Math.abs(dy) > Math.abs(dx)) return { dir: 0, climb: dy < 0 ? -1 : 1 };
  return { dir: dx > STICK.dead ? 1 : dx < -STICK.dead ? -1 : 0, climb: 0 };
}

export function sameSteer(a: Steer, b: Steer): boolean {
  return a.dir === b.dir && a.climb === b.climb;
}
