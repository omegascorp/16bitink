import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { StoredEvent } from '../src/lib/analytics';
import { connectDb, disconnectDb } from '../src/lib/db/connection';
import { AnalyticsEvent } from '../src/lib/db/eventModel';
import { breakdown, daily, gameStats, levelFunnel, overview, recentSessions, recordEvents } from '../src/lib/db/eventRepo';

// Integration test: needs a throwaway MongoDB, e.g.
// MONGODB_TEST_URI=mongodb://localhost:27017/16bitink_test pnpm test
const uri = process.env.MONGODB_TEST_URI;
const T0 = Date.parse('2026-10-10T10:00:00Z');
const RANGE = { from: new Date('2026-10-01T00:00:00Z'), to: new Date('2026-10-14T00:00:00Z') };

let clock = 0;
function ev(visitor: string, event: StoredEvent['meta']['event'], fields: Partial<StoredEvent> = {}, game: string | null = 'inkfish'): StoredEvent {
  clock += 1000;
  return {
    ts: new Date(T0 + clock), meta: { event, game }, visitor, session: `${visitor}-s1`,
    os: 'Windows', browser: 'Chrome', device: 'desktop', country: 'DE', ...fields,
  };
}
const start = (visitor: string, n: number): StoredEvent => ev(visitor, 'level_start', { level: `l${n}`, n, name: `Level ${n}` });
const end = (visitor: string, n: number, result: 'win' | 'lose' | 'quit', seconds = 30): StoredEvent =>
  ev(visitor, 'level_end', { level: `l${n}`, n, name: `Level ${n}`, result, seconds });

describe.skipIf(!uri)('analytics events (MongoDB)', () => {
  beforeAll(async () => {
    await connectDb(uri!);
    await AnalyticsEvent.init();
  });
  beforeEach(async () => {
    clock = 0;
    await AnalyticsEvent.deleteMany({});
  });
  afterAll(async () => {
    await AnalyticsEvent.deleteMany({});
    await disconnectDb();
  });

  it('stores events in a time-series collection', async () => {
    await recordEvents([ev('a', 'game_start')]);
    const [info] = await AnalyticsEvent.db.db!.listCollections({ name: 'events' }).toArray();
    expect(info?.type).toBe('timeseries');
  });

  it('counts how many players reach and beat each level, in level order', async () => {
    await recordEvents([
      // a: level 1 twice (lost, then won), then level 2, won.
      start('a', 1), end('a', 1, 'lose'), start('a', 1), end('a', 1, 'win', 40), start('a', 2), end('a', 2, 'win', 50),
      // b: wins level 1, quits level 2.
      start('b', 1), end('b', 1, 'win', 20), start('b', 2), end('b', 2, 'quit'),
      // c: only tries level 1.
      start('c', 1), end('c', 1, 'lose'),
      // Another game and an out-of-range event don't count.
      ev('d', 'level_start', { level: 'x', n: 1 }, 'inkcrab'),
      { ...start('e', 1), ts: new Date('2026-09-01T00:00:00Z') },
    ]);
    expect(await levelFunnel('inkfish', RANGE)).toEqual([
      { n: 1, level: 'l1', name: 'Level 1', reached: 3, finished: 2, attempts: 4, winSeconds: 30 },
      { n: 2, level: 'l2', name: 'Level 2', reached: 2, finished: 1, attempts: 2, winSeconds: 50 },
    ]);
  });

  it('sums visitors, players and play time', async () => {
    await recordEvents([
      ev('a', 'pageview', { path: '/' }, null), ev('a', 'game_start'), ev('a', 'play_time', { seconds: 100 }), ev('a', 'play_time', { seconds: 20 }),
      ev('b', 'pageview', { path: '/', os: 'iOS', device: 'mobile', country: 'US' }, null),
      ev('c', 'game_start', { os: 'iOS', country: null }, 'inkcrab'),
    ]);
    expect(await overview(RANGE)).toEqual({ visitors: 3, sessions: 3, pageviews: 2, players: 2, plays: 2, playSeconds: 120 });
    expect(await daily(RANGE)).toEqual([{ day: '2026-10-10', visitors: 3, players: 2 }]);
    expect(await gameStats(RANGE)).toEqual([
      { game: 'inkcrab', players: 1, plays: 1, playSeconds: 0 },
      { game: 'inkfish', players: 1, plays: 1, playSeconds: 120 },
    ]);
    expect(await breakdown('os', RANGE)).toEqual([{ value: 'iOS', visitors: 2 }, { value: 'Windows', visitors: 1 }]);
    expect(await breakdown('country', RANGE)).toEqual([{ value: 'DE', visitors: 1 }, { value: 'US', visitors: 1 }, { value: 'Unknown', visitors: 1 }]);
  });

  it('summarises the latest visits, newest first', async () => {
    await recordEvents([ev('a', 'pageview', { path: '/' }, null), ev('a', 'game_start'), start('a', 1), ev('a', 'play_time', { seconds: 30 }), ev('b', 'pageview', { path: '/' }, null)]);
    const [b, a] = await recentSessions(RANGE);
    expect(b).toMatchObject({ session: 'b-s1', pageviews: 1, games: [], levels: [], playSeconds: 0 });
    expect(a).toMatchObject({ session: 'a-s1', pageviews: 1, games: ['inkfish'], levels: ['inkfish #1'], playSeconds: 30, country: 'DE' });
  });
});
