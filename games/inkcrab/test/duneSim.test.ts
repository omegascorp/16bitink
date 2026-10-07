import { describe, expect, it } from 'vitest';
import { BEACH_2 } from '../src/level/beach2';
import { buildLevel } from '../src/level/build';
import { carve } from '../src/level/carve';
import { createRng } from '../src/logic/rng';
import { Beach, IDLE, PIT_PULL, type BeachSetup, type Input } from '../src/logic/sim';
import { TILE, type Terrain } from '../src/logic/terrain';

const T = 16;

/** A flat dune beach, 60 wide: loose sand over packed, with whatever pits and birds. */
function dune(over: Partial<BeachSetup> & { pits?: readonly (readonly [number, number])[] } = {}): Beach {
  const terrain = carve({ width: 60, height: 30, seed: 1, profile: [[0, 12], [59, 12]], loose: 3, pits: over.pits });
  return new Beach({ terrain, items: [], start: { x: 6 * T, y: 12 * T }, tileSize: T, startShell: 'periwinkle', seed: 1, surfaceFood: 0, ...over });
}

const run = (b: Beach, input: Partial<Input>, seconds: number) => {
  const events = [];
  for (let i = 0; i < Math.round(seconds * 60); i++) events.push(...b.step({ ...IDLE, ...input }, 1 / 60));
  return events;
};

const sand = (t: Terrain): number => t.tiles.reduce((n, v) => n + (v === TILE.sand || v === TILE.placed || v === TILE.loose ? 1 : 0), 0);

describe('dunes in play', () => {
  it('pour into a hole dug in them', () => {
    const b = dune();
    run(b, {}, 0.5);
    // A shaft deeper than the crab: the dune sand at its mouth slides in over it.
    const events = run(b, { dig: true, aimY: 1 }, 1.2);
    const poured = events.filter((e) => e.type === 'tiles' && !e.dug);
    expect(poured.length).toBeGreaterThan(0);
  });

  it('never make or lose sand in random play', () => {
    const b = new Beach(buildLevel(BEACH_2[0]!));
    const rng = createRng(7);
    const start = sand(b.terrain) + b.crab.sand;
    let input: Input = IDLE;
    for (let frame = 0; frame < 60 * 90; frame++) {
      const digging = b.crab.sand < b.sandCapacity;
      if (frame % 8 === 0) input = { ...IDLE, moveX: [-1, 0, 1][Math.floor(rng() * 3)]!, aimY: ([-1, 0, 1] as const)[Math.floor(rng() * 3)]!, jump: rng() < 0.1, dig: digging && rng() < 0.7, place: rng() < 0.3 };
      b.step(input, 1 / 60);
      expect(sand(b.terrain) + b.crab.sand).toBe(start);
    }
  }, 30_000);
});

describe('antlion pits', () => {
  it('slide a crab on the slope towards the bottom', () => {
    const b = dune({ pits: [[20, 4]] });
    // Drop it onto the left slope and let it stand still.
    b.crab = { ...b.crab, body: { ...b.crab.body, x: 17 * T, y: 8 * T } };
    run(b, {}, 0.3);
    const x0 = b.crab.body.x;
    run(b, {}, 0.5);
    expect(b.crab.body.x).toBeGreaterThan(x0 + 5);
    expect(b.pitPull(b.crab.body)).toBeLessThanOrEqual(PIT_PULL);
  });

  it('can be walked out of', () => {
    const b = dune({ pits: [[20, 3]] });
    b.crab = { ...b.crab, body: { ...b.crab.body, x: 19 * T, y: 10 * T } };
    run(b, {}, 0.5);
    run(b, { moveX: -1 }, 3);
    expect(b.crab.body.x).toBeLessThan(16 * T);
  });

  it('pull no more once filled in', () => {
    const b = dune({ pits: [[20, 3]] });
    for (let x = 17; x <= 23; x++) for (let y = 12; y < 15; y++) if (b.terrain.tiles[y * 60 + x] === TILE.air) b.terrain.tiles[y * 60 + x] = TILE.placed;
    b.crab = { ...b.crab, body: { ...b.crab.body, x: 18 * T, y: 10 * T } };
    run(b, {}, 0.5);
    expect(b.pitPull(b.crab.body)).toBe(0);
  });

  it('keep an antlion at the bottom', () => {
    const b = dune({ pits: [[20, 3], [40, 3]], critters: [{ count: 2, sizes: [5, 5], species: 'antlion' }] });
    const cols = [...b.critters.values()].map((k) => Math.floor((k.x + k.w / 2) / T)).sort((a, z) => a - z);
    expect(cols).toEqual([20, 40]);
  });
});

describe('kestrels in play', () => {
  const sky = (): Beach => dune({ birds: [{ count: 1, size: 5 }] });
  const near = (b: Beach): void => {
    const k = [...b.birds.values()][0]!;
    b.birds.set(k.id, { ...k, x: b.crab.body.x });
  };

  it('catch a crab out in the open', () => {
    const b = sky();
    near(b);
    run(b, {}, 6);
    expect(b.lives).toBe(2);
  });

  it('strike a crab hiding in its shell harmlessly, then fly off', () => {
    const b = sky();
    near(b);
    run(b, {}, 0.5);
    expect([...b.birds.values()][0]!.phase).toBe('hover');
    run(b, { hide: true }, 4);
    expect(b.lives).toBe(3);
    expect([...b.birds.values()][0]!.bored).toBeGreaterThan(0);
  });

  it('leave a crab alone once it has outgrown them', () => {
    const b = sky();
    near(b);
    b.crab = { ...b.crab, growth: { ...b.crab.growth, size: 5 } };
    run(b, {}, 6);
    expect(b.lives).toBe(3);
  });
});
