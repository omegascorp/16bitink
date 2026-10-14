import { describe, expect, it } from 'vitest';
import { countryName, formatDuration, funnelRows, parsePeriod, rangeFor } from '../src/lib/adminStats';
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
