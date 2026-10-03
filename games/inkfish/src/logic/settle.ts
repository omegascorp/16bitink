/** Slower than this (world units/s) a fish has no heading of its own. */
const DRIFT = 8;

/**
 * Which way the player ends up facing once the level is won: the way it is
 * swimming, or, when it has stopped, the way it was already turning. Never
 * edge-on, which is what a fish frozen mid-turn looks like.
 */
export function settleFacing(vx: number, turn: number): -1 | 1 {
  if (Math.abs(vx) > DRIFT) return vx < 0 ? -1 : 1;
  return turn < 0 ? -1 : 1;
}
