import { describe, expect, it } from 'vitest';
import { INKCRAB_PAID_BEACHES } from '../content/paid';
import { BEACH_1 } from '../src/level/beach1';
import {
  beachIndexOf, BUILT_BEACHES, FREE_BEACHES, installPaidBeaches, isFreeEnd, isPaid, levelById, levelOrder, loadedBeaches, loadedLevels, nextLevel,
} from '../src/level/levels';
import { parseBeaches } from '../src/level/validate';

declare global {
  interface ImportMeta {
    glob(pattern: string, options: { query: '?raw'; import: 'default'; eager: true }): Record<string, string>;
  }
}

/** Every client source file's text, by path. */
const SOURCES = import.meta.glob('../src/**/*.ts', { query: '?raw', import: 'default', eager: true });
const wire = (v: unknown): unknown => JSON.parse(JSON.stringify(v));

describe('paid beaches stay out of the game bundle', () => {
  it('no client code imports beaches 2 to 10 or the paid content', () => {
    expect(Object.keys(SOURCES).length).toBeGreaterThan(50);
    for (const [file, text] of Object.entries(SOURCES)) {
      const imports = [...text.matchAll(/from '([^']+)'/g)].map((m) => m[1]!);
      for (const spec of imports) {
        expect(spec, file).not.toMatch(/(^|\/)beach([2-9]|10)$/);
        expect(spec, file).not.toMatch(/content\/paid/);
      }
    }
  });

  it('a player without the full game has only the free beach', () => {
    expect(FREE_BEACHES).toBe(1);
    expect(FREE_BEACHES + INKCRAB_PAID_BEACHES.length).toBe(BUILT_BEACHES);
    expect(loadedBeaches()).toHaveLength(1);
    expect(loadedLevels().map((l) => l.id)).toEqual(BEACH_1.map((l) => l.id));
    const paid = INKCRAB_PAID_BEACHES[0]![0]!;
    expect(levelById(paid.id)).toBeUndefined();
    expect(isPaid(paid.id)).toBe(true);
    expect(isPaid(BEACH_1[0]!.id)).toBe(false);
    expect(isFreeEnd(BEACH_1.at(-1)!.id)).toBe(true);
    expect(nextLevel(BEACH_1.at(-1)!.id)).toBeUndefined();
  });
});

describe('parseBeaches', () => {
  it('accepts the paid beaches as they arrive over the wire', () => {
    const beaches = parseBeaches(wire(INKCRAB_PAID_BEACHES));
    expect(beaches).toHaveLength(9);
    expect(beaches.flat()).toHaveLength(90);
    expect(beaches).toEqual(INKCRAB_PAID_BEACHES);
  });

  it('rejects anything that is not a list of beaches', () => {
    expect(() => parseBeaches(null)).toThrow();
    expect(() => parseBeaches({})).toThrow();
    expect(() => parseBeaches([])).toThrow();
    expect(() => parseBeaches([[]])).toThrow();
    expect(() => parseBeaches(['beach'])).toThrow();
  });

  const withLevel = (patch: Record<string, unknown>): unknown => {
    const beaches = wire(INKCRAB_PAID_BEACHES) as Record<string, unknown>[][];
    beaches[0]![0] = { ...beaches[0]![0]!, ...patch };
    return beaches;
  };

  it('rejects a malformed level', () => {
    expect(() => parseBeaches(withLevel({ id: undefined }))).toThrow(/Beach 2 level 1/);
    expect(() => parseBeaches(withLevel({ id: 'Not A Slug' }))).toThrow();
    expect(() => parseBeaches(withLevel({ width: -4 }))).toThrow();
    expect(() => parseBeaches(withLevel({ profile: [[0, 'x']] }))).toThrow();
    expect(() => parseBeaches(withLevel({ shells: [['pebble', 3, 10, 0]] }))).toThrow();
    expect(() => parseBeaches(withLevel({ food: { surface: 3 } }))).toThrow();
    expect(() => parseBeaches(withLevel({ critters: [{ count: 2, sizes: [1, 2], species: 'dragon' }] }))).toThrow();
    expect(() => parseBeaches(withLevel({ birds: [{ count: 1, size: 3, species: 'pterodactyl' }] }))).toThrow();
    expect(() => parseBeaches(withLevel({ tide: { low: 20 } }))).toThrow();
    expect(() => parseBeaches(withLevel({ teach: ['juggle'] }))).toThrow();
    expect(() => parseBeaches(withLevel({ ground: 'lava' }))).toThrow();
  });

  it('rejects level ids used twice or taken by the free beach', () => {
    expect(() => parseBeaches(withLevel({ id: INKCRAB_PAID_BEACHES[0]![1]!.id }))).toThrow(/twice/);
    expect(() => parseBeaches(withLevel({ id: BEACH_1[0]!.id }))).toThrow(/twice/);
  });
});

describe('installing the full game', () => {
  it('adds the paid beaches after the free one', () => {
    installPaidBeaches(parseBeaches(wire(INKCRAB_PAID_BEACHES)));
    expect(loadedBeaches()).toHaveLength(10);
    expect(levelOrder()).toHaveLength(100);
    const first = INKCRAB_PAID_BEACHES[0]![0]!;
    expect(levelById(first.id)?.name).toBe(first.name);
    expect(beachIndexOf(first.id)).toBe(1);
    expect(nextLevel(BEACH_1.at(-1)!.id)?.id).toBe(first.id);
    expect(isPaid(first.id)).toBe(true);
    expect(isPaid(BEACH_1[0]!.id)).toBe(false);
  });
});
