import { describe, expect, it } from 'vitest';
import { RUBY_HOARD } from '../src/level/ch2/rubyHoard';
import { RUBY_COINS } from '../src/logic/rubies';
import { audit } from './audit';
import { play } from './solver';

declare const process: { readonly env: Readonly<Record<string, string | undefined>> };

/** How a pull order ends: 'won', the loss cause, 'playing' (stuck), or 'blocked'. */
const outcome = (order: readonly string[]): string => {
  const r = play(RUBY_HOARD, order);
  if (!r.possible) return 'blocked';
  return r.status.state === 'lost' ? r.status.cause : r.status.state;
};

describe('The Ruby Hoard', () => {
  it('is won by its hint in a minute or more, with every ruby and nearly all the gold', () => {
    const r = play(RUBY_HOARD, RUBY_HOARD.solution);
    expect(r.status.state).toBe('won');
    expect(r.steps / 120).toBeGreaterThanOrEqual(60);
    expect(r.steps / 120).toBeLessThanOrEqual(120);
    // Five rubies, and all but the few coins caught under them in the hopper.
    expect(r.treasure).toBeGreaterThanOrEqual(5 * RUBY_COINS + 110);
  });

  it('has a shorter way that skips the left door', () => {
    expect(outcome(['S', 'H', 'L', 'W', 'C', 'G'])).toBe('won');
  });

  it('sets the coin target so that melting the gold loses', () => {
    const coins = RUBY_HOARD.fills.filter((f) => f.kind === 3).reduce((n, f) => n + f.count, 0);
    const rubies = (RUBY_HOARD.rubies ?? []).length * RUBY_COINS;
    expect(rubies).toBeLessThan(RUBY_HOARD.coinsNeeded);
    expect(rubies + coins).toBeGreaterThan(RUBY_HOARD.coinsNeeded + 20);
  });

  it('keeps to the grain budget', () => {
    expect(RUBY_HOARD.fills.reduce((n, f) => n + f.count, 0)).toBeLessThanOrEqual(700);
  });

  it.each([
    // The tempting pin: the hopper's floor. The whole hoard drops into the lava tank and the gold melts.
    [['H', 'S', 'R', 'W', 'L', 'C', 'G'], 'melted'],
    // The left door first: the gold slides off toward Nib's cliff into the landing's lava.
    [['R', 'S', 'W', 'H', 'L', 'C', 'G'], 'melted'],
    // The water after the left door but before the gold has gone: same.
    [['W', 'S', 'R', 'H', 'L', 'C', 'G'], 'melted'],
    // The lava poured away before the water, with R used: the water that follows it melts the gold.
    [['S', 'R', 'L', 'W', 'H', 'C', 'G'], 'melted'],
    // The ramp's pin before the river is stone: the waiting gold slides into the lava.
    [['S', 'R', 'W', 'H', 'C', 'L', 'G'], 'melted'],
    // Nib let down before the lava: he lands on the armadillo's spikes.
    [['S', 'H', 'G', 'L', 'W', 'C'], 'pricked'],
  ])('%j loses: %s', (order, cause) => {
    expect(outcome(order)).toBe(cause);
  });

  if (process.env.AUDIT) it('audit', () => console.log('AUDIT ' + JSON.stringify(audit(RUBY_HOARD))), 3_600_000);
}, 900_000);
