import { describe, expect, it } from 'vitest';
import { BLACK_STEPS as LEVEL } from '../src/level/ch2/blackSteps';
import { STEPS_PER_SECOND } from '../src/logic/particles';
import { inRooms } from '../src/logic/rooms';
import { World } from '../src/logic/world';
import { audit } from './audit';
import { play } from './solver';

declare const process: { readonly env: Readonly<Record<string, string | undefined>> };

/** Nib's walks, as the hint walks them: over the first ledge, over the lid to the gate, and to the chest. */
const BRIDGE = '@760';
const LID = '@1340';
const HOME = '@860';

/** How a pull order ends: 'won', the loss cause, 'stuck' (nothing more happens), or 'blocked'. */
const outcome = (order: readonly string[]): string => {
  const r = play(LEVEL, order);
  if (!r.possible) return 'blocked';
  if (r.status.state === 'lost') return r.status.cause;
  return r.status.state === 'playing' ? 'stuck' : r.status.state;
};

describe('Black Steps', () => {
  it('is won by its hint in 25-120 s', () => {
    const r = play(LEVEL, LEVEL.solution);
    expect(r.status.state).toBe('won');
    expect(r.steps / STEPS_PER_SECOND).toBeGreaterThanOrEqual(25);
    expect(r.steps / STEPS_PER_SECOND).toBeLessThan(120);
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

  it('wins with both hoppers before the first walk, with the water close behind the lava, and with Nib waiting at the gate', () => {
    expect(outcome(['H', 'C', BRIDGE, LID, 'V', 'W', 'G', HOME])).toBe('won');
    expect(outcome(['C', BRIDGE, 'H', LID, 'V', 'W~1', 'G', HOME])).toBe('won');
    expect(outcome(['C', BRIDGE, 'H', LID, 'V', 'W', HOME, 'G', HOME])).toBe('won');
  });

  it.each([
    // The obvious orders: the water first sets the lava in its own tank, so the armadillo lives.
    [['C', BRIDGE, 'H', LID, 'W', 'V', 'G', HOME], 'inked'],
    [['C', 'W', 'V', 'H', 'G', BRIDGE, LID, HOME], 'inked'],
    // Both tanks top-down before the lid has fallen: the stone spills into the cellar, the armadillo lives.
    [['C', BRIDGE, 'H', 'W', 'V', LID, 'G', HOME], 'inked'],
    // Walk first: the bridge falls into the crack, and the gold after it.
    [['H', BRIDGE, 'C', LID, 'V', 'W', 'G', HOME], 'drained'],
    // The lid's hopper after Nib has crossed: its gold goes down the shaft's crack.
    [['C', BRIDGE, LID, 'H', 'V', 'W', 'G', HOME], 'drained'],
    [['C', BRIDGE, LID, 'V', 'W', 'H', 'G', HOME], 'drained'],
    // The lava before the lid is down: it pours through the hole onto the cellar's gold.
    [['C', BRIDGE, 'H', 'V', LID, 'W', 'G', HOME], 'melted'],
    // The gate first: the armadillo comes for Nib as he lands.
    [['C', BRIDGE, 'H', 'G', LID, 'V', 'W', HOME], 'inked'],
    // The gate on the hot lava, before the water: it runs out round Nib's feet.
    [['C', BRIDGE, 'H', LID, 'V', 'G', 'W', HOME], 'burnt'],
  ])('%j loses: %s', (order, cause) => {
    expect(outcome(order)).toBe(cause);
  });

  if (process.env.AUDIT) it('audit', () => console.log('AUDIT ' + JSON.stringify(audit(LEVEL))), 3_600_000);
}, 300_000);
