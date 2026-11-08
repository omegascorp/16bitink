import { describe, expect, it } from 'vitest';
import { TOWN_ART } from '../src/art/pixel/town';
import { BUILDING_IDS } from '../src/logic/buildings';
import { buildingArt, cityTrees, emptyPlots, housePlots, isCanal, lotsOf, stagePieces, CITY } from '../src/scenes/town/townStage';
import { spriteOf, townKit } from '../src/scenes/town/townKit';

const WALL_PIECES = ['wall', 'wall-up', 'wall-gate', 'corner-front', 'corner-back', 'corner-left', 'corner-left-rear', 'corner-right', 'corner-right-rear'] as const;

describe("Egypt's city", () => {
  const kit = townKit('kemet');
  const overlap = (a: { a: number; b: number; n: number }, b: { a: number; b: number; n: number }): boolean =>
    a.a < b.a + b.n && b.a < a.a + a.n && a.b < b.b + b.n && b.b < a.b + a.n;

  it("draws every Greek piece in its own art, and the Temple of Osiris and palms besides", () => {
    for (const k of Object.keys(TOWN_ART) as (keyof typeof TOWN_ART)[]) expect(kit.art[k]?.url, k).not.toBe(TOWN_ART[k].url);
    for (const k of ['templeOsiris', 'palm-a', 'palm-b'] as const) expect(kit.art[k], k).toBeDefined();
  });

  it("keeps the walls' pieces the size of the Greek ones, so the foot lines and corner points hold", () => {
    for (const k of WALL_PIECES) expect([spriteOf(kit, k).w, spriteOf(kit, k).h], k).toEqual([TOWN_ART[k].w, TOWN_ART[k].h]);
  });

  it("has the Greek plots plus a Temple of Osiris plot that crosses none of them", () => {
    const lots = lotsOf('kemet');
    expect(lots.length).toBe(lotsOf('crown').length + 1);
    const temple = lots.find((l) => l.ladder.some(([, b]) => b === 'templeOsiris'))!;
    for (const l of lots) if (l !== temple) expect(overlap(l.plot, temple.plot)).toBe(false);
    expect(lotsOf('crown').some((l) => l.ladder.some(([, b]) => b === 'templeOsiris'))).toBe(false);
  });

  it('shows the Temple of Osiris, its own picture in the hall, where the Greek town borrows the Mage Guild', () => {
    expect(buildingArt('templeOsiris', 'kemet')).toBe('templeOsiris');
    expect(buildingArt('templeOsiris')).toBe('guild-1');
    expect(stagePieces(['templeOsiris'], 'kemet').some((p) => p.art === 'templeOsiris')).toBe(true);
    expect(emptyPlots([], 'kemet').some((p) => p.building === 'templeOsiris')).toBe(true);
  });

  it('shows each dwelling as its upgrade once built, in its own place', () => {
    for (const d of ['guardhouse', 'archeryRange', 'griffinTower', 'barracks', 'monastery', 'tiltyard', 'seraphSpire'] as const) {
      expect(buildingArt(`${d}3`, 'kemet')).toBe(`${d}-3`);
      expect(buildingArt(`${d}2`, 'kemet')).toBe(`${d}-2`);
    }
    for (const id of BUILDING_IDS) expect(buildingArt(id, 'kemet')).toBeTruthy();
  });

  it('lays its houses clear of every plot and the canal', () => {
    const lots = lotsOf('kemet').map((l) => l.plot);
    const houses = housePlots('kemet');
    expect(houses.length).toBeGreaterThan(8);
    for (const h of houses) {
      for (const p of lots) expect(overlap(h.plot, p)).toBe(false);
      for (let i = h.plot.a; i < h.plot.a + h.plot.n; i++) expect(isCanal(i, h.plot.b, 'kemet')).toBe(false);
    }
  });

  it('runs a canal through the middle of an Egyptian city only, and grows no tree in it', () => {
    expect(isCanal(13, 5, 'kemet')).toBe(true);
    expect(isCanal(13, 5, 'crown')).toBe(false);
    for (const t of cityTrees([], 7717, 'kemet')) expect(t.x).toBeGreaterThan(0);
    expect(cityTrees([], 7717, 'kemet').some((t) => t.piece)).toBe(true);
    expect(CITY).toBe(32);
  });
});
