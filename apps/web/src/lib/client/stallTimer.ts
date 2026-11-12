/**
 * Calls `onStall` when `ms` pass without `kick()`, but never while the page is hidden:
 * a hidden tab draws nothing, so a quiet game there isn't stalled. Showing the page again restarts the wait.
 */
export interface StallTimer {
  /** Begin watching (or restart the wait). */
  kick(): void;
  /** The page was hidden or shown. */
  setHidden(hidden: boolean): void;
  /** Stop watching. */
  stop(): void;
  readonly watching: () => boolean;
}

export function createStallTimer(ms: number, onStall: () => void, isHidden: () => boolean): StallTimer {
  let on = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const arm = (): void => {
    clearTimeout(timer);
    timer = undefined;
    if (on && !isHidden()) timer = setTimeout(onStall, ms);
  };
  return {
    kick() {
      on = true;
      arm();
    },
    setHidden(hidden) {
      if (!on) return;
      if (hidden) {
        clearTimeout(timer);
        timer = undefined;
      } else arm();
    },
    stop() {
      on = false;
      clearTimeout(timer);
      timer = undefined;
    },
    watching: () => on,
  };
}
