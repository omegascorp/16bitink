import { BUILDING_IDS, type BuildingId } from '../logic/buildings';

/**
 * What the campaign opens, map by map: each map can build everything the
 * maps before it opened, and what it adds. The rest of the town (and the
 * units it hires) waits for later maps, so going on through the campaign
 * is how a town grows its full tree.
 */
export const UNLOCKS: readonly (readonly BuildingId[])[] = [
  // Map 1: the walls, a hall, the guild's first floor, the four lowest dwellings.
  ['villageHall', 'townHall', 'fort', 'citadel', 'tavern', 'blacksmith', 'mageGuild1', 'guardhouse', 'archeryRange', 'griffinTower', 'barracks'],
  // Map 2: the first upgrades of those four, the centaurs, the market and the guild's second floor.
  ['cityHall', 'marketplace', 'mageGuild2', 'stables', 'monastery', 'guardhouse2', 'archeryRange2', 'griffinTower2', 'barracks2'],
  // Map 3: the Castle, the second upgrades of the first four, the companions and the centaurs' first upgrade.
  ['castle', 'tiltyard', 'monastery2', 'guardhouse3', 'archeryRange3', 'griffinTower3', 'barracks3'],
];

/** The buildings open by map `n` (1-based). */
export const openBy = (n: number): Set<BuildingId> => new Set(UNLOCKS.slice(0, n).flat());

/** What map `n` switches off: everything the campaign hasn't opened by then. */
export const lockedOn = (n: number): BuildingId[] => BUILDING_IDS.filter((b) => !openBy(n).has(b));
