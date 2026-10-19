import { describe, expect, it } from 'vitest';
import { MAX_BATCH_EVENTS, MAX_PLAY_TIME_SECONDS, parseBatch, readBody, toStoredEvents, type Visit } from '../src/lib/analytics';

const VISIT: Visit = { os: 'macOS', browser: 'Safari', device: 'desktop', country: 'DE' };
const NOW = Date.parse('2026-10-14T12:00:00Z');
const isGame = (slug: string): boolean => slug === 'inkfish' || slug === 'inkcrab';

const batch = (events: unknown[], extra: Record<string, unknown> = {}): string =>
  JSON.stringify({ visitor: 'visitor-0001', session: 'session-0001', sentAt: 1_000_000, events, ...extra });

describe('parseBatch', () => {
  it('accepts every event type', () => {
    const parsed = parseBatch(batch([
      { type: 'pageview', at: 1, path: '/games/inkfish', ref: 'www.youtube.com' },
      { type: 'game_start', at: 2, game: 'inkfish' },
      { type: 'play_time', at: 3, game: 'inkfish', seconds: 12.5 },
      { type: 'level_start', at: 4, game: 'inkfish', level: 'c1-l1', n: 1, name: 'Shallows' },
      { type: 'level_end', at: 5, game: 'inkfish', level: 'c1-l1', n: 1, result: 'lose', seconds: 40, score: 120, cause: 'eaten' },
    ], { touch: true }));
    expect(parsed?.events).toHaveLength(5);
    expect(parsed?.touch).toBe(true);
  });

  it.each([
    ['not JSON', '{'],
    ['empty', ''],
    ['no events', batch([])],
    ['an unknown event', batch([{ type: 'purchase', at: 1 }])],
    ['a bad visitor id', batch([{ type: 'game_start', at: 1, game: 'inkfish' }], { visitor: 'x' })],
    ['an id with odd characters', batch([{ type: 'game_start', at: 1, game: 'inkfish' }], { visitor: '$where:1-aaaa' })],
    ['a path that is a URL', batch([{ type: 'pageview', at: 1, path: 'https://evil.example/' }])],
    ['a negative play time', batch([{ type: 'play_time', at: 1, game: 'inkfish', seconds: -1 }])],
    ['a level number of 0', batch([{ type: 'level_start', at: 1, game: 'inkfish', level: 'a', n: 0 }])],
    ['an unknown result', batch([{ type: 'level_end', at: 1, game: 'inkfish', level: 'a', n: 1, result: 'draw', seconds: 1 }])],
    ['a game slug with capitals', batch([{ type: 'game_start', at: 1, game: 'InkFish' }])],
  ])('rejects %s', (_label, raw) => {
    expect(parseBatch(raw)).toBeNull();
  });

  it('keeps the game version on game events', () => {
    const parsed = parseBatch(batch([
      { type: 'game_start', at: 1, game: 'inkcrab', version: '1.2.0' },
      { type: 'play_time', at: 2, game: 'inkcrab', seconds: 5, version: '1.2.0' },
      { type: 'level_start', at: 3, game: 'inkcrab', level: 'b1-1', n: 1, version: '1.2.0-beta.1' },
      { type: 'level_end', at: 4, game: 'inkcrab', level: 'b1-1', n: 1, result: 'win', seconds: 30, version: '1.2.0' },
    ]));
    expect(parsed?.events.map((e) => ('version' in e ? e.version : undefined))).toEqual(['1.2.0', '1.2.0', '1.2.0-beta.1', '1.2.0']);
    const [stored] = toStoredEvents(parsed!, VISIT, NOW, isGame);
    expect(stored?.version).toBe('1.2.0');
  });

  it.each([
    ['too long', '1'.repeat(41)],
    ['with spaces', '1.0 beta'],
    ['with markup', '<b>1</b>'],
  ])('rejects a game version %s', (_label, version) => {
    expect(parseBatch(batch([{ type: 'game_start', at: 1, game: 'inkcrab', version }]))).toBeNull();
  });

  it('rejects oversized batches', () => {
    const events = Array.from({ length: MAX_BATCH_EVENTS + 1 }, (_, i) => ({ type: 'game_start', at: i, game: 'inkfish' }));
    expect(parseBatch(batch(events))).toBeNull();
    expect(parseBatch(' '.repeat(40_000))).toBeNull();
  });

  it('drops only the bad events of a batch', () => {
    const parsed = parseBatch(batch([
      { type: 'game_start', at: 1, game: 'inkfish' },
      { type: 'pageview', at: 2, path: '/', ref: 'x'.repeat(101) },
      { type: 'level_start', at: 3, game: 'inkcrab', level: 'a', n: 0 },
    ]));
    expect(parsed?.events).toEqual([{ type: 'game_start', at: 1, game: 'inkfish' }]);
  });

  it('caps a single play-time report, so one request cannot claim days of play', () => {
    expect(parseBatch(batch([{ type: 'play_time', at: 1, game: 'inkfish', seconds: MAX_PLAY_TIME_SECONDS }]))).not.toBeNull();
    expect(parseBatch(batch([{ type: 'play_time', at: 1, game: 'inkfish', seconds: MAX_PLAY_TIME_SECONDS + 1 }]))).toBeNull();
  });

  it('accepts the loading and page diagnostics', () => {
    const parsed = parseBatch(batch([
      { type: 'page_leave', at: 1, path: '/', ms: 4200, scroll: 35, loadMs: 3100 },
      { type: 'page_leave', at: 2, path: '/play/inkfish', ms: 900, scroll: 100 },
      { type: 'play_tap', at: 3, game: 'inkfish', ms: 5300 },
      { type: 'game_ready', at: 4, game: 'inkfish', ms: 8100, stage: 'ready', version: '1.0.0' },
      { type: 'game_ready', at: 5, game: 'inkcrab', ms: 15000, stage: 'stall' },
      { type: 'load_fail', at: 6, game: 'inkfish', ms: 2000, stage: 'download', error: 'Failed to fetch dynamically imported module' },
      { type: 'load_fail', at: 7, game: 'inkcrab', ms: 2000, stage: 'boot', error: 'WebGL unavailable' },
      { type: 'load_abandon', at: 8, game: 'inkfish', ms: 12000, pct: 41 },
      { type: 'js_error', at: 9, path: '/', error: 'TypeError: x is undefined', source: '/_astro/a.js:1:200' },
    ]));
    expect(parsed?.events).toHaveLength(9);
  });

  it.each([
    ['a scroll over 100%', { type: 'page_leave', at: 1, path: '/', ms: 1, scroll: 101 }],
    ['a negative time on page', { type: 'page_leave', at: 1, path: '/', ms: -1, scroll: 0 }],
    ['a load progress over 100%', { type: 'load_abandon', at: 1, game: 'inkfish', ms: 1, pct: 140 }],
    ['an unknown load stage', { type: 'load_fail', at: 1, game: 'inkfish', ms: 1, stage: 'nap', error: 'x' }],
    ['an empty error', { type: 'js_error', at: 1, path: '/', error: '' }],
    ['an overlong error', { type: 'js_error', at: 1, path: '/', error: 'x'.repeat(201) }],
    ['a ready event with no stage', { type: 'game_ready', at: 1, game: 'inkfish', ms: 1 }],
  ])('rejects %s', (_label, event) => {
    expect(parseBatch(batch([event]))).toBeNull();
  });

  it('accepts a click on a home page game card', () => {
    const parsed = parseBatch(batch([
      { type: 'home_click', at: 1, game: 'inkfish', target: 'cover', slot: 1 },
      { type: 'home_click', at: 2, game: 'inkcrab', target: 'play', slot: 2 },
      { type: 'home_click', at: 3, game: 'inkcrab', target: 'title', slot: 2 },
      { type: 'home_click', at: 4, game: 'inkfish', target: 'about', slot: 1 },
    ]));
    expect(parsed?.events).toHaveLength(4);
  });

  it.each([
    ['an unknown target', { type: 'home_click', at: 1, game: 'inkfish', target: 'banner', slot: 1 }],
    ['no slot', { type: 'home_click', at: 1, game: 'inkfish', target: 'play' }],
    ['a slot of 0', { type: 'home_click', at: 1, game: 'inkfish', target: 'play', slot: 0 }],
    ['a fractional slot', { type: 'home_click', at: 1, game: 'inkfish', target: 'play', slot: 1.5 }],
  ])('rejects a home click with %s', (_label, event) => {
    expect(parseBatch(batch([event]))).toBeNull();
  });

  it('drops unknown fields instead of storing them', () => {
    const parsed = parseBatch(batch([{ type: 'game_start', at: 1, game: 'inkfish', $set: { role: 'admin' } }]));
    expect(parsed?.events[0]).toEqual({ type: 'game_start', at: 1, game: 'inkfish' });
  });
});

describe('readBody', () => {
  const post = (body: BodyInit): Request => new Request('http://localhost/api/events', { method: 'POST', body, duplex: 'half' } as RequestInit);

  it('reads a body within the limit', async () => {
    expect(await readBody(post('{"a":"é"}'), 100)).toBe('{"a":"é"}');
  });

  it('gives up past the limit, counting bytes, even without a content-length', async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(c) {
        for (let i = 0; i < 10; i++) c.enqueue(new Uint8Array(1000));
        c.close();
      },
    });
    expect(await readBody(post(stream), 5000)).toBeNull();
    expect(await readBody(post('é'.repeat(60)), 100)).toBeNull();
  });
});

describe('toStoredEvents', () => {
  it('dates events by the server clock, from how long ago the client says they happened', () => {
    const parsed = parseBatch(batch([{ type: 'game_start', at: 1_000_000 - 3000, game: 'inkfish' }]))!;
    const [e] = toStoredEvents(parsed, VISIT, NOW, isGame);
    expect(e?.ts.toISOString()).toBe('2026-10-14T11:59:57.000Z');
  });

  it('never dates an event in the future or more than an hour back', () => {
    const parsed = parseBatch(batch([
      { type: 'game_start', at: 2_000_000, game: 'inkfish' },
      { type: 'game_start', at: -1e12, game: 'inkfish' },
    ]))!;
    const [ahead, ancient] = toStoredEvents(parsed, VISIT, NOW, isGame);
    expect(ahead?.ts.getTime()).toBe(NOW);
    expect(ancient?.ts.getTime()).toBe(NOW - 60 * 60 * 1000);
  });

  it('stores the event name and game in meta, with the visit and the event fields', () => {
    const parsed = parseBatch(batch([{ type: 'level_end', at: 1_000_000, game: 'inkcrab', level: 'b1-3', n: 3, result: 'win', seconds: 61.2 }]))!;
    expect(toStoredEvents(parsed, VISIT, NOW, isGame)).toEqual([{
      ...VISIT, ts: new Date(NOW), meta: { event: 'level_end', game: 'inkcrab' }, visitor: 'visitor-0001', session: 'session-0001',
      level: 'b1-3', n: 3, result: 'win', seconds: 61.2,
    }]);
  });

  it('stores the load fields, and not a connection type an older page still sends', () => {
    const parsed = parseBatch(batch([
      { type: 'pageview', at: 1_000_000, path: '/' },
      { type: 'load_fail', at: 1_000_000, game: 'inkfish', ms: 900, stage: 'mount', error: 'boom' },
    ], { net: '2g' }))!;
    const stored = toStoredEvents(parsed, VISIT, NOW, isGame);
    expect(stored.every((e) => !('net' in e))).toBe(true);
    expect(stored[1]).toMatchObject({ meta: { event: 'load_fail', game: 'inkfish' }, ms: 900, stage: 'mount', error: 'boom' });
  });

  it('stores which part of which home page card was clicked', () => {
    const parsed = parseBatch(batch([{ type: 'home_click', at: 1_000_000, game: 'inkcrab', target: 'cover', slot: 2 }]))!;
    expect(toStoredEvents(parsed, VISIT, NOW, isGame)[0]).toMatchObject({ meta: { event: 'home_click', game: 'inkcrab' }, target: 'cover', slot: 2 });
  });

  it('keeps page views (no game) and drops events for games that are not playable', () => {
    const parsed = parseBatch(batch([
      { type: 'pageview', at: 1_000_000, path: '/' },
      { type: 'game_start', at: 1_000_000, game: 'inkmine' },
    ]))!;
    const stored = toStoredEvents(parsed, VISIT, NOW, isGame);
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ meta: { event: 'pageview', game: null }, path: '/' });
  });
});
