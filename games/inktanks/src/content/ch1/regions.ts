import type { RegionDef } from '../../logic/land';

/**
 * Chapter 1, Meadowlands: 7 × 7 screens, one region opening per level.
 * Map of the land by the level that opens each screen (0 = level 10):
 *
 *   5 5 5 5 6 6 6
 *   3 5 5 2 6 6 6
 *   3 1 1 2 4 4 7
 *   3 1 1 2 4 4 7
 *   3 3 3 8 8 4 7
 *   9 9 9 8 8 7 7
 *   9 9 9 0 0 0 0
 */
const MAP = ['5555666', '3552666', '3112447', '3112447', '3338847', '9998877', '9990000'];
const NAMES: Readonly<Record<number, [string, string]>> = {
  1: ['farm', 'The farm'],
  2: ['orchard', 'The orchard'],
  3: ['river', 'The river'],
  4: ['village', 'The village road'],
  5: ['woods', 'The woods'],
  6: ['quarry', 'The quarry'],
  7: ['hill', 'The hilltop'],
  8: ['rails', 'The rail yard'],
  9: ['airfield', 'The airfield'],
  10: ['fort', 'The old fort'],
};

export const CH1_COLS = 7;
export const CH1_ROWS = 7;

export const CH1_REGIONS: readonly RegionDef[] = Object.entries(NAMES).map(([lv, [id, name]]) => {
  const level = Number(lv);
  const ch = String(level % 10);
  const cells: [number, number][] = [];
  MAP.forEach((row, r) => [...row].forEach((c, col) => c === ch && cells.push([col, r])));
  return { id, name, level, cells };
});
