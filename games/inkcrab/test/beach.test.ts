import { describe, expect, it } from 'vitest';
import { boxHitsSolid } from '../src/logic/body';
import { isSolid, surfaceRow, TILE, tileAt } from '../src/logic/terrain';
import { BEACH_TILE, buildTestBeach } from '../src/level/testBeach';

describe('test beach', () => {
  const beach = buildTestBeach(7);

  it('is the same beach for the same seed', () => {
    const again = buildTestBeach(7);
    expect(Array.from(again.terrain.tiles)).toEqual(Array.from(beach.terrain.tiles));
    expect(again.items).toEqual(beach.items);
  });

  it('slopes from high dunes on the left down to the tidepools on the right', () => {
    const { terrain } = beach;
    expect(surfaceRow(terrain, 4)).toBeLessThan(surfaceRow(terrain, terrain.width - 5));
  });

  it('has an unbreakable rock floor', () => {
    const { terrain } = beach;
    for (let x = 0; x < terrain.width; x++) expect(tileAt(terrain, x, terrain.height - 1)).toBe(TILE.rock);
  });

  it('starts the crab on open sand', () => {
    const { start, terrain } = beach;
    const box = { x: start.x - 8, y: start.y - 12, w: 16, h: 12 };
    expect(boxHitsSolid(terrain, box, BEACH_TILE)).toBe(false);
    expect(isSolid(terrain, Math.floor(start.x / BEACH_TILE), Math.floor(start.y / BEACH_TILE))).toBe(true);
  });

  it('buries some shells and food inside the sand and leaves some on top', () => {
    const buried = beach.items.filter((i) => i.buried);
    const loose = beach.items.filter((i) => !i.buried);
    expect(buried.some((i) => i.kind.type === 'shell')).toBe(true);
    expect(buried.some((i) => i.kind.type === 'food')).toBe(true);
    expect(loose.some((i) => i.kind.type === 'shell')).toBe(true);
    for (const item of buried) {
      expect(isSolid(beach.terrain, Math.floor((item.x + item.w / 2) / BEACH_TILE), Math.floor((item.y + item.h / 2) / BEACH_TILE))).toBe(true);
    }
  });

  it('hides the conch deepest below the sand of all the shells', () => {
    const depth = (i: (typeof beach.items)[number]): number => {
      const col = Math.floor((i.x + i.w / 2) / BEACH_TILE);
      return Math.floor((i.y + i.h / 2) / BEACH_TILE) - surfaceRow(beach.terrain, col);
    };
    const shells = beach.items.filter((i) => i.kind.type === 'shell');
    const conch = shells.find((i) => i.kind.type === 'shell' && i.kind.shell.kind === 'conch');
    expect(conch).toBeDefined();
    expect(depth(conch!)).toBe(Math.max(...shells.map(depth)));
  });

  it('never buries a shell inside rock', () => {
    for (const i of beach.items.filter((it) => it.buried && it.kind.type === 'shell')) {
      const col = Math.floor((i.x + i.w / 2) / BEACH_TILE);
      const row = Math.floor((i.y + i.h / 2) / BEACH_TILE);
      expect(tileAt(beach.terrain, col, row)).toBe(TILE.sand);
    }
  });
});
