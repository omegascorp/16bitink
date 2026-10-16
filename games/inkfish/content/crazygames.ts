import type { Chapter } from '../src/levels/types';
import { buildChapters } from './kit';
import { SHALLOW_RECIPES } from './shallows';

/**
 * The CrazyGames edition's chapters 2–4 (chapter 1 ships with the game):
 * 40 levels in all. Bundled into that build on purpose; it imports only the
 * shallows' recipes, so nothing about the deeper chapters ships with it.
 */
export const CRAZYGAMES_CHAPTERS: readonly Chapter[] = buildChapters(SHALLOW_RECIPES);
