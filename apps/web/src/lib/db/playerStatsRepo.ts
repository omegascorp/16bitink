import type { Expression, PipelineStage } from 'mongoose';
import { NO_ACTIVITY, playerStatsFrom, summarizePlayers, type PlayerAccount, type PlayerStats, type PlayerSummary, type VisitorActivity } from '../playerStats';
import type { UserId } from '../userId';
import { AnalyticsEvent } from './eventModel';
import type { Range } from './eventRepo';
import { listPlayerAccounts } from './userRepo';
import { visitorsOf } from './visitorLinkRepo';

/**
 * Registered players' statistics: each account's linked browsers
 * (visitorlinks), then all their events, all time. Only the browsers asked
 * about are read, through the events' { visitor, ts } index.
 */

/** Accounts looked up per query when totalling everyone, so the visitor list stays short. */
const CHUNK = 100;
const VISITOR_INDEX = { visitor: 1, ts: 1 } as const;

let indexed: Promise<void> | null = null;

/**
 * Adds the events' secondary index on { visitor, ts }, once per server start.
 * Not declared on the schema on purpose: a failed index build there would
 * fail every event insert; here it only costs these reports speed, and is logged.
 */
function ensureVisitorIndex(): Promise<void> {
  indexed ??= AnalyticsEvent.init()
    .then(() => AnalyticsEvent.collection.createIndex(VISITOR_INDEX, { name: 'visitor_ts' }))
    .then(() => undefined)
    .catch((err: unknown) => {
      indexed = null;
      console.error('[player stats] could not add the { visitor, ts } index to events', err);
    });
  return indexed;
}

const isEvent = (name: string): Expression => ({ $eq: ['$meta.event', name] });
const mark: Expression = { n: '$n', level: '$level', name: { $ifNull: ['$name', null] } };
const won: Expression = { $and: [isEvent('level_end'), { $eq: ['$result', 'win'] }] };

/** Visits per visitor and value(s) of `fields` (each field one group key). */
const visitsBy = (fields: readonly string[]): PipelineStage.FacetPipelineStage[] => {
  const keys = Object.fromEntries(fields.map((f) => [f, `$${f}`]));
  return [
    { $group: { _id: { visitor: '$visitor', session: '$session', ...keys } } },
    { $group: { _id: { visitor: '$_id.visitor', ...Object.fromEntries(fields.map((f) => [f, `$_id.${f}`])) }, sessions: { $sum: 1 } } },
    { $project: { _id: 0, visitor: '$_id.visitor', sessions: 1, ...Object.fromEntries(fields.map((f) => [f, { $ifNull: [`$_id.${f}`, null] }])) } },
  ];
};

/** Everything these browsers did, grouped per browser. */
async function activityOf(visitors: readonly string[]): Promise<VisitorActivity> {
  if (visitors.length === 0) return NO_ACTIVITY;
  await ensureVisitorIndex();
  const [row] = await AnalyticsEvent.aggregate<VisitorActivity>([
    { $match: { visitor: { $in: visitors } } },
    {
      $facet: {
        touches: [
          { $match: { 'meta.event': 'pageview' } },
          { $sort: { ts: 1 } },
          { $group: { _id: '$visitor', at: { $first: '$ts' }, ref: { $first: '$ref' }, path: { $first: '$path' } } },
          { $project: { _id: 0, visitor: '$_id', at: 1, ref: { $ifNull: ['$ref', null] }, path: { $ifNull: ['$path', null] } } },
        ],
        countries: visitsBy(['country']),
        devices: visitsBy(['os', 'browser', 'device']),
        games: [
          { $match: { 'meta.game': { $ne: null }, 'meta.event': { $in: ['game_start', 'play_time', 'level_start', 'level_end'] } } },
          {
            $group: {
              _id: { visitor: '$visitor', game: '$meta.game' },
              // Objects compare field by field, so the biggest is the one with the highest level number.
              reached: { $max: { $cond: [isEvent('level_start'), mark, null] } },
              beaten: { $max: { $cond: [won, mark, null] } },
              playSeconds: { $sum: { $cond: [isEvent('play_time'), '$seconds', 0] } },
              days: { $addToSet: { $dateToString: { date: '$ts', format: '%Y-%m-%d' } } },
            },
          },
          { $project: { _id: 0, visitor: '$_id.visitor', game: '$_id.game', reached: 1, beaten: 1, playSeconds: 1, days: 1 } },
        ],
        seen: [{ $group: { _id: '$visitor', last: { $max: '$ts' } } }, { $project: { _id: 0, visitor: '$_id', last: 1 } }],
      },
    },
  ]).exec();
  return row ?? NO_ACTIVITY;
}

/** Each account's line of statistics, keyed by user id. Meant for a page of accounts at a time. */
export async function playerStats(accounts: readonly PlayerAccount[]): Promise<ReadonlyMap<UserId, PlayerStats>> {
  const links = await visitorsOf(accounts.map((a) => a.id));
  const activity = await activityOf([...links.values()].flat());
  return new Map(accounts.map((a) => [a.id, playerStatsFrom(a, links.get(a.id) ?? [], activity)]));
}

export interface RegisteredPlayers {
  readonly summary: PlayerSummary;
  /** Newest account first, with its public player id when it has one. */
  readonly players: readonly (PlayerStats & { readonly playerId?: string })[];
}

/** Every registered player who isn't an admin (only those who joined in `joined`, when given), and their totals. */
export async function registeredPlayers(joined?: Range): Promise<RegisteredPlayers> {
  const accounts = await listPlayerAccounts(joined);
  const chunks = Array.from({ length: Math.ceil(accounts.length / CHUNK) }, (_, i) => accounts.slice(i * CHUNK, (i + 1) * CHUNK));
  const stats = new Map((await Promise.all(chunks.map(playerStats))).flatMap((m) => [...m]));
  const players = accounts.flatMap((a) => {
    const s = stats.get(a.id);
    return s ? [{ ...s, ...(a.playerId ? { playerId: a.playerId } : {}) }] : [];
  });
  return { summary: summarizePlayers(players), players };
}
