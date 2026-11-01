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

  it.each([
    // The greedy grab before the boulder: the gold leaves the plate, both doors drop, the boulder lands on the shut hatch.
    [['W', 'G', 'C', '@358', 'B', 'V', '@740'], 'sealed'],
    // Left to right: the boulder waits on the shut hatch, then G lets the gold drip straight through: the plate never goes down.
    [['W', 'B', 'G', '@358', 'C', 'V', '@740'], 'sealed'],
    // The flood first, then the grab: the same seal after a flood has crossed the bridge.
    [['C', 'W', 'G', '@358', 'B', 'V', '@740'], 'sealed'],
    // The gold let out before the moat is cooled: it falls into the lava.
    [['C', 'G', 'W', '@358', 'B', 'V', '@740'], 'melted'],
    // Nib walks out before the tank has set the moat.
    [['C', 'B', 'V', '@358', 'W', 'G', '@740'], 'burnt'],
  ])('%j loses: %s', (order, cause) => {
    expect(outcome(order)).toBe(cause);
  });
}, 300_000);
