import { describe, expect, it } from 'vitest';
import { parseGrid } from '../src/logic/map';
import { coverPlacements, mountainPieces } from '../src/scenes/map/mapCover';
import { composeFog, composeGround, distanceInside, GROUND_BORDER, groundSize, MAP_TILE, valueNoise } from '../src/scenes/map/pixelGround';
import { drawWordmark } from '../src/scenes/menu/wordmark';
import type { Pixels } from '../src/scenes/battle/pixelScenery';

/** A flat swatch of one colour. */
const flat = (r: number, g: number, b: number, n = 160): Pixels => {
  const data = new Uint8ClampedArray(n * n * 4);
  for (let i = 0; i < n * n; i++) data.set([r, g, b, 255], i * 4);
  return { data, w: n, h: n };
};
const px = (p: Pixels, x: number, y: number): number[] => {
  const i = (y * p.w + x) * 4;
  return [p.data[i]!, p.data[i + 1]!, p.data[i + 2]!, p.data[i + 3]!];
};
/** A map pixel (from tile 0, 0) in ground-image pixels. */
const at = (x: number, y: number): [number, number] => [x + GROUND_BORDER * MAP_TILE, y + GROUND_BORDER * MAP_TILE];

describe('map ground', () => {
  it('smooth noise stays in [0, 1) and repeats for the same seed', () => {
    for (let i = 0; i < 200; i++) {
      const v = valueNoise(7, i * 0.37, i * 0.91);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      expect(valueNoise(7, i * 0.37, i * 0.91)).toBe(v);
    }
  });

  it('measures how far inside a region each pixel lies', () => {
    const w = 9;
    const d = distanceInside((i) => i % w >= 3, w, 1);
    expect([...d]).toEqual([0, 0, 0, 1, 2, 3, 4, 5, 6]);
  });

  it('covers the map and its border, each terrain from its own swatch, water drawn in code', () => {
    const grid = parseGrid(['ggg~~~', 'ggg~~~', 'ggg~~~', 'ddd~~~']);
    const g = composeGround({ grid, swatches: { grass: flat(90, 140, 60), dirt: flat(140, 100, 60) }, seed: 1 });
    expect({ w: g.w, h: g.h }).toEqual(groundSize(grid));
    expect(px(g, ...at(40, 40))).toEqual([90, 140, 60, 255]);
    // Deep in the water it is blue, not a swatch.
    const [r, , b] = px(g, ...at(5 * 48 + 40, 60));
    expect(b!).toBeGreaterThan(r!);
    // The same seed draws the same ground.
    expect(composeGround({ grid, swatches: { grass: flat(90, 140, 60), dirt: flat(140, 100, 60) }, seed: 1 }).data).toEqual(g.data);
  });

  it('rounds the corners where terrains meet instead of following the tile edges', () => {
    // A single dirt tile in grass: its very corner pixels go to the grass round it.
    const grid = parseGrid(['ggg', 'gdg', 'ggg']);
    const g = composeGround({ grid, swatches: { grass: flat(90, 140, 60), dirt: flat(140, 100, 60) }, seed: 5 });
    expect(px(g, ...at(72, 72))).toEqual([140, 100, 60, 255]);
    expect(px(g, ...at(49, 49))).not.toEqual([140, 100, 60, 255]);
  });

  it('lays a road along the road tiles', () => {
    const grid = parseGrid(['ggggg', '=====', 'ggggg']);
    const g = composeGround({ grid, swatches: { grass: flat(90, 140, 60), dirt: flat(140, 100, 60) }, seed: 2 });
    expect(px(g, ...at(120, 72))).not.toEqual([90, 140, 60, 255]);
    expect(px(g, ...at(120, 10))).toEqual([90, 140, 60, 255]);
  });

  it('fogs what has not been seen, clear over what has, with a dithered edge', () => {
    const grid = parseGrid(['gggg', 'gggg']);
    const fog = composeFog(grid, '11000000', [10, 10, 10]);
    expect(px(fog, ...at(10, 10))[3]).toBe(0);
    expect(px(fog, ...at(3 * 48 + 24, 72))[3]).toBe(255);
    // Across the edge some pixels are fog and some clear.
    const row = Array.from({ length: 48 }, (_, i) => px(fog, ...at(96 + i - 24, 30))[3]);
    expect(row).toContain(0);
    expect(row).toContain(255);
  });
});

describe('map cover', () => {
  it('splits mountain runs into pieces two or three tiles wide', () => {
    for (let n = 1; n <= 12; n++) {
      const p = mountainPieces(n);
      expect(p.reduce((a, b) => a + b, 0)).toBe(n);
      if (n > 1) expect(p.every((k) => k === 2 || k === 3)).toBe(true);
    }
  });

  it('draws no two neighbouring pieces of a range alike', () => {
    const grid = parseGrid(['M'.repeat(24)]);
    const wide = coverPlacements(grid, 3).filter((c) => c.kind === 'mountain');
    expect(wide.length).toBeGreaterThan(4);
    for (let i = 1; i < wide.length; i++) expect(wide[i]!.pick).not.toBe(wide[i - 1]!.pick);
  });

  it('gives different ranges different sprites, seed by seed', () => {
    const grid = parseGrid(['M'.repeat(24), 'g'.repeat(24), 'M'.repeat(24)]);
    const firstPicks = [1, 2, 3, 4, 5, 6, 7, 8].map((seed) => coverPlacements(grid, seed).find((c) => c.kind === 'mountain')!.pick);
    expect(new Set(firstPicks).size).toBeGreaterThan(1);
  });

  it('stands a two-tile piece on the narrow peaks and a three-tile one on the wide ranges', () => {
    const cover = coverPlacements(parseGrid(['MMMMM']), 3);
    expect(cover.filter((c) => c.kind === 'mountain')).toHaveLength(1);
    expect(cover.filter((c) => c.kind === 'peak')).toHaveLength(1);
  });

  it('places trees on forest tiles, a range on mountain runs and one bridge per crossing', () => {
    const grid = parseGrid(['MMMMM', 'gTgPg', '==bb=']);
    const cover = coverPlacements(grid, 3);
    const kinds = (k: string): number => cover.filter((c) => c.kind === k).length;
    expect(kinds('mountain') + kinds('peak')).toBe(2);
    expect(kinds('bridge')).toBe(1);
    expect(kinds('tree')).toBeGreaterThanOrEqual(1);
    expect(kinds('pine')).toBeGreaterThanOrEqual(1);
    for (const c of cover.filter((c) => c.kind === 'tree')) expect(Math.floor(c.x / MAP_TILE)).toBe(1);
  });
});

describe('menu wordmark', () => {
  it('blows the letters up into blocks with an outline and a shadow', () => {
    const mask = { data: new Uint8ClampedArray(2 * 2 * 4), w: 2, h: 2 };
    mask.data.set([255, 255, 255, 255], 0);
    const mark = drawWordmark(mask, 3);
    expect(mark.w).toBe(2 * 3 + 4);
    const a = (x: number, y: number): number => mark.data[(y * mark.w + x) * 4 + 3]!;
    expect(a(2, 2)).toBe(255);
    expect(a(4, 4)).toBe(255);
    expect(a(0, 0)).toBe(255);
    expect(a(mark.w - 1, mark.h - 1)).toBe(0);
  });
});
