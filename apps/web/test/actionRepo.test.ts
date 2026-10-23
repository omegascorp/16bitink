import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { StoredEvent } from '../src/lib/analytics';
import { connectDb, disconnectDb } from '../src/lib/db/connection';
import { AnalyticsEvent } from '../src/lib/db/eventModel';
import { actionStats, appVisitors } from '../src/lib/db/actionRepo';
import { recordEvents } from '../src/lib/db/eventRepo';

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
    os: 'iOS', browser: 'Safari', device: 'mobile', country: 'GB', ...fields,
  };
}

describe.skipIf(!uri)('steps toward a purchase (MongoDB)', () => {
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

  it('counts each step by game, place and sign-in, as times and as distinct visitors', async () => {
    await recordEvents([
      // a sees the free-end offer twice and taps buy signed out; b sees it once.
      ev('a', 'offer_view', { where: 'free_end' }), ev('a', 'offer_view', { where: 'free_end' }), ev('b', 'offer_view', { where: 'free_end' }),
      ev('a', 'buy_click', { where: 'free_end', signedIn: false }),
      // c buys from the game page signed in; checkout opens once and fails once.
      ev('c', 'buy_click', { where: 'page', signedIn: true }, 'inkcrab'),
      ev('c', 'checkout_open', {}, 'inkcrab'), ev('c', 'checkout_fail', { error: 'Network error.' }, 'inkcrab'),
      // Sign-ins, one with no game; an install.
      ev('d', 'signin_click', { where: 'header' }, null), ev('a', 'signin_click', { where: 'save' }),
      ev('e', 'app_install', {}, null),
      // Not a step, and out of range: neither counts.
      ev('a', 'game_start'),
      { ...ev('z', 'buy_click', { where: 'page', signedIn: false }), ts: new Date('2026-09-01T00:00:00Z') },
    ]);
    expect(await actionStats(RANGE)).toEqual([
      { event: 'app_install', game: null, where: null, signedIn: null, error: null, times: 1, visitors: 1 },
      { event: 'buy_click', game: 'inkcrab', where: 'page', signedIn: true, error: null, times: 1, visitors: 1 },
      { event: 'buy_click', game: 'inkfish', where: 'free_end', signedIn: false, error: null, times: 1, visitors: 1 },
      { event: 'checkout_fail', game: 'inkcrab', where: null, signedIn: null, error: 'Network error.', times: 1, visitors: 1 },
      { event: 'checkout_open', game: 'inkcrab', where: null, signedIn: null, error: null, times: 1, visitors: 1 },
      { event: 'offer_view', game: 'inkfish', where: 'free_end', signedIn: null, error: null, times: 3, visitors: 2 },
      { event: 'signin_click', game: null, where: 'header', signedIn: null, error: null, times: 1, visitors: 1 },
      { event: 'signin_click', game: 'inkfish', where: 'save', signedIn: null, error: null, times: 1, visitors: 1 },
    ]);
  });

  it('counts the visitors who opened the site as an installed app', async () => {
    await recordEvents([
      ev('a', 'pageview', { path: '/', app: true }, null), ev('a', 'pageview', { path: '/play/inkfish', app: true }, null),
      ev('b', 'pageview', { path: '/' }, null),
      { ...ev('c', 'pageview', { path: '/', app: true }, null), ts: new Date('2026-09-01T00:00:00Z') },
    ]);
    expect(await appVisitors(RANGE)).toBe(1);
  });

  it('reports nothing for a quiet period', async () => {
    expect(await actionStats(RANGE)).toEqual([]);
    expect(await appVisitors(RANGE)).toBe(0);
  });
});
