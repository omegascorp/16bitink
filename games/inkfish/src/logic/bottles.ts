import type { Rng } from './rng';

/**
 * "Ink bottles" levels: bottles of ink sink from the surface one or two at a
 * time and must be caught before they smash on the seabed. A smashed one is
 * replaced, so the level can always be finished; missing them only costs time.
 */

/** Bottles in the water at once. */
export const MAX_SINKING = 2;
/** How far to the side of the player a bottle is dropped: never on their head, never out of reach. */
const DROP_NEAR = 150;
const DROP_FAR = 900;
const WORLD_EDGE = 100;

/** How many bottles to drop now, given how many are needed, caught and already sinking. */
export function bottlesToDrop(count: number, caught: number, sinking: number): number {
  return Math.max(0, Math.min(MAX_SINKING - sinking, count - caught - sinking));
}

/** Where along the surface the next bottle goes in: to one side of the player, inside the world. */
export function bottleDropX(playerX: number, worldWidth: number, rng: Rng): number {
  const side = rng() < 0.5 ? -1 : 1;
  const reach = DROP_NEAR + rng() * (DROP_FAR - DROP_NEAR);
  const pick = (dir: number): number => playerX + dir * reach;
  const inside = (x: number): boolean => x >= WORLD_EDGE && x <= worldWidth - WORLD_EDGE;
  // Against a wall, drop it on the open side instead.
  const x = inside(pick(side)) ? pick(side) : pick(-side);
  return Math.min(worldWidth - WORLD_EDGE, Math.max(WORLD_EDGE, x));
}
