import { describe, expect, it } from 'vitest';
import { JUST_ENOUGH } from '../src/level/ch2/justEnough';
import { parseStep, type Stop } from '../src/logic/level';
import { LAVA, STEPS_PER_SECOND, WATER } from '../src/logic/particles';
import { World } from '../src/logic/world';
import { audit } from './audit';
import { play } from './solver';

declare const process: { readonly env: Readonly<Record<string, string | undefined>> };

/** The far pool's well (inside its walls). */
const WELL = { x0: 1100, x1: 1170 };

/** How an order ends: 'won', the loss cause, 'playing' (stuck), or 'blocked'. */
const outcome = (order: readonly string[]): string => {
  const r = play(JUST_ENOUGH, order);
  if (!r.possible) return 'blocked';
  return r.status.state === 'lost' ? r.status.cause : r.status.state;
};

/**
 * Plays the hint step for step the way the bot does (test/solver.ts's play),
 * and also reports what each stage left: the moat's lava when the gate went
 * back in and once things settled, and the water the switch sent to the well.
 */
function watchSolution(): { won: boolean; seconds: number; lavaAtCut: number; lavaAfter: number; well: number } {
  const w = new World(JUST_ENOUGH);
  const run = (steps: number): void => {
    for (let s = 0; s < steps && !w.finished; s++) {
      w.step();
      if (s > 30 && w.settled && w.nibOrder.kind === 'stay') break;
    }
  };
  const stops = JUST_ENOUGH.stops ?? [];
  const visit = (list: readonly Stop[], steps: number): void => {
    for (const s of list) {
      if (w.finished) return;
      w.command({ kind: 'goto', x: s.x });
      run(steps);
    }
  };
  const inWell = (): number => {
    const g = w.grains;
    let n = 0;
    for (let i = 0; i < g.count; i++) if (g.kind[i] === WATER && g.x[i]! > WELL.x0 && g.x[i]! < WELL.x1 && g.y[i]! > 1000) n++;
    return n;
  };
  let lavaAtCut = -1;
  let lavaAfter = -1;
  let well = 0;
  const steps = JUST_ENOUGH.solution.map(parseStep);
  for (let i = 0; i < steps.length; i++) {
    const { id, wait } = steps[i]!;
    if (wait !== null) for (let s = Math.round(wait * STEPS_PER_SECOND); s > 0; s--) w.step();
    const pushing = w.pins.find((p) => p.def.id === id)?.pulledAt != null;
    if (pushing) lavaAtCut = w.grains.countOf(LAVA);
    expect(w.tap(id)).toBe(true);
    if (steps[i + 1]?.wait != null) continue;
    run(STEPS_PER_SECOND * 8);
    if (pushing) lavaAfter = w.grains.countOf(LAVA);
    if (id === 'S') well = inWell();
    visit(stops, STEPS_PER_SECOND * 8);
  }
  const back = [...stops].reverse();
  visit([...back, ...stops, ...back, ...stops], (STEPS_PER_SECOND * 25) / 4);
  w.leave();
  return { won: w.status.state === 'won', seconds: w.steps / STEPS_PER_SECOND, lavaAtCut, lavaAfter, well };
}

describe('Just Enough', () => {
  it('is won by its hint in a minute or more: the gate cut once the moat is stone, the rest switched to the far pool', () => {
    const r = watchSolution();
    expect(r.won).toBe(true);
    expect(r.seconds).toBeGreaterThanOrEqual(60);
    // The cue: the moat is all stone when the gate goes back in.
    expect(r.lavaAtCut).toBe(0);
    expect(r.lavaAfter).toBe(0);
    // The switch sent the rest of the cistern to the well, deep enough to float Nib up.
    expect(r.well).toBeGreaterThan(20);
  });

  it('keeps to the grain budget', () => {
    expect(JUST_ENOUGH.fills.reduce((n, f) => n + f.count, 0)).toBeLessThanOrEqual(700);
  });

  it('teaches the gate', () => {
    expect(JUST_ENOUGH.pins.filter((p) => p.gate).map((p) => p.id)).toEqual(['G']);
    expect(JUST_ENOUGH.tip).toMatch(/gate/i);
  });

  // The winning window: the gate pushed back in from about 2 s after it's pulled (the bowl
  // has brimmed over, and enough is on its way to set the moat; 1.75 s is too soon) to about
  // 9 s (the moat not yet brimming over onto the gold; 9.5 s is too late). The cue, the moat
  // all stone, shows at about 4.2 s. Both ends are tested here, a little inside the edges.
  it.each([
    [['G', 'G~2.25', 'H', 'S']],
    [['G', 'G~8.5', 'H', 'S']],
    // The switch before the hopper wins too.
    [['G', 'G~4.5', 'S', 'H']],
  ])('%j wins: the gate back in anywhere in its window', (order) => {
    expect(outcome(order)).toBe('won');
  });

  it.each([
    // The tempting pin: the gold over the moat, nearest Nib. It drops into the hot lava and melts.
    [['H', 'G', 'G~4.5', 'S'], 'melted'],
    // The side door first: with the gate in, the whole cistern slides out to the far pool, and Nib walks into the hot moat.
    [['S', 'G', 'G~4.5', 'H'], 'burnt'],
    // The gate never cut: the moat brims over and washes the shelf's gold down the drain.
    [['G', 'H', 'S'], 'drained'],
    // Cut too soon: the bowl hasn't brimmed over, the moat stays hot and Nib walks into it.
    [['G', 'G~1.5', 'H', 'S'], 'burnt'],
    // Cut too late: the moat has already brimmed over onto the gold.
    [['G', 'G~10', 'H', 'S'], 'drained'],
  ])('%j loses: %s', (order, cause) => {
    expect(outcome(order)).toBe(cause);
  });

  if (process.env.AUDIT) it('audit', () => console.log('AUDIT ' + JSON.stringify(audit(JUST_ENOUGH))), 3_600_000);
}, 600_000);
