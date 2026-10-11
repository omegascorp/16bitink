import { describe, expect, it } from 'vitest';
import { meterGoal } from '../src/logic/growth';
import { capMark, goalSize, levelProgress, sizeMarks } from '../src/logic/progress';
import { shellOf } from '../src/logic/shells';

describe('level progress', () => {
  it('aims for the size of the biggest shell in the level', () => {
    expect(goalSize(shellOf('periwinkle', 2), 1, [])).toBe(2);
    expect(goalSize(shellOf('periwinkle', 2), 2, [shellOf('snail', 3)])).toBe(3);
    expect(goalSize(shellOf('snail', 3), 3, [shellOf('nerite', 4), shellOf('topshell', 5)])).toBe(5);
  });

  it('fills from the starting size to the goal, counting the meter', () => {
    expect(levelProgress({ size: 2, meter: 0 }, 2, 4)).toBe(0);
    expect(levelProgress({ size: 3, meter: 0 }, 2, 4)).toBeCloseTo(0.5);
    expect(levelProgress({ size: 3, meter: meterGoal(3) / 2 }, 2, 4)).toBeCloseTo(0.75);
    expect(levelProgress({ size: 4, meter: 0 }, 2, 4)).toBe(1);
  });

  it('marks each size in between', () => {
    expect(sizeMarks(2, 5)).toEqual([1 / 3, 2 / 3]);
    expect(sizeMarks(1, 2)).toEqual([]);
  });

  it('marks where the current shell stops growth', () => {
    expect(capMark(3, 2, 5)).toBeCloseTo(1 / 3);
    expect(capMark(5, 2, 5)).toBe(1);
  });
});
