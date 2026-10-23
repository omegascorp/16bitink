import { isForeignError } from '../foreignErrors';
import { flushAnalytics, track } from './analytics';

/**
 * What a page reports beyond its view: how long it was on screen, how far
 * down it was read, whether it had finished loading (its images too) when
 * the visitor left, and any script error it hit. Tells a visitor who left
 * at once from one who read and left, and a slow or broken page from both.
 */

/** Enough to see a pattern; a page stuck in an error loop doesn't flood the stats. */
export const MAX_ERRORS_PER_PAGE = 5;
const MAX_ERROR = 200;
const MAX_SOURCE = 200;

/** How far down the page the bottom of the screen got, 0–100. */
export function scrollPercent(scrollTop: number, viewportHeight: number, pageHeight: number): number {
  if (pageHeight <= viewportHeight || pageHeight <= 0) return 100;
  return Math.min(100, Math.round(((scrollTop + viewportHeight) / pageHeight) * 100));
}

export interface ErrorReport {
  readonly error: string;
  readonly source?: string;
}

/**
 * An error as the server takes it: the message trimmed, and where it came
 * from as a path and line on our own site, or just the host elsewhere
 * (a browser extension or another site's script), never a full URL.
 */
export function errorReport(message: string, file: string | undefined, line: number, column: number, origin: string): ErrorReport {
  // URLs in a message keep their path: a query string could carry anything.
  const error = (message.replace(/\?[^\s'"]*/g, '').trim() || 'Unknown error').slice(0, MAX_ERROR);
  if (!file) return { error };
  try {
    const url = new URL(file, origin);
    const source = url.origin === origin ? `${url.pathname}${line ? `:${line}:${column}` : ''}` : url.host || url.protocol;
    return source ? { error, source: source.slice(0, MAX_SOURCE) } : { error };
  } catch {
    return { error };
  }
}

/** Passes each message once, and at most MAX_ERRORS_PER_PAGE in all. */
export function createErrorGate(): (message: string) => boolean {
  let seen: ReadonlySet<string> = new Set();
  return (message) => {
    if (seen.has(message) || seen.size >= MAX_ERRORS_PER_PAGE) return false;
    seen = new Set([...seen, message]);
    return true;
  };
}

const path = (): string => location.pathname.slice(0, 200);

/** When the page finished loading, in ms since it opened; undefined until it has. */
function loadedAt(): number | undefined {
  const [nav] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
  if (nav && nav.loadEventEnd > 0) return Math.round(nav.loadEventEnd);
  return undefined;
}

/**
 * Reports, each time the page goes out of sight, its time on screen so far
 * (the reports add up, so the last one is the whole stay) and how far down
 * it was read.
 */
export function watchPage(): void {
  let visibleMs = 0;
  let since: number | null = document.visibilityState === 'visible' ? performance.now() : null;
  let maxScroll = 0;
  const measureScroll = (): void => {
    const doc = document.documentElement;
    maxScroll = Math.max(maxScroll, scrollPercent(window.scrollY, window.innerHeight, doc.scrollHeight));
  };
  measureScroll();
  window.addEventListener('scroll', measureScroll, { passive: true });
  window.addEventListener('load', measureScroll, { once: true });

  const report = (): void => {
    if (since === null) return;
    visibleMs += performance.now() - since;
    since = null;
    const loadMs = loadedAt();
    track({ type: 'page_leave', path: path(), ms: Math.round(visibleMs), scroll: maxScroll, ...(loadMs === undefined ? {} : { loadMs }) });
    flushAnalytics(true);
  };
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') report();
    else since ??= performance.now();
  });
  window.addEventListener('pagehide', report);
}

/** Reports uncaught script errors and promise rejections on this page, but not an in-app browser's own. */
export function watchErrors(): void {
  const pass = createErrorGate();
  const send = (report: ErrorReport): void => {
    if (!isForeignError(report) && pass(report.error)) track({ type: 'js_error', path: path(), ...report });
  };
  window.addEventListener('error', (e) => {
    // A resource that failed to load (an image, a script tag) arrives here too, with no message.
    if (!(e instanceof ErrorEvent)) return;
    send(errorReport(e.message, e.filename, e.lineno, e.colno, location.origin));
  });
  window.addEventListener('unhandledrejection', (e) => {
    const reason: unknown = e.reason;
    const text = reason instanceof Error ? `${reason.name}: ${reason.message}` : typeof reason === 'string' ? reason : 'Promise rejected with a non-error value';
    send(errorReport(text, undefined, 0, 0, location.origin));
  });
}
