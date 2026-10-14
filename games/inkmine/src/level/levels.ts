import { PLANET_1 } from './planet1';
import type { LevelDef, PlanetDef } from './types';

/** Planets with levels; the free one only for now (paid planets come from the server, later). */
export const PLANETS: readonly PlanetDef[] = [PLANET_1];

const LEVELS: readonly LevelDef[] = PLANETS.flatMap((p) => p.levels);
const ORDER: readonly string[] = LEVELS.map((l) => l.id);

export const levelOrder = (): readonly string[] => ORDER;

export function levelById(id: string): LevelDef | undefined {
  return LEVELS.find((l) => l.id === id);
}

export function planetOf(id: string): PlanetDef {
  return PLANETS.find((p) => p.levels.some((l) => l.id === id)) ?? PLANETS[0]!;
}

/** 1-based number of a level on its planet. */
export function slotOf(id: string): number {
  return planetOf(id).levels.findIndex((l) => l.id === id) + 1;
}

export function nextLevel(id: string): LevelDef | undefined {
  const i = ORDER.indexOf(id);
  return i >= 0 ? LEVELS[i + 1] : undefined;
}
