import { describe, expect, it } from 'vitest';
import { buriedFood, FOOD_POINTS, food, itemSize } from '../src/logic/items';

describe('buried food', () => {
  it('keeps worms and hoppers near the top', () => {
    expect(buriedFood(2, 0.1)).toBe('worm');
    expect(buriedFood(3, 0.9)).toBe('hopper');
  });

  it('has mole crabs a little deeper', () => {
    expect(buriedFood(6, 0.1)).toBe('molecrab');
    expect(buriedFood(6, 0.9)).toBe('worm');
  });

  it('keeps clams for the deepest digs', () => {
    expect(buriedFood(10, 0.1)).toBe('clam');
    expect(buriedFood(10, 0.9)).toBe('molecrab');
  });

  it('is worth more the deeper it lives', () => {
    expect(FOOD_POINTS.worm).toBeLessThan(FOOD_POINTS.molecrab);
    expect(FOOD_POINTS.molecrab).toBeLessThan(FOOD_POINTS.clam);
  });

  it('gives every kind a size that fits in one tile', () => {
    for (const k of ['crumb', 'hopper', 'worm', 'molecrab', 'clam'] as const) {
      const { w, h } = itemSize(food(k));
      expect(w).toBeLessThanOrEqual(16);
      expect(h).toBeLessThanOrEqual(16);
    }
  });
});
