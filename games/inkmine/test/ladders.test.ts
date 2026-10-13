import { describe, expect, it } from 'vitest';
import { ladderRungs, LADDER_MAX } from '../src/logic/ladders';
import { grid } from './helpers';

describe('ladders', () => {
  it('unroll up a shaft to the first way out, plus a rung to step off from', () => {
    const t = grid(['....', '....', 's.ss', 's.ss', 's.ss', 'ssss']);
    expect(ladderRungs(t, 1, 4)).toEqual([[1, 4], [1, 3], [1, 2], [1, 1], [1, 0]]);
  });

  it('stop at the roof', () => {
    const t = grid(['sss', 's.s', 's.s', 'sss']);
    expect(ladderRungs(t, 1, 2)).toEqual([[1, 2], [1, 1]]);
  });

  it('are never longer than LADDER_MAX', () => {
    const t = grid(Array.from({ length: 30 }, () => 's.s'));
    expect(ladderRungs(t, 1, 29)).toHaveLength(LADDER_MAX);
  });
});
