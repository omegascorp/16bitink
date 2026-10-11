import { goalSize } from '../logic/progress';
import { shellOf, type Shell } from '../logic/shells';
import type { LevelDef } from './types';

/** Every level starts here: a size-2 periwinkle, room to grow one size. */
export const START_SHELL: Shell = shellOf('periwinkle', 2);
export const START_SIZE = 1;

/** Every shell a level has besides the starting one: those laid out, those the tide washes in, and those rival hermit crabs are in. */
export function levelShells(def: LevelDef): Shell[] {
  return [
    ...def.shells.map(([k, size]) => shellOf(k, size)),
    ...(def.tideBrings?.shells ?? []).map(([k, size]) => shellOf(k, size)),
    ...(def.rivals ?? []).map(([k, size]) => shellOf(k, size)),
  ];
}

/** The level's goal size: the biggest its shells allow. */
export function levelGoal(def: LevelDef): number {
  return goalSize(START_SHELL, START_SIZE, levelShells(def));
}
