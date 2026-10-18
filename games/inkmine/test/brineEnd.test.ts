import { describe, expect, it } from 'vitest';
import { PLANET_3 } from '../content/planet3';
import { buildWorld } from '../src/level/build';
import { parsePlanets } from '../src/level/validate';
import { CREATURE, CREATURE_KINDS } from '../src/logic/creatures';
import { NEW_PROFILE, type Profile } from '../src/logic/economy';
import { STEPS } from '../src/logic/progress';
import { currentGoal, goalLine } from '../src/logic/repairs';
import { STARSHIP_IDS } from '../src/logic/starship';
import { campVisit, craftVisit, crystalVisit, hasBeat, withBeat } from '../src/logic/story';
import { isSolid } from '../src/logic/terrain';
import { T } from './helpers';

const beats = (p: Profile, ...bs: Parameters<typeof withBeat>[1][]): Profile => bs.reduce(withBeat, p);

/** On Brine with the craft's heart mended: the crew's drive crystal is the next thing. */
const MENDED: Profile = {
  ...beats(NEW_PROFILE, 'called', 'met', 'paid', 'core', 'flown', 'course', 'distress', 'asterFound', 'asterCamp', 'asterWoken', 'brineLanded', 'craftFound', 'reefMet', 'reefPaid', 'crewMet', 'craftRaised', 'craftMended'),
  at: 'brine', visited: ['graphite', 'mycel', 'brine'], starship: [...STARSHIP_IDS, 'asterTank'], shipFuel: 2,
  repaired: ['printer', 'hull', 'thrusters', 'comms', 'core'], gear: { ...NEW_PROFILE.gear, drill: 3 },
  found: ['drill-1', 'drill-2', 'drill-3', 'cell-3', 'pack-3', 'helmet-3', 'jetpack-3', 'suit-3', 'pulse', 'rebreather'], tools: ['receiver', 'pulse', 'rebreather'],
};

describe('the end of chapter 3', () => {
  it('has the crystal taken only once the crew have said it is gone, and only once', () => {
    expect(crystalVisit({ ...MENDED, beats: MENDED.beats.filter((b) => b !== 'craftMended') })).toBeNull();
    const found = crystalVisit(MENDED)!;
    expect(hasBeat(found, 'crystalFound')).toBe(true);
    expect(crystalVisit(found)).toBeNull();
  });

  it('flies the craft home once it has its crystal, and then it is gone', () => {
    expect(craftVisit(MENDED, MENDED.suit).says).toBeNull();
    const flown = craftVisit(beats(MENDED, 'crystalFound'), MENDED.suit);
    expect(flown.says).toBe('flight');
    expect(hasBeat(flown.profile, 'craftFlown')).toBe(true);
    expect(craftVisit(flown.profile, MENDED.suit).says).toBeNull();
  });

  it('brings the four Aster together at their camp, then they just wave', () => {
    const home = { ...beats(MENDED, 'crystalFound', 'craftFlown'), at: 'mycel' as const };
    expect(currentGoal(home)).toEqual({ kind: 'reunion' });
    const met = campVisit(home, home.suit);
    expect(met.says).toBe('reunion');
    expect(currentGoal(met.profile)).toEqual({ kind: 'brineEnd' });
    expect(campVisit(met.profile, home.suit).says).toBe('together');
  });

  it('sends you home to Mycel by the ship: fill the tank for it, then set course', () => {
    const flown = beats(MENDED, 'crystalFound', 'craftFlown');
    expect(currentGoal(flown)).toEqual({ kind: 'tripFuel', to: 'mycel' });
    expect(goalLine(flown, currentGoal(flown))).toMatch(/trip to Mycel: water 2\/14/);
    expect(currentGoal({ ...flown, shipFuel: 14 })).toEqual({ kind: 'setCourse', to: 'mycel' });
    expect(goalLine({ ...flown, shipFuel: 14 }, { kind: 'setCourse', to: 'mycel' })).toMatch(/Set course for Mycel/);
  });

  it('says each new goal in a line, and the end names the next world', () => {
    expect(goalLine(MENDED, currentGoal(MENDED))).toMatch(/wakes it/);
    const found = beats(MENDED, 'crystalFound');
    expect(goalLine(found, currentGoal(found))).toMatch(/craft/);
    const end = { ...beats(MENDED, 'crystalFound', 'craftFlown', 'asterReunion'), at: 'mycel' as const };
    expect(goalLine(end, currentGoal(end))).toMatch(/chapter 3.*Talus/);
  });

  it('lists its steps in the funnel, ending on the end of chapter 3', () => {
    const keys = STEPS.map((s) => s.key);
    const at = (k: string): number => keys.indexOf(k);
    expect(at('heart')).toBeLessThan(at('crystal'));
    expect([at('crystal'), at('flight'), at('tripFuel:mycel'), at('course:mycel'), at('reunion')]).toEqual([at('crystal'), at('crystal') + 1, at('crystal') + 2, at('crystal') + 3, at('crystal') + 4]);
    expect(keys[keys.length - 1]).toBe('brineEnd');
  });
});

describe("Brine's creatures and the Leviathan's cave", () => {
  const built = buildWorld(PLANET_3, { ...MENDED, at: 'brine' }, null);
  const { terrain: t, water, creatures = [], lander } = built.setup;
  const w = water!;
  const tileOf = (x: number, y: number): [number, number] => [Math.floor(x / T), Math.floor(y / T)];

  it('has every one of Brine\'s kinds, and its giant, the Leviathan', () => {
    for (const kind of ['crab', 'jelly', 'lamprey'] as const) expect(creatures.filter((c) => c.kind === kind).length, kind).toBeGreaterThan(2);
    expect(creatures.filter((c) => c.kind === 'leviathan')).toHaveLength(1);
    expect(CREATURE_KINDS).toEqual(expect.arrayContaining(['crab', 'jelly', 'lamprey']));
  });

  it('keeps them away from the lander and out of the Tidesingers\' reef', () => {
    const reef = PLANET_3.world.reef!.at[0];
    for (const c of creatures) {
      const col = Math.floor(c.x / T);
      expect(Math.abs(col - lander.col), `${c.kind} at ${col}`).toBeGreaterThan(12);
      // The reef's cave lies 26 to 40 m down: open sea above it is fine.
      const depth = c.y / T - PLANET_3.world.site.surface;
      if (c.kind !== 'crab') expect(Math.abs(col - reef) < 13 && depth > 26 && depth < 40, `${c.kind} at ${col}`).toBe(false);
    }
  });

  it('puts the jellies in water, and the eels in walls facing water', () => {
    for (const c of creatures.filter((k) => k.kind === 'jelly')) expect(w.isWet(...tileOf(c.x, c.y))).toBe(true);
    for (const c of creatures.filter((k) => k.kind === 'lamprey')) {
      const [col, row] = tileOf(c.x + c.facing * 4, c.y);
      expect(w.isWet(col, row)).toBe(true);
      expect(isSolid(t, col - c.facing, row)).toBe(true);
    }
  });

  it('has the Leviathan asleep in water, with the crystal in the same cave, beyond its hearing', () => {
    const lev = creatures.find((c) => c.kind === 'leviathan')!;
    expect(lev.state).toBe('idle');
    const [lc, lr] = tileOf(lev.x, lev.y - T / 2);
    expect(w.isWet(lc, lr)).toBe(true);
    const site = PLANET_3.world.site;
    const [cc, cd] = PLANET_3.world.crystal!.at;
    const crow = site.surface + cd;
    expect(w.isWet(cc, crow)).toBe(true);
    expect(isSolid(t, cc, crow + 1)).toBe(true);
    // The same floor, open all the way between them.
    for (let x = lc; x <= cc; x++) expect(isSolid(t, x, crow), `column ${x}`).toBe(false);
    // Digging straight down to it, from above, stays out of earshot.
    const edge = lc + CREATURE.leviathan.w / 2;
    expect(cc - edge).toBeGreaterThan(CREATURE.leviathan.hear);
  });

  it('passes the paid-content validator with its giant and crystal, and refuses an unknown giant', () => {
    expect(parsePlanets(JSON.parse(JSON.stringify([PLANET_3])))[0]!.world.giant).toEqual({ at: [165, 92], kind: 'leviathan' });
    const odd = { ...PLANET_3, world: { ...PLANET_3.world, giant: { at: [165, 92], kind: 'kraken' } } };
    expect(() => parsePlanets(JSON.parse(JSON.stringify([odd])))).toThrow();
  });
});
