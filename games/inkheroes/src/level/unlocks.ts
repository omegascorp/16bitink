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
  // Map 2: the first upgrades of those four, the centaurs, the market, both floors of the guild, the Blacksmith, ahead of the chapter's first siege, and the Storehouse, for the second hero's gear.
  ['cityHall', 'marketplace', 'mageGuild1', 'mageGuild2', 'blacksmith', 'storehouse', 'stables', 'monastery', 'guardhouse2', 'archeryRange2', 'griffinTower2', 'barracks2'],
  // Map 3: the Castle, the Treasury, the second upgrades of the first four, the companions and the centaurs' first upgrade.
  ['castle', 'treasury', 'tiltyard', 'monastery2', 'guardhouse3', 'archeryRange3', 'griffinTower3', 'barracks3'],
];

/**
 * Chapter 2, the Two Lands: a fresh start with a new people, so its towns
 * grow their tree again from the bottom, part by part (part 4 is the first).
 */
export const TWO_LANDS_UNLOCKS: readonly (readonly BuildingId[])[] = [
  // Part 4, Nekhen: the halls and walls, the Tavern, the House of Life's first floor and Osiris's temple (the Rites and Ankhs are the part's lesson), the four lowest dwellings.
  ['villageHall', 'townHall', 'fort', 'citadel', 'tavern', 'mageGuild1', 'templeOsiris', 'guardhouse', 'archeryRange', 'griffinTower', 'barracks'],
];

/** The buildings a chapter's `k`th part (1-based) can build: all its parts before it opened, and what it adds. */
export const openIn = (unlocks: readonly (readonly BuildingId[])[], k: number): Set<BuildingId> => new Set(unlocks.slice(0, k).flat());

/** What a chapter's `k`th part switches off. */
export const lockedIn = (unlocks: readonly (readonly BuildingId[])[], k: number): BuildingId[] => BUILDING_IDS.filter((b) => !openIn(unlocks, k).has(b));

/** The buildings open by map `n` (1-based) of chapter 1. */
export const openBy = (n: number): Set<BuildingId> => openIn(UNLOCKS, n);

/** What map `n` of chapter 1 switches off: everything the campaign hasn't opened by then. */
export const lockedOn = (n: number): BuildingId[] => lockedIn(UNLOCKS, n);

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
