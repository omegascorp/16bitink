import { describe, expect, it } from 'vitest';
import { BLASTING_CHAMBER } from '../src/level/ch3/blastingChamber';
import { play } from './solver';

declare const process: { readonly env: Readonly<Record<string, string | undefined>> };

/** How a pull order ends: 'won', the loss cause, 'stuck'/'playing', or 'blocked'. */
const outcome = (order: readonly string[]): string => {
  const r = play(BLASTING_CHAMBER, order);
  if (!r.possible) return 'blocked';
  return r.status.state === 'lost' ? r.status.cause : r.status.state;
};

describe('The Blasting Chamber', () => {
  it('is won by its hint: douse the near bowl, blast the bar with the well, set the lava on the waiting water, then go', () => {
    const r = play(BLASTING_CHAMBER, BLASTING_CHAMBER.solution);
    expect(r.possible).toBe(true);
    expect(r.status.state).toBe('won');
    expect(r.steps / 120).toBeLessThan(120);
  });

  it('keeps to the grain budget', () => {
    expect(BLASTING_CHAMBER.fills.reduce((n, f) => n + f.count, 0)).toBeLessThanOrEqual(700);
  });

  it.each([
    // Nib's pin first (nearest, and leftmost): he drops into the well's mouth and the gas comes up round him.
    [['S', 'W', 'G', 'L', 'X'], 'gassed'],
    // The well before the tank: the gas lights at the near bowl, low in the mouth, and the lava fills the
    // dry well hot; Nib walks into it.
    [['G', 'L', 'W', 'S', 'X'], 'burnt'],
    // The vat before the well: its lava lands on the lid and runs over the far lip onto the gold.
    [['W', 'L', 'G', 'S', 'X'], 'melted'],
    // The near bowl burns the gas, then the lava fills the empty well hot and Nib walks into it.
    [['G', 'L', 'S', 'W', 'X'], 'burnt'],
    // The far bowl's cistern (the trap) first: the gas pools unlit and the bar stands; X's water runs off
    // into the mouth with the rest, and the lava still brims over the far lip onto the gold.
    [['X', 'W', 'G', 'L', 'S'], 'melted'],
    // Two stages right, then Nib goes before the lava: he drops into the empty well and the lava lands on him.
    [['W', 'G', 'S', 'L', 'X'], 'burnt'],
  ])('%j loses: %s', (order, cause) => {
    expect(outcome(order)).toBe(cause);
  });

  if (process.env.AUDIT) it('audit', async () => console.log('AUDIT ' + JSON.stringify((await import('./audit')).audit(BLASTING_CHAMBER))), 3_600_000);
}, 120_000);
