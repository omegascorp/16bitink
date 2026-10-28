import { describe, expect, it } from 'vitest';
import { PIN_OVER_PIN } from '../src/level/pinOverPin';
import { World } from '../src/logic/world';
import { play } from './solver';

/** How a pull order ends: 'won', the loss cause, 'playing' (stuck), or 'blocked' (a pin couldn't come out). */
const outcome = (order: readonly string[]): string => {
  const r = play(PIN_OVER_PIN, order);
  if (!r.possible) return 'blocked';
  return r.status.state === 'lost' ? r.status.cause : r.status.state;
};

/** Plays an order like the solver's eager bot, noting what the crates and guards went through. */
const playEvents = (order: readonly string[]): { world: World; events: Set<string> } => {
  const w = new World(PIN_OVER_PIN);
  const events = new Set<string>();
  const run = (steps: number): void => {
    for (let s = 0; s < steps && !w.finished; s++) {
      w.step();
      for (const e of w.events) events.add(e.type);
      if (s > 30 && w.settled && w.nibOrder.kind === 'stay') break;
    }
  };
  for (const id of order) {
    w.pull(id);
    run(960);
    for (const s of PIN_OVER_PIN.stops ?? []) {
      w.command({ kind: 'goto', x: s.x });
      run(960);
    }
  }
  return { world: w, events };
};

describe('Pin Over Pin, four rooms wide', () => {
  it('is won by the hint’s order, and takes the bot at least a minute', () => {
    const r = play(PIN_OVER_PIN, PIN_OVER_PIN.solution);
    expect(r.status.state).toBe('won');
    expect(r.steps / 120).toBeGreaterThanOrEqual(60);
  });

  it('drops the first crate on the porcupine as a bridge, and burns the second away with the lava', () => {
    const { world, events } = playEvents(PIN_OVER_PIN.solution);
    expect(world.blots[0]!.gone).toBe('stomped');
    expect(events.has('crateBurnt')).toBe(true);
    expect(world.boulders[0]!.gone).toBe(false);
    expect(world.boulders[1]!.gone).toBe(true);
    expect(world.chestTaken).toBe(true);
  });

  it('walks Nib into the porcupine’s pit if the door opens before the crate drops', () => {
    expect(['pricked', 'inked']).toContain(outcome(['N', 'B', 'C', 'J2', 'W2', 'G1', 'C3', 'R3', 'C4', 'L4', 'G3']));
  });

  it('lets the boar out onto Nib if the gate opens before the cell', () => {
    expect(outcome(['B', 'N', 'C', 'G1', 'J2', 'W2', 'C3', 'R3', 'C4', 'L4', 'G3'])).toBe('inked');
  });

  it('drops the gold into the drain if the ramp goes first', () => {
    expect(outcome(['B', 'N', 'C', 'J2', 'W2', 'G1', 'R3', 'C3', 'C4', 'L4', 'G3'])).toBe('drained');
  });

  it('pours the lava onto Nib if the last gate opens before the barricade burns', () => {
    expect(outcome(['B', 'N', 'C', 'J2', 'W2', 'G1', 'C3', 'R3', 'C4', 'G3', 'L4'])).toBe('burnt');
  });

  it('keeps each pin behind the one in its way', () => {
    expect(outcome(['B', 'N', 'C', 'J2', 'W2', 'G1', 'C3', 'C4'])).toBe('blocked');
    expect(outcome(['B', 'N', 'C', 'J2', 'W2', 'G1', 'C3', 'R3', 'L4'])).toBe('blocked');
    expect(outcome(['C'])).toBe('blocked');
  });
}, 120_000);
