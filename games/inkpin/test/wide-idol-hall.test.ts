import { describe, expect, it } from 'vitest';
import { IDOL_HALL } from '../src/level/idolHall';
import type { Stop } from '../src/logic/level';
import { STEPS_PER_SECOND, STONE, WATER } from '../src/logic/particles';
import { World } from '../src/logic/world';
import { play } from './solver';

/** The cistern over the Great Boar (inside its walls, above its floor pin R). */
const CISTERN = { x0: 1616, x1: 1900, y0: 700, y1: 898 };

/** How a pull order ends: 'won', the loss cause, 'playing' (stuck), or 'blocked'. */
const outcome = (order: readonly string[]): string => {
  const r = play(IDOL_HALL, order);
  if (!r.possible) return 'blocked';
  return r.status.state === 'lost' ? r.status.cause : r.status.state;
};

/** Water grains in the cistern right now. */
function inCistern(w: World): number {
  const g = w.grains;
  let n = 0;
  for (let i = 0; i < g.count; i++) {
    if (g.kind[i] === WATER && g.x[i]! > CISTERN.x0 && g.x[i]! < CISTERN.x1 && g.y[i]! > CISTERN.y0 && g.y[i]! < CISTERN.y1) n++;
  }
  return n;
}

/**
 * Plays the hint step for step the way the bot does (test/solver.ts's play),
 * and also reports what each stage left behind: how much of the flood was in
 * the cistern when it opened, the stone in the moat, the seed, the crate and
 * the boar.
 */
function watchSolution(): { won: boolean; seconds: number; flood: number; stone: number; world: World } {
  const w = new World(IDOL_HALL);
  const run = (steps: number): void => {
    for (let s = 0; s < steps && !w.finished; s++) {
      w.step();
      if (s > 30 && w.settled && w.nibOrder.kind === 'stay') break;
    }
  };
  const stops = IDOL_HALL.stops ?? [];
  const visit = (list: readonly Stop[], steps: number): void => {
    for (const s of list) {
      if (w.finished) return;
      w.command(s.y === undefined ? { kind: 'goto', x: s.x } : { kind: 'goto', x: s.x, y: s.y });
      run(steps);
    }
  };
  let flood = 0;
  let stone = 0;
  for (const id of IDOL_HALL.solution) {
    if (id === 'R') flood = inCistern(w);
    w.pull(id);
    run(STEPS_PER_SECOND * 8);
    if (id === 'W') stone = w.grains.countOf(STONE);
    visit(stops, STEPS_PER_SECOND * 8);
  }
  const back = [...stops].reverse();
  visit([...back, ...stops, ...back, ...stops], (STEPS_PER_SECOND * 25) / 4);
  w.leave();
  return { won: w.status.state === 'won', seconds: w.steps / STEPS_PER_SECOND, flood, stone, world: w };
}

describe('The Idol Hall, wide', () => {
  it('is won by its hint in a minute or more: the flood saved for the boar, the tank’s last water on the moat and the seed', () => {
    const r = watchSolution();
    expect(r.won).toBe(true);
    expect(r.seconds).toBeGreaterThanOrEqual(60);
    // Nearly the whole tank went down the aqueduct and waited in the cistern.
    expect(r.flood).toBeGreaterThan(200);
    // The water the tank's well kept back set the whole moat to stone, and grew the seed past it.
    expect(r.stone).toBe(64);
    expect(r.world.vines[0]!.grown).toBe(1);
    // The crate settled in its slot in the tunnel, a bridge level with the floor.
    const crate = r.world.boulders.find((b) => b.crate)!;
    expect(crate.gone).toBe(false);
    expect(Math.abs(crate.x - 1286)).toBeLessThan(8);
    expect(crate.y).toBeGreaterThan(830);
    expect(r.world.blots[0]!.gone).toBe('washed');
  });

  it('keeps to the grain budget', () => {
    expect(IDOL_HALL.fills.reduce((n, f) => n + f.count, 0)).toBeLessThanOrEqual(700);
  });

  it.each([
    // The tempting pin: the great tank's floor, right over the lava. The whole flood is spent on the
    // moat and runs away down the seed room's grate, the cistern stays dry, and the boar is waiting.
    [['W', 'K', 'A', 'D', 'R', 'G'], 'inked'],
    // The cistern opened before the flood came: the stream drops past the baffle into the drain.
    [['K', 'R', 'A', 'W', 'D', 'G'], 'inked'],
    // The moat's gold before its water: it melts on the lava.
    [['K', 'A', 'D', 'W', 'R', 'G'], 'melted'],
    // Nib's gate on the hot moat: Nib walks into it.
    [['K', 'A', 'G', 'W', 'D', 'R'], 'burnt'],
    // Nib let in before the crate: he drops into its slot and the crate comes down on him.
    [['A', 'W', 'D', 'R', 'G', 'K'], 'crushed'],
    // Nib let in before the flood: the boar is still there at the foot of the hall.
    [['K', 'A', 'W', 'D', 'G', 'R'], 'inked'],
  ])('%j loses: %s', (order, cause) => {
    expect(outcome(order)).toBe(cause);
  });
}, 240_000);
