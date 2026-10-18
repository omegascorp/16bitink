import { describe, expect, it } from 'vitest';
import { PLANET_4 } from '../content/planet4';
import { buildWorld } from '../src/level/build';
import { parsePlanets } from '../src/level/validate';
import { RECIPES } from '../src/logic/blueprints';
import { NEW_PROFILE, type Profile } from '../src/logic/economy';
import { addOre, emptyInventory } from '../src/logic/inventory';
import { ORES } from '../src/logic/ore';
import { BRINE_SET, currentGoal, goalLine } from '../src/logic/repairs';
import { canFix, fix, SHIP_TANK, shipTankCapacity, STARSHIP_IDS } from '../src/logic/starship';
import { ARRIVAL_BEAT, hasBeat, searchShipVisit, withBeat } from '../src/logic/story';
import { CARGO } from '../src/logic/mine';
import { canTravel, travel, tripFuel } from '../src/logic/travel';
import { fuelsAt, isWorldId } from '../src/logic/worlds';
import { TILE } from '../src/logic/terrain';

const beats = (p: Profile, ...bs: Parameters<typeof withBeat>[1][]): Profile => bs.reduce(withBeat, p);

/** Back on Mycel at the end of chapter 3: the four Aster together, their star chart yours. */
const REUNITED: Profile = {
  ...beats(NEW_PROFILE, 'called', 'met', 'paid', 'core', 'flown', 'course', 'distress', 'asterFound', 'asterCamp', 'asterWoken', 'brineLanded', 'craftFound', 'reefMet', 'reefPaid', 'crewMet', 'craftRaised', 'craftMended', 'crystalFound', 'craftFlown', 'asterReunion'),
  at: 'mycel', docked: true, visited: ['graphite', 'mycel', 'brine'], starship: [...STARSHIP_IDS, 'asterTank'], shipFuel: 0,
  repaired: ['printer', 'hull', 'thrusters', 'comms', 'core'], gear: { ...NEW_PROFILE.gear, drill: 3 },
  found: ['drill-1', 'drill-2', 'drill-3', ...BRINE_SET, 'pulse', 'rebreather'], tools: ['receiver', 'pulse', 'rebreather'],
};

/** A cargo hold holding these. */
function cargoOf(h: Partial<Record<keyof typeof ORES, number>>): Profile['cargo'] {
  return Object.entries(h).reduce((inv, [ore, n]) => addOre(inv, ore as keyof typeof ORES, n!).inv, emptyInventory(CARGO.slots, CARGO.stack));
}

describe("the Aster's long tank", () => {
  it('is drawn only once the four Aster are together, and fits over their first tank', () => {
    const before = { ...REUNITED, beats: REUNITED.beats.filter((b) => b !== 'asterReunion') };
    expect(canFix({ ...before, cargo: cargoOf({ lignite: 12, amber: 6, pyrite: 6 }) }, 'longTank')).toBe('design');
    expect(canFix(REUNITED, 'longTank')).toBe('materials');
    const r = fix({ ...REUNITED, cargo: cargoOf({ lignite: 12, amber: 6, pyrite: 6 }) }, 'longTank');
    expect(r.ok).toBe(true);
    if (r.ok) expect(shipTankCapacity(r.profile)).toBe(SHIP_TANK.long);
  });

  it('is needed for every trip to Talus: none fits the Aster tank', () => {
    for (const from of ['graphite', 'mycel', 'brine'] as const) {
      const fuel = tripFuel(from, 'talus')!;
      expect(fuel, from).toBeGreaterThan(SHIP_TANK.aster);
      expect(fuel, from).toBeLessThanOrEqual(SHIP_TANK.long);
      expect(canTravel({ ...REUNITED, at: from, shipFuel: 20 }, 'talus', () => true), from).toBe('tank');
    }
    const fitted = { ...REUNITED, starship: [...REUNITED.starship, 'longTank' as const], shipFuel: 28 };
    expect(canTravel(fitted, 'talus', () => true)).toBe('ok');
    expect(canTravel(fitted, 'talus', () => false)).toBe('locked');
    expect(travel(fitted, 'talus')).toMatchObject({ at: 'talus', shipFuel: 0 });
  });
});

describe("Talus's story so far", () => {
  it('goes long tank, fuel, course, land, the search ship, then waits for the rest of the chapter', () => {
    const kinds: string[] = [];
    let p = REUNITED;
    const step = (f: (q: Profile) => Profile): void => {
      kinds.push(currentGoal(p).kind);
      p = f(p);
    };
    step((q) => ({ ...q, starship: [...q.starship, 'longTank'] }));
    step((q) => ({ ...q, shipFuel: 28 }));
    step((q) => travel(q, 'talus'));
    step((q) => ({ ...withBeat(q, 'talusLanded'), visited: [...q.visited, 'talus'], docked: false }));
    step((q) => searchShipVisit(q)!);
    kinds.push(currentGoal(p).kind);
    expect(kinds).toEqual(['talus', 'tripFuel', 'setCourse', 'land', 'searchShip', 'talusSoFar']);
  });

  it('says each goal in a line', () => {
    expect(goalLine(REUNITED, currentGoal(REUNITED))).toMatch(/long tank/);
    const landed = { ...REUNITED, at: 'talus' as const, docked: false, visited: [...REUNITED.visited, 'talus' as const] };
    expect(goalLine(landed, currentGoal(landed))).toMatch(/ship of your own kind/);
    expect(goalLine({ ...landed, docked: true, visited: REUNITED.visited }, { kind: 'land', world: 'talus' })).toMatch(/Land on Talus/);
  });

  it('finds the search ship once', () => {
    const found = searchShipVisit(REUNITED)!;
    expect(hasBeat(found, 'shipFound')).toBe(true);
    expect(searchShipVisit(found)).toBeNull();
  });

  it('has its own first-landing card', () => {
    expect(ARRIVAL_BEAT.talus).toBe('talusLanded');
    expect(PLANET_4.arrival?.paragraphs.length).toBeGreaterThan(0);
  });
});

describe("Talus's ground and gear", () => {
  it('is a world you can stand on, with gypsum for the air and the tanks and sulfur for the cell', () => {
    expect(isWorldId('talus')).toBe(true);
    expect(fuelsAt('talus')).toEqual({ cell: ['sulfur'], air: ['gypsum', 'water'] });
  });

  it("prints its Mk 4 set from its own ores, hematite in four of the six", () => {
    const mk4 = Object.values(RECIPES).filter((r) => r.mk === 4);
    expect(mk4).toHaveLength(6);
    expect(mk4.filter((r) => (r.materials.hematite ?? 0) > 0)).toHaveLength(4);
    const talusOres = new Set(['hematite', 'gypsum', 'sulfur', 'nitre', 'opal', 'copper']);
    for (const r of mk4) for (const ore of Object.keys(r.materials)) expect(talusOres.has(ore), `${r.id}: ${ore}`).toBe(true);
  });

  it('passes the checks the game makes on planets from the server, and builds with its loose rock', () => {
    expect(() => parsePlanets(JSON.parse(JSON.stringify([PLANET_4])))).not.toThrow();
    const { setup } = buildWorld(PLANET_4, { ...REUNITED, at: 'talus' }, null);
    expect(setup.terrain.tiles.includes(TILE.loose)).toBe(true);
    expect(setup.fuels).toEqual(fuelsAt('talus'));
  });
});
