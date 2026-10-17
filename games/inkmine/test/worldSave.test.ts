import type { KeyValueStore } from '@16bitink/game-sdk';
import { describe, expect, it } from 'vitest';
import { carve, type CarveSpec } from '../src/level/carve';
import { Ladders } from '../src/logic/ladders';
import { setTile, TILE, tileAt } from '../src/logic/terrain';
import { applyWorld, captureWorld, loadWorld, packMask, saveWorld, unpackMask, type WorldSave } from '../src/logic/worldSave';

const SPEC: CarveSpec = {
  width: 64, height: 48, seed: 9, surface: 10, landerCol: 8, wrap: true,
  stone: 14, deep: 30, caves: 3, caveFrom: 4,
  ores: [{ ore: 'copper', from: 1, to: 10, veins: 8, size: [2, 4] }],
  firedamp: 3,
};
const N = SPEC.width * SPEC.height;

function memoryStore(): KeyValueStore & { readonly data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
}

/** A mask with a few runs set, like tunnels. */
function tunnels(n: number): Uint8Array {
  const m = new Uint8Array(n);
  for (const [from, len] of [[3, 5], [70, 1], [200, 140], [n - 4, 4]] as const) m.fill(1, from, Math.min(n, from + len));
  return m;
}

describe('packing a mask', () => {
  it('round-trips', () => {
    for (const mask of [new Uint8Array(N), new Uint8Array(N).fill(1), tunnels(N)]) {
      expect(unpackMask(packMask(mask), N)).toEqual(mask);
    }
  });

  it('round-trips runs longer than a byte holds', () => {
    const mask = new Uint8Array(100_000);
    mask.fill(1, 1000, 90_000);
    expect(unpackMask(packMask(mask), mask.length)).toEqual(mask);
  });

  it('is small for a world with a few tunnels', () => {
    expect(packMask(tunnels(N)).length).toBeLessThan(40);
  });

  it('turns down anything that is not a mask of that size', () => {
    const good = packMask(tunnels(N));
    expect(unpackMask(good, N + 1)).toBeNull();
    expect(unpackMask(good, N - 1)).toBeNull();
    expect(unpackMask('not base64!', N)).toBeNull();
    expect(unpackMask(42, N)).toBeNull();
    expect(unpackMask(null, N)).toBeNull();
    // A run claiming more tiles than there are.
    expect(unpackMask(btoa(String.fromCharCode(0xff, 0xff, 0xff, 0xff, 0x0f)), N)).toBeNull();
    // Too long to be real.
    expect(unpackMask('A'.repeat(5_000_000), N)).toBeNull();
  });
});

describe('a world save', () => {
  it('keeps what was dug and blown out, and puts it back on a freshly carved world', () => {
    const base = carve(SPEC);
    const baseTiles = base.tiles.slice();
    const played = carve(SPEC);
    setTile(played, 20, 15, TILE.air);
    setTile(played, 63, 16, TILE.air);
    setTile(played, 0, 16, TILE.air);
    const ladders = new Ladders(played);
    ladders.add([[5, 9], [5, 8]]);
    const save = captureWorld(baseTiles, played, ladders, 3, ['cell-bp']);
    const again = carve(SPEC);
    const restored = new Ladders(again);
    applyWorld(again, restored, save);
    expect(again.tiles).toEqual(played.tiles);
    expect(tileAt(again, 63, 16)).toBe(TILE.air);
    const sorted = (l: Ladders) => l.all().map(([x, y]) => `${x},${y}`).sort();
    expect(sorted(restored)).toEqual(sorted(ladders));
  });

  it("counts only ground the builder made: a tile that was always open isn't dug", () => {
    const base = carve(SPEC);
    const save = captureWorld(base.tiles.slice(), base, new Ladders(base), 1, []);
    expect(save.dug.every((v) => v === 0)).toBe(true);
  });

  it("never opens bedrock or hangs a ladder in rock, whatever the save says (saves are untrusted, and worlds get retuned)", () => {
    const t = carve(SPEC);
    const floor = t.tiles.findIndex((v) => v === TILE.bedrock);
    const rock = t.tiles.findIndex((v) => v === TILE.soil);
    const dug = new Uint8Array(N);
    dug[floor] = 1;
    const rungs = new Uint8Array(N);
    rungs[rock] = 1;
    const ladders = new Ladders(t);
    applyWorld(t, ladders, { version: 1, dug, ladders: rungs, taken: [] });
    expect(t.tiles[floor]).toBe(TILE.bedrock);
    expect(ladders.count).toBe(0);
  });

  it('clears the ore and anything volatile from a dug tile', () => {
    const t = carve(SPEC);
    const i = t.content.findIndex((c) => c !== 0);
    const dug = new Uint8Array(N);
    dug[i] = 1;
    applyWorld(t, new Ladders(t), { version: 1, dug, ladders: new Uint8Array(N), taken: [] });
    expect(t.tiles[i]).toBe(TILE.air);
    expect(t.content[i]).toBe(0);
    expect(t.volatile[i]).toBe(0);
  });
});

describe('saving a world', () => {
  const save: WorldSave = { version: 2, dug: tunnels(N), ladders: new Uint8Array(N), taken: ['cell-bp', 'pack-bp'] };
  const known = new Set(['cell-bp', 'pack-bp', 'drill-bp']);

  it('saves under its own key and loads back', () => {
    const store = memoryStore();
    expect(saveWorld(store, 'graphite', save)).toBe(true);
    expect([...store.data.keys()]).toEqual(['inkmine.world.graphite.v1']);
    expect(loadWorld(store, 'graphite', N, known)).toEqual(save);
  });

  it('is empty for a world never played', () => {
    expect(loadWorld(memoryStore(), 'graphite', N, known)).toBeNull();
  });

  it('drops item ids it does not know and repeats', () => {
    const store = memoryStore();
    saveWorld(store, 'graphite', { ...save, taken: ['cell-bp', 'cell-bp', 'nope', 7 as unknown as string] });
    expect(loadWorld(store, 'graphite', N, known)?.taken).toEqual(['cell-bp']);
  });

  it('ignores a broken save rather than throwing', () => {
    const store = memoryStore();
    store.setItem('inkmine.world.graphite.v1', '{not json');
    expect(loadWorld(store, 'graphite', N, known)).toBeNull();
    store.setItem('inkmine.world.graphite.v1', JSON.stringify({ version: 1, dug: 'AAAA', ladders: 'AAAA', taken: [] }));
    expect(loadWorld(store, 'graphite', N, known)).toBeNull();
  });

  it('keeps a save made for another version of the world: dug ground stays dug', () => {
    const store = memoryStore();
    saveWorld(store, 'graphite', save);
    expect(loadWorld(store, 'graphite', N, known)?.version).toBe(2);
  });

  it('keeps a save it cannot read under a backup key, so a later save never destroys it', () => {
    const store = memoryStore();
    saveWorld(store, 'graphite', save);
    const old = store.data.get('inkmine.world.graphite.v1');
    // The world grew: the old mask is the wrong size.
    expect(loadWorld(store, 'graphite', N + 64, known)).toBeNull();
    expect(store.data.get('inkmine.world.graphite.v1.bak')).toBe(old);
  });

  it('keeps the bag left under its flag', () => {
    const store = memoryStore();
    const bag = { stack: 10, slots: [{ ore: 'quartz' as const, n: 3 }, null] };
    const withBag: WorldSave = { ...save, bag: { at: 70, bag } };
    saveWorld(store, 'graphite', withBag);
    expect(loadWorld(store, 'graphite', N, known)).toEqual(withBag);
  });

  it('drops a left bag it cannot trust, and keeps the rest of the save', () => {
    const store = memoryStore();
    for (const bag of [{ at: N, bag: { stack: 10, slots: [] } }, { at: -1, bag: { stack: 10, slots: [] } }, { at: 3, bag: 'nope' }, 'nope']) {
      store.setItem('inkmine.world.graphite.v1', JSON.stringify({ version: 1, dug: packMask(tunnels(N)), ladders: packMask(new Uint8Array(N)), taken: [], bag }));
      const got = loadWorld(store, 'graphite', N, known);
      expect(got?.dug).toEqual(tunnels(N));
      expect(got?.bag).toBeUndefined();
    }
  });

  it('keeps the pieces left lying loose, where they lay', () => {
    const store = memoryStore();
    const withPieces: WorldSave = { ...save, pieces: [{ at: 70, ore: 1 }, { at: 71, ore: 5 }] };
    saveWorld(store, 'graphite', withPieces);
    expect(loadWorld(store, 'graphite', N, known)).toEqual(withPieces);
  });

  it('drops loose pieces it cannot trust, and keeps the rest', () => {
    const store = memoryStore();
    const pieces = [{ at: 70, ore: 1 }, { at: N, ore: 1 }, { at: 3, ore: 99 }, { at: 1.5, ore: 2 }, 'nope', { at: 4, ore: 2 }];
    store.setItem('inkmine.world.graphite.v1', JSON.stringify({ version: 1, dug: packMask(tunnels(N)), ladders: packMask(new Uint8Array(N)), taken: [], pieces }));
    expect(loadWorld(store, 'graphite', N, known)?.pieces).toEqual([{ at: 70, ore: 1 }, { at: 4, ore: 2 }]);
  });

  it('says when it could not save', () => {
    const full: KeyValueStore = { getItem: () => null, setItem: () => { throw new Error('quota'); } };
    expect(saveWorld(full, 'graphite', save)).toBe(false);
    expect(saveWorld(undefined, 'graphite', save)).toBe(false);
  });

  it('does nothing without storage', () => {
    expect(() => saveWorld(undefined, 'graphite', save)).not.toThrow();
    expect(loadWorld(undefined, 'graphite', N, known)).toBeNull();
  });
});
