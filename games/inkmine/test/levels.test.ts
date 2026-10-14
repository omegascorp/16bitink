import { describe, expect, it } from 'vitest';
import { buildSite } from '../src/level/build';
import { PLANETS } from '../src/level/levels';
import { energyMap } from '../src/level/reach';
import { RECIPES } from '../src/logic/blueprints';
import { ORES, type OreKey } from '../src/logic/ore';
import { STARTER } from '../src/logic/suit';
import { TILE, tileAt } from '../src/logic/terrain';
import type { LevelDef, PlanetDef } from '../src/level/types';

const levels = PLANETS.flatMap((p) => p.levels.map((l) => [p, l] as const));

function reach(planet: PlanetDef, def: LevelDef, drill = def.drill): { map: Float64Array; width: number } {
  const t = buildSite(def);
  return { map: energyMap(t, { mk: drill, planet: planet.number }, [def.site.landerCol, def.site.surface - 1]), width: t.width };
}

/** Pieces of `ore` the drill can reach on the map. */
function reachableOre(planet: PlanetDef, def: LevelDef, ore: OreKey): number {
  const t = buildSite(def);
  const map = energyMap(t, { mk: def.drill, planet: planet.number }, [def.site.landerCol, def.site.surface - 1]);
  return [...t.content.keys()].filter((i) => t.content[i] === ORES[ore].id && Number.isFinite(map[i]!)).length;
}

describe('every level', () => {
  it('has a permanent, unique id', () => {
    const ids = levels.map(([, l]) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]+$/);
  });

  it('offers each kind of contract at most once a level (paid contracts are saved by kind)', () => {
    for (const [, l] of levels) expect(new Set(l.contracts.map((c) => c.kind)).size, l.id).toBe(l.contracts.length);
  });

  it.each(levels.map(([p, l]) => [l.id, p, l] as const))('%s: every item is reachable with the drill the main path expects', (_id, planet, def) => {
    const { map, width } = reach(planet, def);
    for (const item of def.items) {
      const [x, depth] = item.at;
      expect(Number.isFinite(map[(def.site.surface + depth) * width + x]!), `${item.kind} at ${x},${depth}`).toBe(true);
    }
  });

  it.each(levels.map(([p, l]) => [l.id, p, l] as const))('%s: has the ore its mission and orders ask for, within reach', (_id, planet, def) => {
    for (const goal of def.mission.goals) if (goal.kind === 'ore') expect(reachableOre(planet, def, goal.ore)).toBeGreaterThanOrEqual(goal.count + 2);
    for (const c of def.contracts) if (c.kind === 'order') expect(reachableOre(planet, def, c.ore)).toBeGreaterThanOrEqual(c.count + 2);
  });

  it.each(levels.map(([p, l]) => [l.id, p, l] as const))('%s: blueprints sit on open ground or in breakable rock, never bedrock', (_id, _planet, def) => {
    const t = buildSite(def);
    for (const item of def.items) {
      expect(tileAt(t, item.at[0], def.site.surface + item.at[1])).not.toBe(TILE.bedrock);
      if (item.blueprint) expect(RECIPES[item.blueprint]).toBeDefined();
    }
    if (def.mission.blueprint) expect(RECIPES[def.mission.blueprint]).toBeDefined();
  });
});

describe('Graphite', () => {
  const graphite = PLANETS[0]!;
  const level = (id: string): LevelDef => graphite.levels.find((l) => l.id === id)!;

  it('hands out the drill blueprint on a level with its materials in reach, before the level that needs it', () => {
    const order = graphite.levels.map((l) => l.id);
    const giver = graphite.levels.find((l) => l.mission.blueprint === 'drill-1')!;
    const needsIt = graphite.levels.findIndex((l) => l.drill >= 1);
    expect(order.indexOf(giver.id)).toBeLessThan(needsIt);
    for (const [ore, n] of Object.entries(RECIPES['drill-1']!.materials)) expect(reachableOre(graphite, giver, ore as OreKey)).toBeGreaterThanOrEqual(n! * 2);
  });

  it('the core at 60 m is a single cell or two of energy away with the starter drill', () => {
    const def = level('core-sample');
    const core = def.items.find((i) => i.kind === 'core')!;
    const { map, width } = reach(graphite, def, 0);
    const cost = map[(def.site.surface + core.at[1]) * width + core.at[0]]!;
    expect(cost).toBeLessThanOrEqual(STARTER.energy * 2);
  });

  it("level 3's vault needs its firedamp: walled in stone the starter drill can't break", () => {
    const def = level('tick-marks');
    const bp = def.items.find((i) => i.blueprint === 'pack-1')!;
    const noPockets = { ...def, site: { ...def.site, pockets: [] } };
    const { map, width } = reach(graphite, noPockets, 0);
    expect(map[(def.site.surface + bp.at[1]) * width + bp.at[0]]).toBe(Infinity);
  });

  it('level 5 needs the new drill', () => {
    const def = level('lost-probe');
    const probe = def.items.find((i) => i.kind === 'probe')!;
    const { map, width } = reach(graphite, def, 0);
    expect(map[(def.site.surface + probe.at[1]) * width + probe.at[0]]).toBe(Infinity);
  });
});
