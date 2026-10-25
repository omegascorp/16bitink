import { CHAPTER_1 } from './chapter1';
import { PLACES, type LevelDef, type Place } from './types';

/** Chapters free to everyone; the rest are the full game, fetched from the server for owners. */
export const FREE_CHAPTERS = 1;
/** Chapters planned for the full game. */
export const PLANNED_CHAPTERS = 10;
/** Chapters made so far (free and paid); the map draws the rest as pencil drafts. */
export const BUILT_CHAPTERS = 10;
/** Chapter names, in order (the full game's are shown locked on the map). */
export const CHAPTER_NAMES: readonly string[] = ['The Farm', 'The Pine Barrens', 'The Dunes', 'The Savanna', 'The Rainforest', 'The Reef', 'The Mountains', 'The Heath', 'The Jungle', 'The Flooded Forest'];
/** Each chapter's snake, as the map and cards name it. */
export const CHAPTER_SNAKES: readonly string[] = ['corn snake', 'eastern hognose', 'sidewinder', 'egg-eater', 'paradise flying snake', 'banded sea krait', 'spider-tailed horned viper', 'adder', 'king cobra', 'green anaconda'];
export const CHAPTER_PLACES: readonly Place[] = PLACES;

let paid: readonly (readonly LevelDef[])[] = [];

/** The full game's chapters, once fetched and checked (see validate.ts). */
export function installPaidChapters(chapters: readonly (readonly LevelDef[])[]): void {
  paid = chapters;
}

/** Every chapter this player can play now: the free one, plus the paid ones if fetched. */
export function loadedChapters(): readonly (readonly LevelDef[])[] {
  return [CHAPTER_1, ...paid];
}

export function loadedLevels(): readonly LevelDef[] {
  return loadedChapters().flat();
}

/** Level ids in play order. */
export function levelOrder(): string[] {
  return loadedLevels().map((l) => l.id);
}

export function levelById(id: string | undefined): LevelDef | undefined {
  return id === undefined ? undefined : loadedLevels().find((l) => l.id === id);
}

/** The level after `id`, if one is loaded. */
export function nextLevel(id: string): LevelDef | undefined {
  const order = loadedLevels();
  const i = order.findIndex((l) => l.id === id);
  return i < 0 ? undefined : order[i + 1];
}

/** Which chapter (0-based) a level is in. */
export function chapterOf(id: string): number {
  return loadedChapters().findIndex((c) => c.some((l) => l.id === id));
}

/** The last free level: finishing it offers the full game. */
export function isFreeEnd(id: string): boolean {
  return CHAPTER_1[CHAPTER_1.length - 1]!.id === id;
}

/** The place a level is set in (the farm for anything unknown). */
export function placeOf(id: string): Place {
  return CHAPTER_PLACES[chapterOf(id)] ?? 'farm';
}
