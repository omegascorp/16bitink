import type { KeyValueStore } from '@16bitink/game-sdk';

/** The part of `window.localStorage` scoping needs. */
export interface ScopableStore extends KeyValueStore {
  removeItem(key: string): void;
}

/**
 * A game's local saves for whoever is playing in this browser, so one
 * account never boots on another's progress. Signed out, the plain keys are
 * used (the guest's saves). Signed in, each account gets its own keys; the
 * first time an account finds nothing of its own, it takes over the guest's
 * save, so levels played before signing in follow the player who signs in,
 * and nobody after them.
 */
export function scopedStorage(base: ScopableStore, userId: string | null): KeyValueStore {
  if (!userId) return base;
  const scoped = (key: string): string => `user:${userId}:${key}`;
  return {
    getItem(key) {
      const own = base.getItem(scoped(key));
      if (own !== null) return own;
      const guest = base.getItem(key);
      if (guest === null) return null;
      try {
        base.setItem(scoped(key), guest);
        base.removeItem(key);
      } catch (err) {
        // Storage full: play on the guest save now and try moving it next time.
        console.warn('[16bit.ink] could not move the guest save to this account', err);
      }
      return guest;
    },
    setItem: (key, value) => base.setItem(scoped(key), value),
  };
}
