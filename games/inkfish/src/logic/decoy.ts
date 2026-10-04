/**
 * The rubber duck decoy. It bobs up from where you ate it: under open sky it
 * floats on the surface until a bird carries it off; in the deep (no surface
 * in reach) it rises out of sight. While it is in play, hunters mob it
 * instead of you.
 */

/** A point hunters chase instead of the player. */
export interface Decoy {
  readonly x: number;
  readonly y: number;
}

export const DUCK = {
  /** Hunters this close to a duck go for it, px. */
  lure: 650,
  /** Size the duck counts as, for birds diving at it and catching it. */
  radius: 14,
  /** Top rising speed, px/s: brisk under the sky, slow in the deep so it lures a while on screen. */
  riseSpeed: 110,
  deepRiseSpeed: 45,
  /** How fast it picks up speed, px/s². */
  buoyancy: 160,
  /** Afloat, it sits this far below the surface line (half in the water). */
  floatDepth: 4,
  /** Sideways drift while afloat, px/s. */
  driftSpeed: 14,
} as const;

/** The nearest decoy within `reach` of (x, y), or null. */
export function nearestDecoy(x: number, y: number, decoys: readonly Decoy[], reach: number): Decoy | null {
  let best: Decoy | null = null;
  let bestD = reach * reach;
  for (const d of decoys) {
    const dd = (d.x - x) ** 2 + (d.y - y) ** 2;
    if (dd < bestD) {
      best = d;
      bestD = dd;
    }
  }
  return best;
}

/** One step of a rising duck. vy is negative going up. With a surface it stops there and reports `afloat`. */
export function riseStep(y: number, vy: number, dt: number, surfaceY: number | null): { y: number; vy: number; afloat: boolean } {
  const top = surfaceY === null ? DUCK.deepRiseSpeed : DUCK.riseSpeed;
  const nextVy = Math.max(-top, vy - DUCK.buoyancy * dt);
  const nextY = y + nextVy * dt;
  if (surfaceY !== null && nextY <= surfaceY + DUCK.floatDepth) return { y: surfaceY + DUCK.floatDepth, vy: 0, afloat: true };
  return { y: nextY, vy: nextVy, afloat: false };
}
