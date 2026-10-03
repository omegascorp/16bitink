/**
 * The contract between the 16bit.ink website and every game.
 *
 * A game package's default export is a `GameModule`. The website's play
 * page loads it on demand, builds a `GameHost`, and calls `mount`.
 * Games never talk to the network, cookies or Stripe directly; they ask
 * the host. That keeps games portable (web, Capacitor, a dev harness).
 */

/** Minimal storage API (a subset of `window.localStorage`). */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** What the website provides to a running game. */
export interface GameHost {
  /** True when the server confirmed the player owns the full game. */
  readonly unlocked: boolean;
  /**
   * Fetches the game's paid content from the server. Rejects when the
   * player is not entitled or the network fails. The payload is
   * untrusted `unknown`: games must validate it.
   */
  loadContent(): Promise<unknown>;
  /** Starts the purchase flow for this game. */
  onBuy(): void;
  /** Leaves the game (back to its catalog page). */
  onExit(): void;
  /** Per-browser persistence; undefined when storage is blocked. */
  readonly storage?: KeyValueStore;
  /**
   * Local development only (DEV_ALL_LEVELS): every level the player can
   * access is playable without finishing the ones before it. Never opens
   * paid content; that still needs `unlocked`.
   */
  readonly allLevelsOpen?: boolean;
}

/** Returned by `mount` so the host can tear a game down cleanly. */
export interface GameHandle {
  destroy(): void;
}

export interface GameModule {
  /** Mounts the game into `parent`, filling it and tracking its size. */
  mount(parent: HTMLElement, host: GameHost): GameHandle;
}

/** Narrowing guard for a dynamically imported module's default export. */
export function isGameModule(value: unknown): value is GameModule {
  return typeof value === 'object' && value !== null && typeof (value as GameModule).mount === 'function';
}
