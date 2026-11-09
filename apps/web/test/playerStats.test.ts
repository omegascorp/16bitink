import { describe, expect, it } from 'vitest';
import { average, median, NO_ACTIVITY, playerStatsFrom, summarizePlayers, tally, type PlayerStats, type VisitorActivity } from '../src/lib/playerStats';

const JOINED = new Date('2026-11-01T00:00:00Z');
const at = (iso: string): Date => new Date(iso);
const l = (n: number, name: string | null = `Level ${n}`) => ({ n, level: `l${n}`, name });

/** A phone and a laptop, both linked to one player, and a stranger's browser. */
const ACTIVITY: VisitorActivity = {
  touches: [
    { visitor: 'laptop', at: at('2026-11-02T10:00:00Z'), ref: null, path: '/' },
    { visitor: 'phone', at: at('2026-10-30T09:00:00Z'), ref: 'www.youtube.com', path: '/games/inkfish' },
    { visitor: 'stranger', at: at('2026-10-01T00:00:00Z'), ref: 'evil.example', path: '/' },
  ],
  countries: [
    { visitor: 'phone', country: 'DE', sessions: 2 },
    { visitor: 'laptop', country: 'FR', sessions: 1 },
    { visitor: 'laptop', country: 'DE', sessions: 2 },
    { visitor: 'stranger', country: 'US', sessions: 50 },
  ],
  devices: [
    { visitor: 'phone', os: 'iOS', browser: 'Safari', device: 'mobile', sessions: 2 },
    { visitor: 'laptop', os: 'macOS', browser: 'Chrome', device: 'desktop', sessions: 3 },
  ],
  games: [
    { visitor: 'phone', game: 'inkfish', reached: l(4), beaten: l(3), playSeconds: 300, days: ['2026-10-30', '2026-11-02'] },
    { visitor: 'laptop', game: 'inkfish', reached: l(6, null), beaten: l(2), playSeconds: 600, days: ['2026-11-02', '2026-11-03'] },
    { visitor: 'laptop', game: 'inkcrab', reached: null, beaten: null, playSeconds: 1200, days: ['2026-11-03'] },
    { visitor: 'stranger', game: 'inkmine', reached: l(9), beaten: l(9), playSeconds: 9999, days: ['2026-10-01'] },
  ],
  seen: [
    { visitor: 'phone', last: at('2026-11-02T12:00:00Z') },
    { visitor: 'laptop', last: at('2026-11-04T08:00:00Z') },
    { visitor: 'stranger', last: at('2026-11-09T00:00:00Z') },
  ],
};

describe('playerStatsFrom', () => {
  const stats = playerStatsFrom({ id: 'u1', createdAt: JOINED }, ['phone', 'laptop'], ACTIVITY);

  it("starts from the earliest page any of the player's browsers opened, before they signed up too", () => {
    expect(stats.firstTouch).toEqual({ at: at('2026-10-30T09:00:00Z'), ref: 'www.youtube.com', path: '/games/inkfish' });
  });

  it('adds up countries and devices across browsers, commonest first', () => {
    expect(stats.countries).toEqual([{ country: 'DE', sessions: 4 }, { country: 'FR', sessions: 1 }]);
    expect(stats.devices).toEqual([
      { os: 'macOS', browser: 'Chrome', device: 'desktop', sessions: 3 },
      { os: 'iOS', browser: 'Safari', device: 'mobile', sessions: 2 },
    ]);
  });

  it('keeps the furthest level reached and beaten per game, and adds up time and distinct days', () => {
    expect(stats.games).toEqual([
      { game: 'inkcrab', reached: null, beaten: null, playSeconds: 1200, days: 1 },
      { game: 'inkfish', reached: l(6, null), beaten: l(3), playSeconds: 900, days: 3 },
    ]);
    expect(stats.playSeconds).toBe(2100);
    expect(stats.lastSeen).toEqual(at('2026-11-04T08:00:00Z'));
    expect(stats).toMatchObject({ userId: 'u1', joinedAt: JOINED, linked: true });
  });

  it('leaves out browsers that are not linked to the player', () => {
    expect(stats.games.map((g) => g.game)).not.toContain('inkmine');
    expect(stats.countries.map((c) => c.country)).not.toContain('US');
  });

  it('shows a player with no linked browser as having no data', () => {
    expect(playerStatsFrom({ id: 'u2', createdAt: JOINED }, [], ACTIVITY)).toEqual({
      userId: 'u2', joinedAt: JOINED, linked: false, firstTouch: null, countries: [], devices: [], games: [], playSeconds: 0, lastSeen: null,
    });
    expect(playerStatsFrom({ id: 'u3', createdAt: JOINED }, ['new-browser'], NO_ACTIVITY)).toMatchObject({ linked: true, games: [], lastSeen: null });
  });
});

describe('median, average and tally', () => {
  it('finds the middle value', () => {
    expect(median([])).toBe(0);
    expect(median([5])).toBe(5);
    expect(median([9, 1, 5])).toBe(5);
    expect(median([1, 2, 10, 20])).toBe(6);
  });

  it('averages, with 0 for none', () => {
    expect(average([])).toBe(0);
    expect(average([1, 2, 6])).toBe(3);
  });

  it('counts players per value, biggest first, none and unknown last on a tie', () => {
    expect(tally(['b', null, 'a', 'b', 'a', 'c'])).toEqual([
      { value: 'a', players: 2 }, { value: 'b', players: 2 }, { value: 'c', players: 1 }, { value: null, players: 1 },
    ]);
    expect(tally([])).toEqual([]);
  });
});

describe('summarizePlayers', () => {
  const player = (id: string, over: Partial<PlayerStats>): PlayerStats => ({
    userId: id, joinedAt: JOINED, linked: true, firstTouch: null, countries: [], devices: [], games: [], playSeconds: 0, lastSeen: null, ...over,
  });
  const fish = (playSeconds: number) => ({ game: 'inkfish', reached: l(1), beaten: null, playSeconds, days: 1 });
  const summary = summarizePlayers([
    player('a', {
      firstTouch: { at: JOINED, ref: 'www.youtube.com', path: '/' },
      countries: [{ country: 'DE', sessions: 3 }, { country: 'FR', sessions: 1 }],
      devices: [{ os: 'iOS', browser: 'Safari', device: 'mobile', sessions: 2 }],
      games: [fish(600), { game: 'inkcrab', reached: null, beaten: null, playSeconds: 100, days: 1 }], playSeconds: 700,
    }),
    player('b', {
      firstTouch: { at: JOINED, ref: null, path: '/' },
      countries: [{ country: null, sessions: 1 }],
      devices: [{ os: 'Windows', browser: 'Chrome', device: 'desktop', sessions: 1 }],
      games: [fish(200)], playSeconds: 200,
    }),
    // Linked, but never played: counts toward shares, not toward play time.
    player('c', { firstTouch: { at: JOINED, ref: 'www.youtube.com', path: '/' }, devices: [{ os: 'iOS', browser: 'Safari', device: 'mobile', sessions: 1 }] }),
    player('d', { linked: false }),
  ]);

  it('counts accounts with and without statistics', () => {
    expect(summary).toMatchObject({ players: 4, linked: 3, unlinked: 1 });
  });

  it("tallies first-visit sources and each player's commonest country, device and OS", () => {
    expect(summary.cameFrom).toEqual([{ value: 'www.youtube.com', players: 2 }, { value: null, players: 1 }]);
    expect(summary.countries).toEqual([{ value: 'DE', players: 1 }, { value: null, players: 1 }]);
    expect(summary.deviceTypes).toEqual([{ value: 'mobile', players: 2 }, { value: 'desktop', players: 1 }]);
    expect(summary.systems).toEqual([{ value: 'iOS', players: 2 }, { value: 'Windows', players: 1 }]);
  });

  it("gives each game's share of linked players, and its players' average and median time", () => {
    expect(summary.games).toEqual([
      { game: 'inkfish', players: 2, share: 67, avgSeconds: 400, medianSeconds: 400 },
      { game: 'inkcrab', players: 1, share: 33, avgSeconds: 100, medianSeconds: 100 },
    ]);
    expect(summary.total).toEqual({ players: 2, avgSeconds: 450, medianSeconds: 450 });
  });

  it('is empty for no players', () => {
    expect(summarizePlayers([])).toEqual({
      players: 0, linked: 0, unlinked: 0, cameFrom: [], countries: [], deviceTypes: [], systems: [], games: [],
      total: { players: 0, avgSeconds: 0, medianSeconds: 0 },
    });
  });
});
