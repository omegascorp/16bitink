import type { Pt } from './vec';

/**
 * The thumbstick for touch screens, in CSS px. It floats: a thumb that
 * lands in the lower-left part of the screen sets the stick's base there,
 * and the pull from that base steers the head the way the arrow keys do,
 * so a finger never has to sit on the snake to steer it.
 */
export const STICK = {
  /** Pull from the base that reads as a full turn, and where the knob stops. */
  radius: 56,
  /** Fraction of `radius` ignored round the base, so a resting thumb doesn't steer. */
  deadZone: 0.22,
  /** The knob's radius. */
  knob: 22,
  /** The corner that takes the thumb: a share of the screen, capped. */
  zone: { w: 0.42, maxW: 300, h: 0.55, maxH: 320 },
} as const;

export interface StickSize {
  readonly width: number;
  readonly height: number;
}

/** Whether a touch at (x, y) on a screen this size lands in the stick's corner. */
export function inStickZone(x: number, y: number, screen: StickSize): boolean {
  const w = Math.min(screen.width * STICK.zone.w, STICK.zone.maxW);
  const h = Math.min(screen.height * STICK.zone.h, STICK.zone.maxH);
  return x >= 0 && x < w && y > screen.height - h && y <= screen.height;
}

/** The pull (dx, dy) clamped to the rim: where the knob draws, from the base. */
export function knobOffset(dx: number, dy: number): Pt {
  const d = Math.hypot(dx, dy);
  if (d <= STICK.radius) return { x: dx, y: dy };
  return { x: (dx / d) * STICK.radius, y: (dy / d) * STICK.radius };
}

/** The direction a pull of (dx, dy) asks for, radians, or null inside the dead zone. */
export function stickAngle(dx: number, dy: number): number | null {
  if (Math.hypot(dx, dy) <= STICK.radius * STICK.deadZone) return null;
  return Math.atan2(dy, dx);
}
