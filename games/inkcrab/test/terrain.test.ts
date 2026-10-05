import { describe, expect, it } from 'vitest';
import { createTerrain, dig, isDiggable, isSolid, place, setTile, surfaceRow, TILE, tileAt } from '../src/logic/terrain';

describe('terrain', () => {
  it('starts as open air', () => {
    const t = createTerrain(4, 3);
    expect(tileAt(t, 1, 1)).toBe(TILE.air);
    expect(isSolid(t, 1, 1)).toBe(false);
  });

  it('walls the sides and floor and opens the sky', () => {
    const t = createTerrain(4, 3);
    expect(isSolid(t, -1, 1)).toBe(true);
    expect(isSolid(t, 4, 1)).toBe(true);
    expect(isSolid(t, 1, 3)).toBe(true);
    expect(isSolid(t, 1, -1)).toBe(false);
    expect(isDiggable(t, -1, 1)).toBe(false);
  });

  it('digs sand and placed sand, never rock or air', () => {
    const t = createTerrain(4, 3);
    setTile(t, 0, 2, TILE.sand);
    setTile(t, 1, 2, TILE.rock);
    setTile(t, 2, 2, TILE.placed);
    expect(dig(t, 0, 2)).toBe(true);
    expect(tileAt(t, 0, 2)).toBe(TILE.air);
    expect(dig(t, 0, 2)).toBe(false);
    expect(dig(t, 1, 2)).toBe(false);
    expect(dig(t, 2, 2)).toBe(true);
  });

  it('places sand only into open air inside the beach', () => {
    const t = createTerrain(4, 3);
    expect(place(t, 1, 1)).toBe(true);
    expect(tileAt(t, 1, 1)).toBe(TILE.placed);
    expect(place(t, 1, 1)).toBe(false);
    expect(place(t, -1, 1)).toBe(false);
    expect(setTile(t, 9, 9, TILE.sand)).toBe(false);
  });

  it('finds the surface of a column', () => {
    const t = createTerrain(2, 5);
    setTile(t, 0, 3, TILE.sand);
    setTile(t, 0, 4, TILE.sand);
    expect(surfaceRow(t, 0)).toBe(3);
    expect(surfaceRow(t, 1)).toBe(5);
  });
});
