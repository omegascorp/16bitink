import type { GameEvent } from '@16bitink/game-sdk';

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
  | { readonly type: 'pageview'; readonly path: string; readonly ref?: string }
  | { readonly type: 'page_leave'; readonly path: string; readonly ms: number; readonly scroll: number; readonly loadMs?: number }
  | { readonly type: 'js_error'; readonly path: string; readonly error: string; readonly source?: string }
  | ({ readonly type: 'game_start' } & GameTag)
  | ({ readonly type: 'play_time'; readonly seconds: number } & GameTag)
  | ({ readonly type: 'play_tap'; readonly ms: number } & GameTag)
  | ({ readonly type: 'game_ready'; readonly ms: number; readonly stage: 'ready' | 'stall' } & GameTag)
  | ({ readonly type: 'load_fail'; readonly ms: number; readonly stage: LoadStage; readonly error: string } & GameTag)
  | ({ readonly type: 'load_abandon'; readonly ms: number; readonly pct: number } & GameTag)
  | (GameEvent & GameTag);

/** Where a game's load failed: fetching its code, starting it, or its own boot. */
export type LoadStage = 'download' | 'mount' | 'boot';

/** The server refuses an event whose version isn't like this, so leave an odd one out rather than lose the event. */
const VERSION = /^[0-9A-Za-z.+-]{1,40}$/;

/** Tags an event with its game and, when it's well formed, the game's version. */
export function gameTag(game: string, version: string | undefined): GameTag {
  return version && VERSION.test(version) ? { game, version } : { game };
}

type Queued = Event & { readonly at: number };

const NET_TYPES: ReadonlySet<string> = new Set(['slow-2g', '2g', '3g', '4g']);

/** The browser's connection type, when it's one the server knows. */
export function networkType(connection: { readonly effectiveType?: unknown } | undefined): string | undefined {
  const type = connection?.effectiveType;
  return typeof type === 'string' && NET_TYPES.has(type) ? type : undefined;
}

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
  const net = networkType((navigator as Navigator & { connection?: { effectiveType?: unknown } }).connection);
  const body = JSON.stringify({ visitor: visitorId(now), session: visitId(now), sentAt: now, touch: navigator.maxTouchPoints > 1, ...(net ? { net } : {}), events: queue });
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

/** A page view; the referrer only as a host, and only when it's another site. */
export function trackPageview(): void {
  let ref: string | undefined;
  try {
    const host = document.referrer ? new URL(document.referrer).hostname : '';
    ref = host && host !== location.hostname ? host.slice(0, 100) : undefined;
  } catch {
    ref = undefined;
  }
  track({ type: 'pageview', path: location.pathname.slice(0, 200), ...(ref ? { ref } : {}) });
}

/** A level event from a game, trimmed to what the server accepts. */
export function trackLevel(tag: GameTag, e: GameEvent): void {
  if (!Number.isInteger(e.n) || e.n < 1) return;
  track({ ...e, ...tag, level: e.level.slice(0, 40), ...(e.name ? { name: e.name.slice(0, 80) } : {}) });
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
