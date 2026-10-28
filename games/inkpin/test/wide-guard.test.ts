import { describe, expect, it } from 'vitest';
import { GUARD } from '../src/level/guard';
import type { Stop } from '../src/logic/level';
import { STEPS_PER_SECOND, STONE } from '../src/logic/particles';
import { World } from '../src/logic/world';
import { play } from './solver';

/** How a pull order ends: 'won', the loss cause, 'playing' (stuck), or 'blocked'. */
const outcome = (order: readonly string[]): string => {
  const r = play(GUARD, order);
  if (!r.possible) return 'blocked';
  return r.status.state === 'lost' ? r.status.cause : r.status.state;
};

/**
 * Plays the hint step for step the way the bot does (test/solver.ts's play),
 * and also reports how the guards went and whether the lava set to stone.
 */
function watchSolution(): { won: boolean; seconds: number; ends: string[]; stone: number } {
  const w = new World(GUARD);
  const run = (steps: number): void => {
    for (let s = 0; s < steps && !w.finished; s++) {
      w.step();
      if (s > 30 && w.settled && w.nibOrder.kind === 'stay') break;
    }
  };
  const stops = GUARD.stops ?? [];
  const visit = (list: readonly Stop[], steps: number): void => {
    for (const s of list) {
      if (w.finished) return;
      w.command(s.y === undefined ? { kind: 'goto', x: s.x } : { kind: 'goto', x: s.x, y: s.y });
      run(steps);
    }
  };
  let stone = 0;
  for (const id of GUARD.solution) {
    w.pull(id);
    run(STEPS_PER_SECOND * 8);
    if (id === 'C') stone = w.grains.countOf(STONE);
    visit(stops, STEPS_PER_SECOND * 8);
  }
  const back = [...stops].reverse();
  visit([...back, ...stops, ...back, ...stops], (STEPS_PER_SECOND * 25) / 4);
  w.leave();
  return { won: w.status.state === 'won', seconds: w.steps / STEPS_PER_SECOND, ends: w.blots.map((b) => b.gone ?? 'alive'), stone };
}

describe('The Guard, wide', () => {
  it('is won by its hint in a minute or more, beating one guard each way: burnt, washed, squashed', () => {
    const r = watchSolution();
    expect(r.won).toBe(true);
    expect(r.seconds).toBeGreaterThanOrEqual(60);
    expect(r.ends).toEqual(['scorched', 'washed', 'stomped']);
    // The water turned the lava pool to stone.
    expect(r.stone).toBeGreaterThan(60);
  });

  it('keeps to the grain budget', () => {
    expect(GUARD.fills.reduce((n, f) => n + f.count, 0)).toBeLessThanOrEqual(700);
  });

  it.each([
    // The water before the lava: the lava sets as stone in its tank, and the first boar lives.
    [['C', 'L', 'G', 'V', 'K', 'H'], 'inked'],
    // Nib's gate on the hot pool: Nib walks into the lava.
    [['L', 'G', 'C', 'V', 'K', 'H'], 'burnt'],
    // The second gate before the second boar's water.
    [['L', 'C', 'G', 'H', 'V', 'K'], 'inked'],
    // On to the chest before the crate: Nib drops onto the porcupine.
    [['L', 'C', 'G', 'V', 'H', 'K'], 'pricked'],
  ])('%j loses: %s', (order, cause) => {
    expect(outcome(order)).toBe(cause);
  });
}, 120_000);
