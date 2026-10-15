/**
 * The play page's loading bar runs in two parts: downloading the game, then
 * the game's own boot (drawing its art), which the game reports through
 * host.loading. Browsers give no progress for a dynamic import, so the
 * download part is an estimate that eases towards its end and only reaches
 * it when the download really finishes.
 */

/** The share of the bar given to the download. */
export const DOWNLOAD_SHARE = 0.4;
/** The estimate stops short of the download share by this fraction of it. */
const ESTIMATE_CEILING = 0.92;
/** Time constant of the estimate: ~63% of the way after this long, ~86% after twice it. */
const ESTIMATE_TAU_MS = 2500;

/** Estimated bar position `elapsedMs` after the download started. */
export function downloadEstimate(elapsedMs: number): number {
  const t = Math.max(0, elapsedMs);
  return DOWNLOAD_SHARE * ESTIMATE_CEILING * (1 - Math.exp(-t / ESTIMATE_TAU_MS));
}

export interface LoadState {
  readonly downloaded: boolean;
  /** Since the download started. */
  readonly elapsedMs: number;
  /** The game's reported boot progress, 0..1 (untrusted: clamped). */
  readonly boot: number;
}

/** Where the bar should be, 0..1. */
export function overallProgress(state: LoadState): number {
  if (!state.downloaded) return downloadEstimate(state.elapsedMs);
  const boot = Number.isFinite(state.boot) ? Math.min(1, Math.max(0, state.boot)) : 0;
  return DOWNLOAD_SHARE + (1 - DOWNLOAD_SHARE) * boot;
}
