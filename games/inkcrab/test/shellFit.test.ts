import { describe, expect, it } from 'vitest';
import { fitFor, shellFit } from '../src/art/shellFit';

describe('shell fit', () => {
  it('brings every drawing to the same bulk, whatever size it was drawn', () => {
    // A periwinkle drawn small and an Iceland whelk drawn big come out the same bulk.
    const small = fitFor(83, 76) * Math.sqrt(83 * 76);
    const big = fitFor(226, 146) * Math.sqrt(226 * 146);
    expect(small).toBeCloseTo(big, 5);
    expect(fitFor(226, 146)).toBeLessThan(1);
    expect(fitFor(83, 76)).toBeGreaterThan(1);
  });

  it('keeps a slender spire from stretching too long', () => {
    // An auger, long and thin: capped by its length, so it ends up less bulky than a round shell.
    const long = fitFor(164, 60);
    expect(long * 164).toBeLessThanOrEqual(134 + 1e-9);
    expect(long * Math.sqrt(164 * 60)).toBeLessThan(fitFor(90, 90) * 90);
  });

  it('leaves a kind not yet measured at its drawn size', () => {
    expect(shellFit('periwinkle')).toBe(1);
  });
});
