import { describe, expect, it } from 'vitest';
import { shellOf } from '../src/logic/shells';
import { carve } from '../src/level/carve';
import { makeCritter } from '../src/logic/critters';
import { Beach, IDLE, type BeachSetup, type Input } from '../src/logic/sim';
import type { TideSpec } from '../src/logic/tide';

const T = 16;
/** A shore 60 wide: sand from row 10 at the left down to row 18 at the sea edge. */
const TIDE: TideSpec = { low: 22, high: 12, period: 40 };

function shore(over: Partial<BeachSetup> = {}): Beach {
  const terrain = carve({ width: 60, height: 30, seed: 1, profile: [[0, 10], [59, 18]], granite: 6, dens: over.dens, pools: over.pools });
  return new Beach({ terrain, items: [], start: { x: 6 * T, y: 10 * T }, tileSize: T, startShell: shellOf('periwinkle'), seed: 1, surfaceFood: 0, tide: TIDE, ...over });
}

const run = (b: Beach, input: Partial<Input>, seconds: number) => {
  const events = [];
  for (let i = 0; i < Math.round(seconds * 60); i++) events.push(...b.step({ ...IDLE, ...input }, 1 / 60));
  return events;
};
const put = (b: Beach, col: number): void => {
  const c = b.crab;
  let row = 0;
  while (b.terrain.tiles[row * b.terrain.width + col] === 0) row++;
  b.crab = { ...c, body: { ...c.body, x: col * T, y: row * T - c.body.h, vy: 0 } };
};

describe('the tide in play', () => {
  it('floods the low shore at high water and leaves it at low', () => {
    const b = shore();
    put(b, 50);
    run(b, {}, 0.5);
    expect(b.submerged(b.crab.body)).toBe(false);
    run(b, {}, TIDE.period / 2 - 0.5);
    expect(b.submerged(b.crab.body)).toBe(true);
    run(b, {}, TIDE.period / 2);
    expect(b.submerged(b.crab.body)).toBe(false);
  });

  it('slows the crab under water, but never harms it', () => {
    const dry = shore();
    put(dry, 30);
    run(dry, {}, 0.3);
    const x0 = dry.crab.body.x;
    run(dry, { moveX: -1 }, 1);
    const onLand = x0 - dry.crab.body.x;
    const wet = shore();
    put(wet, 52);
    run(wet, {}, TIDE.period / 2);
    expect(wet.submerged(wet.crab.body)).toBe(true);
    const x1 = wet.crab.body.x;
    run(wet, { moveX: -1 }, 1);
    expect(x1 - wet.crab.body.x).toBeLessThan(onLand * 0.8);
    expect(wet.lives).toBe(3);
  });

  it('washes in the level\'s shells, one each high water, on the strandline', () => {
    const b = shore({ tideBrings: { food: 2, shells: [['necklace', 5, 40], ['frogshell', 6, 41]] } });
    run(b, {}, TIDE.period / 2 + 0.2);
    const shells = (): string[] => [...b.items.values()].flatMap((i) => (i.kind.type === 'shell' ? [i.kind.shell.kind] : []));
    expect(shells()).toEqual(['necklace']);
    expect([...b.items.values()].filter((i) => i.kind.type === 'food').length).toBeGreaterThanOrEqual(2);
    run(b, {}, TIDE.period);
    expect(shells().sort()).toEqual(['frogshell', 'necklace']);
  });

  it('sends the gulls off when the water comes in, and back when it goes out', () => {
    const b = shore({ critters: [{ count: 1, sizes: [6, 6], species: 'gull' }] });
    const gull = () => [...b.critters.values()].find((k) => k.species === 'gull');
    expect(gull()?.flight).toBeUndefined();
    // As the water comes in it takes off and climbs away, then it's gone.
    const flights = new Set<string | undefined>();
    for (let i = 0; i < 60 * TIDE.period / 2; i++) {
      b.step(IDLE, 1 / 60);
      flights.add(gull() ? gull()!.flight ?? 'ground' : 'gone');
    }
    expect(flights.has('off')).toBe(true);
    expect(gull()).toBeUndefined();
    // As it goes out, one flies in and lands.
    for (let i = 0; i < 60 * TIDE.period / 2; i++) {
      b.step(IDLE, 1 / 60);
      flights.add(gull() ? gull()!.flight ?? 'ground' : 'gone');
    }
    expect(flights.has('in')).toBe(true);
    expect(gull()?.flight).toBeUndefined();
  });
});

describe('fish', () => {
  it('stay in the water and go after a smaller crab in it', () => {
    const b = shore({ critters: [] });
    put(b, 52);
    run(b, {}, TIDE.period / 2);
    const fish = makeCritter(900, 5, 56 * T, 15 * T, -1, 10, 'sculpin');
    b.critters.set(900, fish);
    run(b, { hide: false }, 4);
    expect(b.lives).toBeLessThan(3);
  });
});

describe('octopuses', () => {
  // A crevice in the rock under the sand: rows 16+ are granite at column 20 (surface ~12.7, granite 6 rows).
  const den = (): Beach => {
    const b = shore({ dens: [[20, 13]], critters: [{ count: 1, sizes: [6, 6], species: 'octopus' }] });
    return b;
  };

  it('sit in their den, reaching out for a smaller crab close by', () => {
    const b = den();
    const k = [...b.critters.values()][0]!;
    expect(Math.floor((k.x + k.w / 2) / T)).toBe(20);
    put(b, 22);
    run(b, {}, 0.6);
    const after = [...b.critters.values()][0]!;
    expect(after.arm).toBeGreaterThan(0);
    expect(after.x).toBeCloseTo(k.x);
  });

  it('catch it with the arm, and leave a crab hiding in its shell alone', () => {
    const caught = den();
    put(caught, 22);
    run(caught, {}, 3);
    expect(caught.lives).toBeLessThan(3);
    const hidden = den();
    put(hidden, 22);
    run(hidden, { hide: true }, 3);
    expect(hidden.lives).toBe(3);
  });

  it('let a crab far enough away be', () => {
    const b = den();
    put(b, 30);
    run(b, {}, 3);
    expect([...b.critters.values()][0]!.arm).toBe(0);
    expect(b.lives).toBe(3);
  });
});

describe('swimming', () => {
  /** A rock pool four deep at columns 20–25, starting full. */
  const pool = (): Beach => shore({ pools: [[20, 6, 4]], critters: [] });

  it('gets a crab up out of a deep rock pool with swim strokes', () => {
    const b = pool();
    put(b, 22);
    run(b, {}, 1);
    expect(b.submerged(b.crab.body)).toBe(true);
    const floor = b.crab.body.y;
    // Paddle up, then out over the rim to the left.
    for (let i = 0; i < 60 * 4; i++) b.step({ ...IDLE, jump: i % 15 === 0, moveX: -1 }, 1 / 60);
    expect(b.submerged(b.crab.body)).toBe(false);
    expect(b.crab.body.y).toBeLessThan(floor - 3 * T);
    expect(b.crab.body.x).toBeLessThan(20 * T);
  });

  it('kicks even when not standing on anything, so it can paddle up', () => {
    const b = pool();
    put(b, 22);
    run(b, {}, 1);
    let lowest = -Infinity;
    let highest = Infinity;
    for (let i = 0; i < 60 * 3; i++) {
      b.step({ ...IDLE, jump: i % 12 === 0 }, 1 / 60);
      highest = Math.min(highest, b.crab.body.y);
      lowest = Math.max(lowest, b.crab.body.y);
    }
    expect(lowest - highest).toBeGreaterThan(2 * T);
  });
});

describe('stranded fish', () => {
  const ground = (b: Beach, col: number): number => {
    let row = 0;
    while (b.terrain.tiles[row * b.terrain.width + col] === 0) row++;
    return row;
  };

  it('die after a few seconds out of the water, and are food worth catching them', () => {
    const b = shore({ critters: [] });
    const fish = makeCritter(900, 4, 30 * T, ground(b, 30) * T, 1, 10, 'sculpin');
    b.critters.set(900, fish);
    run(b, {}, 2);
    expect(b.critters.has(900)).toBe(true);
    run(b, {}, 3);
    expect(b.critters.has(900)).toBe(false);
    const meal = [...b.items.values()].find((i) => i.kind.type === 'food' && i.kind.food === 'fish');
    expect(meal?.buried).toBe(false);
    expect(meal?.kind.type === 'food' && meal.kind.points).toBe(5);
  });

  it('die at once when buried in sand, and can be dug up and eaten', () => {
    const b = shore({ critters: [] });
    const row = ground(b, 10) + 1;
    const fish = { ...makeCritter(900, 2, 10 * T + T / 2, (row + 1) * T, 1, 10, 'blenny'), dry: 0.1 };
    b.critters.set(900, fish);
    run(b, {}, 0.1);
    const meal = [...b.items.values()].find((i) => i.kind.type === 'food' && i.kind.food === 'fish')!;
    expect(meal.buried).toBe(true);
    // Dig down to it (the tiles over and round it cleared, as digging would), then walk into the hole.
    for (const [x, y] of [[10, row - 1], [10, row], [9, row - 1]] as const) b.terrain.tiles[y * b.terrain.width + x] = 0;
    const c = b.crab;
    b.crab = { ...c, body: { ...c.body, x: 10 * T + (T - c.body.w) / 2, y: (row - 2) * T, vy: 0 } };
    run(b, {}, 1);
    expect(b.items.has(meal.id)).toBe(false);
    expect(b.crab.growth.meter + b.crab.growth.bank).toBeGreaterThan(0);
  });
});
