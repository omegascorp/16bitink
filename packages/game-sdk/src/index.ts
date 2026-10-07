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

/**
 * Progress saved to the signed-in player's account, so it follows them
 * between devices. The website stores each game's progress as an opaque
 * JSON value; only the game knows its shape, so the game validates what it
 * loads and says how two copies combine.
 */
export interface ProgressStore {
  /**
   * The progress saved to the account, or null when there is none yet.
   * Untrusted `unknown`: games must validate it. Rejects when offline.
   */
  load(): Promise<unknown>;
  /**
   * Saves `data` to the account. If another device saved since this one
   * last loaded or saved, `merge` is called with that newer copy (untrusted)
   * and its result is saved instead, so neither device's progress is lost.
   * Rejects when offline; the game's local copy still holds the progress.
   */
  save(data: unknown, merge: (theirs: unknown) => unknown): Promise<void>;
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
  /**
   * Starts the purchase flow for this game. The flow is the same for every
   * game: a signed-out player signs in with Google first, then pays. Call it
   * when the player finishes the last free level (and from any unlock button).
   */
  onBuy(): void;
  /** True when a player is signed in, so the game can say whether buying needs a sign-in first. */
  readonly signedIn?: boolean;
  /** The full game's one-time price as shown to players, e.g. "$4.99". */
  readonly price?: string;
  /** Leaves the game (back to its catalog page). */
  onExit(): void;
  /** Per-browser persistence; undefined when storage is blocked. */
  readonly storage?: KeyValueStore;
  /**
   * The player's account progress; undefined when nobody is signed in.
   * Games keep their local `storage` copy too, for offline and signed-out
   * play, and merge the two when both exist.
   */
  readonly progress?: ProgressStore;
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
