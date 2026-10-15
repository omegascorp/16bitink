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
  /**
   * Signs in with Google so progress is saved to an account, then comes back
   * to the game; saves made signed out move to that account. Leaves the page,
   * so save first. Only offer it when `signedIn` is false, and never require it.
   */
  onSignIn?(): void;
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
  /**
   * Records a gameplay moment for the site's own analytics. Fire and
   * forget: it never throws and never blocks the game. Absent in dev
   * harnesses and tests.
   */
  readonly track?: (event: GameEvent) => void;
  /**
   * The site's loading screen, which covers the game until it calls `ready`.
   * Absent in dev harnesses and tests: games then show their own boot screen.
   */
  readonly loading?: LoadingReporter;
}

/**
 * How far a game's boot has got. The site shows it as a progress bar over
 * the game, so a game must call `ready` once its first screen is drawn,
 * also when booting fails, so the player sees the game's error message.
 */
export interface LoadingReporter {
  /** `fraction` of the boot done (0..1); `label` names the step, in the game's voice. */
  progress(fraction: number, label?: string): void;
  /** The first screen is drawn: hide the loading screen. Calling it again does nothing. */
  ready(): void;
  /**
   * Booting failed (e.g. the browser couldn't draw the art): the site records
   * `reason` in its stats. Call `ready` after it, so the player sees the
   * game's own error message. Optional, for hosts that don't record it.
   */
  failed?(reason: string): void;
}

/** Which level an event is about. `n` is its 1-based place in the game's level order (free levels first). */
export interface LevelRef {
  readonly level: string;
  readonly n: number;
  readonly name?: string;
}

export type LevelResult = 'win' | 'lose' | 'quit';

/** What a game reports: each level it starts, and how that level ended. */
export type GameEvent =
  | (LevelRef & { readonly type: 'level_start' })
  | (LevelRef & {
      readonly type: 'level_end';
      readonly result: LevelResult;
      /** Time spent in the level. */
      readonly seconds: number;
      readonly score?: number;
      /** Why the level was lost, e.g. "eaten". */
      readonly cause?: string;
    });

/** Returned by `mount` so the host can tear a game down cleanly. */
export interface GameHandle {
  destroy(): void;
}

export interface GameModule {
  /** The game's release, e.g. "1.2.0" (its package.json version): shown to players and sent with its stats. */
  readonly version?: string;
  /** Mounts the game into `parent`, filling it and tracking its size. */
  mount(parent: HTMLElement, host: GameHost): GameHandle;
}

/** Narrowing guard for a dynamically imported module's default export. */
export function isGameModule(value: unknown): value is GameModule {
  return typeof value === 'object' && value !== null && typeof (value as GameModule).mount === 'function';
}

export { runInSlices, yieldToBrowser, type SliceJob, type SliceOptions } from './slices';
