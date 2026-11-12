import type { Expression, PipelineStage } from 'mongoose';
import { median, pct, percentile, toSeconds } from '../stats';
import { AnalyticsEvent } from './eventModel';
import type { Range } from './eventRepo';

/**
 * How long things take to load, per page and per game, and per browser
 * (in-app browsers like Instagram's are often the slow ones): how many
 * visitors gave up before it finished, and how long they waited first.
 */

/** A page is "slow" when it takes longer than this to load. */
export const SLOW_PAGE_MS = 3000;
/** A game is "slow" when its loading screen takes longer than this to lift. */
export const SLOW_GAME_MS = 8000;

/** One visit's stay on one page, from its leave reports. */
export interface PageVisitRow {
  readonly path: string;
  readonly browser: string;
  /** mobile, desktop or tablet; absent on rows from before it was read. */
  readonly device?: string;
  /** When the page finished loading, if it did while the visitor was there. */
  readonly loadMs: number | null;
  /** Time on screen in all. */
  readonly stayMs: number;
}

export interface PageLoad {
  readonly browser: string;
  readonly visits: number;
  readonly leftBeforeLoad: number;
  readonly leftBeforeLoadPct: number | null;
  /** How long the visitors who left before it loaded waited, median. */
  readonly medianWaitBeforeLeavingSeconds: number | null;
  readonly medianLoadSeconds: number | null;
  readonly p90LoadSeconds: number | null;
  readonly slowPct: number | null;
}

/** One visit's go at one game: from "Tap to play" until it showed, failed or was left. */
export interface GameVisitRow {
  readonly game: string;
  readonly browser: string;
  readonly device?: string;
  readonly tapped: boolean;
  readonly ready: boolean;
  readonly stalled: boolean;
  readonly failed: boolean;
  readonly abandoned: boolean;
  readonly loadMs: number | null;
}

export interface GameLoad {
  readonly browser: string;
  readonly taps: number;
  readonly shown: number;
  readonly failed: number;
  /** Left while it was still loading, and never saw the game. */
  readonly abandoned: number;
  /** Went quiet and the stall timer lifted the loading screen. */
  readonly stalled: number;
  readonly medianLoadSeconds: number | null;
  readonly p90LoadSeconds: number | null;
  readonly slowPct: number | null;
}

export interface Breakdown<T> {
  readonly all: T;
  /** Browsers with at least `minVisits` visits, most first. */
  readonly browsers: readonly T[];
  /** The same per device (mobile, desktop, tablet), under `device` in place of `browser`. */
  readonly devices: readonly (Omit<T, 'browser'> & { readonly device: string })[];
}

function pageLoad(browser: string, rows: readonly PageVisitRow[]): PageLoad {
  const loads = rows.flatMap((r) => (r.loadMs === null ? [] : [r.loadMs]));
  const left = rows.filter((r) => r.loadMs === null);
  return {
    browser, visits: rows.length, leftBeforeLoad: left.length, leftBeforeLoadPct: pct(left.length, rows.length),
    medianWaitBeforeLeavingSeconds: toSeconds(median(left.map((r) => r.stayMs))),
    medianLoadSeconds: toSeconds(median(loads)), p90LoadSeconds: toSeconds(percentile(loads, 0.9)),
    slowPct: pct(loads.filter((ms) => ms > SLOW_PAGE_MS).length, loads.length),
  };
}

function gameLoad(browser: string, rows: readonly GameVisitRow[]): GameLoad {
  const tapped = rows.filter((r) => r.tapped);
  const loads = tapped.flatMap((r) => (r.loadMs === null ? [] : [r.loadMs]));
  return {
    browser, taps: tapped.length, shown: tapped.filter((r) => r.ready).length, failed: tapped.filter((r) => r.failed).length,
    abandoned: tapped.filter((r) => r.abandoned && !r.ready).length, stalled: tapped.filter((r) => r.stalled).length,
    medianLoadSeconds: toSeconds(median(loads)), p90LoadSeconds: toSeconds(percentile(loads, 0.9)),
    slowPct: pct(loads.filter((ms) => ms > SLOW_GAME_MS).length, loads.length),
  };
}

/** Groups `rows` by `key`, biggest group first. */
function groups<R>(rows: readonly R[], key: (r: R) => string): [string, R[]][] {
  const m = new Map<string, R[]>();
  for (const r of rows) m.set(key(r), [...(m.get(key(r)) ?? []), r]);
  return [...m].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
}

function breakdown<R extends { readonly browser: string; readonly device?: string }, T extends { readonly browser: string }>(
  rows: readonly R[], minVisits: number, summarize: (browser: string, rows: readonly R[]) => T,
): Breakdown<T> {
  const devices = groups(rows, (r) => r.device ?? 'unknown').filter(([, g]) => g.length >= minVisits).map(([d, g]) => {
    const { browser: _label, ...rest } = summarize(d, g);
    return { ...rest, device: d } as Omit<T, 'browser'> & { readonly device: string };
  });
  return {
    all: summarize('all', rows),
    browsers: groups(rows, (r) => r.browser).filter(([, g]) => g.length >= minVisits).map(([b, g]) => summarize(b, g)),
    devices,
  };
}

/** Page load per path (the `limit` most visited), overall and per browser. */
export function pageLoads(rows: readonly PageVisitRow[], limit: number, minVisits: number): (Breakdown<PageLoad> & { readonly path: string })[] {
  return groups(rows, (r) => r.path).slice(0, limit).map(([path, g]) => ({ path, ...breakdown(g, minVisits, pageLoad) }));
}

/** Game load per game, overall and per browser; games nobody tapped are left out. */
export function gameLoads(rows: readonly GameVisitRow[], minVisits: number): (Breakdown<GameLoad> & { readonly game: string })[] {
  return groups(rows.filter((r) => r.tapped), (r) => r.game).map(([game, g]) => ({ game, ...breakdown(g, minVisits, gameLoad) }));
}

const isEvent = (name: string): Expression => ({ $eq: ['$meta.event', name] });
const has = (cond: Expression) => ({ $max: { $cond: [cond, true, false] } });
const inRange = (r: Range): Record<string, unknown> => ({ ts: { $gte: r.from, $lt: r.to } });

export async function pageVisitRows(range: Range): Promise<PageVisitRow[]> {
  const pipeline: PipelineStage[] = [
    { $match: { ...inRange(range), 'meta.event': 'page_leave' } },
    // Leave reports add up over the page's life: the biggest is the whole stay.
    { $group: { _id: { session: '$session', path: '$path' }, browser: { $first: '$browser' }, device: { $first: '$device' }, loadMs: { $max: '$loadMs' }, stayMs: { $max: '$ms' } } },
    { $project: { _id: 0, path: '$_id.path', browser: 1, device: 1, loadMs: { $ifNull: ['$loadMs', null] }, stayMs: { $ifNull: ['$stayMs', 0] } } },
  ];
  return AnalyticsEvent.aggregate<PageVisitRow>(pipeline).exec();
}

export async function gameVisitRows(range: Range): Promise<GameVisitRow[]> {
  const shown: Expression = { $and: [isEvent('game_ready'), { $eq: ['$stage', 'ready'] }] };
  const pipeline: PipelineStage[] = [
    { $match: { ...inRange(range), 'meta.game': { $ne: null }, 'meta.event': { $in: ['play_tap', 'game_ready', 'load_fail', 'load_abandon'] } } },
    { $sort: { ts: 1 } },
    {
      $group: {
        _id: { session: '$session', game: '$meta.game' }, browser: { $first: '$browser' }, device: { $first: '$device' },
        tapped: has(isEvent('play_tap')), ready: has(isEvent('game_ready')),
        stalled: has({ $and: [isEvent('game_ready'), { $eq: ['$stage', 'stall'] }] }),
        failed: has(isEvent('load_fail')), abandoned: has(isEvent('load_abandon')),
        loads: { $push: { $cond: [shown, '$ms', '$$REMOVE'] } },
      },
    },
    {
      $project: {
        _id: 0, game: '$_id.game', browser: 1, device: 1, tapped: 1, ready: 1, stalled: 1, failed: 1, abandoned: 1,
        loadMs: { $ifNull: [{ $arrayElemAt: ['$loads', 0] }, null] },
      },
    },
  ];
  return AnalyticsEvent.aggregate<GameVisitRow>(pipeline).exec();
}

export interface LoadReport {
  readonly pages: (Breakdown<PageLoad> & { readonly path: string })[];
  readonly games: (Breakdown<GameLoad> & { readonly game: string })[];
}

export async function loadReport(range: Range, pageLimit = 10, minVisits = 3): Promise<LoadReport> {
  const [pages, games] = await Promise.all([pageVisitRows(range), gameVisitRows(range)]);
  return { pages: pageLoads(pages, pageLimit, minVisits), games: gameLoads(games, minVisits) };
}
