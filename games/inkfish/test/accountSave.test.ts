import { describe, expect, it, vi } from 'vitest';
import type { KeyValueStore, ProgressStore } from '@16bitink/game-sdk';
import { commitSave, pullFromAccount } from '../src/logic/accountSave';
import { covers, loadSave, mergeSaves, persistSave, type SaveData } from '../src/logic/save';

const save = (levels: SaveData['levels'], seen: string[] = []): SaveData => ({ version: 1, levels, seen });

function memoryStore(): KeyValueStore {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
}

/** An account store like the site's: it rejects saves based on an old copy and asks for a merge. */
function fakeAccount(initial: unknown): ProgressStore & { stored: unknown; otherDevice(data: unknown): void } {
  let stale = false;
  const account = {
    stored: initial,
    load: () => Promise.resolve(account.stored),
    save: (data: unknown, merge: (theirs: unknown) => unknown) => {
      account.stored = stale ? merge(account.stored) : data;
      stale = false;
      return Promise.resolve();
    },
    otherDevice(data: unknown) {
      account.stored = data;
      stale = true;
    },
  };
  return account;
}

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

describe('merging saves', () => {
  it('keeps every finished level with its best score and blots, and every creature met', () => {
    const a = save({ l1: { bestScore: 100, blots: 3 }, l2: { bestScore: 50, blots: 1 } }, ['cod']);
    const b = save({ l2: { bestScore: 80, blots: 0 }, l3: { bestScore: 10, blots: 2 } }, ['cod', 'eel']);
    expect(mergeSaves(a, b)).toEqual(save({ l1: { bestScore: 100, blots: 3 }, l2: { bestScore: 80, blots: 1 }, l3: { bestScore: 10, blots: 2 } }, ['cod', 'eel']));
  });

  it('knows when one copy already holds everything in another', () => {
    const big = save({ l1: { bestScore: 100, blots: 3 } }, ['cod']);
    expect(covers(big, save({ l1: { bestScore: 90, blots: 3 } }))).toBe(true);
    expect(covers(big, save({ l1: { bestScore: 110, blots: 3 } }))).toBe(false);
    expect(covers(big, save({}, ['eel']))).toBe(false);
  });
});

describe('account progress', () => {
  it('brings progress from another device onto this one, and this one\'s into the account', async () => {
    const storage = memoryStore();
    persistSave(storage, save({ l1: { bestScore: 10, blots: 1 } }));
    const progress = fakeAccount(save({ l1: { bestScore: 5, blots: 2 }, l2: { bestScore: 30, blots: 1 } }));
    await pullFromAccount({ storage, progress });
    await flush();
    const expected = save({ l1: { bestScore: 10, blots: 2 }, l2: { bestScore: 30, blots: 1 } });
    expect(loadSave(storage)).toEqual(expected);
    expect(progress.stored).toEqual(expected);
  });

  it('does not write to the account when it already has everything', async () => {
    const progress = fakeAccount(save({ l1: { bestScore: 5, blots: 2 } }));
    const spy = vi.spyOn(progress, 'save');
    await pullFromAccount({ storage: memoryStore(), progress });
    expect(spy).not.toHaveBeenCalled();
  });

  it('ignores a malformed account copy', async () => {
    const storage = memoryStore();
    await pullFromAccount({ storage, progress: fakeAccount({ levels: 'nope' }) });
    expect(loadSave(storage)).toEqual(save({}));
  });

  it('plays on the local save when the account cannot be reached', async () => {
    const storage = memoryStore();
    persistSave(storage, save({ l1: { bestScore: 1, blots: 1 } }));
    const progress: ProgressStore = { load: () => Promise.reject(new Error('offline')), save: () => Promise.resolve() };
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await pullFromAccount({ storage, progress });
    expect(loadSave(storage)).toEqual(save({ l1: { bestScore: 1, blots: 1 } }));
  });

  it('merges when another device saved first, keeping both here and in the account', async () => {
    const storage = memoryStore();
    const progress = fakeAccount(null);
    progress.otherDevice(save({ l2: { bestScore: 7, blots: 1 } }));
    commitSave({ storage, progress }, save({ l1: { bestScore: 9, blots: 3 } }));
    await flush();
    const both = save({ l1: { bestScore: 9, blots: 3 }, l2: { bestScore: 7, blots: 1 } });
    expect(progress.stored).toEqual(both);
    expect(loadSave(storage)).toEqual(both);
  });

  it('saves locally only when signed out', () => {
    const storage = memoryStore();
    commitSave({ storage }, save({ l1: { bestScore: 9, blots: 3 } }));
    expect(loadSave(storage).levels.l1).toEqual({ bestScore: 9, blots: 3 });
  });
});
