import { describe, expect, it } from 'vitest';
import { SPRINGS } from '../src/level/ch2/springs';
import { parseStep, type Stop } from '../src/logic/level';
import { LAVA, STEPS_PER_SECOND, STONE } from '../src/logic/particles';
import { World } from '../src/logic/world';
import { audit } from './audit';
import { play } from './solver';

declare const process: { readonly env: Readonly<Record<string, string | undefined>> };

/** How a pull order ends: 'won', the loss cause, 'playing' (stuck), or 'blocked'. */
const outcome = (order: readonly string[]): string => {
  const r = play(SPRINGS, order);
  if (!r.possible) return 'blocked';
  return r.status.state === 'lost' ? r.status.cause : r.status.state;
};

/**
 * Plays the hint step for step the way the bot does (test/solver.ts's play),
 * and also reports how each salamander went and how much lava was left hot
 * once the cistern had poured.
 */
function watchSolution(): { won: boolean; seconds: number; ends: string[]; hotAfterCistern: number; stone: number } {
  const w = new World(SPRINGS);
  const run = (steps: number): void => {
    for (let s = 0; s < steps && !w.finished; s++) {
      w.step();
      if (s > 30 && w.settled && w.nibOrder.kind === 'stay') break;
    }
  };
  const stops = SPRINGS.stops ?? [];
  const visit = (list: readonly Stop[], steps: number): void => {
    for (const s of list) {
      if (w.finished) return;
      w.command(s.y === undefined ? { kind: 'goto', x: s.x } : { kind: 'goto', x: s.x, y: s.y });
      run(steps);
    }
  };
  let hot = -1;
  for (const { id } of SPRINGS.solution.map(parseStep)) {
    w.tap(id);
    run(STEPS_PER_SECOND * 8);
    if (id === 'W') hot = w.grains.countOf(LAVA);
    visit(stops, STEPS_PER_SECOND * 8);
  }
  const back = [...stops].reverse();
  visit([...back, ...stops, ...back, ...stops], (STEPS_PER_SECOND * 25) / 4);
  w.leave();
  return { won: w.status.state === 'won', seconds: w.steps / STEPS_PER_SECOND, ends: w.blots.map((b) => b.gone ?? 'alive'), hotAfterCistern: hot, stone: w.grains.countOf(STONE) };
}

/** The lava tap's own lava, still in its tank in the hint (it is never pulled). */
const TAP_LAVA = SPRINGS.fills[0]!.count;

describe('Salamander Springs', () => {
  it('is won by its hint in a minute or more: the side tap washes the back salamander, the cistern the other two', () => {
    const r = watchSolution();
    expect(r.won).toBe(true);
    expect(r.seconds).toBeGreaterThanOrEqual(60);
    expect(r.ends).toEqual(['washed', 'washed', 'washed']);
    // Both springs set to stone: only the lava tap's lava is still hot.
    expect(r.hotAfterCistern).toBe(TAP_LAVA);
  });

  it('keeps to the grain budget', () => {
    expect(SPRINGS.fills.reduce((n, f) => n + f.count, 0)).toBeLessThanOrEqual(700);
  });

  it.each([
    // The tempting pull: lava on the back salamander is only a warm bath; it wades across the ditch, sloshing lava over the landing's gold.
    [['L', 'D', 'W', 'K', 'G'], 'melted'],
    // The side tap too late: the great cistern has already emptied, the back salamander stays dry and the guard never goes.
    [['W', 'D', 'K', 'G'], 'playing'],
    // The great cistern first, then the tap: with the back salamander still there the gate never opens for Nib's way home.
    [['W', 'K', 'G', 'D'], 'playing'],
    // Nib's gate on the hot great spring.
    [['G', 'D', 'W', 'K', 'L'], 'burnt'],
    // The gold before the cistern: it drops into the far spring while it's still hot.
    [['D', 'K', 'W', 'G', 'L'], 'melted'],
  ])('%j loses: %s', (order, cause) => {
    expect(outcome(order)).toBe(cause);
  });

  if (process.env.AUDIT) it('audit', () => console.log('AUDIT ' + JSON.stringify(audit(SPRINGS))), 3_600_000);
}, 300_000);
