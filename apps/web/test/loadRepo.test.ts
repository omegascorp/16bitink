import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { StoredEvent } from '../src/lib/analytics';
import { connectDb, disconnectDb } from '../src/lib/db/connection';
import { AnalyticsEvent } from '../src/lib/db/eventModel';
import { recordEvents } from '../src/lib/db/eventRepo';
import { gameLoads, loadReport, pageLoads, type PageVisitRow } from '../src/lib/db/loadRepo';

// Integration test: needs a throwaway MongoDB, e.g.
// MONGODB_TEST_URI=mongodb://localhost:27017/16bitink_test pnpm test
const uri = process.env.MONGODB_TEST_URI;
const T0 = Date.parse('2026-11-12T10:00:00Z');
const RANGE = { from: new Date('2026-11-01T00:00:00Z'), to: new Date('2026-11-20T00:00:00Z') };

describe('pageLoads', () => {
  it('splits a page by browser, leaving out browsers with too few visits', () => {
    const rows: PageVisitRow[] = [
      { path: '/', browser: 'Instagram app', loadMs: null, stayMs: 4000 },
      { path: '/', browser: 'Instagram app', loadMs: null, stayMs: 6000 },
      { path: '/', browser: 'Instagram app', loadMs: 5000, stayMs: 20_000 },
      { path: '/', browser: 'Chrome', loadMs: 900, stayMs: 30_000 },
    ];
    const [home] = pageLoads(rows, 10, 2);
    expect(home).toMatchObject({
      path: '/',
      all: { browser: 'all', visits: 4, leftBeforeLoad: 2, leftBeforeLoadPct: 50, medianWaitBeforeLeavingSeconds: 4, medianLoadSeconds: 0.9, slowPct: 50 },
      browsers: [{ browser: 'Instagram app', visits: 3, leftBeforeLoad: 2, medianLoadSeconds: 5, slowPct: 100 }],
    });
  });

  it('splits by device too, under `device`, keeping browsers as before', () => {
    const rows: PageVisitRow[] = [
      { path: '/', browser: 'Chrome iOS', device: 'mobile', loadMs: 4000, stayMs: 9000 },
      { path: '/', browser: 'Chrome', device: 'mobile', loadMs: 2000, stayMs: 9000 },
      { path: '/', browser: 'Chrome', device: 'desktop', loadMs: 500, stayMs: 9000 },
    ];
    const [home] = pageLoads(rows, 10, 2);
    expect(home.browsers.map((b) => b.browser)).toEqual(['Chrome']);
    expect(home.devices).toEqual([expect.objectContaining({ device: 'mobile', visits: 2, medianLoadSeconds: 2 })]);
    expect(home.devices[0]).not.toHaveProperty('browser');
    expect(pageLoads(rows, 10, 1)[0].browsers.map((b) => b.browser).sort()).toEqual(['Chrome', 'Chrome iOS']);
  });

  it('leaves out games nobody tapped', () => {
    expect(gameLoads([{ game: 'inkfish', browser: 'Chrome', tapped: false, ready: false, stalled: false, failed: false, abandoned: false, loadMs: null }], 1)).toEqual([]);
  });
});

let clock = 0;
function ev(session: string, event: StoredEvent['meta']['event'], fields: Partial<StoredEvent> = {}, game: string | null = null): StoredEvent {
  clock += 1000;
  return { ts: new Date(T0 + clock), meta: { event, game }, visitor: `v-${session}`, session, os: 'Android', browser: 'Chrome', device: 'mobile', country: 'IN', ...fields };
}

describe.skipIf(!uri)('loadReport (MongoDB)', () => {
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

  it('times page and game loads, and counts who gave up first', async () => {
    await recordEvents([
      // a: two leave reports for one stay; the page loaded in 1.2 s.
      ev('a', 'page_leave', { path: '/', ms: 3000, scroll: 0, loadMs: 1200 }), ev('a', 'page_leave', { path: '/', ms: 9000, scroll: 0, loadMs: 1200 }),
      // b: in Instagram, left after 5 s before the page loaded.
      ev('b', 'page_leave', { path: '/', ms: 5000, scroll: 0, browser: 'Instagram app' }),
      // c: taps InkFish, it shows after 4 s. d: taps, leaves while it loads. e: taps, it fails.
      ev('c', 'play_tap', { ms: 2000 }, 'inkfish'), ev('c', 'game_ready', { ms: 4000, stage: 'ready' }, 'inkfish'),
      ev('d', 'play_tap', { ms: 1000 }, 'inkfish'), ev('d', 'load_abandon', { ms: 9000, pct: 40 }, 'inkfish'),
      ev('e', 'play_tap', { ms: 1000 }, 'inkfish'), ev('e', 'load_fail', { ms: 3000, stage: 'download', error: 'x' }, 'inkfish'),
    ]);
    const { pages, games } = await loadReport(RANGE, 10, 1);
    expect(pages[0]!.all).toMatchObject({ visits: 2, leftBeforeLoad: 1, medianWaitBeforeLeavingSeconds: 5, medianLoadSeconds: 1.2 });
    expect(games).toEqual([{
      game: 'inkfish',
      all: { browser: 'all', taps: 3, shown: 1, failed: 1, abandoned: 1, stalled: 0, medianLoadSeconds: 4, p90LoadSeconds: 4, slowPct: 0 },
      browsers: [{ browser: 'Chrome', taps: 3, shown: 1, failed: 1, abandoned: 1, stalled: 0, medianLoadSeconds: 4, p90LoadSeconds: 4, slowPct: 0 }],
    }]);
  });
});
