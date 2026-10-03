import { describe, expect, it } from 'vitest';
import { GUIDE, guidePages, guideProgress } from '../src/guide';
import { GUIDE_LIMITS, type GuideEntry } from '../src/guide/types';
import { BIRD_INFO } from '../src/logic/birds';
import { JELLY_IDS } from '../src/levels/jellies';
import { SPECIES_INFO } from '../src/levels/species';
import { PLAYER_FISH } from '../src/levels/zones';
import { DEMO_CHAPTER } from '../src/levels/demo';
import { INKFISH_FULL_CHAPTERS } from '../content/paid';

const everyone = [...Object.keys(SPECIES_INFO), ...PLAYER_FISH, ...Object.keys(BIRD_INFO), ...JELLY_IDS];

describe('fish guide', () => {
  it('has a card for every creature in the game', () => {
    const missing = everyone.filter((id) => !(id in GUIDE));
    expect(missing).toEqual([]);
  });

  it('keeps every card short enough to fit its panel', () => {
    for (const [id, e] of Object.entries(GUIDE) as [string, GuideEntry][]) {
      for (const [key, value] of Object.entries(e)) {
        const limit = key === 'fact' ? GUIDE_LIMITS.fact : GUIDE_LIMITS.field;
        expect(value.length, `${id}.${key}`).toBeGreaterThan(0);
        expect(value.length, `${id}.${key}: "${value}"`).toBeLessThanOrEqual(limit);
      }
    }
  });

  it('lists each creature once, under the first chapter it lives in, starting with the fish you swim as', () => {
    const pages = guidePages([DEMO_CHAPTER, ...INKFISH_FULL_CHAPTERS]);
    const ids = pages.flatMap((p) => p.ids);
    expect(new Set(ids).size).toBe(ids.length);
    for (const p of pages) expect(PLAYER_FISH).toContain(p.ids[0]);
    expect(pages[0]!.ids).toContain('minnow');
    expect(pages.find((p) => p.chapter === 10)!.ids).toContain('angler');
  });

  it('every listed creature has a card', () => {
    const pages = guidePages([DEMO_CHAPTER, ...INKFISH_FULL_CHAPTERS]);
    for (const id of pages.flatMap((p) => p.ids)) expect(GUIDE[id], id).toBeDefined();
  });
});

describe('guide progress', () => {
  it('counts the creatures met on a page and rounds the share down', () => {
    expect(guideProgress(['a', 'b', 'c'], new Set(['a', 'z']))).toEqual({ met: 1, total: 3, percent: 33 });
  });

  it('reads 100% only when every creature is met', () => {
    expect(guideProgress(['a', 'b'], new Set(['a', 'b'])).percent).toBe(100);
    const ids = Array.from({ length: 200 }, (_, i) => `f${i}`);
    expect(guideProgress(ids, new Set(ids.slice(1))).percent).toBe(99);
  });

  it('treats an empty page as nothing to find', () => {
    expect(guideProgress([], new Set())).toEqual({ met: 0, total: 0, percent: 0 });
  });
});
