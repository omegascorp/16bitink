import { describe, expect, it } from 'vitest';
import { countryName, formatDuration, funnelRows, parsePeriod, rangeFor, visitOutcome, type OutcomeInput } from '../src/lib/adminStats';
import type { FunnelStep } from '../src/lib/db/eventRepo';

const step = (n: number, reached: number, finished: number): FunnelStep => ({ n, level: `l${n}`, name: null, reached, finished, attempts: reached, winSeconds: null });

describe('funnelRows', () => {
  it('shows each level as a share of the first level, and of the level before', () => {
    const rows = funnelRows([step(1, 200, 150), step(2, 120, 60), step(3, 30, 30)]);
    expect(rows.map((r) => [r.ofStart, r.fromPrevious, r.winRate])).toEqual([[100, null, 75], [60, 60, 50], [15, 25, 100]]);
  });

  it('skips "from previous" across a gap in the level order', () => {
    expect(funnelRows([step(1, 10, 5), step(3, 4, 0)])[1]?.fromPrevious).toBeNull();
  });

  it('uses the biggest step as the base when level 1 is missing', () => {
    expect(funnelRows([step(2, 8, 0), step(3, 2, 0)]).map((r) => r.ofStart)).toEqual([100, 25]);
  });

  it('is empty for no data', () => {
    expect(funnelRows([])).toEqual([]);
  });
});

describe('formatDuration', () => {
  it.each([[0, '0s'], [44.6, '45s'], [60, '1m'], [200, '3m 20s'], [3600, '1h'], [7500, '2h 5m']])('%s → %s', (s, text) => {
    expect(formatDuration(s)).toBe(text);
  });
});

describe('periods', () => {
  it('accepts only the offered periods, 30 days otherwise', () => {
    expect(parsePeriod('7')).toBe(7);
    expect(parsePeriod('8')).toBe(30);
    expect(parsePeriod(null)).toBe(30);
  });

  it('ends a range now', () => {
    const now = new Date('2026-10-14T12:00:00Z');
    expect(rangeFor(7, now)).toEqual({ from: new Date('2026-10-07T12:00:00Z'), to: now });
  });
});

describe('countryName', () => {
  it('names a country by its code', () => {
    expect(countryName('DE')).toBe('Germany');
    expect(countryName(null)).toBe('Unknown');
    expect(countryName('nope')).toBe('Unknown');
  });
});

describe('visitOutcome', () => {
  const visit = (over: Partial<OutcomeInput> = {}): OutcomeInput => ({
    pageviews: 1, paths: ['/'], games: [], levels: [], tapped: false, failed: false, abandoned: false, ...over,
  });

  it.each<[string, Partial<OutcomeInput>, string]>([
    ['played a level', { games: ['inkfish'], levels: ['inkfish #1'], tapped: true }, 'played'],
    ['got into the game but not a level', { games: ['inkfish'], tapped: true }, 'no level'],
    ['started after a failed first try', { games: ['inkfish'], tapped: true, failed: true }, 'no level'],
    ['hit a loading error', { tapped: true, failed: true, abandoned: true }, 'load failed'],
    ['left while it loaded', { tapped: true, abandoned: true }, 'left loading'],
    ['tapped with no end recorded', { tapped: true }, 'tapped'],
    ['saw the play page and never tapped', { pageviews: 2, paths: ['/', '/play/inkfish'] }, 'no tap'],
    ['left the page it landed on', {}, 'bounced'],
    ['looked around', { pageviews: 3, paths: ['/', '/about', '/games/inkfish'] }, 'browsed'],
  ])('%s', (_label, over, outcome) => {
    expect(visitOutcome(visit(over))).toBe(outcome);
  });
});
