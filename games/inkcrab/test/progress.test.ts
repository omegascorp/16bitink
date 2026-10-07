import { describe, expect, it } from 'vitest';
import { meterGoal } from '../src/logic/growth';
import { capMark, goalSize, levelProgress, sizeMarks } from '../src/logic/progress';

describe('level progress', () => {
  it('aims for the biggest size any shell in the level allows', () => {
    expect(goalSize('periwinkle', 1, [])).toBe(2);
    expect(goalSize('periwinkle', 2, ['snail'])).toBe(3);
    expect(goalSize('snail', 3, ['nerite', 'topshell'])).toBe(5);
  });

  it('fills from the starting size to the goal, counting the meter', () => {
    expect(levelProgress({ size: 2, meter: 0, bank: 0 }, 2, 4)).toBe(0);
    expect(levelProgress({ size: 3, meter: 0, bank: 0 }, 2, 4)).toBeCloseTo(0.5);
    expect(levelProgress({ size: 3, meter: meterGoal(3) / 2, bank: 0 }, 2, 4)).toBeCloseTo(0.75);
    expect(levelProgress({ size: 4, meter: 0, bank: 0 }, 2, 4)).toBe(1);
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
