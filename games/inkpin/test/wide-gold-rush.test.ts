import { describe, expect, it } from 'vitest';
import { GOLD_RUSH } from '../src/level/goldRush';
import { LAVA, STEPS_PER_SECOND, STONE } from '../src/logic/particles';
import { World } from '../src/logic/world';
import { play, type Run } from './solver';

/** Plays an order and keeps the world it was played in, to look at afterwards. */
const playKeeping = (order: readonly string[]): { run: Run; world: World } => {
  const pull = World.prototype.pull;
  const kept: { world?: World } = {};
  World.prototype.pull = function (this: World, id: string): boolean {
    kept.world = this;
    return pull.call(this, id);
  };
  try {
    const run = play(GOLD_RUSH, order);
    if (!kept.world) throw new Error('no pin was pulled');
    return { run, world: kept.world };
  } finally {
    World.prototype.pull = pull;
  }
};

/** How a pull order ends: 'won', the loss cause, 'playing' (stuck), or 'blocked' (a pin couldn't come out). */
const outcome = (order: readonly string[]): string => {
  const r = play(GOLD_RUSH, order);
  if (!r.possible) return 'blocked';
  return r.status.state === 'lost' ? r.status.cause : r.status.state;
};

describe('Gold Rush, wide', () => {
  it('wins with the hint, takes the bot at least a minute, and turns the lava pit to stone', () => {
    const { run, world } = playKeeping(GOLD_RUSH.solution);
    expect(run.status.state).toBe('won');
    expect(run.steps / STEPS_PER_SECOND).toBeGreaterThanOrEqual(60);
    // The pit's lava is all stone now, and the gold that landed on it was kept.
    expect(world.grains.countOf(LAVA)).toBe(0);
    expect(world.grains.countOf(STONE)).toBeGreaterThan(30);
    expect(run.treasure).toBeGreaterThanOrEqual(GOLD_RUSH.coinsNeeded);
  });

  it.each([
    // The hall: the hopper before its ramp pours the gold down the chute.
    [['A', 'B', 'G', 'C', 'R', 'H', 'T', 'W', 'F', 'K'], 'drained'],
    // The trough: open the curb with the gold on the trough and it runs into the drain.
    [['C', 'H', 'R', 'B', 'A', 'G', 'T', 'W', 'F', 'K'], 'drained'],
    // The trapdoor before its gold: the gold falls down the shaft into the grate.
    [['F', 'T', 'B', 'A', 'G', 'C', 'R', 'H', 'W', 'K'], 'drained'],
    // The trapdoor before the water: Nib drops down and walks into the lava pit.
    [['B', 'A', 'G', 'C', 'R', 'H', 'T', 'F', 'W', 'K'], 'burnt'],
    // The last hopper before the water: its gold falls into the lava and melts.
    [['B', 'A', 'G', 'C', 'R', 'H', 'T', 'K', 'W', 'F'], 'melted'],
  ])('%j loses: %s', (order, cause) => {
    expect(outcome(order)).toBe(cause);
  });

  it('keeps the trough in until the curb is out', () => {
    expect(outcome(['R'])).toBe('blocked');
  });
}, 120_000);
