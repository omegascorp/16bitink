import { CRITTER, inWater, makeCritter, swimmable, type Critter, type Surroundings } from './critters';
import { centre } from './items';
import type { Rng } from './rng';
import { movementOf, type SpeciesId } from './species';
import { surfaceRow, tileAt, TILE, type Terrain } from './terrain';

/** New creatures appear at least this many tiles from the player, so never in view. */
export const SPAWN_AWAY = 14;
/** Sandfish start this many tiles below the surface. */
const BURROW_DEPTH = { min: 3, max: 8 } as const;

/** Where a new creature can go. */
export interface SpawnSite {
  readonly terrain: Terrain;
  readonly tile: number;
  readonly rng: Rng;
  /** The player's column: new creatures keep their distance. */
  readonly crabCol: number;
  readonly pits: readonly (readonly [number, number])[];
  readonly dens: readonly (readonly [number, number])[];
  /** Creatures already about (an antlion or octopus already in a pit or den keeps others out). */
  readonly critters: readonly Critter[];
  readonly surroundings: Surroundings;
  /** The level's first creatures: lurkers take any pit, the player close by or not (they were there first). */
  readonly start: boolean;
  /** The highest root top in a column, where a climber can start (null where none grows). */
  readonly perch?: (x: number) => number | null;
}

/**
 * A new creature of a species and size range, placed for how it lives:
 * walkers on the surface, climbers up in the roots, sandfish down in the sand, fish in the water, an
 * antlion at the bottom of an empty pit, an octopus in an empty den. Those
 * that go anywhere go between columns `from` and `to`. Null when there's
 * nowhere for it.
 */
export function placeCritter(
  site: SpawnSite, id: number, species: SpeciesId, [lo, hi]: readonly [number, number],
  [from, to]: readonly [number, number] = [2, site.terrain.width - 3],
): Critter | null {
  const { terrain: t, tile: T, rng } = site;
  const move = movementOf(species);
  const size = (): number => lo + Math.floor(rng() * (hi - lo + 1));
  if (move === 'den') return inDen(site, id, size());
  for (let tries = 0; tries < 12; tries++) {
    const tx = move === 'lurk' ? emptyPit(site) : from + Math.floor(rng() * (to - from + 1));
    if (tx === null) return null;
    if (Math.abs(tx - site.crabCol) < SPAWN_AWAY && !(site.start && move === 'lurk')) continue;
    // Never up on a boat or stilt house, or in the shade under one: they come along the sand.
    if (tileAt(t, tx, surfaceRow(t, tx)) === TILE.wood) continue;
    if (move === 'swim') {
      const fish = inWaterAt(site, id, species, size(), tx);
      if (fish) return fish;
      continue;
    }
    const dir = rng() < 0.5 ? 1 : -1;
    const depth = move === 'burrow' ? BURROW_DEPTH.min + Math.floor(rng() * (BURROW_DEPTH.max - BURROW_DEPTH.min + 1)) : 0;
    // A climber starts up in the roots where there are some.
    const perch = move === 'climb' ? site.perch?.(tx) ?? null : null;
    const row = perch ?? surfaceRow(t, tx) + depth;
    const k = makeCritter(id, size(), tx * T + T / 2, row * T, dir, CRITTER.turnMin + rng() * 3, species);
    if (move === 'burrow' && !swimmable(t, k, T)) continue;
    return k;
  }
  return null;
}

/** A fish in the water somewhere down column `tx`; null if there's none there. */
function inWaterAt(site: SpawnSite, id: number, species: SpeciesId, size: number, tx: number): Critter | null {
  const { terrain: t, tile: T, rng } = site;
  const wet: number[] = [];
  for (let y = 0; y < t.height; y++) if (site.surroundings.wet(tx, y)) wet.push(y);
  if (!wet.length) return null;
  const ty = wet[Math.floor(rng() * wet.length)]!;
  const k = makeCritter(id, size, tx * T + T / 2, (ty + 1) * T - 1, rng() < 0.5 ? 1 : -1, CRITTER.turnMin, species);
  return inWater(t, k, T, site.surroundings) ? k : null;
}

/** An octopus in an empty den, its body centred on the crevice. */
function inDen(site: SpawnSite, id: number, size: number): Critter | null {
  const T = site.tile;
  const taken = (x: number, y: number): boolean => site.critters.some((k) => movementOf(k.species) === 'den' && Math.floor(centre(k).x / T) === x && Math.floor(centre(k).y / T) === y);
  const free = site.dens.filter(([x, y]) => !taken(x, y));
  if (!free.length) return null;
  const [x, y] = free[Math.floor(site.rng() * free.length)]!;
  const k = makeCritter(id, size, x * T + T / 2, y * T + T / 2, 1, CRITTER.turnMin, 'octopus');
  return { ...k, y: y * T + T / 2 - k.h / 2 };
}

/** A pit with no antlion in it yet, picked at random; null when every pit has one. */
function emptyPit(site: SpawnSite): number | null {
  const T = site.tile;
  const free = site.pits.filter(([col]) => !site.critters.some((k) => movementOf(k.species) === 'lurk' && Math.floor(centre(k).x / T) === col));
  return free.length ? free[Math.floor(site.rng() * free.length)]![0] : null;
}
