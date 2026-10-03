import { startCheckout } from './checkout';

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

async function isUnlocked(game: string): Promise<boolean> {
  try {
    return (await getJson<{ unlocked: boolean }>(`/api/entitlement?game=${encodeURIComponent(game)}`)).unlocked;
  } catch (err) {
    // Offline or server hiccup: the free chapter still plays.
    console.warn('[16bit.ink] ownership check failed', err);
    return false;
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

const isIos = (): boolean => /iPhone|iPod/.test(navigator.userAgent) && !('standalone' in navigator && navigator.standalone);

export function bootPlayer(game: string): void {
  const stage = document.getElementById('stage');
  const splash = document.getElementById('splash');
  const play = document.getElementById('play') as HTMLButtonElement | null;
  const status = document.getElementById('status');
  if (!stage || !splash || !play || !status) throw new Error('Player markup missing');
  if (isIos()) document.getElementById('ios-hint')?.removeAttribute('hidden');

  // Start the ownership check and engine download while the player reads the splash.
  const unlockedP = isUnlocked(game);
  // Re-created on retry: a failed dynamic import stays rejected forever.
  let engineP = import('@16bitink/inkfish');
  engineP.catch(() => undefined);
  const fontP = document.fonts.load('32px Caveat').catch(() => undefined);

  play.addEventListener('click', async () => {
    play.disabled = true;
    play.textContent = 'Loading…';
    // Must be requested synchronously inside the click for browsers to allow it.
    const fs = goFullscreen(stage);
    try {
      const [{ bootInkfish }, unlocked] = await Promise.all([engineP, unlockedP, fontP, fs]);
      splash.remove();
      bootInkfish(stage, {
        unlocked,
        storage: safeStorage(),
        loadFullChapters: () => getJson<unknown>(`/api/levels/${game}`),
        onBuy: () => {
          if (document.fullscreenElement) void document.exitFullscreen();
          void startCheckout(game).then((r) => r.error && alert(r.error));
        },
        onExit: () => window.location.assign(`/games/${game}`),
      });
    } catch (err) {
      console.error('[16bit.ink] failed to start game', err);
      status.textContent = 'The game failed to load. Check your connection and try again.';
      engineP = import('@16bitink/inkfish');
      engineP.catch(() => undefined);
      play.disabled = false;
      play.textContent = 'Try again';
    }
  });
}

function safeStorage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}
