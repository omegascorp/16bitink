import { describe, expect, it } from 'vitest';
import type { KeyValueStore } from '@16bitink/game-sdk';
import { shellOf } from '../src/logic/shells';
import { makeCritter } from '../src/logic/critters';
import { meterGoal } from '../src/logic/growth';
import { makeItem, shell } from '../src/logic/items';
import { Beach, IDLE, type Input } from '../src/logic/sim';
import { createTerrain, setTile, TILE, type Terrain } from '../src/logic/terrain';
import { FirstPress, LOST_SECONDS, parseTaught, pressNeeded, PUSH_SECONDS, STILL_SECONDS } from '../src/logic/firstPress';

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

/** A bank `tiles` high from column 10 on, to the right of where the crab starts. */
function bank(b: Beach, tiles: number): void {
  for (let x = 10; x < 60; x++) for (let y = 10 - tiles; y < 10; y++) setTile(b.terrain, x, y, TILE.sand);
}

/** Steps the beach with the cue watching, as the HUD does each frame. */
const watch = (b: Beach, cue: FirstPress, input: Partial<Input> = {}, seconds = 1 / 60, controls: 'keys' | 'touch' = 'keys'): void => {
  for (let i = 0; i < Math.max(1, Math.round(seconds * 60)); i++) {
    b.step({ ...IDLE, ...input }, 1 / 60);
    cue.observe(b, controls);
  }
};

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

describe('the walking cue', () => {
  it('shows the walking controls once the crab has stood still a while on a level it hasn\'t walked on', () => {
    const b = beach();
    const cue = new FirstPress(undefined);
    watch(b, cue, {}, STILL_SECONDS - 0.5);
    expect(cue.cue(b, null, 'keys')).toBeNull();
    watch(b, cue, {}, 1);
    expect(cue.cue(b, null, 'keys')).toBe('move');
    expect(cue.cue(b, null, 'touch')).toBe('move');
  });

  it('goes as soon as the crab walks', () => {
    const b = beach();
    const cue = new FirstPress(undefined);
    watch(b, cue, {}, STILL_SECONDS + 1);
    watch(b, cue, { moveX: 1 }, 0.2);
    expect(cue.cue(b, null, 'keys')).toBeNull();
  });

  it('shows again on a new level for a crab that stands still there, walked before or not', () => {
    const store = memoryStore();
    const first = beach();
    const cue = new FirstPress(store);
    watch(first, cue, { moveX: 1 }, 0.2);
    const next = beach();
    const again = new FirstPress(store);
    watch(next, again, {}, STILL_SECONDS + 0.5);
    expect(again.cue(next, null, 'keys')).toBe('move');
  });

  it('comes back for a beginner who has walked but never jumped and stops for long', () => {
    const b = beach();
    const cue = new FirstPress(undefined);
    watch(b, cue, { moveX: -1 }, 0.3);
    watch(b, cue, {}, STILL_SECONDS + 0.5);
    expect(cue.cue(b, null, 'keys')).toBeNull();
    watch(b, cue, {}, LOST_SECONDS - STILL_SECONDS);
    expect(cue.cue(b, null, 'keys')).toBe('move');
  });

  it('leaves a player who has jumped alone while they wait', () => {
    const b = beach();
    const cue = new FirstPress(undefined);
    watch(b, cue, {}, 0.5);
    watch(b, cue, { jump: true });
    watch(b, cue, { moveX: -1 }, 1);
    watch(b, cue, {}, LOST_SECONDS + 1);
    expect(cue.cue(b, null, 'keys')).toBeNull();
  });

  it('says nothing while the crab is hiding', () => {
    const b = beach();
    const cue = new FirstPress(undefined);
    watch(b, cue, { hide: true }, STILL_SECONDS + 1);
    expect(cue.cue(b, null, 'keys')).toBeNull();
  });
});

describe('the jump cue', () => {
  it('shows jump when the crab pushes into a bank too high to walk up but low enough to jump', () => {
    const b = beach();
    bank(b, 2);
    const cue = new FirstPress(undefined);
    watch(b, cue, { moveX: 1 }, 2);
    expect(cue.cue(b, null, 'keys')).toBe('jump');
    expect(cue.cue(b, null, 'touch')).toBe('jump');
  });

  it('waits a moment of pushing first', () => {
    const b = beach();
    bank(b, 2);
    const cue = new FirstPress(undefined);
    // Walk up to the bank, then just touch it.
    for (let i = 0; i < 240 && b.crab.body.x + b.crab.body.w < 10 * T - 0.5; i++) watch(b, cue, { moveX: 1 });
    watch(b, cue, { moveX: 1 }, PUSH_SECONDS / 2);
    expect(cue.cue(b, null, 'keys')).toBeNull();
  });

  it('shows jump for a crab stood still at the foot of the bank, facing it', () => {
    const b = beach();
    bank(b, 2);
    const cue = new FirstPress(undefined);
    watch(b, cue, { moveX: 1 }, 2);
    watch(b, cue, {}, STILL_SECONDS + 0.5);
    expect(cue.cue(b, null, 'keys')).toBe('jump');
  });

  it('says nothing at a step the crab walks up, or a wall too high to jump', () => {
    for (const tiles of [1, 4]) {
      const b = beach();
      bank(b, tiles);
      const cue = new FirstPress(undefined);
      watch(b, cue, { moveX: 1 }, 2);
      expect(cue.cue(b, null, 'keys')).toBeNull();
    }
  });

  it('is learnt by jumping, and not shown again', () => {
    const store = memoryStore();
    const b = beach();
    bank(b, 2);
    const cue = new FirstPress(store);
    watch(b, cue, { moveX: 1 }, 2);
    watch(b, cue, { moveX: 1, jump: true });
    watch(b, cue, { moveX: -1 }, 0.5);
    watch(b, cue, { moveX: 1 }, 2);
    expect(cue.cue(b, null, 'keys')).toBeNull();
    // Remembered on the next level.
    const next = beach();
    bank(next, 2);
    const again = new FirstPress(store);
    watch(next, again, { moveX: 1 }, 2);
    expect(again.cue(next, null, 'keys')).toBeNull();
  });

  it('keeps hiding first', () => {
    const b = beach();
    bank(b, 2);
    const cue = new FirstPress(undefined);
    watch(b, cue, { moveX: 1 }, 2);
    addHunter(b);
    expect(cue.cue(b, null, 'keys')).toBe('hide');
  });
});
