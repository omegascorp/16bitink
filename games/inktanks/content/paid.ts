import type { LevelDef } from '../src/logic/level/types';

/**
 * The full game's levels (11–50, chapters 2–5). SERVER-ONLY: imported by
 * the website's content registry and served by /api/content/inktanks to
 * verified owners. Never import this, or the chapter files it will list,
 * from the game's client code, or they ship to everyone.
 *
 * Empty until chapter 2 (Dust Flats) is built: the map shows chapters 2–5
 * as "coming". Add each chapter's levels here, and raise READY_CHAPTERS in
 * src/logic/campaign.ts, as it lands.
 */
export const INKTANKS_PAID_LEVELS: readonly LevelDef[] = [];
