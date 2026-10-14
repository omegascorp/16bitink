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
