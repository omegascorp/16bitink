import { THEMES, type ThemeId } from '../art/backdrop';
import { BEACH_1 } from './beach1';
import { BEACH_2 } from './beach2';
import { BEACH_3 } from './beach3';
import { BEACH_4 } from './beach4';
import { BEACH_5 } from './beach5';
import { BEACH_6 } from './beach6';
import { BEACH_7 } from './beach7';
import { BEACH_8 } from './beach8';
import { BIOMES } from './biomes';
import type { LevelDef } from './types';

/** Each built beach's levels, beach 1 first; beaches still to be built are missing from the end. */
export const BEACHES: readonly (readonly LevelDef[])[] = [BEACH_1, BEACH_2, BEACH_3, BEACH_4, BEACH_5, BEACH_6, BEACH_7, BEACH_8];

/** Every playable level, in order. */
export const LEVELS: readonly LevelDef[] = BEACHES.flat();
export const LEVEL_ORDER: readonly string[] = LEVELS.map((l) => l.id);

export function levelById(id: string): LevelDef | undefined {
  return LEVELS.find((l) => l.id === id);
}

/** The backdrop theme for a level: its beach's biome (the atoll's until that biome has one). */
export function themeOf(id: string): ThemeId {
  const biome = BIOMES[beachIndexOf(id)]?.id;
  return biome && biome in THEMES ? (biome as ThemeId) : 'atoll';
}

export function nextLevel(id: string): LevelDef | undefined {
  const i = LEVEL_ORDER.indexOf(id);
  return i >= 0 ? LEVELS[i + 1] : undefined;
}

/** Beaches playable without the full game: the first one. */
export const FREE_BEACHES = 1;

/** 0-based beach of a level, or -1 when it isn't a built level. */
export function beachIndexOf(id: string): number {
  return BEACHES.findIndex((b) => b.some((l) => l.id === id));
}

/** True for the last level of its beach: the finale that earns the beach celebration. */
export function isBeachFinale(id: string): boolean {
  const beach = BEACHES[beachIndexOf(id)];
  return beach?.at(-1)?.id === id;
}

/** True for a level of a beach that comes with the full game. */
export function isPaid(id: string): boolean {
  return beachIndexOf(id) >= FREE_BEACHES;
}

/** True for the last free level: where a player without the full game is offered it. */
export function isFreeEnd(id: string): boolean {
  return isBeachFinale(id) && beachIndexOf(id) === FREE_BEACHES - 1;
}
