import { describe, expect, it } from 'vitest';
import { PUFF_FROG } from '../src/level/ch3/puffFrog';
import { STEPS_PER_SECOND } from '../src/logic/particles';
import { play } from './solver';

declare const process: { readonly env: Readonly<Record<string, string | undefined>> };

/** How a pull order ends: 'won', the loss cause, 'stuck'/'playing', or 'blocked'. */
const outcome = (order: readonly string[]): string => {
  const r = play(PUFF_FROG, order, false);
  if (!r.possible) return 'blocked';
  return r.status.state === 'lost' ? r.status.cause : r.status.state;
};

describe('The Puff Frog', () => {
  it('is won by its hint: blast the crypt, drop the plate frog, flood, open the dam, drop the pool frog, then go', () => {
    const r = play(PUFF_FROG, PUFF_FROG.solution);
    expect(r.possible).toBe(true);
    expect(r.status.state).toBe('won');
    expect(r.steps / STEPS_PER_SECOND).toBeLessThan(120);
  });

  it('keeps to the grain budget', () => {
    expect(PUFF_FROG.fills.reduce((n, f) => n + f.count, 0)).toBeLessThanOrEqual(700);
  });

  it.each([
    // The lamp once the gas pit is open: its oil drips into the pit and stays there.
    [['G', 'T', 'A', 'W', 'U', 'B', 'S', '@524']],
    // ... and after the flood it sets to stone in the pit's water.
    [['G', 'A', 'W', 'U', 'B', 'T', 'S', '@524']],
    // The flood doused the bowl, but the lamp's oil, falling through the pooled gas, lights it instead.
    [['A', 'W', 'U', 'G', 'T', 'B', 'S', '@524']],
  ])('%j wins: the lamp is harmless once the pit is open, and lights the gas a doused bowl cannot', (order) => {
    expect(outcome([...order])).toBe('won');
  });

  it.each([
    // The lamp first (leftmost, and the trap): its oil runs down the lid, under the bar, onto the gold.
    [['T', 'G', 'A', 'W', 'U', 'B', 'S', '@524'], 'melted'],
    // Nib's pin first (nearest, and his own): he drops through the frog dome's gas.
    [['S', 'B', 'U', 'G', 'A', 'W', 'T', '@524'], 'gassed'],
    // Nib's pin before the frog dome's vent: the same.
    [['G', 'A', 'W', 'U', 'S', 'B', 'T', '@524'], 'gassed'],
    // The frog dome before the flood: frog 2 lands on the dry pool's plate, the gallery's door shuts, and the pool stays dry.
    [['G', 'B', 'A', 'W', 'U', 'S', 'T', '@524'], 'sealed'],
    // ... the same with the dam opened between them.
    [['G', 'A', 'W', 'B', 'U', 'S', 'T', '@524'], 'sealed'],
    // Nib's pin before the flood (after the frog): he and the frog wait in a dry pool.
    [['G', 'B', 'U', 'S', 'A', 'W', 'T', '@524'], 'sealed'],
    // The cistern before the plate frog: the sluice is shut, the flood leaks away, and the pool stays dry.
    [['W', 'A', 'G', 'U', 'B', 'S', 'T', '@524'], 'sealed'],
  ])('%j loses: %s', (order, cause) => {
    expect(outcome([...order])).toBe(cause);
  });

  if (process.env.AUDIT) it('audit', async () => console.log('AUDIT ' + JSON.stringify((await import('./audit')).audit(PUFF_FROG))), 3_600_000);
}, 180_000);
