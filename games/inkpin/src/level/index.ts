import type { LevelDef } from '../logic/level';
import { CELLAR } from './cellar';
import { CISTERN } from './cistern';
import { DOOR } from './door';
import { GOLD_RUSH } from './goldRush';
import { GUARD } from './guard';
import { IDOL_HALL } from './idolHall';
import { PIN_OVER_PIN } from './pinOverPin';
import { STAIR } from './stair';
import { TORCHES } from './torches';
import { WELL } from './well';

/** The Ink Atlas's five ruins, one chapter each (50 levels in all), in the order Nib visits them. */
export const CHAPTER_NAMES: readonly string[] = [
  'The Jungle Temple',
  'The Volcano Shrine',
  'The Desert Tomb',
  'The Frozen Monastery',
  'The Dragon’s Hoard',
];

/** Levels planned in each chapter. */
export const LEVELS_PER_CHAPTER = 10;

/** Chapters free to everyone; the rest are the full game, fetched from the server for owners. */
export const FREE_CHAPTERS = 1;
/** Chapters built so far (free and paid): the map shows the paid ones locked, the rest as pencil drafts. */
export const BUILT_CHAPTERS = 3;

/** Chapter 1, the Jungle Temple, in order. */
export const CHAPTER_1: readonly LevelDef[] = [DOOR, GOLD_RUSH, CISTERN, GUARD, CELLAR, PIN_OVER_PIN, WELL, STAIR, TORCHES, IDOL_HALL];

/**
 * The built chapters' levels, by chapter, that this player has installed:
 * Chapter 1 always, plus the paid chapters once fetched (see installPaidChapters).
 * A live binding, so every importer sees the paid chapters once they arrive.
 */
export let CHAPTERS: readonly (readonly LevelDef[])[] = [CHAPTER_1];

/** Every installed level in play order: a level opens once the one before it is won, across chapters. */
export let LEVELS: readonly LevelDef[] = CHAPTERS.flat();

/** Installs the full game's chapters (already validated, see validate.ts) after Chapter 1. */
export function installPaidChapters(chapters: readonly (readonly LevelDef[])[]): void {
  CHAPTERS = [CHAPTER_1, ...chapters];
  LEVELS = CHAPTERS.flat();
}

/** The last free level: finishing it offers the full game. */
export function isFreeEnd(id: string): boolean {
  return CHAPTER_1[CHAPTER_1.length - 1]?.id === id;
}
