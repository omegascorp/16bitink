import { describe, expect, it } from 'vitest';
import { FIRE_AND_FLOOD as LEVEL } from '../src/level/ch2/fireFlood';
import { STEPS_PER_SECOND } from '../src/logic/particles';
import { World } from '../src/logic/world';
import { audit } from './audit';
import { play } from './solver';

declare const process: { readonly env: Readonly<Record<string, string | undefined>> };

/** How an order ends: 'won', the loss cause, 'playing' (stuck), or 'blocked'. */
const outcome = (order: readonly string[]): string => {
  const r = play(LEVEL, order);
  if (!r.possible) return 'blocked';
  return r.status.state === 'lost' ? r.status.cause : r.status.state;
};

describe('Fire and Flood', () => {
  it('is won by its hint, and takes the bot at least a minute', () => {
    const r = play(LEVEL, LEVEL.solution);
    expect(r.status.state).toBe('won');
    expect(r.steps / STEPS_PER_SECOND).toBeGreaterThanOrEqual(60);
  });

  it('keeps to the grain budget', () => {
    expect(LEVEL.fills.reduce((n, f) => n + f.count, 0)).toBeLessThanOrEqual(700);
  });

  // Nib's walk to his door drops the ledge's slab onto the spillway's hole: the dam.
  it('drops the slab onto the hole once Nib has walked over the ledge', () => {
    const w = new World(LEVEL);
    w.command({ kind: 'goto', x: 870 });
    for (let s = 0; s < 900; s++) w.step();
    const slab = w.ledges[0]!;
    expect(slab.state).toBe('down');
    expect(slab.x0).toBeLessThan(380);
    expect(slab.x1).toBeGreaterThan(420);
    expect(slab.y).toBeGreaterThan(720);
  });

  // The gate's window: pushed back in anywhere from half a second to two and a half after the flood starts, it wins.
  it.each([['G', 'W', 'G~0.5', 'L', 'N', 'D', 'H', 'V'], ['G', 'W', 'G~2.5', 'L', 'N', 'D', 'H', 'V']])('wins with the gate pushed back at either end of its window: %j', (...order) => {
    expect(outcome(order)).toBe('won');
  });

  it.each([
    // The lava before Nib has walked over the ledge: it pours down the spillway onto the hoard.
    [['L', 'G', 'W', 'G~1.5', 'N', 'D', 'H', 'V'], 'melted'],
    // Nib's door before the lava: he waits on the dry raft while the lava piles round it and over its deck.
    [['G', 'W', 'G~1.5', 'N', 'L', 'D', 'H', 'V'], 'burnt'],
    // The tempting flood with the gate in: all of it goes to the salamander, and the ruby pool stays hot.
    [['W', 'G', 'L', 'N', 'D', 'H', 'V'], 'burnt'],
    // The gate out and never pushed back: all of it goes to the ruby pool, and the salamander waits in its basin.
    [['G', 'W', 'L', 'N', 'D', 'H', 'V'], 'inked'],
    // The gate pushed back too late: too little is left for the salamander.
    [['G', 'W', 'G~4.5', 'L', 'N', 'D', 'H', 'V'], 'inked'],
    // The ferry before the flood: Nib lands next to a dry salamander.
    [['G', 'L', 'N', 'D', 'W', 'G~1.5', 'H', 'V'], 'inked'],
    // The second lava tank, over Nib's terrace, first: it pours onto him before he has gone.
    [['T', 'G', 'W', 'G~1.5', 'L', 'N', 'D', 'H', 'V'], 'burnt'],
  ])('%j loses: %s', (order, cause) => {
    expect(outcome(order)).toBe(cause);
  });

  if (process.env.AUDIT) it('audit', () => console.log('AUDIT ' + JSON.stringify(audit(LEVEL))), 3_600_000);
}, 1_800_000);
