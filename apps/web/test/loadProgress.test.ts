import { describe, expect, it } from 'vitest';
import { DOWNLOAD_SHARE, downloadEstimate, overallProgress } from '../src/lib/client/loadProgress';

describe('downloadEstimate', () => {
  it('starts at 0 and only grows', () => {
    expect(downloadEstimate(0)).toBe(0);
    const samples = [100, 500, 1000, 3000, 10_000, 60_000].map(downloadEstimate);
    samples.reduce((prev, cur) => {
      expect(cur).toBeGreaterThan(prev);
      return cur;
    }, 0);
  });

  it('never reaches the end of the download share: only the real download finishing does', () => {
    expect(downloadEstimate(10 * 60_000)).toBeLessThan(DOWNLOAD_SHARE);
  });

  it('treats a negative elapsed time (clock skew) as zero', () => {
    expect(downloadEstimate(-50)).toBe(0);
  });
});

describe('overallProgress', () => {
  it('uses the estimate while the game is downloading', () => {
    expect(overallProgress({ downloaded: false, elapsedMs: 1500, boot: 0 })).toBe(downloadEstimate(1500));
  });

  it('maps the game boot onto the rest of the bar once downloaded', () => {
    expect(overallProgress({ downloaded: true, elapsedMs: 0, boot: 0 })).toBe(DOWNLOAD_SHARE);
    expect(overallProgress({ downloaded: true, elapsedMs: 0, boot: 0.5 })).toBeCloseTo(DOWNLOAD_SHARE + (1 - DOWNLOAD_SHARE) / 2);
    expect(overallProgress({ downloaded: true, elapsedMs: 0, boot: 1 })).toBe(1);
  });

  it('clamps a game reporting out of range or NaN', () => {
    expect(overallProgress({ downloaded: true, elapsedMs: 0, boot: 3 })).toBe(1);
    expect(overallProgress({ downloaded: true, elapsedMs: 0, boot: -1 })).toBe(DOWNLOAD_SHARE);
    expect(overallProgress({ downloaded: true, elapsedMs: 0, boot: Number.NaN })).toBe(DOWNLOAD_SHARE);
  });
});
