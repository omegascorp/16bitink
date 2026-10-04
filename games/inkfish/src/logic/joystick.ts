/**
 * On-screen thumbstick for touch screens: a fixed base in the bottom-left
 * corner. A finger that lands anywhere in the corner zone drives it, and the
 * stick reads how far the finger has pulled from the base centre.
 */
export const STICK = {
  /** Side of the bottom-left square that captures the thumb, px. */
  zone: 220,
  /** Pull from the centre that counts as full speed, px. */
  radius: 56,
  /** Fraction of `radius` ignored around the centre so a resting thumb doesn't drift. */
  deadZone: 0.15,
} as const;

export interface Vec {
  readonly x: number;
  readonly y: number;
}

/** Where the stick's base sits on a screen of this height. */
export function stickCentre(height: number): Vec {
  return { x: STICK.zone / 2, y: height - STICK.zone / 2 };
}

/** Whether a touch at (x, y) belongs to the stick. */
export function inStickZone(x: number, y: number, height: number): boolean {
  return x >= 0 && x < STICK.zone && y > height - STICK.zone && y <= height;
}

/** The finger's pull from the base, clamped to the rim: where to draw the knob, relative to the centre. */
export function knobOffset(dx: number, dy: number): Vec {
  const d = Math.hypot(dx, dy);
  if (d <= STICK.radius) return { x: dx, y: dy };
  return { x: (dx / d) * STICK.radius, y: (dy / d) * STICK.radius };
}

/** Swim direction for a pull of (dx, dy): a vector of length 0..1, zero inside the dead zone. */
export function stickVector(dx: number, dy: number): Vec {
  const d = Math.hypot(dx, dy);
  const dead = STICK.radius * STICK.deadZone;
  if (d <= dead) return { x: 0, y: 0 };
  const intent = Math.min(1, (d - dead) / (STICK.radius - dead));
  return { x: (dx / d) * intent, y: (dy / d) * intent };
}
