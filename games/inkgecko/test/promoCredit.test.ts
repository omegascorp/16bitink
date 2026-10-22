import { describe, expect, it } from 'vitest';
import { CREDIT, creditAt } from '../dev/promo/credit';

describe('promo credit on gameplay shorts', () => {
  it('shows "InkGecko · 16bit.ink" in every frame, inside the clear band', () => {
    expect(CREDIT.text).toBe('InkGecko · 16bit.ink');
    for (let t = 0; t < 13; t += 1 / 30) expect(creditAt(t)).toBeGreaterThan(0.5);
    expect(CREDIT.y).toBeLessThan(1250);
    expect(CREDIT.y - CREDIT.size).toBeGreaterThan(270);
  });
});
