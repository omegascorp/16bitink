import { describe, expect, it } from 'vitest';
import { creditAt } from '../dev/promo/credit';

describe('promo credit on narrated shorts', () => {
  for (const loop of [16.5, 18, 19.5]) {
    it(`stays out of the hook and the loop seam (${loop}s loop)`, () => {
      for (let t = 0; t < 0.4 * loop; t += 1 / 30) expect(creditAt(t, loop)).toBe(0);
      expect(creditAt(loop - 0.6, loop)).toBe(0);
      expect(creditAt(loop - 1e-6, loop)).toBe(0);
    });

    it(`shows after the payoff (${loop}s loop)`, () => {
      expect(creditAt(0.6 * loop, loop)).toBeGreaterThan(0.7);
    });
  }
});
