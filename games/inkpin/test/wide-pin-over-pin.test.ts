import { describe, expect, it } from 'vitest';
import { PIN_OVER_PIN } from '../src/level/pinOverPin';
import type { Stop } from '../src/logic/level';
import { STEPS_PER_SECOND } from '../src/logic/particles';
import { World } from '../src/logic/world';
import { play } from './solver';

/** How a pull order ends: 'won', the loss cause, 'playing' (stuck), or 'blocked' (a pin couldn't come out). */
const outcome = (order: readonly string[]): string => {
  const r = play(PIN_OVER_PIN, order);
  if (!r.possible) return 'blocked';
  return r.status.state === 'lost' ? r.status.cause : r.status.state;
};

/**
 * Plays the hint step for step the way the bot does (test/solver.ts's play),
 * and also reports how the guards went and whether the crate burnt.
 */
function watchSolution(): { won: boolean; seconds: number; ends: string[]; crateBurnt: boolean; coins: number } {
  const w = new World(PIN_OVER_PIN);
  let crateBurnt = false;
  const run = (steps: number): void => {
    for (let s = 0; s < steps && !w.finished; s++) {
      w.step();
      if (w.events.some((e) => e.type === 'crateBurnt')) crateBurnt = true;
      if (s > 30 && w.settled && w.nibOrder.kind === 'stay') break;
    }
  };
  const stops = PIN_OVER_PIN.stops ?? [];
  const visit = (list: readonly Stop[], steps: number): void => {
    for (const s of list) {
      if (w.finished) return;
      w.command(s.y === undefined ? { kind: 'goto', x: s.x } : { kind: 'goto', x: s.x, y: s.y });
      run(steps);
    }
  };
  for (const id of PIN_OVER_PIN.solution) {
    w.pull(id);
    run(STEPS_PER_SECOND * 8);
    visit(stops, STEPS_PER_SECOND * 8);
  }
  const back = [...stops].reverse();
  visit([...back, ...stops, ...back, ...stops], (STEPS_PER_SECOND * 25) / 4);
  w.leave();
  return { won: w.status.state === 'won', seconds: w.steps / STEPS_PER_SECOND, ends: w.blots.map((b) => b.gone ?? 'alive'), crateBurnt, coins: w.coinsCollected };
}

describe('Pin Over Pin, wide', () => {
  it('is won by its hint in a minute or more: the boar washed, the porcupine scorched, the crate burnt', () => {
    const r = watchSolution();
    expect(r.won).toBe(true);
    expect(r.seconds).toBeGreaterThanOrEqual(60);
    expect(r.ends).toEqual(['washed', 'scorched']);
    expect(r.crateBurnt).toBe(true);
    expect(r.coins).toBeGreaterThanOrEqual(PIN_OVER_PIN.coinsNeeded);
  });

  it('keeps to the grain budget', () => {
    expect(PIN_OVER_PIN.fills.reduce((n, f) => n + f.count, 0)).toBeLessThanOrEqual(700);
  });

  it('jams pins behind pins in the next room', () => {
    // The water's pin runs into the lava tank's side; the porcupine's gate into the gold shelf.
    const w = new World(PIN_OVER_PIN);
    expect(w.blockedBy(PIN_OVER_PIN.pins.find((p) => p.id === 'W')!)).toBe('P');
    expect(w.blockedBy(PIN_OVER_PIN.pins.find((p) => p.id === 'E')!)).toBe('G');
    expect(outcome(['W'])).toBe('blocked');
    expect(outcome(['E'])).toBe('blocked');
  });

  it.each([
    // The tempting lava before the drain's lid: it pools against the porcupine's gate, and Nib walks down into it.
    [['P', 'W', 'K', 'N', 'G', 'L', 'S', 'E'], 'burnt'],
    // The gold dropped by the gate before the lid: the pooled lava seeps under the gate onto it.
    [['G', 'P', 'W', 'S', 'K', 'N', 'L', 'E'], 'melted'],
    // The gate lifted with the lava pooled against it: it runs out over the gold.
    [['P', 'G', 'E', 'S', 'W', 'K', 'N', 'L'], 'melted'],
    // The cell opened before the water: the boar comes out to Nib's gate, and the water runs off down the drain.
    [['S', 'P', 'K', 'W', 'N', 'G', 'L', 'E'], 'inked'],
    // Nib's gate, then the cell, before the water: the boar comes out at Nib.
    [['N', 'S', 'P', 'K', 'W', 'G', 'L', 'E'], 'inked'],
    // The barricade's lava last: Nib is waiting at the crate, under the chute.
    [['S', 'P', 'W', 'K', 'N', 'G', 'E', 'L'], 'burnt'],
  ])('%j loses: %s', (order, cause) => {
    expect(outcome(order)).toBe(cause);
  });
}, 120_000);
