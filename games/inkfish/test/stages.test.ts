import { describe, expect, it } from 'vitest';
import { INKFISH_FULL_CHAPTERS } from '../content/paid';
import { DEMO_CHAPTER } from '../src/levels/demo';
import { growthStages, START_SIZE, stagesFor } from '../src/levels/generate';

const chapters = [DEMO_CHAPTER, ...INKFISH_FULL_CHAPTERS];

describe('growth stages', () => {
  it('gives later chapters more stages', () => {
    expect(chapters.map((c) => stagesFor(c.id))).toEqual([3, 4, 4, 4, 4, 5, 5, 5, 5, 5]);
    for (const ch of chapters) {
      for (const l of ch.levels) {
        expect(l.playerSizes).toHaveLength(stagesFor(ch.id));
        expect(l.tiers).toHaveLength(stagesFor(ch.id));
      }
    }
  });

  it('keeps every stage-up a moderate step', () => {
    for (const l of chapters.flatMap((c) => c.levels)) {
      expect(l.playerSizes[0]).toBe(START_SIZE);
      for (let i = 1; i < l.playerSizes.length; i++) {
        const step = l.playerSizes[i]! / l.playerSizes[i - 1]!;
        expect(step).toBeGreaterThan(1.2);
        expect(step).toBeLessThan(1.75);
      }
    }
  });

  it('gives bigger stages proportionally more points, ending at the goal', () => {
    const { tiers, playerSizes } = growthStages(256, 77, 5);
    expect(tiers.at(-1)).toBe(256);
    expect(playerSizes.at(-1)).toBe(77);
    const spans = tiers.map((t, i) => t - (tiers[i - 1] ?? 0));
    spans.forEach((span, i) => expect(span / playerSizes[i]!).toBeCloseTo(256 / playerSizes.reduce((a, b) => a + b, 0), 0));
  });

  it('matches the old three-stage pacing in the first level', () => {
    const l = DEMO_CHAPTER.levels[0]!;
    const goal = l.tiers.at(-1)!;
    expect(l.tiers[0]! / goal).toBeCloseTo(0.22, 1);
    expect(l.tiers[1]! / goal).toBeCloseTo(0.52, 1);
  });
});
