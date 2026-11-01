import { describe, expect, it } from 'vitest';
import { BURIAL_GOLD } from '../src/level/ch3/burialGold';
import { STEPS_PER_SECOND } from '../src/logic/particles';
import { play } from './solver';

/** How an order ends: 'won', the loss cause, 'stuck'/'playing' (a dead end), or 'blocked'. */
const outcome = (order: readonly string[]): string => {
  const r = play(BURIAL_GOLD, order);
  if (!r.possible) return 'blocked';
  return r.status.state === 'lost' ? r.status.cause : r.status.state;
};

describe('The Burial Gold', () => {
  it('is won by its hint: the blast and the gold cascade, the trench stone, the hoard', () => {
    const r = play(BURIAL_GOLD, BURIAL_GOLD.solution);
    expect(r.possible).toBe(true);
    expect(r.status.state).toBe('won');
    expect(r.steps / STEPS_PER_SECOND).toBeLessThan(120);
  });

  it('keeps to the grain budget', () => {
    expect(BURIAL_GOLD.fills.reduce((n, f) => n + f.count, 0)).toBeLessThanOrEqual(700);
  });

  it('is full size', () => {
    expect(BURIAL_GOLD.view.w).toBeGreaterThanOrEqual(1300);
  });

  it.each([
    // The tempting first pull: the vat's lava waits on the lid, and the gas lights as it comes up through it.
    [['L', 'G', 'W', 'K', 'S', '@1000', 'P'], 'sealed'],
    // The water before the lava: it stays at the trench's bottom, the basin stays hot and the hoard melts (left to right).
    [['W', 'G', 'L', 'K', 'S', '@1000', 'P'], 'melted'],
    [['G', 'W', 'L', 'K', 'S', '@1000'], 'melted'],
    // The hoard before the basin is set.
    [['G', 'L', 'K', 'W', 'S', '@1000'], 'melted'],
    // The trap, "more gold": the eye door drops between Nib and the hoard.
    [['G', 'L', 'W', 'P', 'K', 'S', '@1000'], 'sealed'],
    // Nearest first.
    [['S', 'K', 'P', 'L', 'G', '@1000', 'W'], 'sealed'],
  ])('%j loses: %s', (order, cause) => {
    expect(outcome(order)).toBe(cause);
  });
}, 600_000);
