import type { AccumulatorOperator, Expression, PipelineStage } from 'mongoose';
import type { StoredEvent } from '../analytics';
import { AnalyticsEvent } from './eventModel';

/** Reports cover events with `from <= ts < to`. */
export interface Range {
  readonly from: Date;
  readonly to: Date;
}

export async function recordEvents(events: readonly StoredEvent[]): Promise<void> {
  if (events.length === 0) return;
  // Creates the time-series collection first (once): a plain insert would create a plain collection.
  await AnalyticsEvent.init();
  await AnalyticsEvent.insertMany(events, { ordered: false, lean: true });
}

const inRange = (r: Range): Record<string, unknown> => ({ ts: { $gte: r.from, $lt: r.to } });
const isEvent = (name: string): Expression => ({ $eq: ['$meta.event', name] });
/** Counts the events named `name`. */
const countOf = (name: string): AccumulatorOperator => ({ $sum: { $cond: [isEvent(name), 1, 0] } });
/** Collects visitors who sent an event named `name` (others are left out). */
const visitorsWith = (name: string): AccumulatorOperator => ({ $addToSet: { $cond: [isEvent(name), '$visitor', '$$REMOVE'] } });
const playSeconds: AccumulatorOperator = { $sum: { $cond: [isEvent('play_time'), '$seconds', 0] } };

async function aggregate<T>(pipeline: PipelineStage[]): Promise<T[]> {
  return AnalyticsEvent.aggregate<T>(pipeline).exec();
}

export interface Overview {
  readonly visitors: number;
  readonly sessions: number;
  readonly pageviews: number;
  /** Visitors who started a game. */
  readonly players: number;
  readonly plays: number;
  readonly playSeconds: number;
}

const EMPTY_OVERVIEW: Overview = { visitors: 0, sessions: 0, pageviews: 0, players: 0, plays: 0, playSeconds: 0 };

/** Counts distinct values by grouping on them, so no list of every id is held in one document. */
const distinct = (field: string, match: Record<string, unknown> = {}): PipelineStage.FacetPipelineStage[] => [
  { $match: match },
  { $group: { _id: `$${field}` } },
  { $count: 'n' },
];

interface OverviewFacets {
  readonly visitors: readonly { n: number }[];
  readonly sessions: readonly { n: number }[];
  readonly players: readonly { n: number }[];
  readonly totals: readonly Pick<Overview, 'pageviews' | 'plays' | 'playSeconds'>[];
}

export async function overview(range: Range): Promise<Overview> {
  const [row] = await aggregate<OverviewFacets>([
    { $match: inRange(range) },
    {
      $facet: {
        visitors: distinct('visitor'),
        sessions: distinct('session'),
        players: distinct('visitor', { 'meta.event': 'game_start' }),
        totals: [{ $group: { _id: null, pageviews: countOf('pageview'), plays: countOf('game_start'), playSeconds } }],
      },
    },
  ]);
  if (!row) return EMPTY_OVERVIEW;
  const totals = row.totals[0];
  return {
    visitors: row.visitors[0]?.n ?? 0,
    sessions: row.sessions[0]?.n ?? 0,
    players: row.players[0]?.n ?? 0,
    pageviews: totals?.pageviews ?? 0,
    plays: totals?.plays ?? 0,
    playSeconds: totals?.playSeconds ?? 0,
  };
}

export interface DayStats {
  /** UTC day, YYYY-MM-DD. */
  readonly day: string;
  readonly visitors: number;
  readonly players: number;
}

export async function daily(range: Range): Promise<DayStats[]> {
  return aggregate<DayStats>([
    { $match: inRange(range) },
    { $group: { _id: { $dateToString: { date: '$ts', format: '%Y-%m-%d' } }, visitors: { $addToSet: '$visitor' }, players: visitorsWith('game_start') } },
    { $project: { _id: 0, day: '$_id', visitors: { $size: '$visitors' }, players: { $size: '$players' } } },
    { $sort: { day: 1 } },
  ]);
}

export interface GameStats {
  readonly game: string;
  readonly players: number;
  readonly plays: number;
  readonly playSeconds: number;
}

export async function gameStats(range: Range): Promise<GameStats[]> {
  return aggregate<GameStats>([
    { $match: { ...inRange(range), 'meta.game': { $ne: null } } },
    { $group: { _id: '$meta.game', players: visitorsWith('game_start'), plays: countOf('game_start'), playSeconds } },
    { $project: { _id: 0, game: '$_id', players: { $size: '$players' }, plays: 1, playSeconds: 1 } },
    { $sort: { players: -1, game: 1 } },
  ]);
}

/** One step of a game's level funnel. */
export interface FunnelStep {
  /** 1-based place in the game's level order. */
  readonly n: number;
  readonly level: string;
  readonly name: string | null;
  /** Visitors who got to this level (started it at least once). */
  readonly reached: number;
  /** Visitors who won it at least once. */
  readonly finished: number;
  /** Times it was started, retries included. */
  readonly attempts: number;
  /** Average time of a winning run, or null when nobody won. */
  readonly winSeconds: number | null;
}

/** How many visitors reached, and beat, each level of `game`, in level order. */
export async function levelFunnel(game: string, range: Range): Promise<FunnelStep[]> {
  const won: Expression = { $and: [isEvent('level_end'), { $eq: ['$result', 'win'] }] };
  return aggregate<FunnelStep>([
    { $match: { ...inRange(range), 'meta.game': game, 'meta.event': { $in: ['level_start', 'level_end'] } } },
    { $sort: { ts: 1 } },
    {
      $group: {
        _id: { n: '$n', visitor: '$visitor' }, level: { $last: '$level' }, name: { $last: '$name' },
        won: { $max: { $cond: [won, 1, 0] } }, attempts: countOf('level_start'),
        winSeconds: { $push: { $cond: [won, '$seconds', '$$REMOVE'] } },
      },
    },
    {
      $group: {
        _id: '$_id.n', level: { $last: '$level' }, name: { $last: '$name' }, reached: { $sum: 1 }, finished: { $sum: '$won' },
        attempts: { $sum: '$attempts' }, winSeconds: { $push: '$winSeconds' },
      },
    },
    {
      $project: {
        _id: 0, n: '$_id', level: 1, name: { $ifNull: ['$name', null] }, reached: 1, finished: 1, attempts: 1,
        winSeconds: { $avg: { $reduce: { input: '$winSeconds', initialValue: [], in: { $concatArrays: ['$$value', '$$this'] } } } },
      },
    },
    { $sort: { n: 1 } },
  ]);
}

export type Dimension = 'os' | 'browser' | 'device' | 'country';

export interface Share {
  readonly value: string;
  readonly visitors: number;
}

/** Visitors per OS, browser, device or country, biggest first. */
export async function breakdown(dimension: Dimension, range: Range, limit = 12): Promise<Share[]> {
  return aggregate<Share>([
    { $match: inRange(range) },
    { $group: { _id: { value: { $ifNull: [`$${dimension}`, 'Unknown'] }, visitor: '$visitor' } } },
    { $group: { _id: '$_id.value', visitors: { $sum: 1 } } },
    { $project: { _id: 0, value: '$_id', visitors: 1 } },
    { $sort: { visitors: -1, value: 1 } },
    { $limit: limit },
  ]);
}

export interface SessionSummary {
  readonly session: string;
  readonly start: Date;
  readonly end: Date;
  readonly country: string | null;
  readonly os: string;
  readonly browser: string;
  readonly device: string;
  readonly pageviews: number;
  readonly games: string[];
  /** Levels started, as "game #n", in no particular order. */
  readonly levels: string[];
  readonly playSeconds: number;
}

/** The latest visits, newest first. */
export async function recentSessions(range: Range, limit = 50): Promise<SessionSummary[]> {
  return aggregate<SessionSummary>([
    { $match: inRange(range) },
    {
      $group: {
        _id: '$session', start: { $min: '$ts' }, end: { $max: '$ts' },
        country: { $first: '$country' }, os: { $first: '$os' }, browser: { $first: '$browser' }, device: { $first: '$device' },
        pageviews: countOf('pageview'), games: { $addToSet: '$meta.game' }, playSeconds,
        levels: { $addToSet: { $cond: [isEvent('level_start'), { $concat: ['$meta.game', ' #', { $toString: '$n' }] }, '$$REMOVE'] } },
      },
    },
    { $sort: { start: -1 } },
    { $limit: limit },
    {
      $project: {
        _id: 0, session: '$_id', start: 1, end: 1, country: 1, os: 1, browser: 1, device: 1, pageviews: 1, playSeconds: 1, levels: 1,
        games: { $filter: { input: '$games', cond: { $ne: ['$$this', null] } } },
      },
    },
  ]);
}
