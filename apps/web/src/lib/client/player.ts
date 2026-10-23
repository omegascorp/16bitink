import { isGameModule, isOfferPlace, type GameModule, type KeyValueStore } from '@16bitink/game-sdk';
import { GAME_LOADERS } from '../../games/loaders';
import { isPendingBuy, BUY_PARAM, signInUrl } from '../buyFlow';
import { flushAnalytics, gameTag, track, trackGameEvent, trackPlayTime, trackSignIn, type LoadStage } from './analytics';
import { buyFullGame, fetchMe, startCheckout } from './checkout';
import { createLoadingBar } from './loadingBar';
import { accountProgress } from './progress';
import { scopedStorage } from './scopedStorage';
import { reloadForNewBuild, shouldReloadForNewBuild } from './staleBuild';

interface ApiEnvelope<T> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: string;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: 'same-origin' });
  const body = (await res.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!res.ok || !body?.success || body.data === undefined) throw new Error(body?.error ?? `Request failed (${res.status})`);
  return body.data;
}

interface Access {
  readonly unlocked: boolean;
  /** Local dev only: the server decides, from DEV_ALL_LEVELS on localhost. */
  readonly allLevelsOpen: boolean;
}

async function checkAccess(game: string): Promise<Access> {
  try {
    const data = await getJson<Partial<Access>>(`/api/entitlement?game=${encodeURIComponent(game)}`);
    return { unlocked: data.unlocked === true, allLevelsOpen: data.allLevelsOpen === true };
  } catch (err) {
    // Offline or server hiccup: the free chapter still plays.
    console.warn('[16bit.ink] ownership check failed', err);
    return { unlocked: false, allLevelsOpen: false };
  }
}

/** Best effort: real fullscreen where supported (desktop, Android, iPad). */
async function goFullscreen(el: HTMLElement): Promise<void> {
  try {
    if (!document.fullscreenElement && el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' });
    const orientation = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
    await orientation.lock?.('landscape').catch(() => undefined);
  } catch {
    // iPhone Safari has no element fullscreen; the page already fills the viewport.
  }
}

/** Downloads a game package and checks it implements the SDK contract. */
async function loadGame(game: string): Promise<GameModule> {
  const loader = GAME_LOADERS[game];
  if (!loader) throw new Error(`No loader registered for game "${game}"`);
  const mod = (await loader()).default;
  if (!isGameModule(mod)) throw new Error(`Game "${game}" does not export a GameModule`);
  return mod;
}

/** An error as the stats take it: its message, trimmed. */
function errorText(err: unknown): string {
  const text = err instanceof Error ? err.message : String(err);
  return (text.trim() || 'Unknown error').slice(0, 200);
}

/** The games draw with WebGL: the same probe Phaser makes before it gives up. */
function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl') ?? canvas.getContext('experimental-webgl'));
  } catch {
    return false;
  }
}

/**
 * Phaser couldn't build a shader (vertex, fragment or link): seen on a few Android GPUs.
 * The driver fails the same way on every retry.
 */
const isShaderFailure = (message: string): boolean => /Shader failed/.test(message);

const NO_WEBGL_TEXT = "This browser can't draw the game: its graphics acceleration (WebGL) is off or unsupported. Try updating it, or open the page in Chrome or Firefox.";

/** One press of "Tap to play" until the game shows or fails. */
interface Attempt {
  readonly start: number;
  /** The page was hidden while it loaded (reported once). */
  readonly hidden: boolean;
}

const isIos = (): boolean => /iPhone|iPod/.test(navigator.userAgent) && !('standalone' in navigator && navigator.standalone);

export function bootPlayer(game: string, fonts: readonly string[]): void {
  const stage = document.getElementById('stage');
  const splash = document.getElementById('splash');
  const play = document.getElementById('play') as HTMLButtonElement | null;
  const status = document.getElementById('status');
  if (!stage || !splash || !play || !status) throw new Error('Player markup missing');
  if (isIos()) document.getElementById('ios-hint')?.removeAttribute('hidden');

  // Start the ownership check and engine download while the player reads the splash.
  const accessP = checkAccess(game);
  const progressP = accountProgress(game);
  const meP = fetchMe();
  if (isPendingBuy(window.location.search, game)) void resumeBuy(game, status, accessP);
  // The stats follow each press of play: how long until it showed, or how it failed or was left.
  let tag = gameTag(game, undefined);
  let attempt: Attempt | null = null;
  const sinceTap = (a: Attempt): number => Math.round(performance.now() - a.start);
  const bar = createLoadingBar(splash, play, performance.now(), {
    onLifted: (stalled) => {
      if (attempt) track({ type: 'game_ready', ...tag, ms: sinceTap(attempt), stage: stalled ? 'stall' : 'ready' });
      attempt = null;
    },
    onBootFailed: (reason) => {
      if (attempt) track({ type: 'load_fail', ...tag, ms: sinceTap(attempt), stage: 'boot', error: errorText(reason) });
      // The game lifts the screen onto its error message next: that isn't the game showing.
      attempt = null;
    },
  });
  const hiddenWhileLoading = (): void => {
    if (!attempt || attempt.hidden) return;
    track({ type: 'load_abandon', ...tag, ms: sinceTap(attempt), pct: bar.percent() });
    attempt = { ...attempt, hidden: true };
    flushAnalytics(true);
  };
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && hiddenWhileLoading());
  window.addEventListener('pagehide', hiddenWhileLoading);
  // Set once and never cleared: from the first tap the reload waits for the tap's own outcome,
  // and once the game is mounted nothing here may reload the page out from under the player.
  let tapped = false;
  let playing = false;
  // Re-created on retry: a failed dynamic import stays rejected forever.
  let engineP = loadGame(game);
  // Failed before the player tapped: a page older than the deploy reloads onto the new one unseen.
  engineP.catch((err: unknown) => !tapped && reloadIfStale(err, playing));
  const fontP = Promise.all(fonts.map((f) => document.fonts.load(f))).catch(() => undefined);
  // This browser can't draw the game, so every retry would fail the same way: say why and stop there.
  const cantPlay = (): void => {
    bar.fail();
    status.textContent = NO_WEBGL_TEXT;
    play.disabled = true;
    play.textContent = "Can't play in this browser";
  };

  play.addEventListener('click', async () => {
    tapped = true;
    play.disabled = true;
    status.textContent = '';
    bar.show();
    attempt = { start: performance.now(), hidden: false };
    track({ type: 'play_tap', ...tag, ms: Math.round(attempt.start) });
    let step: LoadStage = 'download';
    // Must be requested synchronously inside the click for browsers to allow it.
    const fs = goFullscreen(stage);
    try {
      const [module, { unlocked, allLevelsOpen }, accountSaves, me] = await Promise.all([engineP, accessP, progressP, meP, fontP, fs]);
      bar.downloaded();
      step = 'mount';
      // Without knowing who is signed in, local saves can't be told apart: play on this browser's alone.
      const userId = me?.id ?? null;
      const progress = userId ? accountSaves : null;
      tag = gameTag(game, module.version);
      playing = true;
      // The splash stays over the game, showing its boot progress, until the game calls loading.ready().
      const handle = module.mount(stage, {
        unlocked,
        allLevelsOpen,
        track: (event) => trackGameEvent(tag, event),
        loading: bar.reporter,
        storage: safeStorage(userId),
        progress: progress ?? undefined,
        signedIn: me?.signedIn === true,
        price: stage.dataset.price || undefined,
        loadContent: () => getJson<unknown>(`/api/content/${encodeURIComponent(game)}`),
        onBuy: (where) => {
          if (document.fullscreenElement) void document.exitFullscreen();
          void buyFullGame(game, isOfferPlace(where) ? where : 'unknown').then((r) => r.error && alert(r.error));
        },
        onSignIn: () => {
          if (document.fullscreenElement) void document.exitFullscreen();
          trackSignIn('save', game);
          window.location.assign(signInUrl(window.location.pathname));
        },
        onExit: () => {
          handle.destroy();
          window.location.assign(`/games/${game}`);
        },
      });
      bar.mounted();
      // Phaser builds shaders as it first draws with them, inside its frame loop, which stops at the throw.
      const onShaderFailure = (e: ErrorEvent): void => {
        if (!isShaderFailure(e.message)) return;
        window.removeEventListener('error', onShaderFailure);
        if (attempt) track({ type: 'load_fail', ...tag, ms: sinceTap(attempt), stage: 'boot', error: errorText(e.error ?? e.message) });
        attempt = null;
        handle.destroy();
        cantPlay();
      };
      window.addEventListener('error', onShaderFailure);
      track({ type: 'game_start', ...tag });
      trackPlayTime(tag);
    } catch (err) {
      console.error('[16bit.ink] failed to start game', err);
      if (attempt) track({ type: 'load_fail', ...tag, ms: sinceTap(attempt), stage: step, error: errorText(err) });
      attempt = null;
      // A page older than the deploy: retrying asks for the same missing file, so reload (tap again after).
      if (step === 'download' && reloadIfStale(err, playing)) {
        status.textContent = 'Updating to the latest version…';
        return;
      }
      // Without WebGL every retry fails the same way (one phone logged 9 in a row).
      if (step === 'mount' && (!hasWebGL() || isShaderFailure(errorText(err)))) {
        cantPlay();
        return;
      }
      bar.fail();
      status.textContent = 'The game failed to load. Check your connection and try again.';
      engineP = loadGame(game);
      engineP.catch(() => undefined);
      play.disabled = false;
      play.textContent = 'Try again';
    }
  });
}

/**
 * Back from Google sign-in with a purchase pending: go straight on to checkout.
 * The marker is dropped first so Back or a reload never re-opens checkout.
 */
async function resumeBuy(game: string, status: HTMLElement, accessP: Promise<Access>): Promise<void> {
  const url = new URL(window.location.href);
  url.searchParams.delete(BUY_PARAM);
  history.replaceState(null, '', url);
  // Signing in can reveal an earlier purchase: never charge twice.
  if ((await accessP).unlocked) return;
  status.textContent = 'Taking you to checkout…';
  const result = await startCheckout(game);
  status.textContent = result.error ?? '';
}

/**
 * The game's code is gone from the server (a deploy since this page loaded): reload once onto
 * the new build. Never while `playing`: a game that mounted keeps running on the code it has.
 */
function reloadIfStale(err: unknown, playing: boolean): boolean {
  if (!shouldReloadForNewBuild({ err, online: navigator.onLine, playing })) return false;
  let session: Storage | undefined;
  try {
    session = window.sessionStorage;
  } catch {
    session = undefined;
  }
  return reloadForNewBuild(session, Date.now(), () => window.location.reload());
}

/** This browser's storage, keyed to the signed-in account (see scopedStorage). */
function safeStorage(userId: string | null): KeyValueStore | undefined {
  try {
    return scopedStorage(window.localStorage, userId);
  } catch {
    return undefined;
  }
}
