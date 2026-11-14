import { KINDS } from './ch1/kinds';
import { CH1_LEVELS } from './ch1/levels';
import { FREE_LEVELS, TOTAL_LEVELS } from '../logic/campaign';
import { loadLevel, type LoadedLevel } from '../logic/level/load';
import type { LevelDef } from '../logic/level/types';

/**
 * Every level the game can play: chapter 1 ships with it, levels 11–50
 * arrive from host.loadContent() for owners (content/paid.ts on the server).
 */
const paid = new Map<number, LoadedLevel>();

export function levelFor(n: number): LoadedLevel | null {
  return CH1_LEVELS.find((l) => l.def.number === n) ?? paid.get(n) ?? null;
}

export const hasLevel = (n: number): boolean => levelFor(n) !== null;

/**
 * Checks the paid levels the host sent (untrusted JSON) and installs them.
 * Throws on anything that isn't a list of valid levels numbered 11–50;
 * nothing is installed then. Returns how many levels it installed.
 */
export function installPaidLevels(raw: unknown): number {
  if (!Array.isArray(raw)) throw new Error('paid content is not a list of levels');
  const loaded = raw.map((d: unknown, i) => {
    if (typeof d !== 'object' || d === null) throw new Error(`paid level ${i} is not an object`);
    const n = (d as { number?: unknown }).number;
    if (typeof n !== 'number' || !Number.isInteger(n) || n <= FREE_LEVELS || n > TOTAL_LEVELS) throw new Error(`paid level ${i} has number ${String(n)}`);
    return loadLevel(d as LevelDef, KINDS);
  });
  for (const l of loaded) paid.set(l.def.number, l);
  return loaded.length;
}
