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
  // Map 2: the first upgrades of those four, the centaurs, the market, both floors of the guild, the Blacksmith, ahead of the chapter's first siege, and the Storehouse, for the second hero's gear, with the Portal that keeps the towns' stores as one.
  ['cityHall', 'marketplace', 'mageGuild1', 'mageGuild2', 'blacksmith', 'storehouse', 'stables', 'monastery', 'guardhouse2', 'archeryRange2', 'griffinTower2', 'barracks2', 'portal'],
  // Map 3: the Castle, the Treasury, the second upgrades of the first four, the companions and the centaurs' first upgrade; the Summoning Portal, so a hero left to guard a town has the week's band to fight (user, Nov 10: from mid-chapter, when guards start to sit idle).
  ['castle', 'treasury', 'tiltyard', 'monastery2', 'guardhouse3', 'archeryRange3', 'griffinTower3', 'barracks3', 'portal2'],
  // Map 4, Othrys, the chapter's last part: the rest of the tree, so the chapter ends with its whole city (the Capitol, the Titans' line, the last upgrades of lines 5 and 6, the Great Portal's way between towns).
  ['capitol', 'tiltyard2', 'tiltyard3', 'monastery3', 'seraphSpire', 'seraphSpire2', 'seraphSpire3', 'portal3'],
];

/**
 * Chapter 2, the Two Lands: a fresh start with a new people, so its towns
 * grow their tree again from the bottom, part by part (its own parts 1 to 4).
 */
export const TWO_LANDS_UNLOCKS: readonly (readonly BuildingId[])[] = [
  // Part 1, Nekhen: the halls and walls, the Tavern, the House of Life's first floor and Osiris's temple (the Rites and Ankhs are the part's lesson), the four lowest dwellings.
  ['villageHall', 'townHall', 'fort', 'citadel', 'tavern', 'mageGuild1', 'templeOsiris', 'guardhouse', 'archeryRange', 'griffinTower', 'barracks'],
  // Part 2, Abu: the chapter's first siege, so the Workshop (the Earth Ramp); the market, the House of Life's second floor, the Storehouse, the Chariot Road, the embalmers, the first upgrades of lines 1–4, and the Shrine of Wepwawet.
  ['cityHall', 'marketplace', 'mageGuild2', 'blacksmith', 'storehouse', 'stables', 'monastery', 'guardhouse2', 'archeryRange2', 'griffinTower2', 'barracks2', 'portal'],
  // Part 3, the Red Land (as the Black Banner opened Korax's tier): the Castle, the Treasury, the Sphinx Terrace (line 6), Per-Nefer (line 5's first upgrade), the second upgrades of lines 1–4, the Gate of the Duat (the guard's weekly band). The Benben Stone waits for part 4.
  ['castle', 'treasury', 'tiltyard', 'monastery2', 'guardhouse3', 'archeryRange3', 'griffinTower3', 'barracks3', 'portal2'],
  // Part 4, the Delta, the chapter's last part: the rest of the tree, so the chapter ends with its whole city (the Capitol, the Bennu's line, the last upgrades of lines 5 and 6, the Great Gate).
  ['capitol', 'tiltyard2', 'tiltyard3', 'monastery3', 'seraphSpire', 'seraphSpire2', 'seraphSpire3', 'portal3'],
];

/**
 * Chapter 3, the Long Winter: the Norse, a fresh start again. Parts 1 and 2
 * are the design's (docs/inkheroes-design.md, "The parts"); parts 3 and 4
 * follow chapter 2's (part 3 built as drafted, Nov 11; part 4 for its map agent to change).
 */
export const LONG_WINTER_UNLOCKS: readonly (readonly BuildingId[])[] = [
  // Part 1, Hladir: the halls and walls, the Tavern, the Mead Hall (the people's own), the four lowest dwellings. No Hof yet: Hervor finds her rune staff in part 2.
  ['villageHall', 'townHall', 'fort', 'citadel', 'tavern', 'meadHall', 'guardhouse', 'archeryRange', 'griffinTower', 'barracks'],
  // Part 2, Uppsala: the Hof, both floors (Rune Magic is the part's lesson), the Boar Pen (line 5); the market, the Storehouse, the Ski Track, the first upgrades of lines 1–4, the Bifrost Stone.
  ['mageGuild1', 'mageGuild2', 'monastery', 'cityHall', 'marketplace', 'storehouse', 'stables', 'guardhouse2', 'archeryRange2', 'griffinTower2', 'barracks2', 'portal'],
  // Part 3, the Bloodaxe: the ram and a rival, so the Shipwright; the Castle, the Treasury, the Shield Hall (line 6), the Iron Pen, the second upgrades of lines 1–4, the Gate of the Nine Worlds.
  ['blacksmith', 'castle', 'treasury', 'tiltyard', 'monastery2', 'guardhouse3', 'archeryRange3', 'griffinTower3', 'barracks3', 'portal2'],
  // Part 4, Halogaland, the chapter's last part: the rest of the tree (the Capitol, the dragons, the last upgrades of lines 5 and 6, Bifrost).
  ['capitol', 'tiltyard2', 'tiltyard3', 'monastery3', 'seraphSpire', 'seraphSpire2', 'seraphSpire3', 'portal3'],
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
  // Map 4, Othrys: nothing new (the Syracusan Catapult stays a prize).
  [],
];

/** Chapter 2's: Egypt's Workshop sells siege ramps, the Earth Ramp from part 2 (Abu, the chapter's first siege) and the Brick Ramp from part 3. */
export const TWO_LANDS_MACHINE_UNLOCKS: readonly (readonly SoldMachine[])[] = [
  // Part 1, Nekhen: no Workshop yet.
  [],
  ['ramp'],
  ['ramp2'],
  // Part 4, the Delta: nothing new (the Ramp of the Pyramid Builders stays the Serpent's prize).
  [],
];

/** Chapter 3's: the Shipwright sells the Ram from part 3 (the Bloodaxe's ring forts) and the Iron Ram from part 4; the Ram of the Sea-Kings is part 4's prize. */
export const LONG_WINTER_MACHINE_UNLOCKS: readonly (readonly SoldMachine[])[] = [
  [],
  [],
  ['ram'],
  ['ram2'],
];

/** Where chapter 2's parts begin in the campaign's order (not shown: the player reads them as parts 1–4, src/level/maps.ts `partNumber`). */
export const TWO_LANDS_FIRST = 5;
/** Where chapter 3's parts begin. */
export const LONG_WINTER_FIRST = 9;

/** The machines on sale by map `n` (1-based, campaign-wide), lesser first: each chapter's own, opened part by part. */
export const soldOn = (n: number): SoldMachine[] => {
  if (n >= LONG_WINTER_FIRST) return LONG_WINTER_MACHINE_UNLOCKS.slice(0, n - LONG_WINTER_FIRST + 1).flat();
  return n >= TWO_LANDS_FIRST ? TWO_LANDS_MACHINE_UNLOCKS.slice(0, n - TWO_LANDS_FIRST + 1).flat() : MACHINE_UNLOCKS.slice(0, n).flat();
};
