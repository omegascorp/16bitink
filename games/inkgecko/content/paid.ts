import type { LevelDef } from '../src/level/types';

/**
 * The full game's chapters (2 onwards). SERVER-ONLY: imported by the
 * website's content registry and served by /api/content/inkgecko to
 * verified owners. Never import this, or the chapter files, from the game's
 * client code or they ship to everyone (test/paywall.test.ts checks).
 */
export const INKGECKO_PAID_CHAPTERS: readonly (readonly LevelDef[])[] = [];
