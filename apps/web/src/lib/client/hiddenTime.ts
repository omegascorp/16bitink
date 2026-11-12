/**
 * How long the page was hidden since `begin()`: a player who switches away while the game loads
 * must not count that time as load time (a hidden tab draws nothing, so the game can't finish).
 */
export interface HiddenTime {
  /** A new attempt starts now. */
  begin(): void;
  /** The page was hidden or shown. */
  set(hidden: boolean): void;
  /** Milliseconds hidden since `begin()`, counting a hide that is still going on. */
  total(): number;
}

export function createHiddenTime(now: () => number, isHidden: () => boolean): HiddenTime {
  let accumulated = 0;
  let hiddenSince: number | null = isHidden() ? now() : null;
  return {
    begin() {
      accumulated = 0;
      hiddenSince = isHidden() ? now() : null;
    },
    set(hidden) {
      if (hidden) hiddenSince ??= now();
      else if (hiddenSince !== null) {
        accumulated += now() - hiddenSince;
        hiddenSince = null;
      }
    },
    total: () => Math.round(accumulated + (hiddenSince === null ? 0 : now() - hiddenSince)),
  };
}

/** Elapsed time without the hidden part, never below zero. */
export const visibleMs = (elapsedMs: number, hiddenMs: number): number => Math.max(0, Math.round(elapsedMs - hiddenMs));
