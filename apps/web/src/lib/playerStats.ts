import type { UserId } from './userId';

/**
 * Registered players' statistics, worked out from the analytics events of
 * the browsers they signed in on (see db/visitorLinkModel.ts). The database
 * side (db/playerStatsRepo.ts) gathers each browser's activity; this file
 * folds it into one line per player, and those lines into totals.
 */

/** A level as the game named it. */
export interface LevelMark {
  readonly n: number;
  readonly level: string;
  readonly name: string | null;
}

/** The first page a player's browsers opened here, and the site that sent them. */
export interface FirstTouch {
  readonly at: Date;
  /** The linking site's host or the short link typed; null when there was none. */
  readonly ref: string | null;
  readonly path: string | null;
}

/** One browser's activity, as the database returns it. Every row names its visitor id. */
export interface VisitorActivity {
  readonly touches: readonly (FirstTouch & { readonly visitor: string })[];
  readonly countries: readonly { readonly visitor: string; readonly country: string | null; readonly sessions: number }[];
  readonly devices: readonly (Device & { readonly visitor: string; readonly sessions: number })[];
  readonly games: readonly {
    readonly visitor: string;
    readonly game: string;
    readonly reached: LevelMark | null;
    readonly beaten: LevelMark | null;
    readonly playSeconds: number;
    /** UTC days with play, YYYY-MM-DD. */
    readonly days: readonly string[];
  }[];
  readonly seen: readonly { readonly visitor: string; readonly last: Date }[];
}

export const NO_ACTIVITY: VisitorActivity = { touches: [], countries: [], devices: [], games: [], seen: [] };

export interface Device {
  readonly os: string;
  readonly browser: string;
  /** desktop, mobile or tablet. */
  readonly device: string;
}

export interface GamePlay {
  readonly game: string;
  /** The furthest level started; null when none was. */
  readonly reached: LevelMark | null;
  /** The furthest level won; null when none was. */
  readonly beaten: LevelMark | null;
  readonly playSeconds: number;
  readonly days: number;
}

export interface PlayerStats {
  readonly userId: UserId;
  readonly joinedAt: Date;
  /** Whether any browser is linked to the account yet. */
  readonly linked: boolean;
  readonly firstTouch: FirstTouch | null;
  /** ISO codes (null: unknown), by visits, commonest first. */
  readonly countries: readonly { readonly country: string | null; readonly sessions: number }[];
  /** By visits, commonest first. */
  readonly devices: readonly (Device & { readonly sessions: number })[];
  /** Most played first. */
  readonly games: readonly GamePlay[];
  readonly playSeconds: number;
  readonly lastSeen: Date | null;
}

export interface PlayerAccount {
  readonly id: UserId;
  readonly createdAt: Date;
}

const furthest = (a: LevelMark | null, b: LevelMark | null): LevelMark | null => (!a ? b : !b || a.n >= b.n ? a : b);
const bySessions = <T extends { readonly sessions: number }>(a: T, b: T): number => b.sessions - a.sessions;

/** Adds up `sessions` per key, commonest first (the first seen on a tie). */
function totals<T extends { readonly sessions: number }>(rows: readonly T[], key: (row: T) => string): T[] {
  const byKey = rows.reduce((acc, row) => {
    const k = key(row);
    const had = acc.get(k);
    return acc.set(k, had ? { ...had, sessions: had.sessions + row.sessions } : row);
  }, new Map<string, T>());
  return [...byKey.values()].sort(bySessions);
}

const withoutVisitor = <T extends { readonly visitor: string }>({ visitor: _visitor, ...rest }: T): Omit<T, 'visitor'> => rest;

function gamesOf(rows: VisitorActivity['games']): GamePlay[] {
  const byGame = rows.reduce((acc, r) => {
    const had = acc.get(r.game);
    const days = new Set([...(had?.days ?? []), ...r.days]);
    return acc.set(r.game, {
      game: r.game,
      reached: furthest(had?.reached ?? null, r.reached),
      beaten: furthest(had?.beaten ?? null, r.beaten),
      playSeconds: (had?.playSeconds ?? 0) + r.playSeconds,
      days,
    });
  }, new Map<string, Omit<GamePlay, 'days'> & { readonly days: ReadonlySet<string> }>());
  return [...byGame.values()]
    .map((g) => ({ ...g, days: g.days.size }))
    .sort((a, b) => b.playSeconds - a.playSeconds || a.game.localeCompare(b.game));
}

/** One player's line, from the activity of the browsers linked to them. */
export function playerStatsFrom(user: PlayerAccount, visitors: readonly string[], activity: VisitorActivity): PlayerStats {
  const mine = new Set(visitors);
  const own = <T extends { readonly visitor: string }>(rows: readonly T[]): T[] => rows.filter((r) => mine.has(r.visitor));
  const touch = own(activity.touches).reduce<(FirstTouch & { readonly visitor: string }) | null>((best, t) => (!best || t.at < best.at ? t : best), null);
  const games = gamesOf(own(activity.games));
  const last = own(activity.seen).reduce<Date | null>((latest, s) => (!latest || s.last > latest ? s.last : latest), null);
  return {
    userId: user.id,
    joinedAt: user.createdAt,
    linked: mine.size > 0,
    firstTouch: touch ? withoutVisitor(touch) : null,
    countries: totals(own(activity.countries), (c) => c.country ?? '').map(withoutVisitor),
    devices: totals(own(activity.devices), (d) => `${d.os}\u0000${d.browser}\u0000${d.device}`).map(withoutVisitor),
    games,
    playSeconds: games.reduce((sum, g) => sum + g.playSeconds, 0),
    lastSeen: last,
  };
}

/** How many players share a value, biggest first. */
export interface Tally {
  /** null: none (no referrer) or unknown (country). */
  readonly value: string | null;
  readonly players: number;
}

export interface GameSummary {
  readonly game: string;
  /** Linked players who played it (started a level or clocked time). */
  readonly players: number;
  /** Share of the linked players, 0–100. */
  readonly share: number;
  /** Over the players who played it. */
  readonly avgSeconds: number;
  readonly medianSeconds: number;
}

export interface PlayerSummary {
  /** Accounts counted. */
  readonly players: number;
  /** Accounts with at least one browser linked. */
  readonly linked: number;
  /** Accounts with none yet: made before linking began, and not back signed in since (or with statistics off). */
  readonly unlinked: number;
  /** The site (or short link) behind each linked player's first visit. */
  readonly cameFrom: readonly Tally[];
  /** Each linked player's commonest country. */
  readonly countries: readonly Tally[];
  /** Each linked player's commonest device type, and operating system. */
  readonly deviceTypes: readonly Tally[];
  readonly systems: readonly Tally[];
  readonly games: readonly GameSummary[];
  /** Linked players who played anything, and their time in all games. */
  readonly total: { readonly players: number; readonly avgSeconds: number; readonly medianSeconds: number };
}

export const average = (values: readonly number[]): number => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0);

/** The middle value (the mean of the two middle ones for an even count); 0 for none. */
export function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/** Players per value, biggest first, then by value (none and unknown last). */
export function tally(values: readonly (string | null)[]): Tally[] {
  const counts = values.reduce((acc, v) => acc.set(v, (acc.get(v) ?? 0) + 1), new Map<string | null, number>());
  return [...counts]
    .map(([value, players]) => ({ value, players }))
    .sort((a, b) => b.players - a.players || (a.value === null ? 1 : b.value === null ? -1 : a.value.localeCompare(b.value)));
}

const played = (g: GamePlay): boolean => g.playSeconds > 0 || g.reached !== null;
const sharePct = (part: number, whole: number): number => (whole > 0 ? Math.round((part / whole) * 100) : 0);

/** Totals over players' lines: where they came from, what they play on, and how much they play each game. */
export function summarizePlayers(stats: readonly PlayerStats[]): PlayerSummary {
  const linked = stats.filter((s) => s.linked);
  const plays = linked.flatMap((s) => s.games.filter(played));
  const gameNames = [...new Set(plays.map((g) => g.game))];
  const games = gameNames
    .map((game) => {
      const seconds = plays.filter((g) => g.game === game).map((g) => g.playSeconds);
      return { game, players: seconds.length, share: sharePct(seconds.length, linked.length), avgSeconds: average(seconds), medianSeconds: median(seconds) };
    })
    .sort((a, b) => b.players - a.players || a.game.localeCompare(b.game));
  const totalSeconds = linked.filter((s) => s.games.some(played)).map((s) => s.playSeconds);
  const top = <T>(rows: readonly T[]): T | undefined => rows[0];
  return {
    players: stats.length,
    linked: linked.length,
    unlinked: stats.length - linked.length,
    cameFrom: tally(linked.flatMap((s) => (s.firstTouch ? [s.firstTouch.ref] : []))),
    countries: tally(linked.flatMap((s) => (s.countries.length ? [top(s.countries)!.country] : []))),
    deviceTypes: tally(linked.flatMap((s) => (s.devices.length ? [top(s.devices)!.device] : []))),
    systems: tally(linked.flatMap((s) => (s.devices.length ? [top(s.devices)!.os] : []))),
    games,
    total: { players: totalSeconds.length, avgSeconds: average(totalSeconds), medianSeconds: median(totalSeconds) },
  };
}
