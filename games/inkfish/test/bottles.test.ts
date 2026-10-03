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

  it('drops bottles within reach of the player, inside the world', () => {
    for (const r of [0, 0.25, 0.5, 0.999]) {
      const x = bottleDropX(1600, 3200, () => r);
      expect(Math.abs(x - 1600)).toBeLessThanOrEqual(900);
      expect(Math.abs(x - 1600)).toBeGreaterThanOrEqual(150);
    }
    for (const playerX of [0, 50, 3150, 3200]) {
      for (const r of [0, 0.5, 0.999]) {
        const x = bottleDropX(playerX, 3200, () => r);
        expect(x).toBeGreaterThanOrEqual(100);
        expect(x).toBeLessThanOrEqual(3100);
      }
    }
  });
});
