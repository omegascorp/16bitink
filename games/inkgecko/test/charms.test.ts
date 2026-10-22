import { describe, expect, it } from 'vitest';
import { pickCharm, STALL_FROM } from '../src/logic/charms';

describe('pickCharm', () => {
  it('keeps Reverse and Slow back while the line is far from the well: they would only stall it', () => {
    expect(pickCharm(['slow', 'reverse'], 0.2, null, 0)).toBeNull();
    expect(pickCharm(['slow', 'reverse'], STALL_FROM.slow!, null, 0.99)).toBe('slow');
    expect(pickCharm(['reverse'], STALL_FROM.reverse! - 0.01, null, 0)).toBeNull();
    expect(pickCharm(['reverse'], STALL_FROM.reverse!, null, 0)).toBe('reverse');
  });

  it('gives any other charm at any time', () => {
    expect(pickCharm(['slow', 'burst'], 0, null, 0)).toBe('burst');
  });

  it('does not give the same charm twice in a row when there is another', () => {
    for (const roll of [0, 0.5, 0.99]) expect(pickCharm(['slow', 'reverse', 'burst'], 0.9, 'reverse', roll)).not.toBe('reverse');
    expect(pickCharm(['burst'], 0, 'burst', 0)).toBe('burst');
  });

  it('picks evenly from what fits by the roll', () => {
    expect(pickCharm(['burst', 'aim'], 0, null, 0)).toBe('burst');
    expect(pickCharm(['burst', 'aim'], 0, null, 0.99)).toBe('aim');
  });
});
