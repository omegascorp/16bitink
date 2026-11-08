import { BUILDING_IDS, type BuildingId } from '../logic/buildings';
import type { SoldMachine } from '../logic/items';

/**
 * What the campaign opens, map by map: each map can build everything the
 * maps before it opened, and what it adds. The rest of the town (and the
 * units it hires) waits for later maps, so going on through the campaign
 * is how a town grows its full tree.
 */
export const UNLOCKS: readonly (readonly BuildingId[])[] = [
  // Map 1: the walls, a hall, the four lowest dwellings. No magic yet: Rowan finds a spellbook on map 2.
  ['villageHall', 'townHall', 'fort', 'citadel', 'tavern', 'guardhouse', 'archeryRange', 'griffinTower', 'barracks'],
  // Map 2: the first upgrades of those four, the centaurs, the market, both floors of the guild, and the Blacksmith, ahead of the chapter's first siege.
  ['cityHall', 'marketplace', 'mageGuild1', 'mageGuild2', 'blacksmith', 'stables', 'monastery', 'guardhouse2', 'archeryRange2', 'griffinTower2', 'barracks2'],
  // Map 3: the Castle, the second upgrades of the first four, the companions and the centaurs' first upgrade.
  ['castle', 'tiltyard', 'monastery2', 'guardhouse3', 'archeryRange3', 'griffinTower3', 'barracks3'],
];

/** The buildings open by map `n` (1-based). */
export const openBy = (n: number): Set<BuildingId> => new Set(UNLOCKS.slice(0, n).flat());

/** What map `n` switches off: everything the campaign hasn't opened by then. */
export const lockedOn = (n: number): BuildingId[] => BUILDING_IDS.filter((b) => !openBy(n).has(b));

/** The war machines the Blacksmith sells, map by map, opened like its buildings: one grade at a time. */
export const MACHINE_UNLOCKS: readonly (readonly SoldMachine[])[] = [
  // Map 1: no Blacksmith yet.
  [],
  // Map 2: the Catapult, for Thornwood's walls.
  ['catapult'],
  // Map 3: the Bronze Catapult, for Korax's.
  ['catapult2'],
];

/** The machines on sale by map `n` (1-based), lesser first. */
export const soldOn = (n: number): SoldMachine[] => MACHINE_UNLOCKS.slice(0, n).flat();
