import type { KeyValueStore } from '@16bitink/game-sdk';

/**
 * Where InkPin keeps its progress. The website mounts the game with a
 * per-account store; the dev harness and tests fall back to this browser's
 * localStorage.
 */
let store: KeyValueStore | null = null;

/** Called once by mount with the host's storage (undefined when storage is blocked). */
export function useStorage(hostStore: KeyValueStore | undefined): void {
  store = hostStore ?? null;
}

/** The store progress is written to: the host's when there is one, else this browser's. */
export function storage(): KeyValueStore {
  return store ?? window.localStorage;
}
