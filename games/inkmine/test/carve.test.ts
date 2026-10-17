import { describe, expect, it } from 'vitest';
import { BEDROCK_ROWS, carve, surfaceAt } from '../src/level/carve';
import { TEST_MINE } from '../src/level/testMine';
import { ORES } from '../src/logic/ore';
import { TILE, tileAt } from '../src/logic/terrain';
import { VOLATILES } from '../src/logic/volatiles';

describe('carving a dig site', () => {
  const t = carve(TEST_MINE);

  it('is the same map every time for the same seed', () => {
    expect(carve(TEST_MINE).tiles).toEqual(t.tiles);
    expect(carve(TEST_MINE).content).toEqual(t.content);
  });

  it('is flat and solid under the lander', () => {
    for (let dx = -3; dx <= 3; dx++) {
      const x = TEST_MINE.landerCol + dx;
      expect(surfaceAt(TEST_MINE, x)).toBe(TEST_MINE.surface);
      expect(tileAt(t, x, TEST_MINE.surface)).not.toBe(TILE.air);
      expect(tileAt(t, x, TEST_MINE.surface - 1)).toBe(TILE.air);
    }
  });

  it('runs soil to stone to deep rock with depth, over bedrock', () => {
    expect(tileAt(t, TEST_MINE.landerCol, TEST_MINE.surface + 2)).toBe(TILE.soil);
    for (let x = 0; x < t.width; x++) expect(tileAt(t, x, t.height - 1)).toBe(TILE.bedrock);
    const count = (tile: number) => [...t.tiles].filter((v) => v === tile).length;
    expect(count(TILE.stone)).toBeGreaterThan(count(TILE.soil) / 2);
    expect(count(TILE.deep)).toBeGreaterThan(0);
    const volatiles = (id: number) => [...t.volatile].filter((v) => v === id).length;
    expect(volatiles(VOLATILES.firedamp.id)).toBeGreaterThan(10);
    expect(volatiles(VOLATILES.charge.id) + volatiles(VOLATILES.lineCharge.id)).toBeGreaterThan(0);
    expect(t.height - BEDROCK_ROWS).toBeGreaterThan(TEST_MINE.deep);
  });

  it('has every ore it asks for, in rock', () => {
    for (const rule of TEST_MINE.ores) {
      const id = ORES[rule.ore].id;
      const cells = [...t.content.keys()].filter((i) => t.content[i] === id);
      expect(cells.length, rule.ore).toBeGreaterThan(0);
      for (const i of cells) expect([TILE.soil, TILE.stone, TILE.deep]).toContain(t.tiles[i]);
    }
  });
});

describe('firedamp', () => {
  it('sits in soil or stone, never with ore in it, and gathers by the graphite seams', () => {
    const t = carve(TEST_MINE);
    const pockets = [...t.volatile.keys()].filter((i) => t.volatile[i] === VOLATILES.firedamp.id);
    for (const i of pockets) {
      expect([TILE.soil, TILE.stone]).toContain(t.tiles[i]);
      expect(t.content[i]).toBe(0);
    }
    const graphite = ORES.graphite.id;
    const bySeam = pockets.filter((i) => [1, -1, t.width, -t.width].some((d) => t.content[i + d] === graphite));
    expect(bySeam.length).toBeGreaterThan(0);
  });
});
