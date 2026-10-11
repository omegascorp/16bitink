import { describe, expect, it } from 'vitest';
import { sailAt } from '../src/logic/sailing';

const W = 1000;

describe('sailAt', () => {
  it('drifts at its speed and wraps around the tile', () => {
    const lane = { x: 900, speed: 20 };
    expect(sailAt(lane, 0, W)).toEqual({ x: 900, heading: 1 });
    expect(sailAt(lane, 2, W)).toEqual({ x: 940, heading: 1 });
    expect(sailAt(lane, 10, W).x).toBeCloseTo(100);
  });

  it('sails leftwards with a negative speed, still inside the tile', () => {
    const p = sailAt({ x: 50, speed: -10 }, 10, W);
    expect(p.x).toBeCloseTo(950);
    expect(p.heading).toBe(-1);
  });

  it('turns about at the ends of a range', () => {
    const lane = { x: 100, speed: 10, range: [100, 200] as const };
    expect(sailAt(lane, 5, W)).toEqual({ x: 150, heading: 1 });
    expect(sailAt(lane, 10, W).x).toBeCloseTo(200);
    expect(sailAt(lane, 15, W)).toEqual({ x: 150, heading: -1 });
    expect(sailAt(lane, 20, W).x).toBeCloseTo(100);
    expect(sailAt(lane, 25, W)).toEqual({ x: 150, heading: 1 });
  });

  it('starts a ranged boat heading the way its speed says', () => {
    const p = sailAt({ x: 180, speed: -10, range: [100, 200] as const }, 3, W);
    expect(p).toEqual({ x: 150, heading: -1 });
  });

  it('never leaves its range, however long it sails', () => {
    const lane = { x: 130, speed: 7.3, range: [100, 260] as const };
    for (let t = 0; t < 500; t += 3.7) {
      const { x } = sailAt(lane, t, W);
      expect(x).toBeGreaterThanOrEqual(100 - 1e-9);
      expect(x).toBeLessThanOrEqual(260 + 1e-9);
    }
  });
});
