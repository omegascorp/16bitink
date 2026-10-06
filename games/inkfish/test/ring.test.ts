import { describe, expect, it } from 'vitest';
import { nearestOnRing, pastView, ringViewWidth, ringWavelength, ringX } from '../src/logic/ring';

const W = 3200;

describe('the sea as a ring', () => {
  it('leaves things within half a ring of the centre where they are', () => {
    expect(nearestOnRing(1000, 1600, W)).toBe(1000);
    expect(nearestOnRing(0, 1600, W)).toBe(0);
    expect(nearestOnRing(3200, 1600, W)).toBe(3200);
  });

  it('brings things from the far side of the ring to the near side', () => {
    expect(nearestOnRing(100, 3100, W)).toBe(3300);
    expect(nearestOnRing(3100, 100, W)).toBe(-100);
    // Any number of laps away.
    expect(nearestOnRing(50, 32050, W)).toBe(32050);
    expect(nearestOnRing(-12750, 400, W)).toBe(50);
  });

  it('folds any position into the first lap', () => {
    expect(ringX(3300, W)).toBe(100);
    expect(ringX(-100, W)).toBe(3100);
    expect(ringX(1600, W)).toBe(1600);
  });

  it('fits waves a whole number of times round the ring, close to the length asked for', () => {
    for (const wave of [47, 70, 110, 280]) {
      const fitted = ringWavelength(wave, W);
      expect(Math.abs(fitted - wave) / wave).toBeLessThan(0.25);
      expect(Math.sin(W / fitted + 0.3)).toBeCloseTo(Math.sin(0.3), 9);
    }
    expect(ringWavelength(1e6, W)).toBeCloseTo(W / (2 * Math.PI), 9);
  });

  it('never lets the view take in so much that the far side shows twice', () => {
    expect(ringViewWidth(W)).toBeLessThan(W * 0.8);
  });

  it('tells when something has gone well past the view, measured round the ring', () => {
    expect(pastView(1700, 1600, 1000, W, 200)).toBe(false);
    expect(pastView(2400, 1600, 1000, W, 200)).toBe(true);
    // 1600 is 400 round the ring from -1200 + 3200 = 2000.
    expect(pastView(-1200, 1600, 1000, W, 200)).toBe(false);
    // A huge margin is capped short of half the ring, or nothing would ever leave.
    expect(pastView(1600 + W / 2 - 10, 1600, 1000, W, 5000)).toBe(true);
  });
});
