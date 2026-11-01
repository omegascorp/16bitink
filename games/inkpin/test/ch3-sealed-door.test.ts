import { describe, expect, it } from 'vitest';
import { SEALED_DOOR } from '../src/level/ch3/sealedDoor';
import { STEPS_PER_SECOND } from '../src/logic/particles';
import { play } from './solver';

/** How an order ends: 'won', the loss cause, 'playing' (a dead end), or 'blocked'. */
const outcome = (order: readonly string[]): string => {
  const r = play(SEALED_DOOR, order);
  if (!r.possible) return 'blocked';
  return r.status.state === 'lost' ? r.status.cause : r.status.state;
};

describe('The Sealed Door', () => {
  it('is won by its hint: gold on the plate, the boulder through the open hatch, the flood, then the grab', () => {
    const r = play(SEALED_DOOR, SEALED_DOOR.solution);
    expect(r.possible).toBe(true);
    expect(r.status.state).toBe('won');
    expect(r.steps / STEPS_PER_SECOND).toBeLessThan(120);
  });

  it('keeps to the grain budget', () => {
    expect(SEALED_DOOR.fills.reduce((n, f) => n + f.count, 0)).toBeLessThanOrEqual(700);
  });

  it('is full size', () => {
    expect(SEALED_DOOR.view.w).toBeGreaterThanOrEqual(1300);
  });

  it.each([
    // The greedy grab before the boulder: the gold leaves the plate, both doors drop, the boulder lands on the shut hatch.
    [['C', 'W', 'G', '@528', 'B', 'V', '@1140'], 'sealed'],
    // The gold let out before the flood: it falls into the hot moat (nearest first and left to right both start this way).
    [['B', 'C', 'G', '@528', 'W', 'V', '@1140'], 'melted'],
    // The flood before the gold: the shut door holds it, it runs back off the sill and down its grate, and the dip stays hot.
    [['W', 'B', 'C', '@528', 'G', 'V', '@1140'], 'burnt'],
    // V before the flood: its gold falls into the hot moat.
    [['V', 'C', 'B', '@528', 'W', 'G', '@1140'], 'melted'],
    // The plug first: the hopper's coins drip straight through the slot and never weigh the plate.
    [['G', 'W', 'B', '@528', 'C', 'V', '@1140'], 'sealed'],
  ])('%j loses: %s', (order, cause) => {
    expect(outcome(order)).toBe(cause);
  });
}, 300_000);
