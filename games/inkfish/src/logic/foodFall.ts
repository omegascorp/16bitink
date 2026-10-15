import type { Rng } from './rng';

/**
 * "Food fall" levels: the zone's food (see levels/foodFalls.ts) sinks from
 * above one or two pieces at a time and must be eaten before it reaches the
 * seabed, where the scavengers take it. A lost piece is replaced, so the level
 * can always be finished; missing them only costs time.
 */

/** Pieces in the water at once. */
export const MAX_SINKING = 2;
/** How far to the side of the player a piece is dropped: never on their head, never out of reach. */
const DROP_NEAR = 150;
const DROP_FAR = 900;

/** How many pieces to drop now, given how many are needed, eaten and already sinking. */
export function morselsToDrop(count: number, eaten: number, sinking: number): number {
  return Math.max(0, Math.min(MAX_SINKING - sinking, count - eaten - sinking));
}

/** Where along the top the next piece comes from: to one side of the player (the sea is a ring, so there's no wall to dodge). */
export function morselDropX(playerX: number, rng: Rng): number {
  const side = rng() < 0.5 ? -1 : 1;
  return playerX + side * (DROP_NEAR + rng() * (DROP_FAR - DROP_NEAR));
}
