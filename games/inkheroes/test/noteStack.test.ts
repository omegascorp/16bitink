import { describe, expect, it } from 'vitest';
import { freeSlot, releaseSlot, takeSlot } from '../src/scenes/hud/noteStack';

describe('noteStack', () => {
  it('gives two notes at once different lines', () => {
    const first = freeSlot([]);
    const second = freeSlot(takeSlot([], first));
    expect(first).toBe(0);
    expect(second).toBe(1);
  });

  it('reuses a line once its note has gone', () => {
    const taken = releaseSlot(takeSlot(takeSlot([], 0), 1), 0);
    expect(taken).toEqual([1]);
    expect(freeSlot(taken)).toBe(0);
  });

  it('leaves the list it was given alone', () => {
    const taken = [0] as const;
    takeSlot(taken, 1);
    releaseSlot(taken, 0);
    expect(taken).toEqual([0]);
  });
});
