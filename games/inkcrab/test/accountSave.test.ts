import { describe, expect, it, vi } from 'vitest';
import type { KeyValueStore, ProgressStore } from '@16bitink/game-sdk';
import { commitProgress, pullFromAccount } from '../src/logic/accountSave';
import { coversProgress, loadProgress, mergeProgress, saveProgress, type Progress } from '../src/logic/save';

const progress = (levels: Progress['levels'], seen: string[] = []): Progress => ({ levels, seen });

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

describe('merging progress', () => {
  it('keeps every finished level with its most blots and fastest time, and everything met', () => {
    const a = progress({ 'pen-test': { blots: 3, bestTime: 50 }, 'room-to-grow': { blots: 1, bestTime: 40 } }, ['hermit']);
    const b = progress({ 'room-to-grow': { blots: 2, bestTime: 45 }, underlined: { blots: 1, bestTime: 60 } }, ['hermit', 'gull']);
    expect(mergeProgress(a, b)).toEqual(progress({
      'pen-test': { blots: 3, bestTime: 50 },
      'room-to-grow': { blots: 2, bestTime: 40 },
      underlined: { blots: 1, bestTime: 60 },
    }, ['hermit', 'gull']));
  });

  it('knows when one copy already holds everything in another', () => {
    const big = progress({ 'pen-test': { blots: 2, bestTime: 30 } }, ['hermit']);
    expect(coversProgress(big, progress({ 'pen-test': { blots: 2, bestTime: 35 } }))).toBe(true);
    expect(coversProgress(big, progress({ 'pen-test': { blots: 3, bestTime: 35 } }))).toBe(false);
    expect(coversProgress(big, progress({ 'pen-test': { blots: 2, bestTime: 25 } }))).toBe(false);
    expect(coversProgress(big, progress({}, ['gull']))).toBe(false);
  });
});

describe('account progress', () => {
  it('brings progress from another device onto this one, and this one\'s into the account', async () => {
    const storage = memoryStore();
    saveProgress(storage, progress({ 'pen-test': { blots: 1, bestTime: 30 } }));
    const account = fakeAccount(progress({ 'pen-test': { blots: 2, bestTime: 40 }, 'room-to-grow': { blots: 1, bestTime: 50 } }));
    await pullFromAccount({ storage, progress: account });
    await flush();
    const expected = progress({ 'pen-test': { blots: 2, bestTime: 30 }, 'room-to-grow': { blots: 1, bestTime: 50 } });
    expect(loadProgress(storage)).toEqual(expected);
    expect(account.stored).toEqual(expected);
  });

  it('does not write to the account when it already has everything', async () => {
    const account = fakeAccount(progress({ 'pen-test': { blots: 2, bestTime: 30 } }));
    const spy = vi.spyOn(account, 'save');
    await pullFromAccount({ storage: memoryStore(), progress: account });
    expect(spy).not.toHaveBeenCalled();
  });

  it('ignores a malformed account copy', async () => {
    const storage = memoryStore();
    await pullFromAccount({ storage, progress: fakeAccount({ levels: 'nope' }) });
    expect(loadProgress(storage)).toEqual(progress({}));
  });

  it('plays on the local save when the account cannot be reached', async () => {
    const storage = memoryStore();
    saveProgress(storage, progress({ 'pen-test': { blots: 1, bestTime: 30 } }));
    const account: ProgressStore = { load: () => Promise.reject(new Error('offline')), save: () => Promise.resolve() };
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await pullFromAccount({ storage, progress: account });
    expect(loadProgress(storage)).toEqual(progress({ 'pen-test': { blots: 1, bestTime: 30 } }));
  });

  it('merges when another device saved first, keeping both here and in the account', async () => {
    const storage = memoryStore();
    const account = fakeAccount(null);
    account.otherDevice(progress({ 'room-to-grow': { blots: 1, bestTime: 50 } }));
    commitProgress({ storage, progress: account }, progress({ 'pen-test': { blots: 3, bestTime: 20 } }));
    await flush();
    const both = progress({ 'pen-test': { blots: 3, bestTime: 20 }, 'room-to-grow': { blots: 1, bestTime: 50 } });
    expect(account.stored).toEqual(both);
    expect(loadProgress(storage)).toEqual(both);
  });

  it('saves locally only when signed out', () => {
    const storage = memoryStore();
    commitProgress({ storage }, progress({ 'pen-test': { blots: 3, bestTime: 20 } }));
    expect(loadProgress(storage).levels['pen-test']).toEqual({ blots: 3, bestTime: 20 });
  });
});
