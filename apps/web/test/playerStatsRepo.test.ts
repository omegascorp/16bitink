import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { StoredEvent } from '../src/lib/analytics';
import { connectDb, disconnectDb } from '../src/lib/db/connection';
import { AnalyticsEvent } from '../src/lib/db/eventModel';
import { recordEvents } from '../src/lib/db/eventRepo';
import { playerStats, registeredPlayers } from '../src/lib/db/playerStatsRepo';
import { User } from '../src/lib/db/userModel';
import { VisitorLink } from '../src/lib/db/visitorLinkModel';
import { linkVisitor } from '../src/lib/db/visitorLinkRepo';

// Integration test: needs a throwaway MongoDB, e.g.
// MONGODB_TEST_URI=mongodb://localhost:27017/16bitink_test pnpm test
const uri = process.env.MONGODB_TEST_URI;

// Only this file's records: other DB test files run alongside it.
const OWN_EVENTS = { visitor: /^ps-/ };
const OWN_LINKS = { visitor: /^ps-/ };
const OWN_USERS = { email: /@player-stats\.test$/ };
const ANA = '65f0c0ffee0000000000c001';
const BEN = '65f0c0ffee0000000000c002';
const JOINED = new Date('2026-11-02T00:00:00Z');

let clock = 0;
function ev(visitor: string, event: StoredEvent['meta']['event'], fields: Partial<StoredEvent> = {}, game: string | null = 'inkfish', day = '2026-11-02'): StoredEvent {
  clock += 1000;
  return {
    ts: new Date(Date.parse(`${day}T10:00:00Z`) + clock), meta: { event, game }, visitor, session: `${visitor}-${day}`,
    os: 'iOS', browser: 'Safari', device: 'mobile', country: 'DE', ...fields,
  };
}
const start = (visitor: string, n: number, day?: string): StoredEvent => ev(visitor, 'level_start', { level: `l${n}`, n, name: `Level ${n}` }, 'inkfish', day);
const win = (visitor: string, n: number, day?: string): StoredEvent => ev(visitor, 'level_end', { level: `l${n}`, n, name: `Level ${n}`, result: 'win', seconds: 30 }, 'inkfish', day);

describe.skipIf(!uri)('registered player statistics (MongoDB)', () => {
  beforeAll(async () => {
    await connectDb(uri!);
    await Promise.all([AnalyticsEvent.init(), VisitorLink.syncIndexes(), User.syncIndexes()]);
  });
  beforeEach(async () => {
    clock = 0;
    await Promise.all([AnalyticsEvent.deleteMany(OWN_EVENTS), VisitorLink.deleteMany(OWN_LINKS), User.deleteMany(OWN_USERS)]);
  });
  afterAll(async () => {
    await Promise.all([AnalyticsEvent.deleteMany(OWN_EVENTS), VisitorLink.deleteMany(OWN_LINKS), User.deleteMany(OWN_USERS)]);
    await disconnectDb();
  });

  /** Ana: found us on YouTube on her phone the day before signing up, then played on her laptop too. */
  async function seedAna(): Promise<void> {
    await recordEvents([
      ev('ps-phone', 'pageview', { path: '/games/inkfish', ref: 'www.youtube.com' }, null, '2026-11-01'),
      start('ps-phone', 1, '2026-11-01'), win('ps-phone', 1, '2026-11-01'), start('ps-phone', 2, '2026-11-01'),
      ev('ps-phone', 'play_time', { seconds: 120 }, 'inkfish', '2026-11-01'),
      ev('ps-laptop', 'pageview', { path: '/', os: 'macOS', browser: 'Chrome', device: 'desktop' }, null, '2026-11-03'),
      ev('ps-laptop', 'play_time', { seconds: 300, os: 'macOS', browser: 'Chrome', device: 'desktop' }, 'inkcrab', '2026-11-03'),
      ev('ps-laptop', 'play_time', { seconds: 60, os: 'macOS', browser: 'Chrome', device: 'desktop' }, 'inkcrab', '2026-11-04'),
      // Someone else's browser: never counted for Ana.
      ev('ps-stranger', 'play_time', { seconds: 9000 }, 'inkfish'),
    ]);
    await Promise.all([linkVisitor('ps-phone', ANA, JOINED), linkVisitor('ps-laptop', ANA, new Date('2026-11-03T00:00:00Z'))]);
  }

  it("works out a player's line from every linked browser, including the visit that brought them", async () => {
    await seedAna();
    const stats = await playerStats([{ id: ANA, createdAt: JOINED }, { id: BEN, createdAt: JOINED }]);
    const ana = stats.get(ANA)!;
    expect(ana.firstTouch).toEqual({ at: expect.any(Date), ref: 'www.youtube.com', path: '/games/inkfish' });
    expect(ana.firstTouch!.at.toISOString().slice(0, 10)).toBe('2026-11-01');
    expect(ana.countries).toEqual([{ country: 'DE', sessions: 3 }]);
    expect(ana.devices).toEqual([
      { os: 'macOS', browser: 'Chrome', device: 'desktop', sessions: 2 },
      { os: 'iOS', browser: 'Safari', device: 'mobile', sessions: 1 },
    ]);
    expect(ana.games).toEqual([
      { game: 'inkcrab', reached: null, beaten: null, playSeconds: 360, days: 2 },
      { game: 'inkfish', reached: { n: 2, level: 'l2', name: 'Level 2' }, beaten: { n: 1, level: 'l1', name: 'Level 1' }, playSeconds: 120, days: 1 },
    ]);
    expect(ana.playSeconds).toBe(480);
    expect(ana.lastSeen?.toISOString().slice(0, 10)).toBe('2026-11-04');
    expect(stats.get(BEN)).toMatchObject({ linked: false, games: [], firstTouch: null });
  });

  it('reads events through a { visitor, ts } index', async () => {
    await seedAna();
    await playerStats([{ id: ANA, createdAt: JOINED }]);
    const indexes = await AnalyticsEvent.collection.indexes();
    expect(indexes.some((i) => i.key.visitor === 1 && i.key.ts === 1)).toBe(true);
  });

  it('totals the registered players, admins left out', async () => {
    await seedAna();
    await User.create([
      { _id: ANA, email: 'ana@player-stats.test', name: 'Ana', lastSignInAt: JOINED, role: 'user', playerId: 'ABCD2345', createdAt: JOINED },
      { _id: BEN, email: 'ben@player-stats.test', name: 'Ben', lastSignInAt: JOINED, role: 'user', createdAt: new Date('2026-11-05T00:00:00Z') },
      { email: 'boss@player-stats.test', name: 'Boss', lastSignInAt: JOINED, role: 'admin' },
    ]);
    const { summary, players } = await registeredPlayers({ from: new Date('2026-11-01T00:00:00Z'), to: new Date('2026-11-10T00:00:00Z') });
    const mine = players.filter((p) => p.userId === ANA || p.userId === BEN);
    expect(mine.map((p) => p.userId)).toEqual([BEN, ANA]);
    expect(mine[1]?.playerId).toBe('ABCD2345');
    expect(summary.players).toBeGreaterThanOrEqual(2);
    expect(summary.cameFrom).toContainEqual({ value: 'www.youtube.com', players: 1 });
    expect(summary.games.find((g) => g.game === 'inkcrab')).toMatchObject({ players: 1, avgSeconds: 360 });
  });
});
