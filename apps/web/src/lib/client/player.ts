import { isGameModule, type GameModule, type KeyValueStore } from '@16bitink/game-sdk';
import { GAME_LOADERS } from '../../games/loaders';
import { isPendingBuy, BUY_PARAM } from '../buyFlow';
import { buyFullGame, fetchMe, startCheckout } from './checkout';
import { accountProgress } from './progress';
import { scopedStorage } from './scopedStorage';

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
  // Re-created on retry: a failed dynamic import stays rejected forever.
  let engineP = loadGame(game);
  engineP.catch(() => undefined);
  const fontP = Promise.all(fonts.map((f) => document.fonts.load(f))).catch(() => undefined);

  play.addEventListener('click', async () => {
    play.disabled = true;
    play.textContent = 'Loading…';
    // Must be requested synchronously inside the click for browsers to allow it.
    const fs = goFullscreen(stage);
    try {
      const [module, { unlocked, allLevelsOpen }, accountSaves, me] = await Promise.all([engineP, accessP, progressP, meP, fontP, fs]);
      // Without knowing who is signed in, local saves can't be told apart: play on this browser's alone.
      const userId = me?.id ?? null;
      const progress = userId ? accountSaves : null;
      splash.remove();
      const handle = module.mount(stage, {
        unlocked,
        allLevelsOpen,
        storage: safeStorage(userId),
        progress: progress ?? undefined,
        signedIn: me?.signedIn === true,
        price: stage.dataset.price || undefined,
        loadContent: () => getJson<unknown>(`/api/content/${encodeURIComponent(game)}`),
        onBuy: () => {
          if (document.fullscreenElement) void document.exitFullscreen();
          void buyFullGame(game).then((r) => r.error && alert(r.error));
        },
        onExit: () => {
          handle.destroy();
          window.location.assign(`/games/${game}`);
        },
      });
    } catch (err) {
      console.error('[16bit.ink] failed to start game', err);
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

/** This browser's storage, keyed to the signed-in account (see scopedStorage). */
function safeStorage(userId: string | null): KeyValueStore | undefined {
  try {
    return scopedStorage(window.localStorage, userId);
  } catch {
    return undefined;
  }
}
