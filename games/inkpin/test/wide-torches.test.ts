import { describe, expect, it } from 'vitest';
import { TORCHES } from '../src/level/torches';
import type { Stop } from '../src/logic/level';
import { STEPS_PER_SECOND, STONE } from '../src/logic/particles';
import { World } from '../src/logic/world';
import { play } from './solver';

/** How a pull order ends for the eager bot: 'won', the loss cause, or 'playing' (stuck). */
const outcome = (order: readonly string[]): string => {
  const r = play(TORCHES, order);
  if (!r.possible) return 'blocked';
  return r.status.state === 'lost' ? r.status.cause : r.status.state;
};

/** The solver's eager run, kept to look at the world afterwards. */
function playWorld(order: readonly string[]): World {
  const w = new World(TORCHES);
  const run = (steps: number): void => {
    for (let s = 0; s < steps && !w.finished; s++) {
      w.step();
      if (s > 30 && w.settled && w.nibOrder.kind === 'stay') break;
    }
  };
  const visit = (list: readonly Stop[]): void => {
    for (const s of list) {
      if (w.finished) return;
      w.command(s.y === undefined ? { kind: 'goto', x: s.x } : { kind: 'goto', x: s.x, y: s.y });
      run(STEPS_PER_SECOND * 8);
    }
  };
  for (const id of order) {
    w.pull(id);
    run(STEPS_PER_SECOND * 8);
    visit(TORCHES.stops ?? []);
  }
  return w;
}

const stones = (w: World): number => {
  let n = 0;
  for (let i = 0; i < w.grains.count; i++) if (w.grains.kind[i] === STONE) n++;
  return n;
};

describe('Torches Out, wide', () => {
  it('wins with the hint, and takes the bot at least a minute', () => {
    const r = play(TORCHES, TORCHES.solution);
    expect(r.status.state).toBe('won');
    expect(r.steps / STEPS_PER_SECOND).toBeGreaterThanOrEqual(60);
  });

  it('cools the lava to stone, scorches the porcupine and grows the seed on the way', () => {
    const w = playWorld(TORCHES.solution);
    // The trough (68 grains) and the shaft's lava (60) both set to stone.
    expect(stones(w)).toBeGreaterThan(110);
    expect(w.blots[0]!.gone).toBe('scorched');
    expect(w.vines[0]!.grown).toBe(1);
    expect(w.vines[0]!.burnt).toBe(false);
  });

  it('walks Nib into the glowing trough when anything comes before its water', () => {
    expect(outcome(['S', 'W', 'P', 'Q'])).toBe('burnt');
  });

  it('sets the lava in its tank when the water comes first, and the porcupine lives', () => {
    expect(['pricked', 'inked']).toContain(outcome(['W', 'Q', 'P', 'S']));
  });

  it('drops Nib into hot lava when the vine grows before the water cools the pit', () => {
    expect(outcome(['W', 'P', 'S', 'Q'])).toBe('burnt');
  });

  it('drops Nib onto the porcupine when the vine grows before the lava', () => {
    expect(['pricked', 'inked']).toContain(outcome(['W', 'S', 'P', 'Q']));
  });
}, 120_000);
