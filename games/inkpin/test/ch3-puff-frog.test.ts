import { describe, expect, it } from 'vitest';
import { PUFF_FROG } from '../src/level/ch3/puffFrog';
import { STEPS_PER_SECOND } from '../src/logic/particles';
import { play } from './solver';

declare const process: { readonly env: Readonly<Record<string, string | undefined>> };

/** How a pull order ends: 'won', the loss cause, 'stuck'/'playing', or 'blocked'. */
const outcome = (order: readonly string[]): string => {
  const r = play(PUFF_FROG, order);
  if (!r.possible) return 'blocked';
  return r.status.state === 'lost' ? r.status.cause : r.status.state;
};

describe('The Puff Frog', () => {
  it('also wins with the frog dome vented before the flood (the flood washes the frog in its pool)', () => {
    expect(outcome(['G', 'B', 'A', 'W', 'U', 'S', '@556'])).toBe('won');
  });

  it('is won by its hint: blast the crypt, drop the plate frog, flood, open the dam, drop the pool frog, then go', () => {
    const r = play(PUFF_FROG, PUFF_FROG.solution);
    expect(r.possible).toBe(true);
    expect(r.status.state).toBe('won');
    expect(r.steps / STEPS_PER_SECOND).toBeLessThan(120);
  });

  it('keeps to the grain budget', () => {
    expect(PUFF_FROG.fills.reduce((n, f) => n + f.count, 0)).toBeLessThanOrEqual(700);
  });

  // These orders shut Nib out (the bar stands, or the pool stays dry), but 'sealed' needs every pin out and the last one is the trap T, whose oil melts the gold: so they end 'melted'.
  it.each([
    // Nib's pin first (nearest, and leftmost of his own): he drops through the frog dome's gas.
    [['S', 'B', 'U', 'G', 'A', 'W', '@556'], 'gassed'],
    // Nib's pin before the frog dome's vent: the same.
    [['G', 'A', 'W', 'U', 'S', 'B', '@556'], 'gassed'],
    // The flood before the crypt: it douses the bowl, the gas pools unlit and the bar stands.
    [['A', 'W', 'U', 'G', 'B', 'S', 'T', '@556'], 'melted'],
    // Nib's pin before the flood: the dam pours down his hole, the frog's pool stays dry, and he walks into it.
    [['G', 'B', 'U', 'S', 'A', 'W', 'T', '@556'], 'melted'],
    // The cistern before the plate frog: the sluice is shut, the flood leaks away, and the pool stays dry.
    [['W', 'A', 'G', 'U', 'B', 'S', 'T', '@556'], 'melted'],
  ])('%j loses: %s', (order, cause) => {
    expect(outcome([...order])).toBe(cause);
  });

  if (process.env.AUDIT) it('audit', async () => console.log('AUDIT ' + JSON.stringify((await import('./audit')).audit(PUFF_FROG))), 3_600_000);
}, 180_000);
