import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { StoredEvent } from '../src/lib/analytics';
import { connectDb, disconnectDb } from '../src/lib/db/connection';
import { AnalyticsEvent } from '../src/lib/db/eventModel';
import { recordEvents } from '../src/lib/db/eventRepo';
import { levelDetail, levelReports, type PlayerLevelRow } from '../src/lib/db/levelRepo';

// Integration test: needs a throwaway MongoDB, e.g.
// MONGODB_TEST_URI=mongodb://localhost:27017/16bitink_test pnpm test
const uri = process.env.MONGODB_TEST_URI;
const T0 = Date.parse('2026-11-12T10:00:00Z');
const RANGE = { from: new Date('2026-11-01T00:00:00Z'), to: new Date('2026-11-20T00:00:00Z') };

const row = (over: Partial<PlayerLevelRow>): PlayerLevelRow => ({
  n: 1, level: 'a', name: 'First', device: 'mobile', starts: 1, wins: 0, losses: 0, quits: 0, causes: [],
  winSeconds: [], loseSeconds: [], quitSeconds: [], trackedStarts: 0, inputMs: [], lastStop: null, ...over,
});

describe('levelReports', () => {
  it('sums up how runs end, why they were lost, and phones against computers', () => {
    const [level] = levelReports([
      row({ starts: 3, wins: 1, losses: 2, causes: ['eaten', 'eaten'], winSeconds: [40], loseSeconds: [10, 20] }),
      row({ device: 'desktop', starts: 2, losses: 1, causes: ['fell'], loseSeconds: [30], lastStop: 'size 2/4' }),
    ]);
    expect(level).toMatchObject({
      n: 1, name: 'First', players: 2, beat: 1, beatPct: 50, runs: 5, wins: 1, losses: 3, quits: 0, unended: 1, runsPerPlayer: 2.5,
      medianWinSeconds: 40, medianLoseSeconds: 20, causes: [{ value: 'eaten', count: 2 }, { value: 'fell', count: 1 }],
      stops: [{ value: 'size 2/4', count: 1 }], firstInput: null,
      devices: [{ device: 'desktop', players: 1, beat: 0, beatPct: 0 }, { device: 'mobile', players: 1, beat: 1, beatPct: 100 }],
    });
  });

  it('counts runs with no press, and players who never pressed and never won', () => {
    const [level] = levelReports([
      row({ trackedStarts: 2, inputMs: [1500] }),
      row({ trackedStarts: 1, inputMs: [] }),
      row({ trackedStarts: 1, inputMs: [], wins: 1 }),
      row({ trackedStarts: 0 }),
    ]);
    expect(level!.firstInput).toEqual({ runs: 4, runsWithoutInput: 3, playersNeverPressed: 1, medianSeconds: 1.5, p90Seconds: 1.5 });
  });
});

let clock = 0;
function ev(visitor: string, event: StoredEvent['meta']['event'], fields: Partial<StoredEvent> = {}): StoredEvent {
  clock += 1000;
  return {
    ts: new Date(T0 + clock), meta: { event, game: 'inkgecko' }, visitor, session: `s-${visitor}`,
    os: 'iOS', browser: 'Safari', device: 'mobile', country: 'US', level: 'first-pebbles', n: 1, name: 'First Pebbles', ...fields,
  };
}

describe.skipIf(!uri)('levelDetail (MongoDB)', () => {
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

  it("reports each level's runs, causes and first presses", async () => {
    await recordEvents([
      // a: a run from before first presses were watched for, lost; then a run that presses and wins.
      { ...ev('a', 'level_start'), ts: new Date('2026-11-05T00:00:00Z') },
      { ...ev('a', 'level_end', { result: 'lose', seconds: 12, cause: 'eaten' }), ts: new Date('2026-11-05T00:01:00Z') },
      ev('a', 'level_start', { inputs: true }), ev('a', 'level_input', { ms: 2000, input: 'touch' }), ev('a', 'level_end', { result: 'win', seconds: 50 }),
      // b: starts, never presses, closes the tab.
      ev('b', 'level_start', { inputs: true }),
      // c (desktop): presses, quits with a progress note.
      ev('c', 'level_start', { device: 'desktop', inputs: true }), ev('c', 'level_input', { ms: 4000, input: 'mouse', device: 'desktop' }),
      ev('c', 'level_end', { result: 'quit', seconds: 30, progress: 'pebbles 3/10', device: 'desktop' }),
      // Another game doesn't count.
      { ...ev('d', 'level_start'), meta: { event: 'level_start', game: 'inkfish' } },
    ]);
    const [level] = await levelDetail('inkgecko', RANGE);
    expect(level).toMatchObject({
      n: 1, name: 'First Pebbles', players: 3, beat: 1, runs: 4, wins: 1, losses: 1, quits: 1, unended: 1,
      causes: [{ value: 'eaten', count: 1 }], stops: [{ value: 'pebbles 3/10', count: 1 }],
      firstInput: { runs: 3, runsWithoutInput: 1, playersNeverPressed: 1, medianSeconds: 2, p90Seconds: 4 },
      devices: [{ device: 'mobile', players: 2, beat: 1, beatPct: 50 }, { device: 'desktop', players: 1, beat: 0, beatPct: 0 }],
    });
  });
});
