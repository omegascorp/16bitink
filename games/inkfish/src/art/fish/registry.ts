import type { PlayerFishId, SpeciesId } from '../../levels/types';
import { isCritter } from '../critterArt';
import type { Anatomy } from './kit';
import { DEEP } from './species/deep';
import { GIANTS } from './species/giants';
import { PLAYERS } from './species/players';
import { REEF } from './species/reef';
import { SHALLOWS } from './species/shallows';

/** Every drawable fish, merged from the habitat files. */
export const ANATOMY = { ...PLAYERS, ...SHALLOWS, ...REEF, ...DEEP, ...GIANTS } as Record<SpeciesId | PlayerFishId, Anatomy>;

/** Shapes that still have no anatomy: must be empty before shipping (a test checks it). */
export function missingAnatomy(shapes: readonly (SpeciesId | PlayerFishId)[]): (SpeciesId | PlayerFishId)[] {
  // Seabed crawlers aren't fish: they have their own drawings in art/critterArt.ts.
  return shapes.filter((s) => !(s in ANATOMY) && !isCritter(s));
}
