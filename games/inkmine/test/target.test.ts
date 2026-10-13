import { describe, expect, it } from 'vitest';
import { drillTarget } from '../src/logic/target';
import { grid, T } from './helpers';

// A prospector-sized box standing in column 1 with feet on row 2.
const body = { x: T + 6, y: 2 * T - 28, w: 20, h: 28 };
const ground = grid(['sss', 's.s', 'sss']);

describe('which block a push drills', () => {
  it('sideways only when the walk is blocked', () => {
    expect(drillTarget(ground, body, T, { ix: 1, iy: 0 }, true, true)?.tile).toEqual([2, 1]);
    expect(drillTarget(ground, body, T, { ix: 1, iy: 0 }, true, false)).toBeNull();
  });

  it('down and up drill under and over, re-centring', () => {
    expect(drillTarget(ground, body, T, { ix: 0, iy: 1 }, true, false)).toEqual({ tile: [1, 2], centre: true });
    expect(drillTarget(ground, body, T, { ix: 0, iy: -1 }, true, false)).toEqual({ tile: [1, 0], centre: true });
  });

  it('up and sideways cuts stairs: overhead first, then above the block ahead', () => {
    expect(drillTarget(ground, body, T, { ix: 1, iy: -1 }, true, false)?.tile).toEqual([1, 0]);
    const opened = grid(['s.s', 's.s', 'sss']);
    expect(drillTarget(opened, body, T, { ix: 1, iy: -1 }, true, false)?.tile).toEqual([2, 0]);
  });

  it('down and sideways cuts a slope: the block ahead, then the one below it', () => {
    expect(drillTarget(ground, body, T, { ix: -1, iy: 1 }, true, false)?.tile).toEqual([0, 1]);
    const opened = grid(['sss', '..s', 'sss']);
    expect(drillTarget(opened, body, T, { ix: -1, iy: 1 }, true, false)?.tile).toEqual([0, 2]);
  });

  it('never in mid-air', () => {
    expect(drillTarget(ground, body, T, { ix: 0, iy: 1 }, false, false)).toBeNull();
  });
});
