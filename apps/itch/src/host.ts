import type { GameHost, KeyValueStore, LoadingReporter, OfferPlace } from '@16bitink/game-sdk';

/** Where the itch.io edition sends players: the game's own site, tagged so its stats count them as "16bit.ink/itch". */
export const SITE = 'https://16bit.ink';
export const VIA = 'itch';

/** The game's page on 16bit.ink, where the full game is sold. */
export function gamePageUrl(slug: string): string {
  return `${SITE}/games/${encodeURIComponent(slug)}?via=${VIA}`;
}

/** The catalog's home page, for the game's exit button. */
export function catalogUrl(): string {
  return `${SITE}/?via=${VIA}`;
}

/** Opens a page in a new tab: the game keeps running in the itch.io embed behind it. */
export type OpenTab = (url: string) => void;

export interface ItchHostOptions {
  readonly slug: string;
  /** The full game's price as the catalog shows it, e.g. "$4.99". */
  readonly price?: string;
  /** Saves (the embed's localStorage, when the browser allows it). */
  readonly storage?: KeyValueStore;
  /** The edition's own loading bar (index.html). */
  readonly loading?: LoadingReporter;
  readonly openTab: OpenTab;
}

/**
 * The game on itch.io: the free chapter only. itch.io takes only donations for
 * browser games, so the full game stays on 16bit.ink; the offer and the exit
 * button open it in a new tab. Paid content is never bundled: `loadContent`
 * always rejects, and nothing here imports a game's `content/paid`.
 */
export function createItchHost({ slug, price, storage, loading, openTab }: ItchHostOptions): GameHost {
  return {
    unlocked: false,
    loadContent: () => Promise.reject(new Error('The full game is on 16bit.ink')),
    onBuy: (_where?: OfferPlace) => openTab(gamePageUrl(slug)),
    onExit: () => openTab(catalogUrl()),
    ...(price ? { price } : {}),
    ...(storage ? { storage } : {}),
    ...(loading ? { loading } : {}),
  };
}

/** The browser's localStorage, or undefined when it's blocked (e.g. third-party storage off for the embed). */
export function browserStorage(): KeyValueStore | undefined {
  try {
    const store = window.localStorage;
    const probe = '16bitink.probe';
    store.setItem(probe, '1');
    store.removeItem(probe);
    return store;
  } catch {
    return undefined;
  }
}

/**
 * `window.open` in a new tab, without handing the opened page a handle back to the game. Never navigates
 * the itch.io page itself: that would throw the player out of a level they're in.
 */
export function windowOpenTab(url: string): void {
  window.open(url, '_blank', 'noopener');
}
