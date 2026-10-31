import { describe, expect, it } from 'vitest';
import { EMBER_LIGHT } from '../src/level/ch2/emberLight';
import { parseStep, type Stop } from '../src/logic/level';
import { LAVA, STEPS_PER_SECOND } from '../src/logic/particles';
import { World } from '../src/logic/world';
import { audit } from './audit';
import { play } from './solver';

declare const process: { readonly env: Readonly<Record<string, string | undefined>> };

/** How a pull order ends for the eager bot: 'won', the loss cause, 'playing' (stuck), or 'blocked'. */
const outcome = (order: readonly string[]): string => {
  const r = play(EMBER_LIGHT, order);
  if (!r.possible) return 'blocked';
  return r.status.state === 'lost' ? r.status.cause : r.status.state;
};

/**
 * Plays the hint step for step the way the bot does (test/solver.ts's play),
 * and notes where the salamander was when the water came, how it went, and
 * how much lava was left once the tank had poured.
 */
function watchSolution(): { won: boolean; seconds: number; salamanderAtW: number; end: string; lavaAfterW: number; rubies: boolean } {
  const w = new World(EMBER_LIGHT);
  const run = (steps: number): void => {
    for (let s = 0; s < steps && !w.finished; s++) {
      w.step();
      if (s > 30 && w.settled && w.nibOrder.kind === 'stay') break;
    }
  };
  const stops = EMBER_LIGHT.stops ?? [];
  const visit = (list: readonly Stop[], steps: number): void => {
    for (const s of list) {
      if (w.finished) return;
      w.command(s.y === undefined ? { kind: 'goto', x: s.x } : { kind: 'goto', x: s.x, y: s.y });
      run(steps);
    }
  };
  let salamanderAtW = 0;
  let lavaAfterW = -1;
  for (const { id } of EMBER_LIGHT.solution.map(parseStep)) {
    if (id === 'W') salamanderAtW = w.blots[0]!.x;
    w.tap(id);
    run(STEPS_PER_SECOND * 8);
    if (id === 'W') lavaAfterW = w.grains.countOf(LAVA);
    visit(stops, STEPS_PER_SECOND * 8);
  }
  const back = [...stops].reverse();
  visit([...back, ...stops, ...back, ...stops], (STEPS_PER_SECOND * 25) / 4);
  w.leave();
  return {
    won: w.status.state === 'won',
    seconds: w.steps / STEPS_PER_SECOND,
    salamanderAtW,
    end: w.blots[0]!.gone ?? 'alive',
    lavaAfterW,
    rubies: w.rubies.every((r) => r.taken),
  };
}

describe('Ember Light', () => {
  it('is won by its hint in a minute or more: the salamander comes to the sill, and the water washes it there', () => {
    const r = watchSolution();
    expect(r.won).toBe(true);
    expect(r.seconds).toBeGreaterThanOrEqual(60);
    // It came across the bath to Nib's sill (x 410) before the water came.
    expect(r.salamanderAtW).toBeLessThan(520);
    expect(r.end).toBe('washed');
    // The bath set to stone (the brazier's lava was cooled before).
    expect(r.lavaAfterW).toBe(0);
    // The rubies it pushed to the sill were dug out of the stone.
    expect(r.rubies).toBe(true);
  });

  it('keeps to the grain budget', () => {
    expect(EMBER_LIGHT.fills.reduce((n, f) => n + f.count, 0)).toBeLessThanOrEqual(700);
  });

  it('the tank can’t be pulled before Nib’s shelf gate: its pin is in the gate’s way', () => {
    expect(outcome(['W', 'S', 'K', 'V', 'H', 'G'])).toBe('blocked');
  });

  it.each([
    // The door right beside Nib in his pit: the bath's lava pours in on him.
    [['S', 'G', 'K', 'V', 'H', 'W'], 'burnt'],
    // The door before Nib is even down: the lava fills the pit he drops into.
    [['G', 'S', 'K', 'V', 'H', 'W'], 'burnt'],
    // The hall's water before its brazier: the lava sets in the brazier, and the armadillo waits for Nib.
    [['S', 'V', 'K', 'H', 'W', 'G'], 'inked'],
    // The gold before the brazier: the lava pours over it.
    [['S', 'H', 'K', 'V', 'W', 'G'], 'melted'],
    // Out of the pit with the brazier's lava still hot on the hall floor: Nib walks into it.
    [['S', 'K', 'W', 'G', 'V', 'H'], 'burnt'],
    // Out of the pit with the armadillo still pacing the hall.
    [['S', 'W', 'G', 'K', 'V', 'H'], 'inked'],
  ])('%j loses: %s', (order, cause) => {
    expect(outcome(order)).toBe(cause);
  });

  if (process.env.AUDIT) it('audit', () => console.log('AUDIT ' + JSON.stringify(audit(EMBER_LIGHT))), 3_600_000);
}, 600_000);
