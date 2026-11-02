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
  it('is won by its hint: douse the near bowl, blast the bar with the well, set the lava on the waiting water, drop the gold, then go', () => {
    const r = play(BLASTING_CHAMBER, BLASTING_CHAMBER.solution);
    expect(r.possible).toBe(true);
    expect(r.status.state).toBe('won');
    expect(r.steps / 120).toBeLessThan(120);
  });

  it('keeps to the grain budget', () => {
    expect(BLASTING_CHAMBER.fills.reduce((n, f) => n + f.count, 0)).toBeLessThanOrEqual(700);
  });

  it.each([
    // The obvious orders (nearest first, and left to right): the gold drops into the empty mouth and the lava lands on it.
    [['T', 'S', 'K', '@862', 'W', 'L', 'G', '@1240', 'X'], 'melted'],
    // No wash: Nib walks into the armadillo's pen.
    [['W', 'G', 'L', '@862', 'K', 'S', 'T', '@1240'], 'pricked'],
    // The vat first: its lava brims over the mouth's far lip, and the gold dropped later melts in it.
    [['L', 'W', 'G', '@862', 'T', 'K', 'S', '@1240'], 'melted'],
    // The well before the water arrives: the gas lights low at the near bowl and the bar stands.
    [['G', 'W', 'T', '@862', 'L', 'K', 'S', '@1240', 'X'], 'sealed'],
    // The gold before the lava: it lies in the mouth and the lava lands on it.
    [['W', 'G', 'T', '@862', 'K', 'L', 'S', '@1240', 'X'], 'melted'],
    // The trap late: its water fills the bowl's basin, the plate drops and the vault door shuts.
    [['W', 'G', 'T', '@862', 'L', 'K', 'X', 'S', '@1240'], 'sealed'],
  ])('%j loses: %s', (order, cause) => {
    expect(outcome(order)).toBe(cause);
  });

  if (process.env.AUDIT) it('audit', async () => console.log('AUDIT ' + JSON.stringify((await import('./audit')).audit(BLASTING_CHAMBER))), 3_600_000);
}, 120_000);
