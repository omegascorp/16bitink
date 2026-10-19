import type { KeyValueStore } from '@16bitink/game-sdk';

/**
 * A page from before a deploy asks for JS chunks by their old hashed names,
 * which the new build no longer has (each deploy is a fresh container), so the
 * game's import 404s. That happens to a tab left open over a deploy, a page
 * reopened from the browser cache (Back, a restored tab, the home-screen app),
 * or a request that lands on the other instance mid-deploy. A "Try again"
 * asks for the same missing file; only a reload fetches the new page.
 */

/** How the browsers (and Vite's CSS preload) word a dynamic import that failed to fetch. */
const STALE_BUILD_MESSAGE =
  /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Unable to preload CSS/i;

/** A failed fetch of a code chunk: likely a page older than the deploy (or offline). */
export function isStaleBuildError(err: unknown): boolean {
  return err instanceof Error && STALE_BUILD_MESSAGE.test(err.message);
}

interface ReloadCheck {
  readonly err: unknown;
  readonly online: boolean;
  /** The game has mounted: a reload now would throw away the player's run. */
  readonly playing: boolean;
}

/** Only a page that hasn't started its game yet, and is online (else it'd swap to the browser's offline page). */
export function shouldReloadForNewBuild({ err, online, playing }: ReloadCheck): boolean {
  return !playing && online && isStaleBuildError(err);
}

const RELOADED_AT_KEY = '16bitink:stale-build-reload';
/** If the reloaded page fails too, it's not a stale page: show the error instead of looping. */
export const RELOAD_COOLDOWN_MS = 30_000;

/**
 * Reloads the page to pick up the new build, unless it already did so within
 * the cooldown. Returns whether it reloaded. Without storage to remember the
 * reload there's no loop guard, so it doesn't reload at all.
 */
export function reloadForNewBuild(storage: KeyValueStore | undefined, now: number, reload: () => void): boolean {
  if (!storage) return false;
  try {
    const last = Number(storage.getItem(RELOADED_AT_KEY));
    if (Number.isFinite(last) && last > 0 && now - last < RELOAD_COOLDOWN_MS) return false;
    storage.setItem(RELOADED_AT_KEY, String(now));
  } catch {
    return false;
  }
  reload();
  return true;
}
