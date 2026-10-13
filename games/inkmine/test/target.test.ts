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

  it('a diagonal is one dig of two blocks: the diagonal and the block that joins it to you', () => {
    expect(drillTarget(ground, body, T, { ix: 1, iy: -1 }, true, false)).toEqual({ tile: [2, 0], centre: false, with: [1, 0] });
    expect(drillTarget(ground, body, T, { ix: -1, iy: 1 }, true, false)).toEqual({ tile: [0, 2], centre: false, with: [0, 1] });
  });

  it('when one of the two is already open, just the other', () => {
    const overheadOpen = grid(['s.s', 's.s', 'sss']);
    expect(drillTarget(overheadOpen, body, T, { ix: 1, iy: -1 }, true, false)).toEqual({ tile: [2, 0], centre: false });
    const aheadOpen = grid(['sss', '..s', 'sss']);
    expect(drillTarget(aheadOpen, body, T, { ix: -1, iy: 1 }, true, false)).toEqual({ tile: [0, 2], centre: false });
  });

  it('never in mid-air', () => {
    expect(drillTarget(ground, body, T, { ix: 0, iy: 1 }, false, false)).toBeNull();
  });
});
