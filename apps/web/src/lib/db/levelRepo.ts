import type { Expression, PipelineStage } from 'mongoose';
import { median, pct, percentile, round1, toSeconds, topCounts, type Count } from '../stats';
import { AnalyticsEvent } from './eventModel';
import type { Range } from './eventRepo';

/**
 * How each level of a game plays: how its runs end (won, lost and why, quit,
 * or the tab just closed), how long they take, how often players retry, how
 * long until the first press (players who never press didn't work out the
 * controls), and how phones fare against computers.
 */

/** One player's runs of one level, as the database sums them up. */
export interface PlayerLevelRow {
  readonly n: number;
  readonly level: string;
  readonly name: string | null;
  readonly device: string;
  readonly starts: number;
  readonly wins: number;
  readonly losses: number;
  readonly quits: number;
  readonly causes: readonly string[];
  readonly winSeconds: readonly number[];
  readonly loseSeconds: readonly number[];
  readonly quitSeconds: readonly number[];
  /** Runs whose first press was watched for (`level_start` with `inputs`), and those runs' first presses. */
  readonly trackedStarts: number;
  readonly inputMs: readonly number[];
  /** Where the player last stopped without winning, in the game's words, if it said. */
  readonly lastStop: string | null;
}

export interface DeviceSplit {
  readonly device: string;
  readonly players: number;
  readonly beat: number;
  readonly beatPct: number | null;
}

export interface FirstInput {
  /** Runs started since first presses are recorded. */
  readonly runs: number;
  /** Of those, runs with no press at all before they ended or the tab closed. */
  readonly runsWithoutInput: number;
  /** Players who never pressed anything in any run of this level, and never beat it. */
  readonly playersNeverPressed: number;
  readonly medianSeconds: number | null;
  readonly p90Seconds: number | null;
}

export interface LevelReport {
  readonly n: number;
  readonly name: string | null;
  readonly players: number;
  readonly beat: number;
  readonly beatPct: number | null;
  readonly runs: number;
  readonly wins: number;
  readonly losses: number;
  readonly quits: number;
  /** Runs that never ended: the tab closed or the app was left mid-level. */
  readonly unended: number;
  readonly runsPerPlayer: number | null;
  readonly medianWinSeconds: number | null;
  readonly medianLoseSeconds: number | null;
  readonly medianQuitSeconds: number | null;
  /** Why runs were lost, commonest first. */
  readonly causes: readonly Count[];
  /** Where players who never beat it last stopped, in the game's words. */
  readonly stops: readonly Count[];
  /** Null before first presses were recorded. */
  readonly firstInput: FirstInput | null;
  readonly devices: readonly DeviceSplit[];
}

const TOP = 5;
const flat = <T>(rows: readonly PlayerLevelRow[], pick: (r: PlayerLevelRow) => readonly T[]): T[] => rows.flatMap(pick);

function deviceSplit(rows: readonly PlayerLevelRow[]): DeviceSplit[] {
  const devices = [...new Set(rows.map((r) => r.device))].sort();
  return devices.map((device) => {
    const mine = rows.filter((r) => r.device === device);
    const beat = mine.filter((r) => r.wins > 0).length;
    return { device, players: mine.length, beat, beatPct: pct(beat, mine.length) };
  }).sort((a, b) => b.players - a.players);
}

function firstInput(rows: readonly PlayerLevelRow[]): FirstInput | null {
  const tracked = rows.filter((r) => r.trackedStarts > 0);
  if (tracked.length === 0) return null;
  const runs = tracked.reduce((s, r) => s + r.trackedStarts, 0);
  const pressed = tracked.reduce((s, r) => s + Math.min(r.inputMs.length, r.trackedStarts), 0);
  const ms = flat(tracked, (r) => r.inputMs);
  return {
    runs, runsWithoutInput: runs - pressed,
    playersNeverPressed: tracked.filter((r) => r.inputMs.length === 0 && r.wins === 0).length,
    medianSeconds: toSeconds(median(ms)), p90Seconds: toSeconds(percentile(ms, 0.9)),
  };
}

/** One level's report from its players' rows. */
export function levelReport(rows: readonly PlayerLevelRow[]): LevelReport {
  const first = rows[0]!;
  const sum = (pick: (r: PlayerLevelRow) => number): number => rows.reduce((s, r) => s + pick(r), 0);
  const runs = sum((r) => r.starts);
  const [wins, losses, quits] = [sum((r) => r.wins), sum((r) => r.losses), sum((r) => r.quits)];
  const beat = rows.filter((r) => r.wins > 0).length;
  const stops = rows.flatMap((r) => (r.wins === 0 && r.lastStop ? [r.lastStop] : []));
  return {
    n: first.n, name: rows.map((r) => r.name).find((x) => x) ?? first.level,
    players: rows.length, beat, beatPct: pct(beat, rows.length),
    runs, wins, losses, quits, unended: Math.max(0, runs - wins - losses - quits),
    runsPerPlayer: rows.length > 0 ? round1(runs / rows.length) : null,
    medianWinSeconds: round1(median(flat(rows, (r) => r.winSeconds))),
    medianLoseSeconds: round1(median(flat(rows, (r) => r.loseSeconds))),
    medianQuitSeconds: round1(median(flat(rows, (r) => r.quitSeconds))),
    causes: topCounts(flat(rows, (r) => r.causes), TOP), stops: topCounts(stops, TOP),
    firstInput: firstInput(rows), devices: deviceSplit(rows),
  };
}

/** The reports of every level in `rows`, in level order. */
export function levelReports(rows: readonly PlayerLevelRow[]): LevelReport[] {
  const byLevel = rows.reduce((m, r) => m.set(r.n, [...(m.get(r.n) ?? []), r]), new Map<number, PlayerLevelRow[]>());
  return [...byLevel.keys()].sort((a, b) => a - b).map((n) => levelReport(byLevel.get(n)!));
}

const isEvent = (name: string): Expression => ({ $eq: ['$meta.event', name] });
const ended = (result: string): Expression => ({ $and: [isEvent('level_end'), { $eq: ['$result', result] }] });
const count = (cond: Expression) => ({ $sum: { $cond: [cond, 1, 0] } });
const collect = (cond: Expression, value: string) => ({ $push: { $cond: [cond, value, '$$REMOVE'] } });

/** Each player's runs of each level of `game`, summed up. */
export async function playerLevelRows(game: string, range: Range): Promise<PlayerLevelRow[]> {
  const tracked: Expression = { $and: [isEvent('level_start'), { $eq: ['$inputs', true] }] };
  const unwonNote: Expression = {
    $and: [{ $or: [{ $and: [isEvent('level_end'), { $ne: ['$result', 'win'] }] }, isEvent('level_progress')] }, { $gt: ['$progress', null] }],
  };
  const pipeline: PipelineStage[] = [
    {
      $match: {
        ts: { $gte: range.from, $lt: range.to }, 'meta.game': game,
        'meta.event': { $in: ['level_start', 'level_progress', 'level_end', 'level_input'] },
      },
    },
    { $sort: { ts: 1 } },
    {
      $group: {
        _id: { n: '$n', visitor: '$visitor' }, level: { $last: '$level' }, name: { $last: '$name' }, device: { $first: '$device' },
        starts: count(isEvent('level_start')), wins: count(ended('win')), losses: count(ended('lose')), quits: count(ended('quit')),
        causes: collect({ $and: [ended('lose'), { $gt: ['$cause', null] }] }, '$cause'),
        winSeconds: collect(ended('win'), '$seconds'), loseSeconds: collect(ended('lose'), '$seconds'), quitSeconds: collect(ended('quit'), '$seconds'),
        trackedStarts: count(tracked), inputMs: collect(isEvent('level_input'), '$ms'),
        notes: collect(unwonNote, '$progress'),
      },
    },
    {
      $project: {
        _id: 0, n: '$_id.n', level: 1, name: { $ifNull: ['$name', null] }, device: 1, starts: 1, wins: 1, losses: 1, quits: 1,
        causes: 1, winSeconds: 1, loseSeconds: 1, quitSeconds: 1, trackedStarts: 1, inputMs: 1,
        lastStop: { $ifNull: [{ $arrayElemAt: ['$notes', -1] }, null] },
      },
    },
  ];
  return AnalyticsEvent.aggregate<PlayerLevelRow>(pipeline).exec();
}

/** How every level of `game` plays over `range`. */
export async function levelDetail(game: string, range: Range): Promise<LevelReport[]> {
  return levelReports(await playerLevelRows(game, range));
}
