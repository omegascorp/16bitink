import { describe, expect, it } from 'vitest';
import { bottleDropX, bottlesToDrop, MAX_SINKING } from '../src/logic/bottles';

describe('ink bottles', () => {
  it('keeps a couple of bottles sinking until enough are caught', () => {
    expect(bottlesToDrop(10, 0, 0)).toBe(MAX_SINKING);
    expect(bottlesToDrop(10, 0, MAX_SINKING)).toBe(0);
    expect(bottlesToDrop(10, 4, 1)).toBe(MAX_SINKING - 1);
  });

  it('never drops more than are still needed, and none once the job is done', () => {
    expect(bottlesToDrop(10, 9, 0)).toBe(1);
    expect(bottlesToDrop(10, 9, 1)).toBe(0);
    expect(bottlesToDrop(10, 10, 0)).toBe(0);
    expect(bottlesToDrop(10, 12, 0)).toBe(0);
  });

  it('drops bottles within reach of the player, on either side', () => {
    for (const playerX of [1600, 0, 3200, -9000, 25000]) {
      for (const r of [0, 0.25, 0.5, 0.999]) {
        const x = bottleDropX(playerX, () => r);
        expect(Math.abs(x - playerX)).toBeLessThanOrEqual(900);
        expect(Math.abs(x - playerX)).toBeGreaterThanOrEqual(150);
      }
    }
  });
});
