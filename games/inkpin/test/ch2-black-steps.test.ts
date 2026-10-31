import { describe, expect, it } from 'vitest';
import { BLACK_STEPS as LEVEL } from '../src/level/ch2/blackSteps';
import { STEPS_PER_SECOND } from '../src/logic/particles';
import { inRooms } from '../src/logic/rooms';
import { World } from '../src/logic/world';
import { audit } from './audit';
import { play } from './solver';

declare const process: { readonly env: Readonly<Record<string, string | undefined>> };

/** Nib's walk from the shelf to the foot of the black steps, as the hint walks it. */
const DOWN = ['@1100', '@1500', '@1800', '@2060', '@1800', '@1600'];
/** And from the gate to the chest. */
const HOME = ['@1200', '@600', '@260'];

/** How a pull order ends: 'won', the loss cause, 'playing' (stuck), or 'blocked'. */
const outcome = (order: readonly string[]): string => {
  const r = play(LEVEL, order);
  if (!r.possible) return 'blocked';
  return r.status.state === 'lost' ? r.status.cause : r.status.state;
};

describe('Black Steps', () => {
  it('is won by its hint in a minute or more', () => {
    const r = play(LEVEL, LEVEL.solution);
    expect(r.status.state).toBe('won');
    expect(r.steps / STEPS_PER_SECOND).toBeGreaterThanOrEqual(60);
  });

  it('keeps to the grain budget', () => {
    expect(LEVEL.fills.reduce((n, f) => n + f.count, 0)).toBeLessThanOrEqual(700);
    expect(LEVEL.pins.length).toBeGreaterThanOrEqual(5);
  });

  it('opens at rest, with every grain inside the rooms and enough treasure', () => {
    const w = new World(LEVEL);
    const g = w.grains;
    const outside: string[] = [];
    for (let i = 0; i < g.count; i++) if (!inRooms(LEVEL.rooms, g.x[i]!, g.y[i]!)) outside.push(`${g.x[i]!.toFixed(0)},${g.y[i]!.toFixed(0)}`);
    expect(outside).toEqual([]);
    expect(w.coinsTotal).toBeGreaterThanOrEqual(LEVEL.coinsNeeded);
    expect(w.ledges.every((l) => l.state === 'up')).toBe(true);
    expect(w.status.state).toBe('playing');
  });

  it('wins with the hopper before the gold, and with the water first', () => {
    expect(outcome(['H', 'C', '@900', ...DOWN, 'V', 'W', 'G', ...HOME])).toBe('won');
    expect(outcome(['C', '@900', 'H', ...DOWN, 'W', 'V', 'G', ...HOME])).toBe('won');
  });

  it.each([
    // The lava before Nib has walked over the second ledge: it pours through the hole onto the cellar's gold.
    [['V', 'C', '@900', 'H', ...DOWN, 'W', 'G', ...HOME], 'melted'],
    // The lid's hopper after Nib has crossed: its gold falls to the slab and the lava melts it.
    [['C', '@900', ...DOWN, 'H', 'V', 'W', 'G', ...HOME], 'melted'],
    // The tanks poured while Nib waits short of the second ledge: the water goes through the hole, the lava has no water to set it.
    [['C', '@900', 'W', ...DOWN, 'V', 'H', 'G', ...HOME], 'stuck'],
    // The gate before the water and the lava: Nib walks into the armadillo.
    [['C', '@900', 'H', ...DOWN, 'G', ...HOME, 'V', 'W'], 'inked'],
    // The gate on the hot lava, before the water.
    [['C', '@900', 'H', ...DOWN, 'V', 'G', ...HOME, 'W'], 'burnt'],
  ])('%j loses: %s', (order, cause) => {
    const got = outcome(order);
    expect(got === 'playing' ? 'stuck' : got).toBe(cause);
  });

  if (process.env.AUDIT) it('audit', () => console.log('AUDIT ' + JSON.stringify(audit(LEVEL))), 3_600_000);
}, 300_000);
