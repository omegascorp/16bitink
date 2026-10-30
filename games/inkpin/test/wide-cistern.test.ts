import { describe, expect, it } from 'vitest';
import { CISTERN } from '../src/level/cistern';
import type { LevelDef, Stop } from '../src/logic/level';
import { STEPS_PER_SECOND } from '../src/logic/particles';
import { World } from '../src/logic/world';
import { play } from './solver';

/** How a pull order ends: 'won', the loss cause, 'playing' (stuck), or 'blocked'. */
const outcome = (order: readonly string[]): string => {
  const r = play(CISTERN, order);
  if (!r.possible) return 'blocked';
  return r.status.state === 'lost' ? r.status.cause : r.status.state;
};

/**
 * Plays the hint step for step the way the bot does (test/solver.ts's play),
 * and also reports how high the crate rose from the bottom of its pit, how far right Nib got, whether
 * the porcupine was washed away and whether the seed grew. With `tail` off
 * it stops after the pulls, before the bot's last sweeps.
 */
function watch(level: LevelDef, order = level.solution, tail = true): { won: boolean; seconds: number; crateRose: number; farthest: number; washed: boolean; grown: boolean } {
  const w = new World(level);
  const crate = w.boulders.find((b) => b.crate);
  // The crate's lowest point: the bottom of the pit, once it has been dropped in.
  let lowest = crate?.y ?? 0;
  let farthest = w.nib.x;
  const run = (steps: number): void => {
    for (let s = 0; s < steps && !w.finished; s++) {
      w.step();
      if (crate) lowest = Math.max(lowest, crate.y);
      farthest = Math.max(farthest, w.nib.x);
      if (s > 30 && w.settled && w.nibOrder.kind === 'stay') break;
    }
  };
  const stops = level.stops ?? [];
  const visit = (list: readonly Stop[], steps: number): void => {
    for (const s of list) {
      if (w.finished) return;
      w.command(s.y === undefined ? { kind: 'goto', x: s.x } : { kind: 'goto', x: s.x, y: s.y });
      run(steps);
    }
  };
  for (const id of order) {
    w.pull(id);
    run(STEPS_PER_SECOND * 8);
    visit(stops, STEPS_PER_SECOND * 8);
  }
  if (tail) {
    const back = [...stops].reverse();
    visit([...back, ...stops, ...back, ...stops], (STEPS_PER_SECOND * 25) / 4);
    w.leave();
  }
  return {
    won: w.status.state === 'won',
    seconds: w.steps / STEPS_PER_SECOND,
    crateRose: lowest - (crate?.y ?? 0),
    farthest,
    washed: w.blots.every((b) => b.gone === 'washed'),
    grown: w.vines.every((v) => v.grown >= 1),
  };
}

describe('The Rain Cistern, wide', () => {
  it('is won by its hint in a minute or more: the sluice washes the porcupine away, the crate floats up and the overflow grows the vine', () => {
    const r = watch(CISTERN);
    expect(r.won).toBe(true);
    expect(r.seconds).toBeGreaterThanOrEqual(60);
    expect(r.crateRose).toBeGreaterThan(100);
    expect(r.washed).toBe(true);
    expect(r.grown).toBe(true);
  });

  it('needs the crate: without it Nib never gets up to the ledge past the pit', () => {
    // The ledge starts past the pit's far wall (x 1034).
    expect(watch(CISTERN, CISTERN.solution, false).farthest).toBeGreaterThan(1300);
    expect(watch({ ...CISTERN, crates: [] }, ['S', 'W', 'X'], false).farthest).toBeLessThan(1034);
  });

  it('can be played patiently too: Nib waits on the lock room floor, then steps onto the crate as it floats up', () => {
    const w = new World(CISTERN);
    const run = (n: number): void => {
      for (let s = 0; s < n && !w.finished; s++) w.step();
    };
    const go = (x: number, y?: number): void => {
      w.command(y === undefined ? { kind: 'goto', x } : { kind: 'goto', x, y });
      for (let s = 0; s < 4000 && !w.finished; s++) {
        w.step();
        if (s > 20 && w.nibOrder.kind === 'stay') break;
      }
    };
    w.pull('S');
    run(400);
    w.pull('C');
    run(300);
    w.pull('W');
    run(900);
    go(500);
    go(860);
    w.pull('X');
    run(16 * STEPS_PER_SECOND);
    const crate = w.boulders.find((b) => b.crate)!;
    // Afloat at about the lock room floor's height (it bobs a little): a step up from the floor, and on up to the ledge.
    expect(crate.y).toBeGreaterThan(1240);
    expect(crate.y).toBeLessThan(1300);
    go(1250);
    expect(w.nib.x).toBeGreaterThan(1200);
    go(1634, 1254);
    go(1760);
    expect(w.chestTaken).toBe(true);
    expect(w.goalMet).toBe(true);
  });

  it('keeps to the grain budget', () => {
    expect(CISTERN.fills.reduce((n, f) => n + f.count, 0)).toBeLessThanOrEqual(700);
  });

  it.each([
    // The rain before the boulder: the gold runs down the open drain.
    [['W', 'S', 'C', 'X'], 'drained'],
    // The sluice while Nib is still down the cistern: the porcupine walks in.
    [['S', 'X', 'C', 'W'], 'inked'],
    [['X', 'S', 'C', 'W'], 'inked'],
    // Nib waits by the sluice, right under the boulder's niche, and the boulder comes down on him.
    [['C', 'S', 'W', 'X'], 'crushed'],
    // The crate dropped once Nib is down in the pit (dry, or swimming in it).
    [['S', 'W', 'C', 'X'], 'crushed'],
    [['S', 'W', 'X', 'C'], 'crushed'],
  ])('%j loses: %s', (order, cause) => {
    expect(outcome(order)).toBe(cause);
  });
}, 120_000);
