import { describe, expect, it } from 'vitest';
import { CELLAR } from '../src/level/cellar';
import type { Stop } from '../src/logic/level';
import { COIN, LAVA, STEPS_PER_SECOND, STONE } from '../src/logic/particles';
import { World } from '../src/logic/world';
import { play } from './solver';

/** How a pull order ends: 'won', the loss cause, 'playing' (stuck), or 'blocked'. */
const outcome = (order: readonly string[]): string => {
  const r = play(CELLAR, order);
  if (!r.possible) return 'blocked';
  return r.status.state === 'lost' ? r.status.cause : r.status.state;
};

/** Plays an order step for step the way the bot does (test/solver.ts's play), and hands back the world to look at. */
function playWorld(order: readonly string[]): World {
  const w = new World(CELLAR);
  const run = (steps: number): void => {
    for (let s = 0; s < steps && !w.finished; s++) {
      w.step();
      if (s > 30 && w.settled && w.nibOrder.kind === 'stay') break;
    }
  };
  const stops = CELLAR.stops ?? [];
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
  return w;
}

/** Grains of a kind inside the vault (right of the pit's door). */
const inVault = (w: World, kind: number): number => {
  let n = 0;
  for (let i = 0; i < w.grains.count; i++) if (w.grains.kind[i] === kind && w.grains.x[i]! > 1200) n++;
  return n;
};

describe('The Gold Vault, wide', () => {
  it('is won by its hint, and takes the bot at least a minute', () => {
    const r = play(CELLAR, CELLAR.solution);
    expect(r.status.state).toBe('won');
    expect(r.steps / STEPS_PER_SECOND).toBeGreaterThanOrEqual(60);
  });

  it('keeps to the grain budget', () => {
    expect(CELLAR.fills.reduce((n, f) => n + f.count, 0)).toBeLessThanOrEqual(700);
  });

  it('does both of the lava’s jobs: it scorches the porcupine, then sets to stone in the vault’s water, clear of the vine', () => {
    const w = playWorld(CELLAR.solution);
    expect(w.blots[0]!.gone).toBe('scorched');
    expect(w.vines[0]!.grown).toBe(1);
    expect(w.vines[0]!.burnt).toBe(false);
    expect(w.chestTaken).toBe(true);
    expect(inVault(w, LAVA)).toBe(0);
    expect(inVault(w, STONE)).toBeGreaterThan(40);
    // Hardly a coin of the hoard melts.
    expect(w.coinsCollected + w.grains.countOf(COIN)).toBeGreaterThanOrEqual(w.coinsTotal - 8);
  });

  it.each([
    // The gold before the boulder: it runs down the ramp and the drain.
    [['C', 'B', 'F', 'W', 'D', 'G'], 'drained'],
    // Any other pin before the boulder: Nib walks over to the pen's door, under it.
    [['F', 'B', 'C', 'W', 'D', 'G'], 'crushed'],
    // The pen's door first, the pin right in front of Nib: the porcupine comes out at him.
    [['G', 'B', 'C', 'F', 'W', 'D'], 'inked'],
    // The door once the porcupine is scorched, but with the lava still in the pit: Nib walks into it.
    [['B', 'C', 'F', 'G', 'W', 'D'], 'burnt'],
    // The lava down to the vault before its water: it runs into the dry pit and melts the hoard.
    [['B', 'C', 'F', 'D', 'W', 'G'], 'melted'],
  ])('%j loses: %s', (order, cause) => {
    expect(outcome(order)).toBe(cause);
  });

  it('drops the porcupine into an empty pit if the lava goes first, and Nib lands on it', () => {
    expect(['inked', 'pricked']).toContain(outcome(['B', 'C', 'W', 'D', 'F', 'G']));
    const w = playWorld(['B', 'C', 'W', 'D', 'F']);
    const porcupine = w.blots[0]!;
    expect(porcupine.gone).toBe(null);
    // It paces the pit, below the pen and back from its open door.
    expect(porcupine.y).toBeGreaterThan(780);
    expect(porcupine.x).toBeLessThan(1200);
  });
}, 300_000);
