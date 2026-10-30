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
    [['A', 'B', 'C', 'R', 'H', 'T', 'W', 'F', 'K'], 'drained'],
    // The trough: open the curb with the gold on the trough and it runs into the drain.
    [['C', 'H', 'R', 'B', 'A', 'T', 'W', 'F', 'K'], 'drained'],
    // The trough's hopper after the curb but before the trough: the gold slides straight into the drain.
    [['B', 'A', 'C', 'H', 'R', 'T', 'W', 'F', 'K'], 'drained'],
    // The trapdoor before its gold: the gold falls down the shaft into the grate.
    [['F', 'T', 'B', 'A', 'C', 'R', 'H', 'W', 'K'], 'drained'],
    // The trapdoor before the water: Nib drops down and walks into the lava pit.
    [['B', 'A', 'C', 'R', 'H', 'T', 'F', 'W', 'K'], 'burnt'],
    // The same, with the trapdoor opened before Nib could get to it: the curb lets him through.
    [['B', 'A', 'F', 'C', 'R', 'H', 'T', 'W', 'K'], 'burnt'],
    // The last hopper before the water: its gold falls into the lava and melts.
    [['B', 'A', 'C', 'R', 'H', 'T', 'K', 'W', 'F'], 'melted'],
  ])('%j loses: %s', (order, cause) => {
    expect(outcome(order)).toBe(cause);
  });

  it.each([
    // The water first, before anything else, and the trapdoor's gold before the hall's.
    [['W', 'B', 'A', 'C', 'R', 'H', 'T', 'F', 'K']],
    [['T', 'B', 'A', 'C', 'R', 'H', 'W', 'F', 'K']],
    // Down the trapdoor before the hall's and the trough's gold: Nib climbs the shaft's vine back up for it.
    [['C', 'T', 'B', 'R', 'W', 'K', 'A', 'F', 'H']],
  ])('%j wins too', (order) => {
    expect(outcome(order)).toBe('won');
  });

  it('stays within the grain budget', () => {
    expect(GOLD_RUSH.fills.reduce((n, f) => n + f.count, 0)).toBeLessThanOrEqual(700);
  });

  it('keeps the trough in until the curb is out', () => {
    expect(outcome(['R'])).toBe('blocked');
  });
}, 120_000);
