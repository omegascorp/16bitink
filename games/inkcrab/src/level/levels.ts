import { THEMES, type ThemeId } from '../art/backdrop';
import { BEACH_1 } from './beach1';
import { BIOMES } from './biomes';
import type { LevelDef } from './types';

type Beaches = readonly (readonly LevelDef[])[];

/** Beaches playable without the full game: the first one. */
export const FREE_BEACHES = 1;
/** Beaches with levels, free and paid; the map draws the rest as pencil drafts. */
export const BUILT_BEACHES = 10;

/** The beaches that ship with the game. The rest come from the server, to owners only (see content/paid.ts). */
const FREE: Beaches = [BEACH_1];
const FREE_IDS: ReadonlySet<string> = new Set(FREE.flat().map((l) => l.id));

let beaches: Beaches = FREE;
let levels: readonly LevelDef[] = beaches.flat();
let order: readonly string[] = levels.map((l) => l.id);

/** Adds the full game's beaches, already validated (see validate.ts), after the free one. */
export function installPaidBeaches(paid: Beaches): void {
  beaches = [...FREE, ...paid];
  levels = beaches.flat();
  order = levels.map((l) => l.id);
}

/** Each beach this player has, beach 1 first: the free one, then the full game's once installed. */
export const loadedBeaches = (): Beaches => beaches;
/** Every level this player has, in order. */
export const loadedLevels = (): readonly LevelDef[] => levels;
export const levelOrder = (): readonly string[] => order;
/** Ids of the levels that ship with the game. */
export const freeLevelIds = (): ReadonlySet<string> => FREE_IDS;

export function levelById(id: string): LevelDef | undefined {
  return levels.find((l) => l.id === id);
}

/** The backdrop theme for a level: its beach's biome (the atoll's until that biome has one). */
export function themeOf(id: string): ThemeId {
  const biome = BIOMES[beachIndexOf(id)]?.id;
  return biome && biome in THEMES ? (biome as ThemeId) : 'atoll';
}

export function nextLevel(id: string): LevelDef | undefined {
  const i = order.indexOf(id);
  return i >= 0 ? levels[i + 1] : undefined;
}

/** 0-based beach of a level, or -1 when it isn't a loaded level. */
export function beachIndexOf(id: string): number {
  return beaches.findIndex((b) => b.some((l) => l.id === id));
}

/** True for the last level of its beach: the finale that earns the beach celebration. */
export function isBeachFinale(id: string): boolean {
  const beach = beaches[beachIndexOf(id)];
  return beach?.at(-1)?.id === id;
}

/** True for anything but a free level: a level of the full game's beaches, loaded or not. */
export function isPaid(id: string): boolean {
  return !FREE_IDS.has(id);
}

/** True for the last free level: where a player without the full game is offered it. */
export function isFreeEnd(id: string): boolean {
  return id === FREE.at(-1)?.at(-1)?.id;
}
