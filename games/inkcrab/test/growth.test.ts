import { describe, expect, it } from 'vitest';
import { feed, initialGrowth, isCapped, MAX_SIZE, meterGoal, settle, type Growth } from '../src/logic/growth';

const g = (size: number, meter = 0, bank = 0): Growth => ({ size, meter, bank });

describe('growth', () => {
  it('starts tiny and empty', () => {
    expect(initialGrowth()).toEqual(g(1));
  });

  it('needs more food for each size', () => {
    expect(meterGoal(2)).toBeGreaterThan(meterGoal(1));
  });

  it('fills the meter and grows while the shell has room', () => {
    const r = feed(g(1), meterGoal(1) + 1, 3);
    expect(r.growth).toEqual(g(2, 1));
    expect(r.grew).toBe(1);
    expect(r.banked).toBe(0);
  });

  it('stops at the shell cap with a full meter and banks the rest', () => {
    const r = feed(g(2), meterGoal(2) + 4, 2);
    expect(r.growth).toEqual(g(2, meterGoal(2), 4));
    expect(r.grew).toBe(0);
    expect(r.banked).toBe(4);
    expect(isCapped(r.growth, 2)).toBe(true);
  });

  it('is not capped below the cap or with a part-full meter', () => {
    expect(isCapped(g(2, 1), 2)).toBe(false);
    expect(isCapped(g(1, meterGoal(1)), 2)).toBe(false);
  });

  it('banks everything eaten while already capped', () => {
    const capped = g(2, meterGoal(2), 3);
    expect(feed(capped, 2, 2)).toEqual({ growth: g(2, meterGoal(2), 5), grew: 0, banked: 2 });
  });

  it('converts the meter and bank at once after moving into a bigger shell', () => {
    const capped = g(2, meterGoal(2), meterGoal(3) + meterGoal(4) + 2);
    const r = settle(capped, 5);
    // Full meter -> 3, bank covers 3->4 and 4->5, two points left on the meter.
    expect(r.growth).toEqual(g(5, 2, 0));
    expect(r.grew).toBe(3);
  });

  it('keeps leftover reserve banked when the new shell caps the burst', () => {
    const capped = g(2, meterGoal(2), 100);
    const r = settle(capped, 3);
    expect(r.growth.size).toBe(3);
    expect(isCapped(r.growth, 3)).toBe(true);
    expect(r.growth.bank).toBe(meterGoal(2) + 100 - meterGoal(2) - meterGoal(3));
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
