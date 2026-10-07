import type { SpawnEntry } from '../levels/types';
import { rangeOf, type Rng } from './rng';

/** A fish is edible when it is clearly smaller than the eater. */
export const EDIBLE_RATIO = 0.9;
/** A fish is dangerous when it is clearly bigger than the player. */
export const DANGER_RATIO = 1.1;
/** Share of spawns guaranteed to be prey for the current player size. */
export const PREY_SPAWN_BIAS = 0.6;

export type Relation = 'prey' | 'peer' | 'predator';

export function relationTo(playerSize: number, otherSize: number): Relation {
  if (otherSize < playerSize * EDIBLE_RATIO) return 'prey';
  if (otherSize > playerSize * DANGER_RATIO) return 'predator';
  return 'peer';
}

/** Growth points for eating a fish; bigger meals are worth more. */
export function growthPointsFor(size: number): number {
  return Math.max(1, Math.round(size / 8));
}

export function scoreFor(size: number, multiplier: number): number {
  return Math.round(size * 10) * multiplier;
}

/** Circle overlap with a forgiving factor so bites feel generous. */
export function touches(
  ax: number, ay: number, ar: number,
  bx: number, by: number, br: number,
  factor = 0.75,
): boolean {
  const reach = (ar + br) * factor;
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy < reach * reach;
}

export interface SpawnPick {
  readonly entry: SpawnEntry;
  readonly size: number;
}

function weighted(entries: readonly SpawnEntry[], rng: Rng): SpawnEntry {
  const total = entries.reduce((sum, e) => sum + e.weight, 0);
  let roll = rng() * total;
  for (const entry of entries) {
    roll -= entry.weight;
    if (roll <= 0) return entry;
  }
  return entries[entries.length - 1]!;
}

/**
 * Picks the next fish to spawn. Biased towards prey so the player
 * always has something to eat, without removing the threats.
 */
export function pickSpawn(entries: readonly SpawnEntry[], playerSize: number, rng: Rng, preyOnly = false): SpawnPick {
  if (entries.length === 0) throw new Error('pickSpawn: level has no spawn entries');
  const maxPrey = playerSize * EDIBLE_RATIO;
  const prey = entries.filter((e) => e.size[0] < maxPrey);
  // `preyOnly`: always something you can eat, when the level has anything that small.
  if (prey.length > 0 && (preyOnly || rng() < PREY_SPAWN_BIAS)) {
    const entry = weighted(prey, rng);
    return { entry, size: rangeOf(rng, entry.size[0], Math.min(entry.size[1], maxPrey)) };
  }
  const entry = weighted(entries, rng);
  return { entry, size: rangeOf(rng, entry.size[0], entry.size[1]) };
}
