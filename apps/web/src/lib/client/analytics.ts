import { isOfferPlace, type GameEvent, type OfferPlace } from '@16bitink/game-sdk';
import { pageviewRef } from '../shortLinks';

/**
 * First-party analytics, sent only to our own server (POST /api/events).
 * No cookies: one random visitor id in localStorage (renewed yearly, so a
 * player can be followed through a game's levels) and one random visit id
 * per tab in sessionStorage (new after half an hour away). Nothing is sent when the browser asks not to be tracked, or
 * on a browser an admin marked as their own.
 */

const ENDPOINT = '/api/events';
const VISITOR_KEY = '16bitink:visitor';
const VISIT_KEY = '16bitink:visit';
const OPT_OUT_KEY = '16bitink:no-analytics';
/** About 13 months: then the visitor gets a fresh id. */
const VISITOR_MAX_AGE_MS = 395 * 24 * 60 * 60 * 1000;
/** A visit ends after this long without an event. */
const VISIT_IDLE_MS = 30 * 60 * 1000;
const FLUSH_DELAY_MS = 5000;
const MAX_QUEUE = 20;

/** Which game an event is about, and which release of it. */
interface GameTag {
  readonly game: string;
  readonly version?: string;
}

type Event =
  | { readonly type: 'pageview'; readonly path: string; readonly ref?: string; readonly app?: true }
  | { readonly type: 'page_leave'; readonly path: string; readonly ms: number; readonly scroll: number; readonly loadMs?: number }
  | { readonly type: 'js_error'; readonly path: string; readonly error: string; readonly source?: string }
  | ({ readonly type: 'game_start' } & GameTag)
  | { readonly type: 'home_click'; readonly game: string; readonly target: HomeClickTarget; readonly slot: number }
  | ({ readonly type: 'play_time'; readonly seconds: number } & GameTag)
  | ({ readonly type: 'play_tap'; readonly ms: number } & GameTag)
  | ({ readonly type: 'game_ready'; readonly ms: number; readonly stage: 'ready' | 'stall' } & GameTag)
  | ({ readonly type: 'load_fail'; readonly ms: number; readonly stage: LoadStage; readonly error: string } & GameTag)
  | ({ readonly type: 'load_abandon'; readonly ms: number; readonly pct: number } & GameTag)
  | ({ readonly type: 'buy_click'; readonly where: BuyPlace; readonly signedIn: boolean } & GameTag)
  | { readonly type: 'signin_click'; readonly where: SignInPlace; readonly game?: string }
  | { readonly type: 'checkout_open'; readonly game: string }
  | { readonly type: 'checkout_fail'; readonly game: string; readonly error: string }
  | { readonly type: 'app_install' }
  | (GameEvent & GameTag);

/** Where a buy was tapped: one of the game's own offers, the game's page, or a game too old to say. */
export type BuyPlace = OfferPlace | 'page' | 'unknown';
/** Where a sign-in was tapped: a game's "save your progress", the site header, or "Bought it already?"; then, on the sign-in page, the way chosen. */
export type SignInPlace = 'save' | 'header' | 'restore' | 'google' | 'email';

/** Which part of a home page game card was clicked. */
export type HomeClickTarget = 'cover' | 'title' | 'play' | 'about';

/** Where a game's load failed: fetching its code, starting it, or its own boot. */
export type LoadStage = 'download' | 'mount' | 'boot';

/** The server refuses an event whose version isn't like this, so leave an odd one out rather than lose the event. */
const VERSION = /^[0-9A-Za-z.+-]{1,40}$/;

/** Tags an event with its game and, when it's well formed, the game's version. */
export function gameTag(game: string, version: string | undefined): GameTag {
  return version && VERSION.test(version) ? { game, version } : { game };
}

type Queued = Event & { readonly at: number };

const randomId = (): string =>
  typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('');

/** Used when storage is blocked: the visit is then just this page load. */
const pageId = randomId();

function readStorage(key: string, storage: () => Storage = () => window.localStorage): string | null {
  try {
    return storage().getItem(key);
  } catch {
    return null;
  }
}

/** This tab's visit id, kept across its pages; a new one after half an hour idle. */
function visitId(now: number): string {
  const session = (): Storage => window.sessionStorage;
  let id = pageId;
  try {
    const v = JSON.parse(readStorage(VISIT_KEY, session) ?? 'null') as { id?: unknown; last?: unknown } | null;
    if (v && typeof v.id === 'string' && typeof v.last === 'number' && now - v.last < VISIT_IDLE_MS) id = v.id;
    else if (v) id = randomId();
  } catch {
    id = randomId();
  }
  try {
    session().setItem(VISIT_KEY, JSON.stringify({ id, last: now }));
  } catch {
    // Storage blocked: the visit is this page load.
  }
  return id;
}

/** This browser's visitor id; with storage blocked, just this page load's. */
function visitorId(now: number): string {
  const saved = readStorage(VISITOR_KEY);
  try {
    const v = saved ? (JSON.parse(saved) as { id?: unknown; since?: unknown }) : null;
    if (v && typeof v.id === 'string' && typeof v.since === 'number' && now - v.since < VISITOR_MAX_AGE_MS) return v.id;
  } catch {
    // Unreadable: replaced below.
  }
  const id = randomId();
  try {
    window.localStorage.setItem(VISITOR_KEY, JSON.stringify({ id, since: now }));
    return id;
  } catch {
    return pageId;
  }
}

function optedOut(): boolean {
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  return nav.globalPrivacyControl === true || navigator.doNotTrack === '1' || readStorage(OPT_OUT_KEY) === '1';
}

const enabled = typeof window !== 'undefined' && !optedOut();
let queue: readonly Queued[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

/** Sends what is queued. `leaving`: the page is going away, so use sendBeacon, which outlives it. */
export function flushAnalytics(leaving = false): void {
  if (timer !== null) clearTimeout(timer);
  timer = null;
  if (queue.length === 0) return;
  const now = Date.now();
  const body = JSON.stringify({ visitor: visitorId(now), session: visitId(now), sentAt: now, touch: navigator.maxTouchPoints > 1, events: queue });
  queue = [];
  try {
    if (leaving && navigator.sendBeacon?.(ENDPOINT, body)) return;
    void fetch(ENDPOINT, { method: 'POST', body, keepalive: true, credentials: 'same-origin', headers: { 'content-type': 'text/plain' } }).catch(() => undefined);
  } catch {
    // Analytics never gets in the way of the page.
  }
}

export function track(event: Event): void {
  if (!enabled) return;
  queue = [...queue, { ...event, at: Date.now() }];
  if (queue.length >= MAX_QUEUE) flushAnalytics();
  else timer ??= setTimeout(() => flushAnalytics(), FLUSH_DELAY_MS);
}

/** Opened from the home screen, as the installed app. */
function isInstalledApp(): boolean {
  try {
    return matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  } catch {
    return false;
  }
}

/**
 * A page view, with where it came from: a short link typed from a video, or another site's host only;
 * and whether it's the installed app. Also counts the browser installing the site as an app.
 */
export function trackPageview(): void {
  const ref = pageviewRef({ referrer: document.referrer, hostname: location.hostname, search: location.search });
  track({ type: 'pageview', path: location.pathname.slice(0, 200), ...(ref ? { ref } : {}), ...(isInstalledApp() ? { app: true as const } : {}) });
  window.addEventListener('appinstalled', () => {
    track({ type: 'app_install' });
    flushAnalytics();
  }, { once: true });
  // Counted once: a reload or a shared copy of the address isn't another visit from the video.
  if (new URLSearchParams(location.search).has('via')) {
    const url = new URL(location.href);
    url.searchParams.delete('via');
    history.replaceState(history.state, '', url);
  }
}

/** Longest level progress note kept (the server refuses more). */
const PROGRESS_MAX = 60;

/** A game's event, trimmed to what the server accepts; null when the server would refuse it anyway. */
export function fromGameEvent(tag: GameTag, e: GameEvent): Event | null {
  if (e.type === 'offer_view') return isOfferPlace(e.where) ? { type: 'offer_view', where: e.where, ...tag } : null;
  if (!Number.isInteger(e.n) || e.n < 1) return null;
  return {
    ...e, ...tag, level: e.level.slice(0, 40), ...(e.name ? { name: e.name.slice(0, 80) } : {}),
    ...(e.type === 'level_end' && e.progress ? { progress: e.progress.slice(0, PROGRESS_MAX) } : {}),
  };
}

/** Records an event a game reported: its levels, and the offers it showed. */
export function trackGameEvent(tag: GameTag, e: GameEvent): void {
  const event = fromGameEvent(tag, e);
  if (event) track(event);
}

/** A buy offer was taken, from a game or the game's page. */
export function trackBuy(game: string, where: BuyPlace, signedIn: boolean): void {
  track({ type: 'buy_click', game, where, signedIn });
}

/** A sign-in was tapped; the page may be about to leave (for Google or the sign-in page), so the event goes now. */
export function trackSignIn(where: SignInPlace, game?: string): void {
  track({ type: 'signin_click', where, ...(game ? { game } : {}) });
  flushAnalytics(true);
}

/** Stripe's checkout is opening (the page leaves next, so the event goes now), or couldn't, and why. */
export function trackCheckout(game: string, error?: string): void {
  if (error) track({ type: 'checkout_fail', game, error: (error.trim() || 'Unknown error').slice(0, 200) });
  else track({ type: 'checkout_open', game });
  flushAnalytics(true);
}

/** Play time is reported at least this often, so a tab that dies unannounced loses at most this much. */
const PLAY_REPORT_MS = 60_000;
/** The most one report may claim (the server refuses more). */
const MAX_PLAY_REPORT_SECONDS = 600;

/**
 * Counts time actually spent in a game: only while the tab is visible.
 * Reports every minute and whenever the page hides; the server adds the
 * pieces up.
 */
export function trackPlayTime(tag: GameTag): void {
  let since: number | null = document.visibilityState === 'visible' ? Date.now() : null;
  /** Reports the time since `since`, then keeps counting only if the game is still on screen. */
  const report = (stillPlaying: boolean): void => {
    if (since === null) return;
    const now = Date.now();
    const seconds = Math.round((now - since) / 100) / 10;
    since = stillPlaying ? now : null;
    if (seconds > 0) track({ type: 'play_time', ...tag, seconds: Math.min(seconds, MAX_PLAY_REPORT_SECONDS) });
  };
  const leave = (): void => {
    report(false);
    flushAnalytics(true);
  };
  setInterval(() => report(document.visibilityState === 'visible'), PLAY_REPORT_MS);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') leave();
    else since ??= Date.now();
  });
  window.addEventListener('pagehide', leave);
}

/** Turns this site's statistics off (or back on) for this browser, from the next page on. */
export function setAnalyticsOptOut(off: boolean): void {
  try {
    if (off) window.localStorage.setItem(OPT_OUT_KEY, '1');
    else window.localStorage.removeItem(OPT_OUT_KEY);
  } catch {
    // Storage blocked: nothing is stored or counted anyway.
  }
}

export const isAnalyticsOptedOut = (): boolean => readStorage(OPT_OUT_KEY) === '1';

if (enabled) {
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && flushAnalytics(true));
  window.addEventListener('pagehide', () => flushAnalytics(true));
}
