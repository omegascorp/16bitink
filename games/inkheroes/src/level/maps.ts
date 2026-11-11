import { ASHFORD, BLACK_BANNER, OTHRYS, THORNWOOD } from './borderMarch';
import type { LineId } from '../narration/lines';
import { NORSE_CAMPAIGN, NORSE_VILLAINS } from '../logic/roster/norse';
import type { MapDef } from './types';

/** Chapter 1's parts, in order: one land played straight through (chapter 1 is free and ships with the game). */
export const MAPS: readonly MapDef[] = [ASHFORD, THORNWOOD, BLACK_BANNER, OTHRYS];

export type ChapterId = 'borderMarch' | 'twoLands' | 'longWinter';

/** A part as the campaign menu names it before its map is loaded (a paid one only comes to owners). */
export interface PartName {
  readonly id: string;
  readonly n: number;
  readonly name: string;
}

/**
 * A chapter of the campaign: one land that grows over its parts, with its
 * own saved game. A part's `n` is its place in the whole campaign (chapter
 * 2 begins at 5), which decides its chapter; the player reads it counted
 * within the chapter (`partNumber`: every chapter is parts 1, 2, 3…). A paid chapter's maps are fetched for owners only (src/scenes/BootScene.ts).
 */
export interface ChapterDef {
  readonly id: ChapterId;
  /** 1-based. */
  readonly n: number;
  readonly name: string;
  /** Its first and last part, campaign-wide (the last may not be built yet); shown as 1 to `partsIn`. */
  readonly first: number;
  readonly last: number;
  /** Part of the full game. */
  readonly paid: boolean;
  /** The parts built, named for the menu without their maps. */
  readonly parts: readonly PartName[];
  /** The parts as designed, for the card of a chapter with none built yet. */
  readonly planned?: readonly PartName[];
  /** What the chapter is, in a line or two, for a player who doesn't own it. */
  readonly pitch: string;
  /** Its saved game's own place in storage (none: the first, as it always was). */
  readonly slot?: string;
  /** What the narrator tells when its last part built is won (none yet: a chapter with no part built). */
  readonly ending?: LineId;
  /** What the chapter is, for the card that ends the chapter before it ("Chapter 2, The Two Lands, …"). */
  readonly teaser?: string;
  /** Its story villains, besides its parts' rival lords: never offered at the player's Taverns (src/logic/heroes.ts). */
  readonly villains?: readonly string[];
  /** Its campaign heroes, ours by the story (Hervor, Heid): never offered at a lord's Taverns, hired or not (src/logic/heroes.ts). */
  readonly heroes?: readonly string[];
}

const named = (m: MapDef): PartName => ({ id: m.id, n: m.n, name: m.name });

export const CHAPTERS: readonly ChapterDef[] = [
  { id: 'borderMarch', n: 1, name: 'The Border March', first: 1, last: 4, paid: false, parts: MAPS.map(named), ending: 'chapter-won', pitch: 'The Crown’s northern border, in four parts.' },
  {
    id: 'twoLands', n: 2, name: 'The Two Lands', first: 5, last: 8, paid: true, slot: 'twoLands',
    parts: [{ id: 'nekhen', n: 5, name: 'Nekhen' }, { id: 'abu', n: 6, name: 'Abu' }, { id: 'red-land', n: 7, name: 'The Red Land' }, { id: 'delta', n: 8, name: 'The Delta' }],
    // The Delta's win ends the chapter: Apepi beaten, the Two Lands are one.
    ending: 'twoLands-won',
    teaser: 'crosses to Egypt: a new people, Neferet the priestess of Isis, and Sacred Rites that curse, ward and raise the fallen.',
    pitch: 'Egypt on the Nile, a new people, and Sacred Rites that curse, ward and raise the fallen.',
  },
  {
    // Chapter 3 (docs/inkheroes-design.md, "Chapter 3: The Long Winter"): its four parts, the maps in src/level/longWinter.ts.
    id: 'longWinter', n: 3, name: 'The Long Winter', first: 9, last: 12, paid: true, slot: 'longWinter',
    parts: [{ id: 'hladir', n: 9, name: 'Hladir' }, { id: 'uppsala', n: 10, name: 'Uppsala' }, { id: 'bloodaxe', n: 11, name: 'The Bloodaxe' }, { id: 'halogaland', n: 12, name: 'Halogaland' }],
    planned: [{ id: 'hladir', n: 9, name: 'Hladir' }, { id: 'uppsala', n: 10, name: 'Uppsala' }, { id: 'bloodaxe', n: 11, name: 'The Bloodaxe' }, { id: 'halogaland', n: 12, name: 'Halogaland' }],
    // Halogaland's win ends the chapter: Gunnhild's song stops and the sun rises over the fjord.
    ending: 'longWinter-won',
    villains: NORSE_VILLAINS,
    heroes: NORSE_CAMPAIGN,
    teaser: 'sails north to the Norse kingdoms: a new people, Hervor the shieldmaiden, berserkers and Rune Magic, in a winter that won’t end.',
    pitch: 'The Norse kingdoms in a winter that won’t end: a new people, berserkers and Rune Magic.',
  },
];

export const chapterById = (id: ChapterId): ChapterDef => CHAPTERS.find((c) => c.id === id)!;

/** The chapter part `n` belongs to, or none (never chapter 1's by default: its save slot isn't a stray part's). */
export const chapterOfPart = (n: number): ChapterDef | undefined => CHAPTERS.find((c) => n >= c.first && n <= c.last);

/** The chapter map `def` belongs to, if any. */
export const chapterOf = (def: Pick<MapDef, 'n'>): ChapterDef | undefined => chapterOfPart(def.n);

/** A part's number as the player reads it: counted within its chapter, from 1 (the Delta is chapter 2's part 4). */
export const partNumber = (def: Pick<MapDef, 'n'>): number => {
  const c = chapterOf(def);
  return c ? def.n - c.first + 1 : def.n;
};

/** How many parts chapter `c` has, built or not ("Part 1 of 4"). */
export const partsIn = (c: Pick<ChapterDef, 'first' | 'last'>): number => c.last - c.first + 1;

let paid: readonly MapDef[] = [];

/** The full game's maps, once fetched and checked (src/level/validate.ts): only for owners. */
export function installPaidMaps(maps: readonly MapDef[]): void {
  paid = maps;
}

/** Every map this player can play now: chapter 1's, and the paid ones if fetched. */
export const loadedMaps = (): readonly MapDef[] => [...MAPS, ...paid];

/** A chapter's parts that are loaded, in order (none for a paid chapter the player doesn't own). */
export const partsOf = (c: ChapterDef): readonly MapDef[] => (c.paid ? paid.filter((m) => m.n >= c.first && m.n <= c.last) : MAPS);

/** Whether this player can play chapter `c` now. */
export const isLoaded = (c: ChapterDef): boolean => partsOf(c).length > 0;

/** Whether chapter `c` is still being made, with no part built yet (its card says so, for owners too). */
export const comingSoon = (c: Pick<ChapterDef, 'parts'>): boolean => c.parts.length === 0;

export function mapById(id: string): MapDef | undefined {
  return loadedMaps().find((m) => m.id === id);
}

/** The loaded parts of the chapter `def` belongs to (none if it belongs to no chapter). */
const siblings = (def: Pick<MapDef, 'n'>): readonly MapDef[] => {
  const c = chapterOf(def);
  return c ? partsOf(c) : [];
};

/** The map before `def` in its chapter, if any. */
export const previousMap = (def: MapDef): MapDef | undefined => siblings(def).find((m) => m.n === def.n - 1);
/** The map after `def` in its chapter, if it is built (a chapter never rides on into the next). */
export const nextMap = (def: MapDef): MapDef | undefined => siblings(def).find((m) => m.n === def.n + 1);

/** Whether the campaign has opened `def`: a chapter's first map always, each later one once the map before it is won (`won` has a record for it). */
export function isOpen(def: MapDef, won: Readonly<Record<string, unknown>>): boolean {
  const before = previousMap(def);
  return !before || !!won[before.id];
}
