import { describe, expect, it } from 'vitest';
import { digTargets, inReach, placeTarget } from '../src/logic/dig';
import { createTerrain, setTile, TILE } from '../src/logic/terrain';

const T = 16;
// A crab two tiles wide and one tall, standing on row 5 (tiles x 2..3, y 4).
const box = { x: 2 * T + 1, y: 4 * T + 2, w: T * 2 - 2, h: T - 2 };

describe('digging targets', () => {
  it('digs the row under the body', () => {
    expect(digTargets(box, 1, 1, false, T)).toEqual([[2, 5], [3, 5]]);
  });

  it('digs the column ahead, either way it faces', () => {
    expect(digTargets(box, 1, 0, false, T)).toEqual([[4, 4]]);
    expect(digTargets(box, -1, 0, false, T)).toEqual([[1, 4]]);
  });

  it('digs straight up when only aiming up', () => {
    expect(digTargets(box, 1, -1, false, T)).toEqual([[2, 3], [3, 3]]);
  });

  it('cuts a step up-ahead when aiming up while walking', () => {
    expect(digTargets(box, 1, -1, true, T)).toEqual([[4, 3]]);
  });
});

describe('placing targets', () => {
  const ground = (): ReturnType<typeof createTerrain> => {
    const t = createTerrain(8, 8);
    for (let x = 0; x < 8; x++) for (let y = 5; y < 8; y++) setTile(t, x, y, TILE.sand);
    return t;
  };

  it('fills a hole ahead first, then builds a wall up from the feet', () => {
    const t = ground();
    setTile(t, 4, 5, TILE.air);
    expect(placeTarget(t, box, 1, 0, T)).toEqual([4, 5]);
    setTile(t, 4, 5, TILE.placed);
    expect(placeTarget(t, box, 1, 0, T)).toEqual([4, 4]);
    setTile(t, 4, 4, TILE.placed);
    expect(placeTarget(t, box, 1, 0, T)).toEqual([4, 3]);
    setTile(t, 4, 3, TILE.placed);
    expect(placeTarget(t, box, 1, 0, T)).toBeNull();
  });

  it('drops a clump under itself when aiming down in mid-air', () => {
    const t = createTerrain(8, 8);
    for (let x = 0; x < 8; x++) setTile(t, x, 7, TILE.sand);
    expect(placeTarget(t, box, 1, 1, T)).toEqual([3, 5]);
  });

  it('aiming down on solid ground fills the hole ahead instead', () => {
    const t = ground();
    setTile(t, 4, 5, TILE.air);
    expect(placeTarget(t, box, 1, 1, T)).toEqual([4, 5]);
  });

  it('aiming up places ahead, like aiming level', () => {
    const t = ground();
    expect(placeTarget(t, box, 1, -1, T)).toEqual(placeTarget(t, box, 1, 0, T));
  });

  it('reaches only tiles next to the crab', () => {
    expect(inReach(box, [4, 4], T)).toBe(true);
    expect(inReach(box, [6, 4], T)).toBe(false);
  });
});
