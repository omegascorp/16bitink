/**
 * Leaping out of the water where the level has open sky. Rush the surface fast
 * enough and you fly in an arc you can't steer, then splash back in. Pure, so
 * the feel can be tuned and tested without Phaser.
 */
export const JUMP = {
  /** Upward speed needed at the surface to leave the water (normal swimming is 300, a dash 820). */
  minSpeed: 360,
  /** A dash this recent still counts as a rush at the surface, even after it has slowed. */
  rushMs: 800,
  /** Breaking the surface kicks the fish up: its speed is multiplied by this, within the launch range. */
  kick: 1.6,
  minLaunch: 600,
  maxLaunch: 900,
  /** Pull back down while in the air, px/s². */
  gravity: 1500,
  /** Sideways speed lost per second in the air. */
  airDrag: 0.4,
  /** Fraction of the falling speed kept on hitting the water. */
  entryDamp: 0.4,
  /** No leap goes higher than this above the surface, even for the best leapers; the sky is drawn taller. */
  maxHeight: 340,
} as const;

export interface AirState {
  readonly y: number;
  readonly vy: number;
  readonly airborne: boolean;
}

export type SurfaceEvent = 'leap' | 'splash' | null;

/**
 * One vertical step at the surface. `top` is the highest a swimmer's centre
 * sits while in the water. Under water this only moves `y` (the caller keeps
 * it inside the water as before); it reports 'leap' when the swimmer breaks
 * out and 'splash' when it falls back in. `rushing` (just dashed, or on a
 * speed boost) leaps on any upward swim into the surface. `leap` scales the
 * height of the jump (a fish's leap stat).
 */
export function stepSurface(s: AirState, top: number, dt: number, canLeap: boolean, rushing = false, leap = 1): { state: AirState; event: SurfaceEvent } {
  if (s.airborne) {
    const vy = s.vy + JUMP.gravity * dt;
    const y = s.y + vy * dt;
    if (y >= top && vy > 0) return { state: { y, vy: vy * JUMP.entryDamp, airborne: false }, event: 'splash' };
    return { state: { y, vy, airborne: true }, event: null };
  }
  const y = s.y + s.vy * dt;
  if (canLeap && y < top && (s.vy < -JUMP.minSpeed || (rushing && s.vy < 0))) {
    // Height grows with the square of launch speed, so the leap stat scales it by its square root.
    const launch = Math.min(JUMP.maxLaunch, Math.max(JUMP.minLaunch, -s.vy * JUMP.kick)) * Math.sqrt(leap);
    return { state: { y, vy: -launch, airborne: true }, event: 'leap' };
  }
  return { state: { y, vy: s.vy, airborne: false }, event: null };
}
