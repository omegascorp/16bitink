import { ASHFORD, BLACK_BANNER, THORNWOOD } from './borderMarch';
import type { LineId } from '../narration/lines';
import type { MapDef } from './types';

/** Chapter 1's parts, in order: one land played straight through (chapter 1 is free and ships with the game). */
export const MAPS: readonly MapDef[] = [ASHFORD, THORNWOOD, BLACK_BANNER];

export type ChapterId = 'borderMarch' | 'twoLands';

/** A part as the campaign menu names it before its map is loaded (a paid one only comes to owners). */
export interface PartName {
  readonly id: string;
  readonly n: number;
  readonly name: string;
}

/**
 * A chapter of the campaign: one land that grows over its parts (numbered
 * on through the campaign: chapter 2 begins at part 4), with its own saved
 * game. A paid chapter's maps are fetched for owners only (src/scenes/BootScene.ts).
 */
export interface ChapterDef {
  readonly id: ChapterId;
  /** 1-based. */
  readonly n: number;
  readonly name: string;
  /** Its first and last part, campaign-wide (the last may not be built yet). */
  readonly first: number;
  readonly last: number;
  /** Part of the full game. */
  readonly paid: boolean;
  /** The parts built, named for the menu without their maps. */
  readonly parts: readonly PartName[];
  /** What the chapter is, in a line or two, for a player who doesn't own it. */
  readonly pitch: string;
  /** Its saved game's own place in storage (none: the first, as it always was). */
  readonly slot?: string;
  /** What the narrator tells when its last part built is won. */
  readonly ending: LineId;
  /** What the chapter is, for the card that ends the chapter before it ("Chapter 2, The Two Lands, …"). */
  readonly teaser?: string;
}

const named = (m: MapDef): PartName => ({ id: m.id, n: m.n, name: m.name });

export const CHAPTERS: readonly ChapterDef[] = [
  { id: 'borderMarch', n: 1, name: 'The Border March', first: 1, last: 3, paid: false, parts: MAPS.map(named), ending: 'chapter-won', pitch: 'The Crown’s northern border, in three parts.' },
  {
    id: 'twoLands', n: 2, name: 'The Two Lands', first: 4, last: 6, paid: true, slot: 'twoLands',
    parts: [{ id: 'nekhen', n: 4, name: 'Nekhen' }, { id: 'abu', n: 5, name: 'Abu' }, { id: 'red-land', n: 6, name: 'The Red Land' }],
    // The Red Land's win ends the chapter: the Two Lands are one.
    ending: 'twoLands-won',
    teaser: 'crosses to Egypt: a new people, Neferet the priestess of Isis, and Sacred Rites that curse, ward and raise the fallen.',
    pitch: 'Egypt on the Nile, a new people, and Sacred Rites that curse, ward and raise the fallen.',
  },
];

export const chapterById = (id: ChapterId): ChapterDef => CHAPTERS.find((c) => c.id === id)!;

/** The chapter part `n` belongs to, or none (never chapter 1's by default: its save slot isn't a stray part's). */
export const chapterOfPart = (n: number): ChapterDef | undefined => CHAPTERS.find((c) => n >= c.first && n <= c.last);

/** The chapter map `def` belongs to, if any. */
export const chapterOf = (def: Pick<MapDef, 'n'>): ChapterDef | undefined => chapterOfPart(def.n);

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
