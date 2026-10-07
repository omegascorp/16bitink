import type { ThemeId } from '../art/backdrop';
import { BEACH_1 } from './beach1';
import type { LevelDef } from './types';

/** Each built beach's levels, beach 1 first; beaches still to be built are missing from the end. */
export const BEACHES: readonly (readonly LevelDef[])[] = [BEACH_1];

/** Every playable level, in order. */
export const LEVELS: readonly LevelDef[] = BEACHES.flat();
export const LEVEL_ORDER: readonly string[] = LEVELS.map((l) => l.id);

export function levelById(id: string): LevelDef | undefined {
  return LEVELS.find((l) => l.id === id);
}

/** The backdrop theme for a level: one per beach. */
export function themeOf(_id: string): ThemeId {
  return 'atoll';
}

export function nextLevel(id: string): LevelDef | undefined {
  const i = LEVEL_ORDER.indexOf(id);
  return i >= 0 ? LEVELS[i + 1] : undefined;
}
