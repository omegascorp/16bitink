import { loadLevel, type LoadedLevel } from '../../../logic/level/load';
import type { LevelDef } from '../../../logic/level/types';
import { KINDS } from '../kinds';
import { LEVEL_01 } from './level01';
import { LEVEL_02 } from './level02';
import { LEVEL_03 } from './level03';
import { LEVEL_04 } from './level04';
import { LEVEL_05 } from './level05';
import { LEVEL_06 } from './level06';
import { LEVEL_07 } from './level07';
import { LEVEL_08 } from './level08';
import { LEVEL_09 } from './level09';
import { LEVEL_10 } from './level10';

/** Chapter 1, Meadowlands: the ten levels (design doc "The 50 levels"), checked at load time. */
export const CH1_LEVEL_DEFS: readonly LevelDef[] = [LEVEL_01, LEVEL_02, LEVEL_03, LEVEL_04, LEVEL_05, LEVEL_06, LEVEL_07, LEVEL_08, LEVEL_09, LEVEL_10];

export const CH1_LEVELS: readonly LoadedLevel[] = CH1_LEVEL_DEFS.map((d) => loadLevel(d, KINDS));

export function ch1Level(n: number): LoadedLevel {
  const l = CH1_LEVELS.find((x) => x.def.number === n);
  if (!l) throw new Error(`no chapter 1 level ${n} (1–${CH1_LEVELS.length})`);
  return l;
}
