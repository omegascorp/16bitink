import type { LoadingReporter } from '@16bitink/game-sdk';
import { overallProgress } from './loadProgress';

/**
 * Lifts the loading screen when the game goes this long without a report:
 * a game that doesn't know about it, or a boot that stalled or crashed. Long
 * enough for the slowest single step (a fetch on a poor connection).
 */
const STALL_MS = 15_000;
/** Matches the splash's fade-out transition in [slug].astro. */
const FADE_MS = 320;
const DOWNLOAD_LABEL = 'fetching the game…';

export interface LoadingBar {
  /** The player tapped play: swap the button for the bar. */
  show(): void;
  /** The game's code (and everything else it needs) has arrived. */
  downloaded(): void;
  /** Handed to the game as host.loading. */
  readonly reporter: LoadingReporter;
  /** The game is mounted; from now on, a game that stops reporting gets the screen lifted anyway. */
  mounted(): void;
  /** Loading failed: back to the button. */
  fail(): void;
  /** How far the bar has got, 0–100. */
  percent(): number;
}

/** Told when the loading screen lifts: `stalled` when the game went quiet and the stall timer lifted it. */
export type OnLifted = (stalled: boolean) => void;
/** Told when the game reports that its boot failed. */
export type OnBootFailed = (reason: string) => void;

export interface LoadingBarEvents {
  readonly onLifted?: OnLifted;
  readonly onBootFailed?: OnBootFailed;
}

interface Elements {
  readonly splash: HTMLElement;
  readonly play: HTMLButtonElement;
  readonly loader: HTMLElement;
  readonly bar: HTMLElement;
  readonly fill: HTMLElement;
  readonly step: HTMLElement;
  readonly pct: HTMLElement;
}

function findElements(splash: HTMLElement, play: HTMLButtonElement): Elements {
  const get = (id: string): HTMLElement => {
    const el = document.getElementById(id);
    if (!el) throw new Error(`Loading bar markup missing #${id}`);
    return el;
  };
  return { splash, play, loader: get('loader'), bar: get('loader-bar'), fill: get('loader-fill'), step: get('loader-step'), pct: get('loader-pct') };
}

/**
 * The splash's loading bar. `downloadStart` is when the game download began
 * (the page starts it on load), so a player who reads the splash for a
 * while finds the bar already part filled.
 */
export function createLoadingBar(splash: HTMLElement, play: HTMLButtonElement, downloadStart: number, events: LoadingBarEvents = {}): LoadingBar {
  const el = findElements(splash, play);
  let startedAt = downloadStart;
  let downloaded = false;
  let boot = 0;
  let shown = 0;
  let frame = 0;
  let finished = false;
  let stallTimer: ReturnType<typeof setTimeout> | undefined;

  const render = (): void => {
    // Never moves backwards, e.g. when the real download beats the estimate's position.
    shown = Math.max(shown, overallProgress({ downloaded, elapsedMs: performance.now() - startedAt, boot }));
    const pct = Math.floor(shown * 100);
    el.fill.style.width = `${shown * 100}%`;
    el.pct.textContent = `${pct}%`;
    el.bar.setAttribute('aria-valuenow', String(pct));
  };
  // While downloading the estimate moves with time; afterwards only the game's reports move it.
  const tick = (): void => {
    render();
    frame = downloaded ? 0 : requestAnimationFrame(tick);
  };
  const stopTicking = (): void => {
    cancelAnimationFrame(frame);
    frame = 0;
  };

  const reveal = (stalled = false): void => {
    if (finished) return;
    finished = true;
    events.onLifted?.(stalled);
    clearTimeout(stallTimer);
    stopTicking();
    boot = 1;
    render();
    el.splash.classList.add('leaving');
    setTimeout(() => el.splash.remove(), FADE_MS);
  };

  const watchStall = (): void => {
    clearTimeout(stallTimer);
    stallTimer = setTimeout(() => reveal(true), STALL_MS);
  };

  const reporter: LoadingReporter = {
    progress(fraction, label) {
      if (finished) return;
      if (stallTimer !== undefined) watchStall();
      boot = Math.max(boot, fraction);
      if (label) el.step.textContent = label;
      render();
    },
    ready: () => reveal(),
    failed(reason) {
      if (!finished) events.onBootFailed?.(String(reason));
    },
  };

  return {
    reporter,
    show() {
      el.play.hidden = true;
      el.loader.hidden = false;
      el.step.textContent = DOWNLOAD_LABEL;
      if (!downloaded && !frame) tick();
      render();
    },
    downloaded() {
      downloaded = true;
      stopTicking();
      render();
    },
    mounted() {
      if (!finished) watchStall();
    },
    fail() {
      stopTicking();
      clearTimeout(stallTimer);
      stallTimer = undefined;
      downloaded = false;
      boot = 0;
      shown = 0;
      // The player retries straight away, starting a fresh download.
      startedAt = performance.now();
      el.loader.hidden = true;
      el.play.hidden = false;
    },
    percent: () => Math.floor(shown * 100),
  };
}
