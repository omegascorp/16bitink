import { describe, expect, it } from 'vitest';
import { startSwap, SWAP_SECONDS, swapProgress, tickSwap } from '../src/logic/swap';

describe('shell swap', () => {
  it('leaves the crab exposed for about a second', () => {
    expect(SWAP_SECONDS).toBeCloseTo(1, 1);
  });

  it('counts down and finishes', () => {
    let s = startSwap(7);
    expect(s.itemId).toBe(7);
    expect(swapProgress(s)).toBe(0);
    let r = tickSwap(s, SWAP_SECONDS / 2);
    expect(r.done).toBe(false);
    expect(swapProgress(r.swap)).toBeCloseTo(0.5);
    s = r.swap;
    r = tickSwap(s, SWAP_SECONDS);
    expect(r.done).toBe(true);
    expect(swapProgress(r.swap)).toBe(1);
  });
});
