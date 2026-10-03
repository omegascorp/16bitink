import type { SpeciesId } from '../levels/types';

/** A hunter only eats fish clearly smaller than itself, so the player can see it happen. */
export const HUNT_RATIO = 0.7;
/** How long a hunter ignores other fish after a meal. */
export const HUNT_COOLDOWN_MS = 5000;

const HUNTERS: ReadonlySet<SpeciesId> = new Set<SpeciesId>(['perch', 'pike', 'angler', 'eel']);

export function canHunt(hunter: SpeciesId, hunterSize: number, preySize: number): boolean {
  return HUNTERS.has(hunter) && preySize < hunterSize * HUNT_RATIO;
}
