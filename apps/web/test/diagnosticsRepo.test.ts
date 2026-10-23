import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { StoredEvent } from '../src/lib/analytics';
import { connectDb, disconnectDb } from '../src/lib/db/connection';
import { entryStats, homeClicks, playFunnel, topErrors } from '../src/lib/db/diagnosticsRepo';
import { AnalyticsEvent } from '../src/lib/db/eventModel';
import { recentSessions, recordEvents } from '../src/lib/db/eventRepo';

// Integration test: needs a throwaway MongoDB, e.g.
// MONGODB_TEST_URI=mongodb://localhost:27017/16bitink_test pnpm test
const uri = process.env.MONGODB_TEST_URI;
const T0 = Date.parse('2026-10-10T10:00:00Z');
const RANGE = { from: new Date('2026-10-01T00:00:00Z'), to: new Date('2026-10-14T00:00:00Z') };

let clock = 0;
function ev(session: string, event: StoredEvent['meta']['event'], fields: Partial<StoredEvent> = {}, game: string | null = null): StoredEvent {
  clock += 1000;
  return {
    ts: new Date(T0 + clock), meta: { event, game }, visitor: `v-${session}`, session,
    os: 'Android', browser: 'Chrome', device: 'mobile', country: 'IN', ...fields,
  };
}
const view = (s: string, path: string, ref?: string): StoredEvent => ev(s, 'pageview', { path, ...(ref ? { ref } : {}) });
const leave = (s: string, path: string, ms: number, loadMs?: number): StoredEvent => ev(s, 'page_leave', { path, ms, scroll: 10, ...(loadMs === undefined ? {} : { loadMs }) });

describe.skipIf(!uri)('loading and page diagnostics (MongoDB)', () => {
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

  it('says where visits start, how long they stay there and where they came from', async () => {
    await recordEvents([
      // a: lands on the home page from YouTube, leaves within seconds, before the covers loaded.
      view('a', '/', 'm.youtube.com'), leave('a', '/', 2500),
      // b: home page, reads for 40 s, goes on to play.
      view('b', '/'), leave('b', '/', 40_000, 1800), view('b', '/play/inkfish'), ev('b', 'game_start', {}, 'inkfish'),
      // c: lands straight on the play page and plays.
      view('c', '/play/inkfish'), ev('c', 'game_start', {}, 'inkfish'),
      // An event outside the range doesn't count.
      { ...view('d', '/'), ts: new Date('2026-09-01T00:00:00Z') },
    ]);
    const { landings, referrers } = await entryStats(RANGE);
    expect(landings).toEqual([
      { path: '/', visits: 2, bounced: 1, started: 1, quick: 1, avgSeconds: 21.25, leftBeforeLoad: 1 },
      { path: '/play/inkfish', visits: 1, bounced: 0, started: 1, quick: 0, avgSeconds: null, leftBeforeLoad: 0 },
    ]);
    expect(referrers).toEqual([
      { ref: null, visits: 2, started: 2 },
      { ref: 'm.youtube.com', visits: 1, started: 0 },
    ]);
  });

  it('counts which home page cards get clicked, where, and whether that game was then played', async () => {
    const click = (s: string, game: string, target: StoredEvent['target'], slot: number): StoredEvent => ev(s, 'home_click', { target, slot }, game);
    await recordEvents([
      // a: home, clicks InkFish's cover, plays it.
      view('a', '/'), click('a', 'inkfish', 'cover', 1), ev('a', 'game_start', {}, 'inkfish'),
      // b: home, reads about InkCrab, then presses its play button but leaves before it starts.
      view('b', '/'), click('b', 'inkcrab', 'about', 2), click('b', 'inkcrab', 'play', 2),
      // c: home twice, clicks nothing.
      view('c', '/'), view('c', '/'),
      // d: never on the home page.
      view('d', '/games/inkmine'),
    ]);
    expect(await homeClicks(RANGE)).toEqual({
      homeVisits: 3,
      clickedVisits: 2,
      cards: [
        { game: 'inkfish', slot: 1, visits: 1, played: 1, cover: 1, title: 0, play: 0, about: 0 },
        { game: 'inkcrab', slot: 2, visits: 1, played: 0, cover: 0, title: 0, play: 1, about: 1 },
      ],
    });
  });

  it('follows each game from its play page to the first level', async () => {
    await recordEvents([
      // a: taps after 5 s, the game is ready 8 s later, plays a level.
      view('a', '/play/inkfish'), ev('a', 'play_tap', { ms: 5000 }, 'inkfish'), ev('a', 'game_start', {}, 'inkfish'),
      ev('a', 'game_ready', { ms: 8000, stage: 'ready' }, 'inkfish'), ev('a', 'level_start', { level: 'l1', n: 1 }, 'inkfish'),
      // b: taps after 1 s, then the download fails, twice.
      view('b', '/play/inkfish'), ev('b', 'play_tap', { ms: 1000 }, 'inkfish'),
      ev('b', 'load_fail', { ms: 3000, stage: 'download', error: 'Failed to fetch' }, 'inkfish'),
      ev('b', 'load_fail', { ms: 3000, stage: 'download', error: 'Failed to fetch' }, 'inkfish'),
      // c: taps, gives up while it loads.
      view('c', '/play/inkfish'), ev('c', 'play_tap', { ms: 3000 }, 'inkfish'), ev('c', 'load_abandon', { ms: 20_000, pct: 40 }, 'inkfish'),
      // f: switched away while it loaded, came back and it showed: not a visit that left.
      view('f', '/play/inkfish'), ev('f', 'play_tap', { ms: 1000 }, 'inkfish'), ev('f', 'load_abandon', { ms: 4000, pct: 30 }, 'inkfish'),
      ev('f', 'game_start', {}, 'inkfish'), ev('f', 'game_ready', { ms: 8000, stage: 'ready' }, 'inkfish'),
      // d: never taps.
      view('d', '/play/inkfish'),
      // e: another game, whose loading screen had to be lifted by the stall timer.
      view('e', '/play/inkcrab'), ev('e', 'play_tap', { ms: 2000 }, 'inkcrab'), ev('e', 'game_start', {}, 'inkcrab'),
      ev('e', 'game_ready', { ms: 15_000, stage: 'stall' }, 'inkcrab'),
    ]);
    expect(await playFunnel(RANGE)).toEqual([
      { game: 'inkfish', views: 5, taps: 4, started: 2, ready: 2, leveled: 1, failed: 1, abandoned: 1, stalled: 0, avgWaitSeconds: 2.5, avgLoadSeconds: 8 },
      { game: 'inkcrab', views: 1, taps: 1, started: 1, ready: 1, leveled: 0, failed: 0, abandoned: 0, stalled: 1, avgWaitSeconds: 2, avgLoadSeconds: null },
    ]);
  });

  it('lists the errors players hit, most frequent first', async () => {
    await recordEvents([
      ev('a', 'load_fail', { ms: 1, stage: 'boot', error: 'WebGL unavailable' }, 'inkfish'),
      ev('b', 'load_fail', { ms: 1, stage: 'boot', error: 'WebGL unavailable', os: 'iOS', browser: 'Safari' }, 'inkfish'),
      ev('b', 'load_fail', { ms: 1, stage: 'boot', error: 'WebGL unavailable', os: 'iOS', browser: 'Safari' }, 'inkfish'),
      ev('c', 'js_error', { path: '/', error: 'TypeError: x is undefined', source: '/_astro/a.js:1:2' }),
      // An in-app browser's own scripts: left out.
      ev('d', 'js_error', { path: '/', error: 'Uncaught Error: Error invoking postMessage: Java object is gone', source: 'navigation_performance_logger_android' }),
      ev('d', 'js_error', { path: '/', error: 'Script error.' }),
    ]);
    const errors = await topErrors(RANGE);
    expect(errors.map(({ last: _last, ...e }) => ({ ...e, agents: [...e.agents].sort() }))).toEqual([
      { kind: 'load_fail', error: 'WebGL unavailable', where: 'inkfish · boot', count: 3, visits: 2, agents: ['Android · Chrome', 'iOS · Safari'] },
      { kind: 'js_error', error: 'TypeError: x is undefined', where: '/_astro/a.js:1:2', count: 1, visits: 1, agents: ['Android · Chrome'] },
    ]);
    expect(errors[0]?.last).toBeInstanceOf(Date);
  });

  it('adds the landing page, referrer and loading outcome to each visit', async () => {
    await recordEvents([
      view('a', '/', 'www.youtube.com'), leave('a', '/', 6000), view('a', '/play/inkfish'),
      ev('a', 'play_tap', { ms: 900 }, 'inkfish'), ev('a', 'load_abandon', { ms: 9000, pct: 20 }, 'inkfish'),
      view('b', '/games/inkcrab'),
    ]);
    const [b, a] = await recentSessions(RANGE);
    expect(a).toMatchObject({ landing: '/', ref: 'www.youtube.com', landingSeconds: 6, tapped: true, failed: false, abandoned: true });
    expect(b).toMatchObject({ landing: '/games/inkcrab', ref: null, landingSeconds: null, tapped: false, failed: false, abandoned: false });
  });
});
