import { describe, expect, it } from 'vitest';
import { feed, initialGrowth, isCapped, MAX_SIZE, meterGoal, type Growth } from '../src/logic/growth';

const g = (size: number, meter = 0): Growth => ({ size, meter });

describe('growth', () => {
  it('starts tiny and empty', () => {
    expect(initialGrowth()).toEqual(g(1));
  });

  it('needs more food for each size', () => {
    expect(meterGoal(2)).toBeGreaterThan(meterGoal(1));
  });

  it('grows quickly at first and slower as it gets big', () => {
    expect(meterGoal(1)).toBe(7);
    expect(meterGoal(7)).toBe(40);
    // Each size costs more than the last, by more each time.
    for (let s = 2; s < 7; s++) expect(meterGoal(s + 1) - meterGoal(s)).toBeGreaterThan(meterGoal(s) - meterGoal(s - 1));
  });

  it('fills the meter and grows while the shell has room', () => {
    const r = feed(g(1), meterGoal(1) + 1, 3);
    expect(r.growth).toEqual(g(2, 1));
    expect(r.grew).toBe(1);
    expect(r.wasted).toBe(0);
  });

  it('stops growing once it fills its shell: the rest is wasted', () => {
    const r = feed(g(1), meterGoal(1) + 4, 2);
    expect(r.growth).toEqual(g(2, 0));
    expect(r.grew).toBe(1);
    expect(r.wasted).toBe(4);
    expect(isCapped(r.growth, 2)).toBe(true);
  });

  it('is capped as soon as it is as big as its shell, and not before', () => {
    expect(isCapped(g(2), 2)).toBe(true);
    expect(isCapped(g(1, meterGoal(1) - 1), 2)).toBe(false);
  });

  it('eats nothing into growth while capped, and nothing is kept for later', () => {
    expect(feed(g(2), 5, 2)).toEqual({ growth: g(2), grew: 0, wasted: 5 });
  });

  it('grows on from where it was in a bigger shell, a meal at a time', () => {
    expect(feed(g(2), meterGoal(2) - 1, 3).growth).toEqual(g(2, meterGoal(2) - 1));
    expect(feed(g(2), meterGoal(2), 3).growth).toEqual(g(3, 0));
  });

  it('never grows past the largest body size', () => {
    const r = feed(g(MAX_SIZE - 1), 10_000, 99);
    expect(r.growth.size).toBe(MAX_SIZE);
  });

  it('ignores zero and negative meals', () => {
    expect(feed(g(1, 2), 0, 2).growth).toEqual(g(1, 2));
    expect(feed(g(1, 2), -3, 2).growth).toEqual(g(1, 2));
  });
});
