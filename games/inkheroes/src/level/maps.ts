import { ASHFORD } from './chapter1';
import type { MapDef } from './types';

/** The campaign's maps, in order (chapter 1 is free and ships with the game). */
export const MAPS: readonly MapDef[] = [ASHFORD];

export function mapById(id: string): MapDef | undefined {
  return MAPS.find((m) => m.id === id);
}
