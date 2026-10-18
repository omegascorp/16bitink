import { describe, expect, it } from 'vitest';
import { INKMINE_PAID_PLANETS } from '../content/paid';
import { currentPlanet, hasWorld, installPaidPlanets, loadedPlanets, planetOf } from '../src/level/planets';
import { parsePlanets } from '../src/level/validate';
import { NEW_PROFILE, type Profile } from '../src/logic/economy';
import { firstScene } from '../src/level/route';

/** Every client source file's text, by path (Vite's glob import: its types come with src/narration/library.ts). */
const SOURCES = import.meta.glob<string>('../src/**/*.ts', { query: '?raw', import: 'default', eager: true });
const wire = (v: unknown): unknown => JSON.parse(JSON.stringify(v));

describe('paid planets stay out of the game bundle', () => {
  it('no client code imports the full game\'s planets', () => {
    expect(Object.keys(SOURCES).length).toBeGreaterThan(50);
    for (const [file, text] of Object.entries(SOURCES)) {
      const imports = [...text.matchAll(/from '([^']+)'/g)].map((m) => m[1]!);
      for (const spec of imports) {
        expect(spec, file).not.toMatch(/(^|\/)planet([2-9]|10)$/);
        expect(spec, file).not.toMatch(/content\//);
      }
    }
  });

  it('a player without the full game has only Graphite, and stays on it', () => {
    expect(loadedPlanets().map((p) => p.world.id)).toEqual(['graphite']);
    expect(hasWorld('mycel')).toBe(false);
    expect(planetOf('mycel')).toBeUndefined();
    expect(currentPlanet({ at: 'mycel' }).world.id).toBe('graphite');
  });
});

describe('parsePlanets', () => {
  it('accepts the paid planets as they arrive over the wire', () => {
    expect(parsePlanets(wire(INKMINE_PAID_PLANETS))).toEqual(INKMINE_PAID_PLANETS);
  });

  it('rejects anything that is not a list of planets', () => {
    for (const bad of [null, {}, [], ['mycel'], 'planets']) expect(() => parsePlanets(bad)).toThrow();
  });

  const withPlanet = (patch: (p: Record<string, any>) => void): unknown => {
    const planets = wire(INKMINE_PAID_PLANETS) as Record<string, any>[];
    patch(planets[0]!);
    return planets;
  };

  it('rejects a malformed planet', () => {
    expect(() => parsePlanets(withPlanet((p) => { p.name = ''; }))).toThrow(/Planet 2/);
    expect(() => parsePlanets(withPlanet((p) => { p.number = 1; }))).toThrow();
    expect(() => parsePlanets(withPlanet((p) => { p.world.id = 'graphite'; }))).toThrow();
    expect(() => parsePlanets(withPlanet((p) => { p.world.id = 'atlantis'; }))).toThrow();
    expect(() => parsePlanets(withPlanet((p) => { p.style.soil = 'violet'; }))).toThrow();
    expect(() => parsePlanets(withPlanet((p) => { p.signature = 'gold'; }))).toThrow();
    expect(() => parsePlanets(withPlanet((p) => { p.world.site.ores[0].ore = 'gold'; }))).toThrow();
    expect(() => parsePlanets(withPlanet((p) => { p.world.items[0].blueprint = 'laser-9'; }))).toThrow();
    expect(() => parsePlanets(withPlanet((p) => { p.world.site.caps[0].where = 'sky'; }))).toThrow();
  });

  it('rejects a world too big to carve, or one that wraps off a chunk', () => {
    expect(() => parsePlanets(withPlanet((p) => { p.world.site.width = 100_000; }))).toThrow();
    expect(() => parsePlanets(withPlanet((p) => { p.world.site.height = 100_000; }))).toThrow();
    expect(() => parsePlanets(withPlanet((p) => { p.world.site.caves = 1e9; }))).toThrow();
    expect(() => parsePlanets(withPlanet((p) => { p.world.site.width = 250; }))).toThrow(/chunks/);
  });

  it('rejects an item id used twice', () => {
    expect(() => parsePlanets(withPlanet((p) => { p.world.items[1].id = p.world.items[0].id; }))).toThrow(/twice/);
  });
});

describe('installing the full game', () => {
  it('adds Mycel and Brine after Graphite, and a profile there lands there', () => {
    installPaidPlanets(parsePlanets(wire(INKMINE_PAID_PLANETS)));
    expect(loadedPlanets().map((p) => p.world.id)).toEqual(['graphite', 'mycel', 'brine']);
    expect(hasWorld('mycel') && hasWorld('brine')).toBe(true);
    expect(currentPlanet({ ...NEW_PROFILE, at: 'mycel' }).name).toBe('Mycel');
    expect(currentPlanet({ ...NEW_PROFILE, at: 'brine' }).name).toBe('Brine');
  });
});

describe('the first screen', () => {
  const done = { ...NEW_PROFILE, docked: true, beats: ['flown', 'course'] as Profile['beats'] };

  it('is the star map at the end of the demo, until the full game is here', () => {
    installPaidPlanets([]);
    expect(firstScene(done)[0]).toBe('System');
    expect(firstScene({ ...done, at: 'mycel' })).toEqual(['System', { selected: 'mycel' }]);
    installPaidPlanets(parsePlanets(wire(INKMINE_PAID_PLANETS)));
    expect(firstScene(done)[0]).toBe('Ship');
    expect(firstScene({ ...done, at: 'mycel' })[0]).toBe('Ship');
    expect(firstScene({ ...done, at: 'mycel', docked: false })[0]).toBe('Game');
  });
});
