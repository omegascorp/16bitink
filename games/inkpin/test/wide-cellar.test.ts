import { describe, expect, it } from 'vitest';
import { CELLAR } from '../src/level/cellar';
import type { LevelDef } from '../src/logic/level';
import { STONE } from '../src/logic/particles';
import { World } from '../src/logic/world';
import { play } from './solver';

/** How a pull order ends: 'won', the loss cause, 'playing' (stuck), or 'blocked'. */
const outcome = (order: readonly string[]): string => {
  const r = play(CELLAR, order);
  if (!r.possible) return 'blocked';
  return r.status.state === 'lost' ? r.status.cause : r.status.state;
};

/** Plays an order like the solver's eager bot, and hands back the world to look at. */
const playWorld = (level: LevelDef, order: readonly string[]): World => {
  const w = new World(level);
  const run = (steps: number): void => {
    for (let s = 0; s < steps && !w.finished; s++) {
      w.step();
      if (s > 30 && w.settled && w.nibOrder.kind === 'stay') break;
    }
  };
  const stops = level.stops ?? [];
  const visit = (list: typeof stops, steps: number): void => {
    for (const s of list) {
      if (w.finished) return;
      w.command(s.y === undefined ? { kind: 'goto', x: s.x } : { kind: 'goto', x: s.x, y: s.y });
      run(steps);
    }
  };
  for (const id of order) {
    w.pull(id);
    run(960);
    visit(stops, 960);
  }
  return w;
};

describe('The Gold Vault, four rooms wide', () => {
  it('is won by the hint’s order, and takes the bot at least a minute', () => {
    const r = play(CELLAR, CELLAR.solution);
    expect(r.status.state).toBe('won');
    expect(r.steps / 120).toBeGreaterThanOrEqual(60);
  });

  it('grows the vault’s vine, keeps it from the lava, and sets the lava to stone', () => {
    const w = playWorld(CELLAR, CELLAR.solution);
    const vine = w.vines[0]!;
    expect(vine.grown).toBe(1);
    expect(vine.burnt).toBe(false);
    expect(w.chestTaken).toBe(true);
    expect(w.blots[0]!.gone).toBe('scorched');
    let stone = 0;
    for (let i = 0; i < w.grains.count; i++) if (w.grains.kind[i] === STONE && w.grains.x[i]! > 1720) stone++;
    expect(stone).toBeGreaterThan(15);
  });

  it('melts the moat’s gold if it goes in before the water', () => {
    expect(outcome(['C1', 'W1', 'L2', 'W2', 'G1', 'B3', 'G2', 'C3', 'W', 'L', 'C'])).toBe('melted');
  });

  it('leaves the porcupine alive if the water cools the lava in its tank first', () => {
    expect(['pricked', 'inked']).toContain(outcome(['W1', 'C1', 'W2', 'L2', 'G1', 'B3', 'G2', 'C3', 'W', 'L', 'C']));
  });

  it('drops Nib onto the porcupine if the first gate opens too soon', () => {
    expect(['pricked', 'inked']).toContain(outcome(['W1', 'C1', 'G1', 'L2', 'W2', 'B3', 'G2', 'C3', 'W', 'L', 'C']));
  });

  it('runs the gold down the drain before the boulder plugs it', () => {
    expect(outcome(['W1', 'C1', 'L2', 'W2', 'G1', 'C3', 'B3', 'G2', 'W', 'L', 'C'])).toBe('drained');
  });

  it('burns the seed (and Nib by it) if the lava comes before the water', () => {
    expect(outcome(['W1', 'C1', 'L2', 'W2', 'G1', 'B3', 'G2', 'C3', 'L', 'W', 'C'])).toBe('burnt');
    // With Nib out of the way, the seed still burns, and the chest is out of reach.
    const away = { ...CELLAR, stops: CELLAR.stops!.filter((s) => s.x < 1700) };
    const w = playWorld(away, ['W1', 'C1', 'L2', 'W2', 'G1', 'B3', 'G2', 'C3', 'L', 'W']);
    expect(w.vines[0]!.burnt).toBe(true);
  });

  it('keeps the vault’s gold behind the lava', () => {
    expect(outcome(['W1', 'C1', 'L2', 'W2', 'G1', 'B3', 'G2', 'C3', 'W', 'C'])).toBe('blocked');
  });
}, 120_000);
