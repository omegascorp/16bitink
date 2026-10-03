import { describe, expect, it } from 'vitest';
import { INKFISH_FULL_CHAPTERS } from '../content/paid';
import { DEMO_CHAPTER } from '../src/levels/demo';
import { describeLevel, twistsFor } from '../src/levels/twists';
import { parseChapters } from '../src/levels/validate';
import { LEVELS_PER_CHAPTER } from '../src/levels/zones';

const chapters = [DEMO_CHAPTER, ...INKFISH_FULL_CHAPTERS];
const key = (t: readonly string[]): string => t.join('+');

describe('twists', () => {
  it('gives every level in a chapter its own twist', () => {
    for (const ch of chapters) {
      expect(new Set(ch.levels.map((l) => key(l.twists))).size).toBe(LEVELS_PER_CHAPTER);
    }
  });

  it('opens each chapter gently and ends it with a giant', () => {
    for (const ch of chapters) {
      expect(ch.levels[0]!.twists).toEqual(['grow']);
      expect(ch.levels.at(-1)!.objective.kind).toBe('boss');
    }
  });

  it('remixes a different pair of twists in every chapter', () => {
    const remixes = chapters.map((ch) => key(ch.levels[8]!.twists));
    expect(new Set(remixes).size).toBe(chapters.length);
  });

  it('turns hook storms into jelly blooms where hooks cannot reach', () => {
    for (const ch of chapters) {
      const storm = ch.levels.find((l) => l.twists.includes('storm'))!;
      const plain = ch.levels[0]!;
      // Fishing lines don't reach the twilight zone and below.
      if (ch.id >= 7) {
        expect(storm.hazards.hookEverySec).toBe(0);
        expect(storm.hazards.jellyfish).toBeGreaterThan(plain.hazards.jellyfish * 1.5);
      } else {
        expect(storm.hazards.hookEverySec).toBeLessThanOrEqual(5);
      }
    }
  });

  it('makes marked fish edible only after the first growth', () => {
    for (const ch of chapters) {
      for (const l of ch.levels) {
        if (l.objective.kind !== 'bounty') continue;
        expect(l.objective.size[0]).toBeGreaterThan(l.playerSizes[0] * 0.9);
        expect(l.objective.size[1]).toBeLessThan(l.playerSizes[1] * 0.9);
      }
    }
  });

  it('makes the giant dangerous until the final size, then edible', () => {
    for (const ch of chapters) {
      const l = ch.levels.at(-1)!;
      if (l.objective.kind !== 'boss') throw new Error('expected a boss');
      expect(l.objective.size).toBeGreaterThan(l.playerSizes[1] * 1.1);
      expect(l.objective.size).toBeLessThan(l.playerSizes[2] * 0.9);
    }
  });

  it('describes every level in plain words', () => {
    for (const l of chapters.flatMap((c) => c.levels)) {
      const d = describeLevel(l);
      expect(d.goal.length).toBeGreaterThan(5);
      expect(d.tag.length).toBeGreaterThan(2);
    }
    expect(describeLevel(DEMO_CHAPTER.levels[1]!).goal).toMatch(/ink drops/);
  });

  it('survives the trip through JSON and validation', () => {
    expect(() => parseChapters(JSON.parse(JSON.stringify(chapters)))).not.toThrow();
    const bad = JSON.parse(JSON.stringify([DEMO_CHAPTER]));
    bad[0].levels[1].objective = { kind: 'collect', count: -1 };
    expect(() => parseChapters(bad)).toThrow();
  });

  it('makes growth part of every goal and one-life levels truly one life', () => {
    for (const l of chapters.flatMap((c) => c.levels)) {
      expect(describeLevel(l).goal).toMatch(/[Gg]row/);
      if (l.twists.includes('survive')) expect(l.modifiers.lives).toBe(1);
    }
  });

  it('schedules a remix from the chapter number', () => {
    expect(twistsFor(1, 8)).not.toEqual(twistsFor(2, 8));
    expect(twistsFor(3, 9)).toEqual(['boss']);
  });
});
