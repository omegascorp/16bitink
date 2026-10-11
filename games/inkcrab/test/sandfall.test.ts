import { describe, expect, it } from 'vitest';
import { settleColumn } from '../src/logic/sandfall';
import { createTerrain, setTile, TILE, tileAt } from '../src/logic/terrain';

const open = (): ReturnType<typeof createTerrain> => {
  const t = createTerrain(3, 8);
  for (let x = 0; x < 3; x++) setTile(t, x, 7, TILE.sand);
  return t;
};
const never = (): boolean => false;

describe('loose sand', () => {
  it('falls until it lands on the ground', () => {
    const t = open();
    setTile(t, 1, 2, TILE.placed);
    expect(settleColumn(t, 1, never)).toEqual([[1, 2], [1, 6]]);
    expect(tileAt(t, 1, 2)).toBe(TILE.air);
    expect(tileAt(t, 1, 6)).toBe(TILE.placed);
  });

  it('stacks: a column of clumps falls together', () => {
    const t = open();
    setTile(t, 1, 1, TILE.placed);
    setTile(t, 1, 3, TILE.placed);
    settleColumn(t, 1, never);
    expect(tileAt(t, 1, 6)).toBe(TILE.placed);
    expect(tileAt(t, 1, 5)).toBe(TILE.placed);
    expect(tileAt(t, 1, 4)).toBe(TILE.air);
  });

  it('rests on whatever blocks it (the crab)', () => {
    const t = open();
    setTile(t, 1, 2, TILE.placed);
    settleColumn(t, 1, (_, y) => y === 5);
    expect(tileAt(t, 1, 4)).toBe(TILE.placed);
  });

  it('leaves packed sand alone, so tunnels keep their roofs', () => {
    const t = open();
    setTile(t, 1, 2, TILE.sand);
    expect(settleColumn(t, 1, never)).toEqual([]);
    expect(tileAt(t, 1, 2)).toBe(TILE.sand);
  });
});
