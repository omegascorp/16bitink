import { ASHFORD, BLACK_BANNER, THORNWOOD } from './borderMarch';
import type { MapDef } from './types';

/** The campaign's parts, in order: chapter 1's three, one land played straight through (chapter 1 is free and ships with the game). */
export const MAPS: readonly MapDef[] = [ASHFORD, THORNWOOD, BLACK_BANNER];

export function mapById(id: string): MapDef | undefined {
  return MAPS.find((m) => m.id === id);
}

/** The map before `def` in the campaign, if any. */
export const previousMap = (def: MapDef): MapDef | undefined => MAPS.find((m) => m.n === def.n - 1);
/** The map after `def` in the campaign, if it is built. */
export const nextMap = (def: MapDef): MapDef | undefined => MAPS.find((m) => m.n === def.n + 1);

/** Whether the campaign has opened `def`: the first map always, each later one once the map before it is won (`won` has a record for it). */
export function isOpen(def: MapDef, won: Readonly<Record<string, unknown>>): boolean {
  const before = previousMap(def);
  return !before || !!won[before.id];
}
