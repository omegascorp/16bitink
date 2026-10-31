import { describe, expect, it } from 'vitest';
import { hintsNow, planSteps, stepsDone, walkDone, WALK_REACH, type Done } from '../src/scenes/hintPlan';
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

describe('a walk in the hint', () => {
  const plan = planSteps(['C', '@2060', 'V'], new Set());

  it("reads '@x' as a walk to x", () => {
    expect(plan[1]).toEqual({ id: '@2060', act: 'walk', wait: null, x: 2060 });
  });

  it('numbers the walk with the rest, and marks it done once Nib gets there', () => {
    expect(hintsNow(plan, 1, 0).map((m) => `${m.n}${m.act}`)).toEqual(['1walk', '2pull']);
    expect(walkDone(plan, 1, 2060 - WALK_REACH - 1)).toBeNull();
    expect(walkDone(plan, 1, 2060 - WALK_REACH + 1)?.id).toBe('@2060');
    // Only while it's the next step.
    expect(walkDone(plan, 0, 2060)).toBeNull();
    expect(stepsDone(plan, [{ id: 'C', act: 'pull', step: 5 }, { id: '@2060', act: 'walk', step: 90 }])).toBe(2);
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
