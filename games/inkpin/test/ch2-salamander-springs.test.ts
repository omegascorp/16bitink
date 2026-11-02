import { describe, expect, it } from 'vitest';
import { SPRINGS } from '../src/level/ch2/springs';
import { audit } from './audit';
import { play } from './solver';
import { STEPS_PER_SECOND } from '../src/logic/particles';

declare const process: { readonly env: Readonly<Record<string, string | undefined>> };

/** How a pull order ends: 'won', the loss cause, 'playing' (stuck), or 'blocked'. */
const outcome = (order: readonly string[]): string => {
  const r = play(SPRINGS, order);
  if (!r.possible) return 'blocked';
  return r.status.state === 'lost' ? r.status.cause : r.status.state;
};

describe('Salamander Springs', () => {
  it('is won by its hint inside two minutes: the cistern emptied from the top down', () => {
    const r = play(SPRINGS, SPRINGS.solution);
    expect(r.possible).toBe(true);
    expect(r.status.state).toBe('won');
    expect(r.steps / STEPS_PER_SECOND).toBeLessThan(120);
  });

  it('keeps to the grain budget', () => {
    expect(SPRINGS.fills.reduce((n, f) => n + f.count, 0)).toBeLessThanOrEqual(700);
  });

  it.each([
    // The tempting pull: lava is only a warm bath; the back salamander wades across the ditch and sloshes it up the step onto Nib.
    [['L', 'E', 'W', 'D', 'K', 'G'], 'burnt'],
    // The same, later: the springs are done right, but the lava still comes before the back salamander's wash.
    [['E', 'W', 'L', 'D', 'K', 'G'], 'burnt'],
    // The reader's first try, the back salamander first: the bottom tap drains the whole cistern onto it, and the gold falls into the hot far spring.
    [['D', 'E', 'W', 'K', 'G'], 'melted'],
    // The spout before the top tap: the great spring cools, but it took the far spring's share, so the gold melts in the far spring.
    [['W', 'E', 'D', 'K', 'G'], 'melted'],
    // The bottom tap before the spout: the far spring is fine, the great spring stays hot, and Nib walks into it.
    [['E', 'D', 'W', 'K', 'G'], 'burnt'],
    // Nib's gate before the spout: he walks into the hot great spring.
    [['E', 'G', 'W', 'D', 'K'], 'burnt'],
    // The gold before the top tap: it drops into the hot far spring.
    [['K', 'E', 'W', 'D', 'G'], 'melted'],
  ])('%j loses: %s', (order, cause) => {
    expect(outcome(order)).toBe(cause);
  });

  if (process.env.AUDIT) it('audit', () => console.log('AUDIT ' + JSON.stringify(audit(SPRINGS))), 3_600_000);
}, 300_000);
