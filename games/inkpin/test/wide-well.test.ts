import { describe, expect, it } from 'vitest';
import { WELL } from '../src/level/well';
import { LAVA, STEPS_PER_SECOND, STONE } from '../src/logic/particles';
import { World } from '../src/logic/world';
import { play } from './solver';

/** How a pull order ends: 'won', the loss cause, 'playing' (stuck), or 'blocked'. */
const outcome = (order: readonly string[], patient = false): string => {
  const r = play(WELL, order, patient);
  if (!r.possible) return 'blocked';
  return r.status.state === 'lost' ? r.status.cause : r.status.state;
};

/** Pulls the pins in order, letting each settle, with Nib kept in its room: the world after. */
const pullAll = (order: readonly string[]): World => {
  const w = new World(WELL);
  for (const id of order) {
    w.pull(id);
    for (let s = 0; s < 1500; s++) w.step();
  }
  return w;
};

/** The vines, by where they stand. */
const FIRST = 0;
const WAY_UP = 1;
const GOLD = 2;
const TOP = 3;

describe('The Well of Vines, wide', () => {
  it('is won by its hint, and takes the bot at least a minute', () => {
    const r = play(WELL, WELL.solution);
    expect(r.status.state).toBe('won');
    expect(r.steps / STEPS_PER_SECOND).toBeGreaterThanOrEqual(60);
  });

  it('keeps to the grain budget', () => {
    expect(WELL.fills.reduce((n, f) => n + f.count, 0)).toBeLessThanOrEqual(700);
  });

  // The signature: one tank grows all four seeds, and the cup sets the lava to stone first.
  it('grows every seed from the one tank, and the lava sets to stone', () => {
    const w = pullAll(WELL.solution);
    expect(w.vines.map((v) => v.grown)).toEqual([1, 1, 1, 1]);
    expect(w.vines.some((v) => v.burnt)).toBe(false);
    expect(w.grains.countOf(LAVA)).toBe(0);
    expect(w.grains.countOf(STONE)).toBeGreaterThan(30);
    expect(w.blots[0]!.gone).toBe('washed');
  });

  it('keeps the tank shut until the lava is let go', () => {
    expect(outcome(['W', 'K', 'L', 'D', 'N'])).toBe('blocked');
  });

  // The lava before its cup: it pours down the shaft and burns the top seed; Nib can't reach the chest.
  it('burns the top seed when the lava goes first', () => {
    expect(pullAll(['L']).vines[TOP]!.burnt).toBe(true);
    expect(outcome(['L', 'K', 'W', 'D', 'N'])).not.toBe('won');
  });

  // The hatch before the water: it all runs through, and the basin's seeds stay seeds.
  it('runs the water straight through an open hatch', () => {
    const w = pullAll(['K', 'L', 'D', 'W']);
    expect(w.vines[WAY_UP]!.grown).toBe(0);
    expect(w.vines[GOLD]!.grown).toBe(0);
    expect(outcome(['K', 'L', 'D', 'W', 'N'])).toBe('playing');
  });

  // Nib's door before the hatch: the porcupine is still in its dry pit, and the first seed hasn't grown.
  it('sends Nib into the porcupine before the basin comes down', () => {
    const w = pullAll(['K', 'L', 'W']);
    expect(w.vines[FIRST]!.grown).toBe(0);
    expect(['pricked', 'inked']).toContain(outcome(['K', 'L', 'W', 'N', 'D']));
  });
}, 300_000);
