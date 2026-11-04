import { describe, expect, it } from 'vitest';
import { BUILDING_IDS, type BuildingId } from '../src/logic/buildings';
import { BUILD_ORDER } from '../src/logic/town';
import { paintCity } from '../src/scenes/town/townGround';
import { fitFactor, puffPixels, shrinkPixels, standOn } from '../src/scenes/town/townPictures';
import { buildingArt, CITY, emptyPlots, housePlots, ledgerOf, LOTS, stagePieces, toGrid, toStage, type Plot } from '../src/scenes/town/townStage';

const overlaps = (p: Plot, q: Plot): boolean => p.a < q.a + q.n && q.a < p.a + p.n && p.b < q.b + q.n && q.b < p.b + p.n;
const inside = (p: Plot): boolean => p.a >= 0 && p.b >= 0 && p.a + p.n <= CITY && p.b + p.n <= CITY;

describe('town city layout', () => {
  it('grid and stage round-trip', () => {
    const s = toStage(7, 11);
    const g = toGrid(s.x, s.y);
    expect(g.i).toBeCloseTo(7);
    expect(g.j).toBeCloseTo(11);
  });

  it('plots and houses stay inside the city and never overlap', () => {
    const plots = [...LOTS.map((l) => l.plot), ...housePlots().map((h) => h.plot)];
    for (const p of plots) expect(inside(p)).toBe(true);
    for (let x = 0; x < plots.length; x++) for (let y = x + 1; y < plots.length; y++) expect(overlaps(plots[x]!, plots[y]!)).toBe(false);
  });

  it('fills the city with houses, the same every time', () => {
    const a = housePlots();
    expect(a.length).toBeGreaterThanOrEqual(8);
    expect(housePlots()).toEqual(a);
  });

  it('shows the best of each ladder, back to front', () => {
    const built: BuildingId[] = ['villageHall', 'townHall', 'fort', 'citadel', 'tavern'];
    const pieces = stagePieces(built);
    const arts = pieces.map((p) => p.art);
    expect(arts).toContain('hall-town');
    expect(arts).not.toContain('hall-village');
    expect(arts).toContain('walls-citadel');
    expect(arts).toContain('tavern');
    expect(arts).toContain('fountain');
    for (let i = 1; i < pieces.length; i++) expect(pieces[i]!.spot.y).toBeGreaterThanOrEqual(pieces[i - 1]!.spot.y);
  });

  it('every building has art and a plot; bare plots offer their first step', () => {
    for (const id of BUILDING_IDS) expect(buildingArt(id)).toBeTruthy();
    const bare = emptyPlots(['villageHall']);
    expect(bare.find((b) => b.building === 'fort')).toBeTruthy();
    expect(bare.find((b) => b.building === 'villageHall')).toBeUndefined();
    expect(emptyPlots([...BUILDING_IDS])).toEqual([]);
  });

  it('the ledger shows one card per ladder, its next step', () => {
    const l = ledgerOf(['villageHall', 'fort'], BUILD_ORDER, []);
    expect(l).toContain('townHall');
    expect(l).toContain('citadel');
    expect(l).toContain('mageGuild1');
    expect(l).not.toContain('villageHall');
    expect(l).not.toContain('mageGuild2');
    expect(ledgerOf([...BUILDING_IDS], BUILD_ORDER, [])).toContain('capitol');
    expect(ledgerOf([], BUILD_ORDER, ['tiltyard'])).not.toContain('tiltyard');
  });
});

describe('town pictures', () => {
  const solid = (w: number, h: number, c: number): { data: Uint8ClampedArray; w: number; h: number } => {
    const data = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < w * h; i++) data.set([c, c, c, 255], i * 4);
    return { data, w, h };
  };

  it('shrinks by whole factors and fits boxes', () => {
    const s = shrinkPixels(solid(8, 6, 100), 2);
    expect([s.w, s.h]).toEqual([4, 3]);
    expect(s.data[3]).toBe(255);
    expect(fitFactor(300, 100, 150, 76)).toBe(2);
    expect(fitFactor(40, 40, 150, 76)).toBe(1);
  });

  it('stands a sprite on its backdrop, feet up from the bottom', () => {
    const out = standOn(solid(10, 10, 10), solid(2, 2, 200), 10, 10, 1);
    expect(out.data[((8 - 1) * 10 + 4) * 4]).toBe(200);
    expect(out.data[(9 * 10 + 4) * 4]).toBe(10);
  });
});

describe('town ground', () => {
  it('paves the city, greens its verge and walls its front edges', () => {
    const area = { x: 0, y: 0, w: 1180, h: 740 };
    const out = { data: new Uint8ClampedArray(area.w * area.h * 4), w: area.w, h: area.h };
    const sw = (c: number): { data: Uint8ClampedArray; w: number; h: number } => ({ data: new Uint8ClampedArray(16 * 16 * 4).map((_, i) => (i % 4 === 3 ? 255 : c)), w: 16, h: 16 });
    paintCity(out, area, { paving: sw(150), grass: sw(60) }, []);
    const at = (x: number, y: number): number => out.data[(y * area.w + x) * 4]!;
    const mid = toStage(CITY / 2, CITY / 2);
    expect(at(Math.round(mid.x), Math.round(mid.y))).toBeGreaterThan(150);
    const edge = toStage(0.5, 0.5);
    expect(at(Math.round(edge.x), Math.round(edge.y))).toBe(60);
    const front = toStage(CITY, CITY);
    expect(out.data[((Math.round(front.y) - 4) * area.w + Math.round(front.x) - 20) * 4 + 3]).toBe(255);
  });
});

describe('town smoke', () => {
  it('draws each puff as a round disc, lit on the top left and shaded on the bottom right', () => {
    for (const r of [1, 2, 3, 4]) {
      const b = puffPixels(r);
      expect(b.w).toBe(r * 2 + 1);
      const at = (x: number, y: number): readonly number[] => [...b.data.subarray((y * b.w + x) * 4, (y * b.w + x) * 4 + 4)];
      expect(at(r, r)[3]).toBe(255);
      expect(at(0, 0)[3]).toBe(0);
      if (r > 1) expect(at(r - 1, r - 1)[0]!).toBeGreaterThan(at(r + 1, r + 1)[0]!);
    }
  });
});
