import { describe, expect, it } from 'vitest';
import { chumSpots } from '../src/logic/chum';
import { createRng } from '../src/logic/rng';

describe('chum school', () => {
  it('lands inside the view of a small fish, so you see it arrive', () => {
    const spots = chumSpots(1000, 900, 240, 130, 8, 50, createRng(7));
    expect(spots).toHaveLength(8);
    for (const s of spots) {
      expect(Math.abs(s.x - 1000)).toBeLessThan(240);
      expect(Math.abs(s.y - 900)).toBeLessThan(130);
    }
  });

  it('spreads out further when the view is wider', () => {
    const reach = (half: number): number =>
      Math.max(...chumSpots(0, 0, half, half * 0.56, 8, 0, createRng(3)).map((s) => Math.hypot(s.x, s.y)));
    expect(reach(900)).toBeGreaterThan(reach(250) * 3);
  });

  it('never lands right on top of you', () => {
    for (const s of chumSpots(0, 0, 60, 40, 8, 90, createRng(1))) expect(Math.hypot(s.x, s.y)).toBeGreaterThanOrEqual(89.999);
  });

  it('comes from all sides', () => {
    const spots = chumSpots(0, 0, 400, 300, 8, 0, createRng(5));
    expect(spots.some((s) => s.x < 0) && spots.some((s) => s.x > 0)).toBe(true);
    expect(spots.some((s) => s.y < 0) && spots.some((s) => s.y > 0)).toBe(true);
  });
});
