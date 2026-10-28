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
 * and also reports how high the crate rose and how far right Nib got. With
 * `tail` off it stops after the pulls, before the bot's last sweeps.
 */
function watch(level: LevelDef, order = level.solution, tail = true): { won: boolean; seconds: number; crateRose: number; farthest: number } {
  const w = new World(level);
  const crate = w.boulders.find((b) => b.crate);
  const startY = crate?.y ?? 0;
  let topY = startY;
  let farthest = w.nib.x;
  const run = (steps: number): void => {
    for (let s = 0; s < steps && !w.finished; s++) {
      w.step();
      if (crate) topY = Math.min(topY, crate.y);
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
  return { won: w.status.state === 'won', seconds: w.steps / STEPS_PER_SECOND, crateRose: startY - topY, farthest };
}

describe('The Rain Cistern, wide', () => {
  it('is won by its hint in a minute or more, the crate floating up the pit as a step', () => {
    const r = watch(CISTERN);
    expect(r.won).toBe(true);
    expect(r.seconds).toBeGreaterThanOrEqual(60);
    expect(r.crateRose).toBeGreaterThan(100);
  });

  it('needs the crate: without it Nib never gets up to the ledge', () => {
    // The ledge starts past the pit's far wall (x 1204).
    expect(watch(CISTERN, ['S', 'W', 'X'], false).farthest).toBeGreaterThan(1300);
    expect(watch({ ...CISTERN, crates: [] }, ['S', 'W', 'X'], false).farthest).toBeLessThan(1204);
  });

  it('floats the crate up as a step while Nib waits in the lock room (the overflow holds the water there)', () => {
    const w = new World(CISTERN);
    const run = (n: number): void => {
      for (let s = 0; s < n; s++) w.step();
    };
    const go = (x: number): void => {
      w.command({ kind: 'goto', x });
      for (let s = 0; s < 3000; s++) {
        w.step();
        if (s > 20 && w.nibOrder.kind === 'stay') break;
      }
    };
    w.pull('S');
    run(400);
    w.pull('W');
    run(900);
    go(500);
    go(1000);
    w.pull('X');
    run(16 * STEPS_PER_SECOND);
    const crate = w.boulders.find((b) => b.crate)!;
    // Afloat at about the floor's height (it bobs a little), and Nib gets over it onto the ledge.
    expect(crate.y).toBeGreaterThan(1240);
    expect(crate.y).toBeLessThan(1300);
    go(1300);
    expect(w.nib.x).toBeGreaterThan(1290);
  });

  it('keeps to the grain budget', () => {
    expect(CISTERN.fills.reduce((n, f) => n + f.count, 0)).toBeLessThanOrEqual(700);
  });

  it.each([
    // The rain before the cistern's boulder: the gold runs down its drain.
    [['W', 'S', 'X', 'R', 'G'], 'drained'],
    // The sluice before the rain: the water runs out as it comes in, and Nib stays down the cistern.
    [['S', 'X', 'W', 'R', 'G'], 'playing'],
    // The hopper before its ramp: the gold slides down to the ramp's drain.
    [['S', 'W', 'X', 'G', 'R'], 'drained'],
  ])('%j loses: %s', (order, cause) => {
    expect(outcome(order)).toBe(cause);
  });
}, 120_000);
