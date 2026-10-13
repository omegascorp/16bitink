import { describe, expect, it } from 'vitest';
import { gradeCost, standing, tileCost, tooHard } from '../src/logic/drill';
import { TILE } from '../src/logic/terrain';

describe('drill costs (the spec table)', () => {
  it('weighs the mark against the planet', () => {
    expect(standing({ mk: 2, planet: 3 })).toBe('behind');
    expect(standing({ mk: 3, planet: 3 })).toBe('own');
    expect(standing({ mk: 6, planet: 3 })).toBe('ahead');
  });

  it('a drill a step behind digs soil at double cost and nothing harder', () => {
    const d = { mk: 2, planet: 3 };
    expect([gradeCost(d, 0), gradeCost(d, 1), gradeCost(d, 2)]).toEqual([2, null, null]);
  });

  it("the planet's own drill opens the stone", () => {
    const d = { mk: 3, planet: 3 };
    expect([gradeCost(d, 0), gradeCost(d, 1), gradeCost(d, 2)]).toEqual([1, 2, null]);
  });

  it("the next planet's drill opens the deep rock", () => {
    const d = { mk: 4, planet: 3 };
    expect([gradeCost(d, 0), gradeCost(d, 1), gradeCost(d, 2)]).toEqual([1, 1, 2]);
  });

  it('Graphite is gentle: the starter drill digs its soil at the normal cost', () => {
    const d = { mk: 0, planet: 1 };
    expect([gradeCost(d, 0), gradeCost(d, 1)]).toEqual([1, null]);
  });

  it('bedrock never breaks; crates cost a tap', () => {
    const d = { mk: 10, planet: 1 };
    expect(tileCost(d, TILE.bedrock)).toBeNull();
    expect(tileCost(d, TILE.air)).toBeNull();
    expect(tileCost(d, TILE.crate)).toBe(1);
    expect(tooHard({ mk: 1, planet: 1 }, 2)).toBe(true);
  });
});
