import type { AccumulatorOperator, Expression, PipelineStage } from 'mongoose';
import { AnalyticsEvent } from './eventModel';
import type { Range } from './eventRepo';

/**
 * Reports on where visitors drop off before playing: the page they land
 * on and how long they stay there, and each game's way from its play page
 * through loading to the first level, with the errors on the way.
 */

/** Time on a landing page under this counts as leaving straight away. */
export const QUICK_LEAVE_MS = 10_000;

const inRange = (r: Range): Record<string, unknown> => ({ ts: { $gte: r.from, $lt: r.to } });
const isEvent = (name: string): Expression => ({ $eq: ['$meta.event', name] });
/** 1 when any event in the group is named `name`. */
const hasEvent = (name: string): AccumulatorOperator => ({ $max: { $cond: [isEvent(name), 1, 0] } });
const toSeconds = (ms: Expression): Expression => ({ $cond: [{ $eq: [ms, null] }, null, { $divide: [ms, 1000] }] });

async function aggregate<T>(pipeline: PipelineStage[]): Promise<T[]> {
  return AnalyticsEvent.aggregate<T>(pipeline).exec();
}

export interface LandingStats {
  readonly path: string;
  readonly visits: number;
  /** Visits that never left this page and started no game. */
  readonly bounced: number;
  /** Visits that went on to start a game. */
  readonly started: number;
  /** Visits that left it within QUICK_LEAVE_MS on screen. */
  readonly quick: number;
  /** Average time it was on screen, over the visits that reported one. */
  readonly avgSeconds: number | null;
  /** Visits that left before the page (its images too) finished loading. */
  readonly leftBeforeLoad: number;
}

export interface ReferrerStats {
  /** The linking site's host; null for typed-in addresses, apps and bookmarks. */
  readonly ref: string | null;
  readonly visits: number;
  readonly started: number;
}

export interface EntryStats {
  readonly landings: readonly LandingStats[];
  readonly referrers: readonly ReferrerStats[];
}

/** Each visit's first page, how long it stayed there, and where it came from. */
export async function entryStats(range: Range, limit = 12): Promise<EntryStats> {
  const [row] = await aggregate<EntryStats>([
    { $match: { ...inRange(range), 'meta.event': { $in: ['pageview', 'page_leave', 'game_start'] } } },
    { $sort: { ts: 1 } },
    {
      $group: {
        _id: '$session',
        paths: { $push: { $cond: [isEvent('pageview'), '$path', '$$REMOVE'] } },
        leaves: { $push: { $cond: [isEvent('page_leave'), { path: '$path', ms: '$ms', loaded: { $gt: ['$loadMs', null] } }, '$$REMOVE'] } },
        ref: { $max: '$ref' },
        started: hasEvent('game_start'),
      },
    },
    { $addFields: { landing: { $arrayElemAt: ['$paths', 0] }, pages: { $size: '$paths' } } },
    { $match: { landing: { $ne: null } } },
    { $addFields: { onLanding: { $filter: { input: '$leaves', cond: { $eq: ['$$this.path', '$landing'] } } } } },
    {
      $addFields: {
        // Leave reports add up over the page's life, so the last (the biggest) is the whole stay.
        landingMs: { $max: '$onLanding.ms' },
        loaded: { $anyElementTrue: [{ $map: { input: '$onLanding', in: '$$this.loaded' } }] },
        reported: { $gt: [{ $size: '$onLanding' }, 0] },
      },
    },
    {
      $facet: {
        landings: [
          {
            $group: {
              _id: '$landing', visits: { $sum: 1 }, started: { $sum: '$started' },
              bounced: { $sum: { $cond: [{ $and: [{ $eq: ['$pages', 1] }, { $eq: ['$started', 0] }] }, 1, 0] } },
              quick: { $sum: { $cond: [{ $and: ['$reported', { $lt: ['$landingMs', QUICK_LEAVE_MS] }] }, 1, 0] } },
              avgMs: { $avg: '$landingMs' },
              leftBeforeLoad: { $sum: { $cond: [{ $and: ['$reported', { $not: ['$loaded'] }] }, 1, 0] } },
            },
          },
          { $sort: { visits: -1, _id: 1 } },
          { $limit: limit },
          { $project: { _id: 0, path: '$_id', visits: 1, bounced: 1, started: 1, quick: 1, avgSeconds: toSeconds('$avgMs'), leftBeforeLoad: 1 } },
        ],
        referrers: [
          { $group: { _id: { $ifNull: ['$ref', null] }, visits: { $sum: 1 }, started: { $sum: '$started' } } },
          { $sort: { visits: -1, _id: 1 } },
          { $limit: limit },
          { $project: { _id: 0, ref: '$_id', visits: 1, started: 1 } },
        ],
      },
    },
  ]);
  return row ?? { landings: [], referrers: [] };
}

/** One game's way from its play page to the first level, in visits. */
export interface PlayFunnel {
  readonly game: string;
  /** Visits that opened the game's play page. */
  readonly views: number;
  readonly taps: number;
  /** Visits where the game mounted (the existing game_start). */
  readonly started: number;
  /** Visits where the loading screen lifted. */
  readonly ready: number;
  /** Visits that started a level. */
  readonly leveled: number;
  readonly failed: number;
  /** Visits that hid the page while it loaded and never saw the game. */
  readonly abandoned: number;
  /** Visits whose loading screen the stall timer had to lift. */
  readonly stalled: number;
  /** Average time from opening the play page to tapping. */
  readonly avgWaitSeconds: number | null;
  /** Average time from the tap to the game's first screen, when it said it was ready. */
  readonly avgLoadSeconds: number | null;
}

const PLAY_PATH = '^/play/([a-z0-9-]+)$';

export async function playFunnel(range: Range): Promise<PlayFunnel[]> {
  const funnelEvents = ['pageview', 'play_tap', 'game_start', 'game_ready', 'level_start', 'load_fail', 'load_abandon'];
  return aggregate<PlayFunnel>([
    { $match: { ...inRange(range), 'meta.event': { $in: funnelEvents } } },
    // A play page view carries no game: read it from the path.
    { $addFields: { game: { $ifNull: ['$meta.game', { $arrayElemAt: [{ $getField: { field: 'captures', input: { $regexFind: { input: '$path', regex: PLAY_PATH } } } }, 0] }] } } },
    { $match: { game: { $type: 'string' } } },
    {
      $group: {
        _id: { game: '$game', session: '$session' },
        viewed: hasEvent('pageview'),
        tapped: hasEvent('play_tap'), started: hasEvent('game_start'), ready: hasEvent('game_ready'), leveled: hasEvent('level_start'),
        failed: hasEvent('load_fail'), abandoned: hasEvent('load_abandon'),
        stalled: { $max: { $cond: [{ $and: [isEvent('game_ready'), { $eq: ['$stage', 'stall'] }] }, 1, 0] } },
        waits: { $push: { $cond: [isEvent('play_tap'), '$ms', '$$REMOVE'] } },
        loads: { $push: { $cond: [{ $and: [isEvent('game_ready'), { $eq: ['$stage', 'ready'] }] }, '$ms', '$$REMOVE'] } },
      },
    },
    {
      $group: {
        _id: '$_id.game', views: { $sum: '$viewed' }, taps: { $sum: '$tapped' }, started: { $sum: '$started' }, ready: { $sum: '$ready' },
        leveled: { $sum: '$leveled' }, failed: { $sum: '$failed' }, stalled: { $sum: '$stalled' },
        // A player who switched away while it loaded and came back to a game that showed didn't leave.
        abandoned: { $sum: { $cond: [{ $and: [{ $eq: ['$abandoned', 1] }, { $eq: ['$ready', 0] }, { $eq: ['$started', 0] }] }, 1, 0] } },
        waits: { $push: '$waits' }, loads: { $push: '$loads' },
      },
    },
    {
      $project: {
        _id: 0, game: '$_id', views: 1, taps: 1, started: 1, ready: 1, leveled: 1, failed: 1, abandoned: 1, stalled: 1,
        avgWaitSeconds: toSeconds({ $avg: { $reduce: { input: '$waits', initialValue: [], in: { $concatArrays: ['$$value', '$$this'] } } } }),
        avgLoadSeconds: toSeconds({ $avg: { $reduce: { input: '$loads', initialValue: [], in: { $concatArrays: ['$$value', '$$this'] } } } }),
      },
    },
    { $sort: { views: -1, game: 1 } },
  ]);
}

export interface ErrorStats {
  readonly kind: 'load_fail' | 'js_error';
  readonly error: string;
  /** For a failed load, the game and stage; for a page error, the script and line (or the page). */
  readonly where: string;
  readonly count: number;
  readonly visits: number;
  /** A few of the OS · browser pairs that hit it. */
  readonly agents: readonly string[];
  readonly last: Date;
}

/** The errors visitors hit, most frequent first. */
export async function topErrors(range: Range, limit = 15): Promise<ErrorStats[]> {
  return aggregate<ErrorStats>([
    { $match: { ...inRange(range), 'meta.event': { $in: ['load_fail', 'js_error'] } } },
    {
      $addFields: {
        where: { $cond: [isEvent('load_fail'), { $concat: [{ $ifNull: ['$meta.game', '?'] }, ' · ', { $ifNull: ['$stage', '?'] }] }, { $ifNull: ['$source', { $ifNull: ['$path', ''] }] }] },
        agent: { $concat: [{ $ifNull: ['$os', '?'] }, ' · ', { $ifNull: ['$browser', '?'] }] },
      },
    },
    {
      $group: {
        _id: { kind: '$meta.event', error: '$error', where: '$where' },
        count: { $sum: 1 }, sessions: { $addToSet: '$session' }, agents: { $addToSet: '$agent' }, last: { $max: '$ts' },
      },
    },
    { $sort: { count: -1, last: -1 } },
    { $limit: limit },
    {
      $project: {
        _id: 0, kind: '$_id.kind', error: '$_id.error', where: '$_id.where', count: 1,
        visits: { $size: '$sessions' }, agents: { $slice: ['$agents', 3] }, last: 1,
      },
    },
  ]);
}
