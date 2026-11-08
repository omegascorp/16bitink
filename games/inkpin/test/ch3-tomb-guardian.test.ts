import { describe, expect, it } from 'vitest';
import { TOMB_GUARDIAN } from '../src/level/ch3/tombGuardian';
import { STEPS_PER_SECOND } from '../src/logic/particles';
import { play } from './solver';

/** How an order ends: 'won', the loss cause, 'playing' (a dead end), or 'blocked'. */
const outcome = (order: readonly string[]): string => {
  const r = play(TOMB_GUARDIAN, order);
  if (!r.possible) return 'blocked';
  return r.status.state === 'lost' ? r.status.cause : r.status.state;
};

describe('The Tomb Guardian', () => {
  it('is won by its hint: the bridge, the gold, the drop, the cover, the breath lit under the lid, the flood, the frog', () => {
    const r = play(TOMB_GUARDIAN, TOMB_GUARDIAN.solution);
    expect(r.possible).toBe(true);
    expect(r.status.state).toBe('won');
    expect(r.steps / STEPS_PER_SECOND).toBeLessThan(120);
  });

  it('keeps to the grain budget (with the breath cap)', () => {
    const grains = TOMB_GUARDIAN.fills.reduce((n, f) => n + f.count, 0) + (TOMB_GUARDIAN.breath?.max ?? 0);
    expect(grains).toBeLessThanOrEqual(700);
  });

  it('is full size', () => {
    expect(TOMB_GUARDIAN.view.w).toBeGreaterThanOrEqual(1300);
  });

  it('sets its breath cap so two breaths overfill the lid', () => {
    expect(TOMB_GUARDIAN.breath).toEqual({ every: 5, count: 24, max: 48 });
  });

  it.each([
    // Nib's floor first (the nearest and leftmost pin): he drops into the hot moat.
    [['S', 'M', 'C', 'F', '@800', 'W~5', 'U', '@1320'], 'burnt'],
    // The gold before the bridge: it falls into the moat.
    [['C', 'M', 'S', 'F', '@800', 'W~5', 'U', '@1320'], 'melted'],
    // The cover left in: one breath fits under the lid, the second spills under the lip onto Nib.
    [['M', 'C', 'S', '@800', 'F~12', 'W~5', 'U', '@1320'], 'gassed'],
    // Wash the toad (the tempting pull): the flood douses the bowl and lies on the lid; the lip and the door stand.
    [['M', 'C', 'S', 'F', 'W', '@800', 'U', '@1320'], 'sealed'],
    // The frog before the flood: it drops into the dry dip, hops out and waits for Nib by the chest.
    [['M', 'C', 'S', 'F', '@800', 'U', 'W~5', '@1320'], 'inked'],
  ])('%j loses: %s', (order, cause) => {
    expect(outcome(order)).toBe(cause);
  });

  it('wins with the cover pulled after Nib is in sight, before the second breath', () => {
    expect(outcome(['M', 'C', 'S', '@800', 'F', 'W~5', 'U', '@1320'])).toBe('won');
  });

  it('ends a permanently shut route even while the boss keeps breathing', () => {
    expect(outcome(['M', 'U', 'F', 'S', '@800', 'W', 'C', '@1320'])).toBe('sealed');
  });
}, 300_000);
