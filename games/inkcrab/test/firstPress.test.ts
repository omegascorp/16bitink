import { describe, expect, it } from 'vitest';
import type { KeyValueStore } from '@16bitink/game-sdk';
import { shellOf } from '../src/logic/shells';
import { makeCritter } from '../src/logic/critters';
import { meterGoal } from '../src/logic/growth';
import { makeItem, shell } from '../src/logic/items';
import { Beach, IDLE, type Input } from '../src/logic/sim';
import { createTerrain, setTile, TILE, type Terrain } from '../src/logic/terrain';
import { FirstPress, parseTaught, pressNeeded } from '../src/logic/firstPress';

const T = 16;

function beach(items = [] as ReturnType<typeof makeItem>[]): Beach {
  const terrain: Terrain = createTerrain(60, 30);
  for (let x = 0; x < 60; x++) for (let y = 10; y < 30; y++) setTile(terrain, x, y, TILE.sand);
  return new Beach({ terrain, items, start: { x: 5 * T, y: 10 * T }, tileSize: T, startShell: shellOf('periwinkle'), seed: 1, surfaceFood: 0 });
}

const step = (b: Beach, input: Partial<Input> = {}, frames = 1): void => {
  for (let i = 0; i < frames; i++) b.step({ ...IDLE, ...input }, 1 / 60);
};

function memoryStore(): KeyValueStore {
  const data = new Map<string, string>();
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
}

/** A size-3 nerite lying on the sand where the crab stands: it fits a size-2 crab. */
const looseNerite = (): ReturnType<typeof makeItem> => {
  const proto = makeItem(1, shell('nerite', 3), 0, 0, false);
  return { ...proto, x: 5 * T + T / 2 - proto.w / 2, y: 10 * T - proto.h };
};

/** A hunter bigger than the crab, a few tiles off. */
const addHunter = (b: Beach): void => {
  b.critters.set(50, makeCritter(50, 4, b.crab.body.x + 60, 10 * T, -1, 10));
};

describe('which press the player needs to be shown', () => {
  it('asks for nothing on a quiet beach', () => {
    const b = beach();
    step(b, {}, 30);
    expect(pressNeeded(b, null)).toBeNull();
  });

  it('asks to hide when a hunter that can catch the crab comes near', () => {
    const b = beach();
    step(b, {}, 30);
    addHunter(b);
    expect(pressNeeded(b, null)).toBe('hide');
  });

  it('stops asking to hide once the crab is in its shell', () => {
    const b = beach();
    step(b, {}, 30);
    addHunter(b);
    step(b, { hide: true }, 2);
    expect(pressNeeded(b, null)).toBeNull();
  });

  it('asks to grab when a shell that fits is in reach', () => {
    const b = beach([looseNerite()]);
    b.crab = { ...b.crab, growth: { size: 2, meter: meterGoal(2) } };
    step(b, {}, 30);
    expect(b.nearbyFits).toBe(true);
    expect(pressNeeded(b, null)).toBe('grab');
  });

  it('asks to dig when the coach is teaching a dig, the way down to a buried shell, or the way out of a hole', () => {
    const b = beach();
    step(b, {}, 30);
    expect(pressNeeded(b, 'dig')).toBe('dig');
    expect(pressNeeded(b, 'buried')).toBe('dig');
    expect(pressNeeded(b, 'stuck')).toBe('dig');
    expect(pressNeeded(b, 'swap')).toBeNull();
  });

  it('asks to drop sand once the crab is full of it, ahead of digging more', () => {
    const b = beach();
    step(b, {}, 30);
    b.crab = { ...b.crab, sand: b.sandCapacity };
    expect(pressNeeded(b, null)).toBe('drop');
    expect(pressNeeded(b, 'dig')).toBe('drop');
  });

  it('puts hiding first: the danger can\'t wait', () => {
    const b = beach();
    step(b, {}, 30);
    addHunter(b);
    expect(pressNeeded(b, 'dig')).toBe('hide');
  });
});

describe('the first-press cue', () => {
  it('shows a press until the player has made it, then never again', () => {
    const store = memoryStore();
    const b = beach();
    step(b, {}, 30);
    addHunter(b);
    const cue = new FirstPress(store);
    expect(cue.cue(b, null, 'keys')).toBe('hide');
    step(b, { hide: true }, 2);
    cue.observe(b, 'keys');
    expect(cue.cue(b, null, 'keys')).toBeNull();
    step(b, {}, 2);
    expect(b.crab.hidden).toBe(false);
    expect(cue.cue(b, null, 'keys')).toBeNull();
    // Remembered across levels.
    expect(new FirstPress(store).cue(b, null, 'keys')).toBeNull();
  });

  it('keeps the keyboard and the touch buttons apart: learning a key doesn\'t teach the button', () => {
    const store = memoryStore();
    const b = beach();
    step(b, {}, 30);
    addHunter(b);
    const cue = new FirstPress(store);
    step(b, { hide: true }, 2);
    cue.observe(b, 'keys');
    step(b, {}, 2);
    expect(cue.cue(b, null, 'touch')).toBe('hide');
  });

  it('learns a dig from the sand the crab picks up', () => {
    const b = beach();
    step(b, {}, 30);
    const cue = new FirstPress(undefined);
    cue.observe(b, 'touch');
    expect(cue.cue(b, 'dig', 'touch')).toBe('dig');
    step(b, { dig: true, aimY: 1 }, 20);
    expect(b.crab.sand).toBeGreaterThan(0);
    cue.observe(b, 'touch');
    expect(cue.cue(b, 'dig', 'touch')).toBeNull();
  });

  it('learns dropping sand from the sand the crab puts down', () => {
    const b = beach();
    step(b, {}, 30);
    b.crab = { ...b.crab, sand: b.sandCapacity };
    const cue = new FirstPress(undefined);
    cue.observe(b, 'keys');
    expect(cue.cue(b, null, 'keys')).toBe('drop');
    step(b, { place: true }, 2);
    expect(b.crab.sand).toBeLessThan(b.sandCapacity);
    cue.observe(b, 'keys');
    b.crab = { ...b.crab, sand: b.sandCapacity };
    expect(cue.cue(b, null, 'keys')).toBeNull();
  });

  it('learns moving in from the crab starting to move house', () => {
    const b = beach([looseNerite()]);
    b.crab = { ...b.crab, growth: { size: 2, meter: meterGoal(2) } };
    step(b, {}, 30);
    const cue = new FirstPress(undefined);
    expect(cue.cue(b, null, 'keys')).toBe('grab');
    step(b, { interact: true });
    cue.observe(b, 'keys');
    expect(cue.cue(b, null, 'keys')).toBeNull();
  });

  it('keeps nothing it doesn\'t know from an untrusted save', () => {
    expect(parseTaught(['keys:dig', 'touch:hide', 'touch:drop', 'keys:fly', 42, 'x'.repeat(100)])).toEqual(['keys:dig', 'touch:hide', 'touch:drop']);
    expect(parseTaught({ nope: true })).toEqual([]);
    expect(parseTaught(null)).toEqual([]);
  });

  it('survives a store that throws', () => {
    const broken: KeyValueStore = {
      getItem: () => { throw new Error('denied'); },
      setItem: () => { throw new Error('denied'); },
    };
    const b = beach();
    step(b, {}, 30);
    addHunter(b);
    const cue = new FirstPress(broken);
    expect(cue.cue(b, null, 'keys')).toBe('hide');
    step(b, { hide: true }, 2);
    expect(() => cue.observe(b, 'keys')).not.toThrow();
  });
});
