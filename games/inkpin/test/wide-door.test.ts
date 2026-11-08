import { describe, expect, it } from 'vitest';
import { DOOR } from '../src/level/door';
import { STEPS_PER_SECOND } from '../src/logic/particles';
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
    const run = play(DOOR, order);
    if (!kept.world) throw new Error('no pin was pulled');
    return { run, world: kept.world };
  } finally {
    World.prototype.pull = pull;
  }
};

describe('The Door, wide', () => {
  it('wins with the hint, takes the bot at least a minute, and grows the seed into a vine', () => {
    const { run, world } = playKeeping(DOOR.solution);
    expect(run.status.state).toBe('won');
    expect(run.steps / STEPS_PER_SECOND).toBeGreaterThanOrEqual(60);
    const seed = world.vines.find((v) => v.def.seed);
    expect(seed?.grown).toBe(1);
    expect(seed?.burnt).toBe(false);
  });

  it('keeps the seed a seed until the water reaches it: the wall beside it is too tall without the vine', () => {
    const w = new World(DOOR);
    w.command({ kind: 'goto', x: 1420 });
    for (let s = 0; s < 2400; s++) w.step();
    expect(w.vines.find((v) => v.def.seed)?.grown).toBe(0);
    expect(w.nib.x).toBeLessThan(1240);
  });

  // The tutorial can't be lost: whatever the order, Nib gets the chest.
  it.each([
    [['deep', 'water', 'gold', 'door']],
    [['water', 'door', 'deep', 'gold']],
  ])('wins in another order too: %j', (order) => {
    expect(play(DOOR, order).status.state).toBe('won');
  });
}, 120_000);
