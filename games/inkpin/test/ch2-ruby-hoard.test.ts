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
    // Five rubies, and all but the few coins caught under them in the hopper.
    expect(r.treasure).toBeGreaterThanOrEqual(5 * RUBY_COINS + 130);
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
    [['H', 'S', 'L', 'W', 'C', 'G'], 'melted'],
    // The ramp's pin before the gold comes down: it slides straight off the ramp into the river.
    [['C', 'S', 'H', 'L', 'W', 'G'], 'melted'],
    // The ramp's pin on the hot river: the waiting gold slides into the lava.
    [['S', 'H', 'L', 'C', 'W', 'G'], 'melted'],
    // Nib let down before the lava: he lands on the armadillo's spikes.
    [['S', 'H', 'G', 'L', 'W', 'C'], 'pricked'],
    // Nib let down after the lava but before the water: he walks into the river.
    [['S', 'H', 'L', 'G', 'W', 'C'], 'burnt'],
    // The water first, the hoard still in the hopper: it pools on the gold, and the floor drops the lot into the lava.
    [['W', 'H', 'S', 'L', 'C', 'G'], 'melted'],
  ])('%j loses: %s', (order, cause) => {
    expect(outcome(order)).toBe(cause);
  });

  if (process.env.AUDIT) it('audit', () => console.log('AUDIT ' + JSON.stringify(audit(RUBY_HOARD))), 3_600_000);
}, 900_000);
