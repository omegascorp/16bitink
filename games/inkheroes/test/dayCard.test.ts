import { describe, expect, it } from 'vitest';
import { partStates, spreadCard } from '../src/scenes/menu/chapterProgress';
import { barLength, centredRows, faceSlot, needsColumns } from '../src/scenes/hud/dayCardLayout';
import { drawMeter } from '../src/scenes/hud/dayCardArt';
import { RIMS, SLOT } from '../src/scenes/battle/pixelFrames';
import { parseDayReport, type DayReport } from '../src/logic/dayReport';

const REPORT: DayReport = {
  income: { gold: 8000, wood: 2, ore: 6, mercury: 0, sulfur: 1, crystal: 1, gems: 1 },
  sources: [{ kind: 'town', label: 'Ashford', gold: 2000 }, { kind: 'mines', label: 'Gold mines ×2', gold: 2000 }],
  hero: { name: 'Rowan', tiles: 17, horses: 4, mana: 12, maxMana: 20, gained: 2 },
  week: { recruits: [{ town: 'Ashford', units: [{ creature: 'spearman', count: 14 }] }] },
};

describe('the day card', () => {
  it('sizes a gold bar against the biggest source, and never loses a small one', () => {
    expect(barLength(2000, 2000, 100)).toBe(100);
    expect(barLength(1000, 2000, 100)).toBe(50);
    expect(barLength(10, 20000, 100)).toBe(2);
    expect(barLength(0, 2000, 100)).toBe(0);
  });

  it('lays what it can on a row, centred, and carries the rest to the next', () => {
    expect(centredRows([40, 40], 200, 10)).toEqual([[{ i: 0, x: 55 }, { i: 1, x: 105 }]]);
    const rows = centredRows([100, 100, 100], 250, 10);
    expect(rows.map((r) => r.map((c) => c.i))).toEqual([[0, 1], [2]]);
    expect(rows[1]![0]!.x).toBe(75);
  });

  it('shrinks the faces only when seven lines would not fit', () => {
    expect(faceSlot(334, 66, 3)).toBe(SLOT);
    expect(faceSlot(334, 66, 7)).toBe(SLOT);
    expect(faceSlot(282, 66, 7)).toBeLessThan(SLOT);
    expect(66 + 7 * (faceSlot(282, 66, 7) + 2)).toBeLessThanOrEqual(282 + 2);
  });

  it('spreads into two columns only on a screen too short and wide enough', () => {
    expect(needsColumns(400, { w: 844, h: 390 })).toBe(true);
    expect(needsColumns(300, { w: 844, h: 390 })).toBe(false);
    expect(needsColumns(700, { w: 390, h: 640 })).toBe(false);
  });

  it('fills a meter up to its share', () => {
    const b = drawMeter(20, 9, 0.5, RIMS.gold);
    const at = (x: number): number => b.data[(4 * 20 + x) * 4]!;
    expect(at(8)).toBeGreaterThan(at(14));
    expect(drawMeter(20, 9, 0, RIMS.gold).w).toBe(20);
  });

  it('comes back from a save whole, and a broken one is refused', () => {
    expect(parseDayReport(JSON.parse(JSON.stringify(REPORT)))).toEqual(REPORT);
    expect(parseDayReport({ ...REPORT, week: undefined })).toEqual({ ...REPORT, week: undefined });
    expect(parseDayReport({ ...REPORT, income: 'lots' })).toBeUndefined();
    expect(parseDayReport({ ...REPORT, sources: [{ kind: 'dragon', label: 'x', gold: 1 }] })).toBeUndefined();
    expect(parseDayReport({ ...REPORT, week: { recruits: [{ town: 'Ashford', units: [{ creature: 'nobody', count: 1 }] }] } })).toBeUndefined();
    expect(parseDayReport(null)).toBeUndefined();
  });
});

describe('the chapter card', () => {
  const parts = [{ id: 'a' }, { id: 'b' }, { id: 'c' }] as const;

  it('shows the game in play, whatever earlier games won', () => {
    expect(partStates(parts, 'a', { a: {}, b: {} })).toEqual(['now', 'ahead', 'ahead']);
    expect(partStates(parts, 'b', { a: {}, b: {} })).toEqual(['won', 'now', 'ahead']);
    expect(partStates(parts, 'c', {})).toEqual(['won', 'won', 'now']);
  });

  it('spreads into two columns only where one runs off the screen and two fit', () => {
    expect(spreadCard(420, 444, { w: 844, h: 390 })).toBe(true);
    expect(spreadCard(420, 444, { w: 1512, h: 751 })).toBe(false);
    expect(spreadCard(420, 444, { w: 390, h: 400 })).toBe(false);
  });

  it('with no game in play, shows the chapter won only when all of it was', () => {
    expect(partStates(parts, null, { a: {}, b: {}, c: {} })).toEqual(['won', 'won', 'won']);
    expect(partStates(parts, null, { a: {} })).toEqual(['now', 'ahead', 'ahead']);
    expect(partStates(parts, null, {})).toEqual(['now', 'ahead', 'ahead']);
  });
});
