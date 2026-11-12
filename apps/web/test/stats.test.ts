import { describe, expect, it } from 'vitest';
import { median, pct, percentile, toSeconds, topCounts } from '../src/lib/stats';

describe('stats', () => {
  it('takes percentiles by nearest rank', () => {
    expect(median([5, 1, 3])).toBe(3);
    expect(median([1, 2, 3, 4])).toBe(2);
    expect(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0.9)).toBe(9);
    expect(median([])).toBeNull();
  });

  it('formats seconds and shares', () => {
    expect(toSeconds(2349)).toBe(2.3);
    expect(toSeconds(null)).toBeNull();
    expect(pct(1, 3)).toBe(33);
    expect(pct(1, 0)).toBeNull();
  });

  it('counts the commonest values first', () => {
    expect(topCounts(['eaten', 'fell', 'eaten', 'time', 'fell', 'eaten'], 2)).toEqual([{ value: 'eaten', count: 3 }, { value: 'fell', count: 2 }]);
  });
});
