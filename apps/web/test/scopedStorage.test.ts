import { describe, expect, it } from 'vitest';
import { scopedStorage, type ScopableStore } from '../src/lib/client/scopedStorage';

function memoryStore(initial: Record<string, string> = {}): ScopableStore & { readonly items: Map<string, string> } {
  const items = new Map(Object.entries(initial));
  return {
    items,
    getItem: (k) => items.get(k) ?? null,
    setItem: (k, v) => void items.set(k, v),
    removeItem: (k) => void items.delete(k),
  };
}

const A = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const B = 'bbbbbbbbbbbbbbbbbbbbbbbb';

describe('scoped storage', () => {
  it('uses the plain keys when signed out', () => {
    const base = memoryStore({ 'game:save': 'guest' });
    const store = scopedStorage(base, null);
    expect(store.getItem('game:save')).toBe('guest');
    store.setItem('game:save', 'guest2');
    expect(base.items.get('game:save')).toBe('guest2');
  });

  it("keeps each account's saves apart", () => {
    const base = memoryStore();
    scopedStorage(base, A).setItem('game:save', 'alice');
    expect(scopedStorage(base, B).getItem('game:save')).toBeNull();
    expect(scopedStorage(base, null).getItem('game:save')).toBeNull();
    expect(scopedStorage(base, A).getItem('game:save')).toBe('alice');
  });

  it('gives the guest save to the first account that has none, once', () => {
    const base = memoryStore({ 'game:save': 'guest' });
    expect(scopedStorage(base, A).getItem('game:save')).toBe('guest');
    expect(base.items.has('game:save')).toBe(false);
    expect(scopedStorage(base, B).getItem('game:save')).toBeNull();
    expect(scopedStorage(base, A).getItem('game:save')).toBe('guest');
  });

  it('leaves the guest save alone when the account already has its own', () => {
    const base = memoryStore({ 'game:save': 'guest', [`user:${A}:game:save`]: 'alice' });
    expect(scopedStorage(base, A).getItem('game:save')).toBe('alice');
    expect(base.items.get('game:save')).toBe('guest');
  });

  it('still returns the guest save when moving it fails (e.g. storage full)', () => {
    const base = memoryStore({ 'game:save': 'guest' });
    const full: ScopableStore = { ...base, setItem: () => { throw new Error('QuotaExceededError'); } };
    expect(scopedStorage(full, A).getItem('game:save')).toBe('guest');
  });
});
