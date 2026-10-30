import { describe, expect, it } from 'vitest';
import { TORCHES } from '../src/level/torches';
import type { Stop } from '../src/logic/level';
import { LAVA, STEPS_PER_SECOND, STONE } from '../src/logic/particles';
import { World } from '../src/logic/world';
import { play } from './solver';

/** How a pull order ends for the eager bot: 'won', the loss cause, 'playing' (stuck), or 'blocked'. */
const outcome = (order: readonly string[]): string => {
  const r = play(TORCHES, order);
  if (!r.possible) return 'blocked';
  return r.status.state === 'lost' ? r.status.cause : r.status.state;
};

/**
 * Plays the hint step for step the way the bot does (test/solver.ts's play),
 * and notes how the guards went, the sump once the water has come, and the
 * seed.
 */
function watchSolution(): { won: boolean; seconds: number; ends: string[]; sumpLava: number; stone: number; vine: number; sumpVine: boolean } {
  const w = new World(TORCHES);
  const run = (steps: number): void => {
    for (let s = 0; s < steps && !w.finished; s++) {
      w.step();
      if (s > 30 && w.settled && w.nibOrder.kind === 'stay') break;
    }
  };
  const stops = TORCHES.stops ?? [];
  const visit = (list: readonly Stop[], steps: number): void => {
    for (const s of list) {
      if (w.finished) return;
      w.command(s.y === undefined ? { kind: 'goto', x: s.x } : { kind: 'goto', x: s.x, y: s.y });
      run(steps);
    }
  };
  let sumpLava = -1;
  let stone = 0;
  for (const id of TORCHES.solution) {
    w.pull(id);
    run(STEPS_PER_SECOND * 8);
    if (id === 'W') {
      // Only the lamp's lava is left hot: the sump has set.
      sumpLava = w.grains.countOf(LAVA) - TORCHES.fills.filter((f) => f.kind === LAVA && f.x0 < 1000).reduce((n, f) => n + f.count, 0);
      stone = w.grains.countOf(STONE);
    }
    visit(stops, STEPS_PER_SECOND * 8);
  }
  const back = [...stops].reverse();
  visit([...back, ...stops, ...back, ...stops], (STEPS_PER_SECOND * 25) / 4);
  w.leave();
  return { won: w.status.state === 'won', seconds: w.steps / STEPS_PER_SECOND, ends: w.blots.map((b) => b.gone ?? 'alive'), sumpLava, stone, vine: w.vines[0]!.grown, sumpVine: !w.vines[1]!.burnt };
}

describe('Torches Out, wide', () => {
  it('is won by its hint in a minute or more: the pen porcupine scorched, the pit porcupine washed', () => {
    const r = watchSolution();
    expect(r.won).toBe(true);
    expect(r.seconds).toBeGreaterThanOrEqual(60);
    expect(r.ends).toEqual(['scorched', 'washed']);
    // The tank set the whole sump to stone, and the seed grew.
    expect(r.sumpLava).toBe(0);
    expect(r.stone).toBeGreaterThan(50);
    expect(r.vine).toBe(1);
    // The vine out of the sump hangs just clear of the lava: it never burns.
    expect(r.sumpVine).toBe(true);
  });

  it('keeps to the grain budget', () => {
    expect(TORCHES.fills.reduce((n, f) => n + f.count, 0)).toBeLessThanOrEqual(700);
  });

  it.each([
    // The pen's floor before its slot: the gold drops into the sump with the porcupine and melts.
    [['P', 'C', 'W', 'V', 'L', 'S', 'G'], 'melted'],
    // The tank over the fire first: the porcupine lands on cold stone and waits for Nib in the dark.
    [['W', 'C', 'P', 'V', 'L', 'S', 'G'], 'inked|pricked'],
    // The gate while the sump still glows: Nib walks on and drops into the lava.
    [['C', 'P', 'S', 'G', 'W', 'V', 'L'], 'burnt'],
    // The pen left shut: Nib drops into it with the porcupine.
    [['C', 'V', 'L', 'W', 'G', 'S', 'P'], 'inked'],
    // The lamp before the water: its lava runs into the dry pit and melts the gold.
    [['C', 'P', 'W', 'L', 'V', 'S', 'G'], 'melted'],
    // The gate before the water: Nib comes down into the gold hall and walks into the pit's porcupine.
    [['C', 'P', 'W', 'S', 'G', 'V', 'L'], 'inked'],
    // The lamp with Nib down in the pool: it lands on him.
    [['C', 'P', 'W', 'V', 'S', 'G', 'L'], 'burnt'],
  ])('%j loses: %s', (order, cause) => {
    // Landing beside a porcupine or on its spines are the same lesson.
    expect(cause.split('|')).toContain(outcome(order));
  });
}, 300_000);
