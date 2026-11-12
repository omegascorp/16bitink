import { isGameModule, isOfferPlace, type GameModule, type KeyValueStore } from '@16bitink/game-sdk';
import { GAME_LOADERS } from '../../games/loaders';
import { BUY_PARAM, isPendingBuy, signInUrl } from '../buyFlow';
import { flushAnalytics, gameTag, track, trackGameEvent, trackLevelInput, trackPlayTime, trackSignIn, type LoadStage } from './analytics';
import { buyFullGame, fetchMe, startCheckout } from './checkout';
import { pointerKind, watchLevelInput } from './levelInput';
import { createHiddenTime, visibleMs } from './hiddenTime';
import { createLoadingBar } from './loadingBar';
import { classifyMountFailure, isShaderFailure } from './mountFailure';
import { cleanStack } from '../stackText';
import { accountProgress } from './progress';
import { scopedStorage } from './scopedStorage';
import { SITE_BUILD } from '../build';
import { isNewerBuild, reloadForNewBuild, shouldReloadForNewBuild } from './staleBuild';

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
  /** Local dev only: DEV_ALL_LEVELS on localhost, for a signed-in admin. */
  readonly cheats: boolean;
}

async function checkAccess(game: string): Promise<Access> {
  try {
    const data = await getJson<Partial<Access>>(`/api/entitlement?game=${encodeURIComponent(game)}`);
    return { unlocked: data.unlocked === true, allLevelsOpen: data.allLevelsOpen === true, cheats: data.cheats === true };
  } catch (err) {
    // Offline or server hiccup: the free chapter still plays.
    console.warn('[16bit.ink] ownership check failed', err);
    return { unlocked: false, allLevelsOpen: false, cheats: false };
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

/** An error's stack as the stats keep it (cut, no query strings), or nothing. */
function errorStack(err: unknown): { readonly stack?: string } {
  const stack = err instanceof Error ? cleanStack(err.stack, `${err.name}: ${err.message}`) : undefined;
  return stack ? { stack } : {};
}

const RELOAD_TEXT = "The game couldn't start its graphics. Reload the page to try again.";
const NO_WEBGL_TEXT = "This browser can't draw the game: its graphics acceleration (WebGL) is off or unsupported. Try updating it, or open the page in Chrome or Firefox.";

/** One press of "Tap to play" until the game shows or fails. */
interface Attempt {
  readonly start: number;
  /** The page was hidden while it loaded (reported once). */
  readonly hidden: boolean;
}

/** How often a waiting splash screen asks whether a deploy has replaced it. */
const BUILD_CHECK_MS = 2 * 60_000;
/** The check made as Play is tapped waits no longer than this: a slow answer never holds up the game. */
const BUILD_CHECK_TIMEOUT_MS = 1_500;

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
  void accessP.then(({ unlocked }) => showOwned(unlocked));
  const progressP = accountProgress(game);
  const meP = fetchMe();
  if (isPendingBuy(window.location.search, game)) void resumeBuy(game, status, accessP);
  // The stats follow each press of play: how long until it showed, or how it failed or was left.
  let tag = gameTag(game, undefined);
  let attempt: Attempt | null = null;
  // Time with the tab hidden is not load time: the game can't draw there.
  const hiddenTime = createHiddenTime(() => performance.now(), () => document.visibilityState === 'hidden');
  const sinceTap = (a: Attempt): number => visibleMs(performance.now() - a.start, hiddenTime.total());
  /** `ms` without the hidden part, and the hidden part when there was one. */
  const loadTime = (a: Attempt): { readonly ms: number; readonly hiddenMs?: number } => {
    const hiddenMs = hiddenTime.total();
    return hiddenMs > 0 ? { ms: sinceTap(a), hiddenMs } : { ms: sinceTap(a) };
  };
  const bar = createLoadingBar(splash, play, performance.now(), {
    onLifted: (stalled) => {
      if (attempt) track({ type: 'game_ready', ...tag, ...loadTime(attempt), stage: stalled ? 'stall' : 'ready' });
      attempt = null;
    },
    onBootFailed: (reason) => {
      if (attempt) track({ type: 'load_fail', ...tag, ...loadTime(attempt), stage: 'boot', error: errorText(reason) });
      // The game lifts the screen onto its error message next: that isn't the game showing.
      attempt = null;
      // Its files may be gone with a deploy: then a refresh fixes it.
      void offerRefresh(stage, true);
    },
  });
  const hiddenWhileLoading = (): void => {
    if (!attempt || attempt.hidden) return;
    track({ type: 'load_abandon', ...tag, ms: sinceTap(attempt), pct: bar.percent() });
    attempt = { ...attempt, hidden: true };
    flushAnalytics(true);
  };
  document.addEventListener('visibilitychange', () => {
    hiddenTime.set(document.visibilityState === 'hidden');
    if (document.visibilityState === 'hidden') hiddenWhileLoading();
  });
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
  // Waiting on the splash (a tab left open, the app brought back): a deploy since this page loaded
  // reloads it onto the new build, so the game never starts on files the server no longer has.
  watchForNewBuild(() => tapped);
  // This browser can't draw the game, so every retry would fail the same way: say why and stop there.
  const cantPlay = (): void => {
    bar.fail();
    status.textContent = NO_WEBGL_TEXT;
    play.disabled = true;
    play.textContent = "Can't play in this browser";
  };
  // WebGL works again, but Phaser cached "no WebGL" when it was imported: only a reload gets a fresh import.
  let reloadOnTap = false;
  const offerReload = (): void => {
    bar.fail();
    status.textContent = RELOAD_TEXT;
    reloadOnTap = true;
    play.disabled = false;
    play.textContent = 'Reload page';
  };

  play.addEventListener('click', async () => {
    if (reloadOnTap) {
      window.location.reload();
      return;
    }
    tapped = true;
    play.disabled = true;
    status.textContent = '';
    bar.show();
    attempt = { start: performance.now(), hidden: false };
    hiddenTime.begin();
    track({ type: 'play_tap', ...tag, ms: Math.round(attempt.start) });
    let step: LoadStage = 'download';
    // Must be requested synchronously inside the click for browsers to allow it.
    const fs = goFullscreen(stage);
    // The last moment a reload costs the player nothing: once the game mounts, it plays on the files it has.
    const newerP = newerBuildServed();
    try {
      const [module, { unlocked, allLevelsOpen, cheats }, accountSaves, me, , , newer] = await Promise.all([engineP, accessP, progressP, meP, fontP, fs, newerP]);
      if (newer && reloadOntoNewBuild()) {
        attempt = null;
        status.textContent = 'Updating to the latest version…';
        return;
      }
      bar.downloaded();
      step = 'mount';
      // Without knowing who is signed in, local saves can't be told apart: play on this browser's alone.
      const userId = me?.id ?? null;
      const progress = userId ? accountSaves : null;
      tag = gameTag(game, module.version);
      playing = true;
      const inputs = watchLevelInput(() => performance.now(), (e) => trackLevelInput(tag, e));
      // Capture on the window: seen before the game's own handlers, whatever they stop.
      window.addEventListener('pointerdown', (e) => inputs.onInput(pointerKind(e.pointerType)), { capture: true, passive: true });
      window.addEventListener('keydown', (e) => !e.repeat && inputs.onInput('key'), { capture: true, passive: true });
      // The splash stays over the game, showing its boot progress, until the game calls loading.ready().
      const handle = module.mount(stage, {
        unlocked,
        allLevelsOpen,
        cheats,
        track: (event) => {
          trackGameEvent(tag, event);
          inputs.onGameEvent(event);
        },
        loading: bar.reporter,
        storage: safeStorage(userId),
        progress: progress ?? undefined,
        signedIn: me?.signedIn === true,
        price: stage.dataset.price || undefined,
        loadContent: () => getJson<unknown>(`/api/content/${encodeURIComponent(game)}`),
        // Only as a new chapter or level loads (see GameHost): never in the middle of play.
        filesMissing: () => void offerRefresh(stage, false),
        onBuy: (where) => {
          if (document.fullscreenElement) void document.exitFullscreen();
          void offerBuy(game, isOfferPlace(where) ? where : 'unknown');
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
        if (attempt) track({ type: 'load_fail', ...tag, ...loadTime(attempt), stage: 'boot', error: errorText(e.error ?? e.message), ...errorStack(e.error) });
        attempt = null;
        handle.destroy();
        cantPlay();
      };
      window.addEventListener('error', onShaderFailure);
      track({ type: 'game_start', ...tag });
      trackPlayTime(tag);
    } catch (err) {
      console.error('[16bit.ink] failed to start game', err);
      if (attempt) track({ type: 'load_fail', ...tag, ...loadTime(attempt), stage: step, error: errorText(err), ...errorStack(err) });
      attempt = null;
      // A page older than the deploy: retrying asks for the same missing file, so reload (tap again after).
      if (step === 'download' && reloadIfStale(err, playing)) {
        status.textContent = 'Updating to the latest version…';
        return;
      }
      // Without WebGL every retry fails the same way (one phone logged 9 in a row).
      if (step === 'mount') {
        const action = classifyMountFailure(errorText(err), hasWebGL());
        if (action === 'unsupported') return cantPlay();
        if (action === 'reload') return offerReload();
      }
      bar.fail();
      status.textContent = 'The game failed to load. Check your connection and try again.';
      void offerRefresh(stage, true);
      engineP = loadGame(game);
      engineP.catch(() => undefined);
      play.disabled = false;
      play.textContent = 'Try again';
    }
  });
}

let refreshOffered = false;

/**
 * The card over the game with a Refresh button, for a game, chapter or level that can't load
 * its files. Never in the middle of play: only the game starting, or a game's own report as
 * a new chapter or level loads. The page is rendered per request and never cached without
 * asking the server, so the refresh always lands on the newest version.
 * `onlyIfNewer`: show it only when a deploy is the cause.
 */
async function offerRefresh(stage: HTMLElement, onlyIfNewer: boolean): Promise<void> {
  const card = document.getElementById('refresh');
  const text = document.getElementById('refresh-text');
  const go = document.getElementById('refresh-go');
  if (refreshOffered || !card || !text || !go) return;
  refreshOffered = true;
  const newer = await newerBuildServed(10_000);
  if (!newer && onlyIfNewer) {
    refreshOffered = false;
    return;
  }
  text.textContent = newer
    ? `A new version of ${stage.dataset.title ?? 'the game'} is out. Refresh to keep playing: your saved progress stays.`
    : "Some of the game's files didn't load. Check your connection, then refresh.";
  go.addEventListener('click', () => window.location.reload(), { once: true });
  card.hidden = false;
  go.focus();
}

/** The splash's price line, once ownership is known: "unlocked" for an owner, else the price (also when the check failed). */
function showOwned(unlocked: boolean): void {
  const price = document.getElementById('price');
  if (!price) return;
  price.textContent = unlocked ? 'Full game · unlocked' : (price.dataset.text ?? '');
  price.removeAttribute('aria-busy');
}

/** A game's "Unlock" was tapped: sign in, then pay. */
async function offerBuy(game: string, where: Parameters<typeof buyFullGame>[1]): Promise<void> {
  const result = await buyFullGame(game, where);
  if (result.error) alert(result.error);
}

/**
 * Back from signing in with a purchase pending: go straight on to checkout.
 * The marker is dropped first so Back or a reload never re-opens checkout.
 */
async function resumeBuy(game: string, status: HTMLElement, accessP: Promise<Access>): Promise<void> {
  const url = new URL(window.location.href);
  url.searchParams.delete(BUY_PARAM);
  history.replaceState(null, '', url);
  // Signing in can reveal an earlier purchase of this game: never charge twice.
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
  return reloadOntoNewBuild();
}

/** Reloads once onto the new build (the cooldown in staleBuild.ts stops a loop). Returns whether it did. */
function reloadOntoNewBuild(): boolean {
  let session: Storage | undefined;
  try {
    session = window.sessionStorage;
  } catch {
    session = undefined;
  }
  return reloadForNewBuild(session, Date.now(), () => window.location.reload());
}

/** Whether the server runs a newer build than this page. No answer in time, offline or an error: no. */
async function newerBuildServed(timeoutMs: number = BUILD_CHECK_TIMEOUT_MS): Promise<boolean> {
  if (!navigator.onLine) return false;
  const timeout = new Promise<undefined>((resolve) => setTimeout(resolve, timeoutMs));
  const served = getJson<{ build?: unknown }>('/api/build').then((d) => d.build).catch(() => undefined);
  return isNewerBuild(SITE_BUILD, await Promise.race([served, timeout]));
}

/**
 * Until the first tap only: checks for a new build each time the page comes back
 * into view, and every few minutes while it is on screen, and reloads onto it.
 */
function watchForNewBuild(tapped: () => boolean): void {
  const check = async (): Promise<void> => {
    if (tapped() || document.visibilityState !== 'visible') return;
    if ((await newerBuildServed(10_000)) && !tapped()) reloadOntoNewBuild();
  };
  document.addEventListener('visibilitychange', () => void check());
  window.addEventListener('pageshow', (e) => e.persisted && void check());
  const timer = setInterval(() => (tapped() ? clearInterval(timer) : void check()), BUILD_CHECK_MS);
}

/** This browser's storage, keyed to the signed-in account (see scopedStorage). */
function safeStorage(userId: string | null): KeyValueStore | undefined {
  try {
    return scopedStorage(window.localStorage, userId);
  } catch {
    return undefined;
  }
}
