import { describe, expect, it } from 'vitest';
import { buildGround } from '../src/level/build';
import { surfaceAt } from '../src/level/carve';
import { PLANETS } from '../src/level/planets';
import { energyMap } from '../src/level/reach';
import type { PlanetDef, WorldDef } from '../src/level/types';
import { RECIPES } from '../src/logic/blueprints';
import { addHold, holdEntries, type Hold } from '../src/logic/hold';
import { ORES, type OreKey } from '../src/logic/ore';
import { STARTER } from '../src/logic/suit';
import { indexOf, TILE, tileAt } from '../src/logic/terrain';

const worlds = PLANETS.map((p) => [p.world.id, p] as const);

/** The least energy to every tile from the lander, with a drill of mark `mk`. */
function reach(planet: PlanetDef, mk: number, def: WorldDef = planet.world): { map: Float64Array; at: (x: number, depth: number) => number } {
  const t = buildGround(def);
  const map = energyMap(t, { mk, planet: planet.number }, [def.site.landerCol, def.site.surface - 1]);
  return { map, at: (x, depth) => map[indexOf(t, x, def.site.surface + depth)]! };
}

/** Pieces of `ore` a drill of mark `mk` can reach. */
function reachableOre(planet: PlanetDef, mk: number, ore: OreKey): number {
  const t = buildGround(planet.world);
  const { map } = reach(planet, mk);
  return [...t.content.keys()].filter((i) => t.content[i] === ORES[ore].id && Number.isFinite(map[i]!)).length;
}

describe.each(worlds)('the world of %s', (_id, planet) => {
  const def = planet.world;

  it('has fuel for life support and the cell within the starter drill\'s reach, and near the lander', () => {
    for (const ore of [planet.fuels.air, planet.fuels.cell]) {
      expect(reachableOre(planet, 0, ore)).toBeGreaterThan(40);
    }
    // Ice within 30 columns of the crash, for the first trips.
    const t = buildGround(def);
    const near = [...t.content.keys()].filter((i) => t.content[i] === ORES[planet.fuels.air].id && Math.abs((i % t.width) - def.site.landerCol) < 30);
    expect(near.length).toBeGreaterThan(10);
  });

  it('has permanent ids, its items each unique', () => {
    expect(def.id).toMatch(/^[a-z0-9-]+$/);
    const ids = def.items.map((it) => it.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]+$/);
  });

  it('wraps, a whole number of ground chunks and hatch tiles round, and meets itself at the join', () => {
    expect(def.site.wrap).toBe(true);
    expect(def.site.width % 16).toBe(0);
    expect(Math.abs(surfaceAt(def.site, def.site.width - 1) - surfaceAt(def.site, 0))).toBeLessThanOrEqual(2);
  });

  it('every item can be reached with the drill it is meant for', () => {
    for (const item of def.items) {
      const { at } = reach(planet, item.drill ?? 0);
      expect(Number.isFinite(at(item.at[0], item.at[1])), `${item.id} with drill Mk ${item.drill ?? 0}`).toBe(true);
    }
  });

  it('blueprints are real and sit on open ground or in breakable rock, never bedrock', () => {
    const t = buildGround(def);
    for (const item of def.items) {
      expect(tileAt(t, item.at[0], def.site.surface + item.at[1])).not.toBe(TILE.bedrock);
      if (item.blueprint) expect(RECIPES[item.blueprint], item.id).toBeDefined();
    }
  });

  it("holds three times what all of the planet's gear needs, within reach of its own drill", () => {
    const need: Hold = Object.values(RECIPES).filter((r) => r.mk === planet.number).reduce<Hold>((sum, r) => addHold(sum, r.materials), {});
    for (const [ore, n] of holdEntries(need)) expect(reachableOre(planet, planet.number, ore), ore).toBeGreaterThanOrEqual(n * 3);
  });
});

describe('Graphite', () => {
  const graphite = PLANETS[0]!;
  const item = (id: string) => graphite.world.items.find((it) => it.id === id)!;

  it("the drill's blueprint and twice its materials are within the starter drill's reach", () => {
    expect(item('fissure-cave-drill').drill).toBe(0);
    for (const [ore, n] of holdEntries(RECIPES['drill-1']!.materials)) expect(reachableOre(graphite, 0, ore)).toBeGreaterThanOrEqual(n * 2);
  });

  it("the drill's blueprint is a cell or two of energy away down the fissure", () => {
    const bp = item('fissure-cave-drill');
    expect(reach(graphite, 0).at(bp.at[0], bp.at[1])).toBeLessThanOrEqual(STARTER.energy * 2);
  });

  it("the Pack's vault needs its firedamp: walled in stone the starter drill can't break", () => {
    const bp = item('crash-vault-pack');
    const noPockets = { ...graphite.world, site: { ...graphite.world.site, pockets: [] } };
    expect(reach(graphite, 0, noPockets).at(bp.at[0], bp.at[1])).toBe(Infinity);
  });

  it('the Helmet and the Jetpack wait for the new drill', () => {
    const { at } = reach(graphite, 0);
    for (const id of ['deep-vault-helmet', 'stone-vault-jetpack']) expect(at(item(id).at[0], item(id).at[1]), id).toBe(Infinity);
  });
});
