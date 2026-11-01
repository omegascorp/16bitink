import type { GameEvent, GameHost, KeyValueStore, OfferPlace } from '@16bitink/game-sdk';

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

/** The website's host, set by mount; undefined in tests. */
let theHost: GameHost | null = null;
/** Why the full game's chapters failed to load for an owner, or null. */
let fullError: string | null = null;

export function useHost(host: GameHost): void {
  theHost = host;
  fullError = null;
}

export const getHost = (): GameHost | null => theHost;
export const getFullError = (): string | null => fullError;
export const setFullError = (message: string | null): void => {
  fullError = message;
};

/** Reports a gameplay moment to the site's analytics. Never throws: a game must not break over a stat. */
export function trackGame(event: GameEvent): void {
  try {
    theHost?.track?.(event);
  } catch {
    // Ignored on purpose.
  }
}

/** Reports that the full-game offer is on screen (once per showing), for the site's stats. */
export function trackOffer(where: OfferPlace): void {
  trackGame({ type: 'offer_view', where });
}
