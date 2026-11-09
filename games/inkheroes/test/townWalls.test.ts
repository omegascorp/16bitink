import { describe, expect, it } from 'vitest';
import { ASHFORD } from '../src/level/borderMarch';
import { MAPS } from '../src/level/maps';
import { ABU } from '../src/level/twoLands';
import { planPath, startAdventure, terrainView } from '../src/logic/adventure';
import { townCore, townFootprint } from '../src/logic/objects';
import { parseAdventure } from '../src/logic/save';

const has = (tiles: readonly { x: number; y: number }[], x: number, y: number): boolean => tiles.some((t) => t.x === x && t.y === y);

describe('a town blocks the ground its picture stands on', () => {
  it('reaches its left, right and front towers, the picture spreading to the right of the gate', () => {
    expect(has(townFootprint(6, 5), 5, 5)).toBe(true);
    expect(has(townFootprint(6, 5), 10, 5)).toBe(true);
    expect(has(townFootprint(6, 5), 7, 6)).toBe(true);
  });

  it('never blocks its own gate or the tiles in front of it', () => {
    expect(has(townFootprint(6, 5), 6, 5)).toBe(false);
    expect(has(townFootprint(6, 5), 6, 6)).toBe(false);
  });

  it('keeps the inner tiles in the wider footprint', () => {
    for (const t of townCore(6, 5)) expect(has(townFootprint(6, 5), t.x, t.y)).toBe(true);
  });

  it('abu: a road (the causeway) reaches Abu’s gate from the south, past its walls', () => {
    const town = ABU.towns![0]!;
    expect('=#b').toContain(ABU.rows[town.y + 1]![town.x]);
    expect('=#b').toContain(ABU.rows[town.y]![town.x]);
    for (const t of townFootprint(town.x, town.y)) expect('=#b', `Abu ${t.x},${t.y}`).not.toContain(ABU.rows[t.y]?.[t.x] ?? '.');
  });

  for (const def of MAPS) {
    it(`${def.id}: a road reaches every town's gate from the south, past its walls`, () => {
      for (const town of [def.town, ...(def.towns ?? [])]) {
        expect('=#b').toContain(def.rows[town.y + 1]![town.x]);
        expect('=#b', `${town.name}'s gate`).toContain(def.rows[town.y]![town.x]);
        for (const t of townFootprint(town.x, town.y)) expect('=#b', `${town.name} ${t.x},${t.y}`).not.toContain(def.rows[t.y]?.[t.x] ?? '.');
      }
    });

    it(`${def.id}: no object stands inside a town`, () => {
      const towns = [def.town, ...(def.towns ?? [])];
      for (const town of towns) for (const t of townFootprint(town.x, town.y)) expect(def.objects.filter((o) => o.x === t.x && o.y === t.y).map((o) => o.id)).toEqual([]);
    });
  }
});

describe('a town by the map edge', () => {
  it('blocks nothing on the far side of the map', () => {
    const adv = startAdventure(ASHFORD);
    const hugging = { ...adv, towns: adv.towns.map((t) => ({ ...t, x: 2, y: 5 })) };
    const view = terrainView(hugging, ASHFORD);
    const w = view.grid.w;
    expect([...view.solid].filter((i) => i % w >= w - 2)).toEqual([]);
  });
});

describe('a game saved before the walls grew', () => {
  const standingAt = (x: number, y: number): unknown => {
    const adv = startAdventure(ASHFORD);
    return JSON.parse(JSON.stringify({ ...adv, hero: { ...adv.hero, x, y } }));
  };

  it('still loads with the hero on a tile the walls now cover', () => {
    expect(parseAdventure(standingAt(9, 5), ASHFORD)).not.toBeNull();
  });

  it('lets that hero ride out', () => {
    const adv = parseAdventure(standingAt(9, 5), ASHFORD)!;
    expect(planPath(adv, ASHFORD, 12, 4)).not.toBeNull();
  });

  it('still refuses a hero inside the town', () => {
    expect(parseAdventure(standingAt(5, 5), ASHFORD)).toBeNull();
  });
});
