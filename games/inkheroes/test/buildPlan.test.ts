import { describe, expect, it } from 'vitest';
import { ASHFORD } from '../src/level/borderMarch';
import { MAPS } from '../src/level/maps';
import { startAdventure } from '../src/logic/adventure';
import { BUILDING_IDS, BUILDINGS } from '../src/logic/buildings';
import { briefAmount, purse, shortfall, type Amount } from '../src/logic/resources';
import { build, cantBuild, suggestBuilding, type Town } from '../src/logic/town';
import { ledgerOf } from '../src/scenes/town/townStage';

const RICH = purse({ gold: 1e7, wood: 9999, ore: 9999, mercury: 999, sulfur: 999, crystal: 999, gems: 999 });
const firstTown = (n: number): Town => startAdventure(MAPS[n]!).towns[0]!;
const withBuilt = (t: Town, ...more: Town['built']): Town => ({ ...t, built: [...t.built, ...more] });

describe('the build suggestion', () => {
  it.each(MAPS.map((m, i) => [m.name, i] as const))('walks %s to a finished town, every step buildable that day', (_, n) => {
    const def = MAPS[n]!;
    let town = firstTown(n);
    const steps: string[] = [];
    for (let next = suggestBuilding(town, RICH, def.off); next; next = suggestBuilding(town, RICH, def.off)) {
      expect(cantBuild(town, next, RICH, def.off)).toBeNull();
      steps.push(next);
      town = { ...build(town, next, RICH, def.off).town, builtToday: false };
    }
    // Nothing the map allows is left out.
    const allowed = BUILDING_IDS.filter((b) => !def.off.includes(b) && BUILDINGS[b].needs.every((p) => !def.off.includes(p)));
    expect(allowed.filter((b) => !town.built.includes(b))).toEqual([]);
    expect(new Set(steps).size).toBe(steps.length);
  });

  it('starts the first map with income, then the best troops and their growth, and has nothing more to suggest', () => {
    let town = firstTown(0);
    const steps = [];
    for (let i = 0; i < 5; i++) {
      const next = suggestBuilding(town, RICH, ASHFORD.off)!;
      steps.push(next);
      town = { ...build(town, next, RICH, ASHFORD.off).town, builtToday: false };
    }
    expect(steps).toEqual(['townHall', 'barracks', 'archeryRange', 'citadel', 'griffinTower']);
    expect(suggestBuilding(town, RICH, ASHFORD.off)).toBeNull();
  });

  it('keeps its suggestion after the day’s building is up, for tomorrow', () => {
    const town = { ...firstTown(0), builtToday: true };
    expect(suggestBuilding(town, RICH, ASHFORD.off)).toBe('townHall');
  });

  it('goes for what stands in a building’s way first', () => {
    const bare = { ...firstTown(0), built: ['villageHall' as const] };
    expect(suggestBuilding(bare, RICH, [])).toBe('tavern');
    expect(suggestBuilding(withBuilt(bare, 'tavern', 'townHall'), RICH, [])).toBe('fort');
  });

  it('saves up for it when only gold is short: gold comes every day', () => {
    expect(suggestBuilding(firstTown(0), purse({ gold: 100, wood: 50, ore: 50 }), ASHFORD.off)).toBe('townHall');
  });

  it('passes over what the purse has no wood or ore for, so it never stalls', () => {
    const noOre = purse({ gold: 9000, wood: 50, ore: 0 });
    const town = withBuilt(firstTown(0), 'townHall');
    expect(suggestBuilding(town, noOre, [])).not.toBe('barracks');
    expect(BUILDINGS[suggestBuilding(town, noOre, [])!].cost.ore ?? 0).toBe(0);
  });

  it('still names the top of the plan when nothing at all is within reach', () => {
    const town = withBuilt(firstTown(0), 'townHall');
    expect(suggestBuilding(town, purse({}), ASHFORD.off)).toBe('barracks');
  });

  it('leaves out what the map keeps closed, and what stands behind it', () => {
    const def = MAPS[0]!;
    const next = suggestBuilding(firstTown(0), RICH, def.off)!;
    expect(def.off).not.toContain(next);
    expect(suggestBuilding(withBuilt(firstTown(0), 'townHall', 'barracks', 'archeryRange', 'citadel', 'griffinTower', 'mageGuild1'), RICH, def.off)).toBeNull();
  });

  it.each(MAPS.map((m, i) => [m.name, i] as const))('can always be found in the hall on %s', (_, n) => {
    const def = MAPS[n]!;
    let town = firstTown(n);
    for (let next = suggestBuilding(town, RICH, def.off); next; next = suggestBuilding(town, RICH, def.off)) {
      expect(ledgerOf(town.built, BUILDING_IDS, def.off)).toContain(next);
      town = { ...build(town, next, RICH, def.off).town, builtToday: false };
    }
  });
});

describe('what a purse is short of', () => {
  it('names only what is missing, and how much', () => {
    expect(shortfall(purse({ gold: 1000, wood: 9 }), { gold: 2500, wood: 5, ore: 2 })).toEqual({ gold: 1500, ore: 2 });
  });

  it('is empty when the purse covers it', () => {
    expect(shortfall(purse({ gold: 2500 }), { gold: 2500 })).toEqual({});
  });
});

describe('a price on a button', () => {
  /** Every part of every building's price, and each short by one: all a button can be asked to show. */
  const prices = BUILDING_IDS.flatMap((id) => {
    const cost = Object.entries(BUILDINGS[id].cost) as [keyof Amount, number][];
    return Array.from({ length: 2 ** cost.length }, (_, mask) => cost.filter((_, i) => mask & (1 << i))).filter((part) => part.length).flatMap((part): Amount[] => [
      Object.fromEntries(part),
      Object.fromEntries(part.map(([r, n]) => [r, Math.max(1, n - 1)])),
    ]);
  });

  it('always fits one line', () => {
    for (const p of prices) expect(briefAmount(p).length).toBeLessThanOrEqual(17);
  });

  it('names both parts when they fit, and counts the rest when they do not', () => {
    expect(briefAmount({ gold: 1970, wood: 7 })).toBe('1970 gold, 7 wood');
    expect(briefAmount({ gold: 10000, wood: 20 })).toBe('10000 gold +1');
    expect(briefAmount({ mercury: 10, gems: 5 })).toBe('10 mercury +1');
    expect(briefAmount({ gold: 3000, wood: 5, ore: 5, gems: 2 })).toBe('3000 gold +3 more');
  });
});
