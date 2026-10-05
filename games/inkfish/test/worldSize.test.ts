import { describe, expect, it } from 'vitest';
import { REFERENCE_SEA, shoalScale, widthScale, worldFor } from '../src/levels/worldSize';
import { DEMO_CHAPTER } from '../src/levels/demo';
import { INKFISH_FULL_CHAPTERS } from '../content/paid';
import { outsideShoal, shoalReach, SHOAL_HALF } from '../src/logic/ring';

const chapters = [DEMO_CHAPTER, ...INKFISH_FULL_CHAPTERS];

describe('sea sizes', () => {
  it('gives every chapter a long ring, and the deep chapters taller water', () => {
    for (const c of chapters) {
      const { width, height } = worldFor(c.id);
      expect(width).toBeGreaterThanOrEqual(5000);
      if (c.id >= 7) expect(height).toBeGreaterThan(worldFor(6).height);
      for (const level of c.levels) expect(level.world).toEqual({ width, height });
    }
  });

  it('takes well over a quarter of a minute to swim one lap at cruising speed', () => {
    expect(worldFor(1).width / 300).toBeGreaterThan(15);
  });

  it('scales scenery with width and fish with the height of the water', () => {
    expect(widthScale(REFERENCE_SEA.width)).toBe(1);
    expect(widthScale(REFERENCE_SEA.width * 2)).toBe(2);
    expect(shoalScale(REFERENCE_SEA.height)).toBe(1);
    expect(shoalScale(2300)).toBeCloseTo(1.15, 5);
  });

  it('keeps the first chapter as crowded as it was on its old 3200 x 1800 sea', () => {
    const [first] = DEMO_CHAPTER.levels;
    const oldDensity = 26 / (3200 * 1800);
    const shoalArea = SHOAL_HALF * 2 * first!.world.height;
    expect(first!.maxFish / shoalArea / oldDensity).toBeCloseTo(1, 1);
  });

  it('gives deep chapters more fish for their taller water', () => {
    const shallow = INKFISH_FULL_CHAPTERS.find((c) => c.id === 6)!.levels.at(-1)!;
    const deep = INKFISH_FULL_CHAPTERS.find((c) => c.id === 7)!.levels.at(-1)!;
    expect(deep.maxFish / deep.world.height).toBeGreaterThanOrEqual((shallow.maxFish / shallow.world.height) * 0.95);
  });
});

describe('the shoal band', () => {
  it('is a fixed width on a long ring, whatever the ring', () => {
    expect(shoalReach(1400, 5600)).toBe(SHOAL_HALF);
    expect(shoalReach(1400, 9000)).toBe(SHOAL_HALF);
  });

  it('widens for a very wide view, but never past half the ring', () => {
    expect(shoalReach(4000, 9000)).toBe(2400);
    expect(shoalReach(4000, 3600)).toBeLessThan(1800);
  });

  it('lets fish go once they fall well behind, measured round the ring', () => {
    expect(outsideShoal(1000 + SHOAL_HALF, 1000, 1400, 5600)).toBe(false);
    expect(outsideShoal(1000 + SHOAL_HALF + 300, 1000, 1400, 5600)).toBe(true);
    // 5000 is 1600 the other way round from 1000.
    expect(outsideShoal(5000, 1000, 1400, 5600)).toBe(false);
  });
});
