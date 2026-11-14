import { KINDS } from '../../src/content/ch1/kinds';
import { LOOT_EARLY } from '../../src/content/ch1/levels/kit';
import { loadLevel, type LoadedLevel } from '../../src/logic/level/load';
import type { EnemyDef, LevelDef, ObjectiveDef, StructPlace } from '../../src/logic/level/types';
import type { Pt } from '../../src/logic/vec';

/**
 * Small test layouts on a 2 × 2 grass map. Recon, Capture and Chase aren't
 * in chapter 1, so their layouts live here (design doc: they arrive in
 * later chapters).
 */
export const POINTS: Readonly<Record<string, Pt>> = {
  a: { x: 400, y: 300 }, b: { x: 1500, y: 300 }, c: { x: 1500, y: 800 }, d: { x: 400, y: 800 }, mid: { x: 960, y: 540 }, far: { x: 1800, y: 1000 },
};

export function fixture(objective: ObjectiveDef, enemies: readonly EnemyDef[] = [], extra: { structures?: readonly StructPlace[]; roads?: Record<string, readonly Pt[]>; timeLimit?: number } = {}): LevelDef {
  return {
    id: `test-${objective.kind}`, number: 99, name: `Test ${objective.kind}`, type: objective.kind, briefing: '', teaches: '',
    map: { cols: 2, rows: 2, base: 'grass', terrain: [], structures: extra.structures ?? [], points: POINTS, roads: { line: [POINTS.a!, POINTS.b!, POINTS.c!], ...(extra.roads ?? {}) } },
    start: { x: 200, y: 540 }, enemies, crates: [], objective, bonus: [{ kind: 'kills', n: 1 }, { kind: 'noKit' }], timeLimit: extra.timeLimit, loot: LOOT_EARLY,
  };
}

export const load = (d: LevelDef): LoadedLevel => loadLevel(d, KINDS);

/** Recon: three spots, one watched by a guard; an alarm wave of reinforcements. */
export const RECON = fixture({ kind: 'recon', spots: ['a', 'b', 'c'], radius: 150, dwell: 1 }, [
  { role: 'guard', clan: 'crows', tank: 'machinegun1/light1/wheels1', at: { x: 1650, y: 300 } },
  { role: 'wave', clan: 'crows', tank: 'machinegun1/light1/wheels1', at: 'far', when: 'alarm' },
]);

/** Capture: three flags, a patrol driving between two of them. */
export const CAPTURE = fixture({ kind: 'capture', flags: ['a', 'b', 'd'], radius: 140, capture: 2, holdAll: 2 }, [
  { role: 'patrol', clan: 'boars', tank: 'machinegun1/light1/wheels1', at: 'b', route: 'line' },
]);

/** Chase: a fast courier on Wheels runs the road to its base at c. */
export const CHASE = fixture({ kind: 'chase', base: 'c' }, [
  { role: 'runner', clan: 'weasels', tank: 'machinegun1/light1/wheels1', at: 'a', route: 'line', speedMult: 1.1, name: 'Dart' },
]);
