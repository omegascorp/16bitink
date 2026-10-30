import { describe, expect, it } from 'vitest';
import { WELL } from '../src/level/well';
import { LAVA, STEPS_PER_SECOND, STONE } from '../src/logic/particles';
import { World } from '../src/logic/world';
import { playNoting } from './audit';
import { play } from './solver';

/** Pulls the pins in order, letting each settle (the drop takes a while), with Nib kept in his corner: the world after. */
const pullAll = (order: readonly string[]): World => {
  const w = new World(WELL);
  for (const id of order) {
    w.pull(id);
    for (let s = 0; s < 4000; s++) w.step();
  }
  return w;
};

/** The vines, by where they stand. */
const FIRST = 0;
const WAY_UP = 1;
const GOLD = 2;
const TOP = 3;

/** Nib climbs up into the porcupine: it pricks him, or he lands on its spikes. */
const PORCUPINE = ['inked', 'pricked'];

describe('The Well of Vines, wide', () => {
  it('is won by its hint, and takes the bot at least a minute', () => {
    const r = play(WELL, WELL.solution);
    expect(r.status.state).toBe('won');
    expect(r.steps / STEPS_PER_SECOND).toBeGreaterThanOrEqual(60);
  });

  it('keeps to the grain budget', () => {
    expect(WELL.fills.reduce((n, f) => n + f.count, 0)).toBeLessThanOrEqual(700);
  });

  // The signature: one tank grows all four seeds and washes the porcupine, and the cup sets the lava to stone first.
  it('grows every seed from the one tank, and the lava sets to stone', () => {
    const w = pullAll(WELL.solution);
    expect(w.vines.map((v) => v.grown)).toEqual([1, 1, 1, 1]);
    expect(w.vines.some((v) => v.burnt)).toBe(false);
    expect(w.grains.countOf(LAVA)).toBe(0);
    expect(w.grains.countOf(STONE)).toBeGreaterThan(30);
    expect(w.blots[0]!.gone).toBe('washed');
  });

  // The taps in either order, the gold any time, the cistern before or after the tank.
  it.each([[['K', 'L', 'X', 'W', 'H', 'D', 'B']], [['B', 'K', 'L', 'H', 'W', 'X', 'D']]])('is won by %j too', (order) => {
    expect(play(WELL, order).status.state).toBe('won');
  });

  // The tempting tank, with L still in: it all goes down the drop to the first vine, and the porcupine is dry.
  it('sends the whole tank down the drop when L is still in', () => {
    const w = pullAll(['B', 'W']);
    expect(w.vines[FIRST]!.grown).toBe(1);
    expect(w.vines[TOP]!.grown).toBe(0);
    expect(w.blots[0]!.gone).toBeNull();
  });

  // Amounts: the side tap lets out only the top of the tank, too little to fill the sump and spill over onto the porcupine.
  it("doesn't wash the porcupine with the side tap's share alone", () => {
    const w = pullAll(['B', 'K', 'L', 'X', 'H']);
    expect(w.vines[TOP]!.grown).toBe(1);
    expect(w.vines[WAY_UP]!.grown).toBe(0);
    expect(w.vines[GOLD]!.grown).toBe(0);
    expect(w.blots[0]!.gone).toBeNull();
  });

  // The lava before its cup: it burns the top seed and melts the coins by it.
  it('burns the top seed when the lava goes first', () => {
    const w = pullAll(['L']);
    expect(w.vines[TOP]!.burnt).toBe(true);
  });

  // Each tempting wrong order, the pull it goes wrong on, and how it ends (as the audit plays it).
  it.each([
    ['the big tank first: down the drop', ['W', 'K', 'L', 'X', 'H', 'D', 'B'], 'W', PORCUPINE],
    ['the gold, then the tank: down the drop', ['B', 'W', 'K', 'L', 'X', 'H', 'D'], 'W', PORCUPINE],
    ['the side tap before L: down the drop', ['B', 'K', 'X', 'L', 'W', 'H', 'D'], 'X', PORCUPINE],
    ['the lava before its cup', ['L', 'K', 'W', 'X', 'H', 'D', 'B'], 'L', ['melted']],
    ['the hatch open under an open cistern: straight through', ['B', 'K', 'L', 'H', 'D', 'W', 'X'], 'W', PORCUPINE],
    ['the hatch before the cistern: straight through', ['B', 'K', 'L', 'W', 'X', 'D', 'H'], 'H', PORCUPINE],
    ["the side tap's share alone, then the hatch", ['B', 'K', 'L', 'X', 'H', 'D', 'W'], 'D', PORCUPINE],
  ])('%s: %j', (_name, order, at, causes) => {
    const e = playNoting(WELL, order);
    expect(e.at).toBe(at);
    expect(causes).toContain(e.end);
  });
}, 600_000);
