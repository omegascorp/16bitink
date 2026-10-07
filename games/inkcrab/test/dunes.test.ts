import { describe, expect, it } from 'vitest';
import { columnsAround, pourStep, settleDunes } from '../src/logic/dunes';
import { createTerrain, setTile, TILE, tileAt, type Terrain } from '../src/logic/terrain';

const never = (): boolean => false;
const floor = (w: number, h: number): Terrain => {
  const t = createTerrain(w, h);
  for (let x = 0; x < w; x++) setTile(t, x, h - 1, TILE.rock);
  return t;
};
const count = (t: Terrain, tile: number): number => t.tiles.reduce((n, v) => n + (v === tile ? 1 : 0), 0);
const all = (t: Terrain): number[] => Array.from({ length: t.width }, (_, x) => x);

describe('dune sand', () => {
  it('drops a row a tick while nothing is under it', () => {
    const t = floor(3, 6);
    setTile(t, 1, 1, TILE.loose);
    expect(pourStep(t, [1], never, false)).toEqual([[1, 1], [1, 2]]);
    expect(tileAt(t, 1, 2)).toBe(TILE.loose);
    settleDunes(t);
    expect(tileAt(t, 1, 4)).toBe(TILE.loose);
  });

  it('slides off a step taller than one tile, and rests on a single step', () => {
    const t = floor(5, 6);
    // A column three high: the top slides down beside it, leaving a 45-degree heap.
    for (const y of [2, 3, 4]) setTile(t, 2, y, TILE.loose);
    settleDunes(t);
    expect(tileAt(t, 2, 2)).toBe(TILE.air);
    expect(tileAt(t, 2, 4)).toBe(TILE.loose);
    expect(tileAt(t, 1, 4) === TILE.loose || tileAt(t, 3, 4) === TILE.loose).toBe(true);
    // At rest: another tick moves nothing.
    expect(pourStep(t, all(t), never, false)).toEqual([]);
  });

  it('never makes or loses sand', () => {
    const t = floor(12, 12);
    for (let x = 3; x < 9; x++) for (let y = 2; y < 11; y++) setTile(t, x, y, TILE.loose);
    const before = count(t, TILE.loose);
    settleDunes(t);
    expect(count(t, TILE.loose)).toBe(before);
  });

  it('caves in a tunnel roof of dune sand, but packed sand holds', () => {
    const t = floor(5, 8);
    for (let x = 0; x < 5; x++) {
      setTile(t, x, 2, TILE.loose);
      setTile(t, x, 3, TILE.loose);
      for (let y = 4; y < 7; y++) setTile(t, x, y, TILE.sand);
    }
    // A tunnel in the packed sand: its roof is packed, so it stays open.
    setTile(t, 2, 5, TILE.air);
    // A hole in the dune layer fills from above and the sides.
    setTile(t, 2, 3, TILE.air);
    settleDunes(t);
    expect(tileAt(t, 2, 5)).toBe(TILE.air);
    expect(tileAt(t, 2, 3)).toBe(TILE.loose);
  });

  it('stops on whatever blocks it (the crab), sliding off its sides', () => {
    const blocked = (_x: number, y: number): boolean => y === 6;
    const u = floor(3, 8);
    setTile(u, 1, 1, TILE.loose);
    for (let i = 0; i < 10; i++) pourStep(u, [0, 1, 2], blocked, i % 2 === 0);
    expect(tileAt(u, 1, 5)).toBe(TILE.loose);
    expect(tileAt(u, 1, 6)).toBe(TILE.air);
  });

  it('leaves placed and packed sand alone', () => {
    const t = floor(3, 6);
    setTile(t, 1, 1, TILE.placed);
    setTile(t, 0, 1, TILE.sand);
    expect(pourStep(t, all(t), never, false)).toEqual([]);
  });

  it('wakes the columns either side of a change', () => {
    expect([...columnsAround([[4, 2], [5, 9]])].sort((a, b) => a - b)).toEqual([3, 4, 5, 6]);
  });
});
