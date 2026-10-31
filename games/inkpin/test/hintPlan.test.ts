import { describe, expect, it } from 'vitest';
import { hintsNow, planSteps, stepsDone, type Done } from '../src/scenes/hintPlan';
import { lossText } from '../src/scenes/lossLines';

describe('the hint plan', () => {
  const gates = new Set(['G']);
  const plan = planSteps(['W', 'G', 'G~1.5', 'H'], gates);

  it('reads a gate the second time as a push, with its wait', () => {
    expect(plan).toEqual([
      { id: 'W', act: 'pull', wait: null },
      { id: 'G', act: 'pull', wait: null },
      { id: 'G', act: 'push', wait: 1.5 },
      { id: 'H', act: 'pull', wait: null },
    ]);
  });

  it('follows the player through the plan, skipping taps off it', () => {
    const done: Done[] = [
      { id: 'W', act: 'pull', step: 10 },
      { id: 'X', act: 'pull', step: 20 },
      { id: 'G', act: 'pull', step: 30 },
    ];
    expect(stepsDone(plan, done)).toBe(2);
    expect(stepsDone(plan, [...done, { id: 'G', act: 'push', step: 40 }])).toBe(3);
  });

  it('keeps a timed step and everything after it back until its moment', () => {
    expect(hintsNow(plan, 2, 0.5)).toEqual([]);
    expect(hintsNow(plan, 2, 1.6).map((m) => [m.id, m.act, m.n])).toEqual([
      ['G', 'push', 1],
      ['H', 'pull', 2],
    ]);
  });

  it('numbers the steps up to the first timed one', () => {
    expect(hintsNow(plan, 0, 0).map((m) => `${m.n}${m.id}`)).toEqual(['1W', '2G']);
  });
});

describe('the loss lines', () => {
  it('blames the animal that did it', () => {
    expect(lossText('inked', 'salamander', 'volcano')?.line).toMatch(/water/);
    expect(lossText('pricked', 'armadillo', 'volcano')?.line).toMatch(/Never jump on an armadillo/);
  });

  it('keeps the jungle lines, and gives the volcano its own', () => {
    expect(lossText('crushed')?.line).toBe('A boulder or a crate came down on Nib. Keep out from under it.');
    expect(lossText('crushed', undefined, 'volcano')?.line).toMatch(/slab/);
    expect(lossText('pricked', 'porcupine')?.title).toBe('Ouch, spikes!');
  });
});
