import type { LevelDef } from '../src/logic/level';
import { CHAPTER_2, CHAPTER_3 } from '../src/level/paid';

/**
 * The full game's chapters (2 onwards). SERVER-ONLY: imported by the
 * website's content registry and served by /api/content/inkpin to verified
 * owners. Never import this, or src/level/paid.ts, or the chapter files, from
 * the game's client code or they ship to everyone (test/paywall.test.ts checks).
 */
export const INKPIN_PAID_CHAPTERS: readonly (readonly LevelDef[])[] = [CHAPTER_2, CHAPTER_3];
