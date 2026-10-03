import { describe, expect, it } from 'vitest';
import { DEMO_CHAPTER } from '../src/levels/demo';
import { parseChapters } from '../src/levels/validate';
import { drainFrenzy, feedFrenzy, frenzyLabel, frenzyMultiplier, initialFrenzy } from '../src/logic/frenzy';
import { addGrowth, blotsFor, growthProgress, initialGrowth, playerSizeFor } from '../src/logic/growth';
import { createRng } from '../src/logic/rng';
import { isLevelOpen, loadSave, markSeen, parseSave, persistSave, recordResult, SAVE_KEY } from '../src/logic/save';
import { growthPointsFor, pickSpawn, relationTo, scoreFor, touches } from '../src/logic/sizing';

const level = DEMO_CHAPTER.levels[0]!;

describe('sizing', () => {
  it('classifies relations by size ratio', () => {
    expect(relationTo(20, 10)).toBe('prey');
    expect(relationTo(20, 20)).toBe('peer');
    expect(relationTo(20, 30)).toBe('predator');
  });

  it('rewards bigger meals', () => {
    expect(growthPointsFor(4)).toBe(1);
    expect(growthPointsFor(40)).toBe(5);
    expect(scoreFor(10, 3)).toBe(300);
  });

  it('detects overlap with a forgiving factor', () => {
    expect(touches(0, 0, 10, 14, 0, 10)).toBe(true);
    expect(touches(0, 0, 10, 16, 0, 10)).toBe(false);
  });

  it('biases spawns towards prey but still spawns threats', () => {
    const rng = createRng(42);
    const picks = Array.from({ length: 500 }, () => pickSpawn(level.spawns, 18, rng));
    const prey = picks.filter((p) => relationTo(18, p.size) === 'prey').length;
    expect(prey / picks.length).toBeGreaterThan(0.55);
    expect(picks.some((p) => relationTo(18, p.size) === 'predator')).toBe(true);
  });

  it('caps prey spawn size below the edible threshold', () => {
    const rng = createRng(1);
    for (let i = 0; i < 200; i++) {
      const p = pickSpawn([{ species: 'minnow', weight: 1, size: [8, 40] }], 20, rng);
      expect(p.size).toBeGreaterThanOrEqual(8);
    }
  });

  it('throws on an empty spawn table', () => {
    expect(() => pickSpawn([], 10, createRng(1))).toThrow();
  });
});

describe('frenzy', () => {
  it('climbs with consecutive meals and caps at x5', () => {
    let s = initialFrenzy;
    expect(frenzyMultiplier(s)).toBe(1);
    for (let i = 0; i < 20; i++) s = feedFrenzy(s);
    expect(s.meter).toBe(1);
    expect(frenzyMultiplier(s)).toBe(5);
    expect(frenzyLabel(5)).toBe('INK FRENZY!');
  });

  it('drains over time without mutating input', () => {
    const full = { meter: 1 };
    const drained = drainFrenzy(full, 100);
    expect(drained.meter).toBe(0);
    expect(full.meter).toBe(1);
    expect(frenzyLabel(1)).toBe('');
    expect(frenzyLabel(3)).toBe('Frenzy');
  });

  /** Eats `meals` fish, `gapSec` apart; returns the best multiplier reached. */
  function binge(meals: number, gapSec: number): number {
    let s = initialFrenzy;
    let best = 1;
    for (let i = 0; i < meals; i++) {
      s = feedFrenzy(drainFrenzy(s, i === 0 ? 0 : gapSec));
      best = Math.max(best, frenzyMultiplier(s));
    }
    return best;
  }

  it('rewards two quick meals with x2', () => {
    expect(binge(2, 1)).toBe(2);
  });

  it('builds to a frenzy with steady eating, a fish every two seconds', () => {
    expect(binge(5, 2)).toBeGreaterThanOrEqual(3);
    expect(binge(12, 2)).toBe(5);
  });

  it('gives nothing for slow eating: it is a combo, not a bonus', () => {
    expect(binge(10, 6)).toBe(1);
  });

  it('takes a while to drain from full, so a short chase does not lose it', () => {
    expect(frenzyMultiplier(drainFrenzy({ meter: 1 }, 4))).toBeGreaterThanOrEqual(3);
  });
});

describe('growth', () => {
  it('advances tiers and completes the level', () => {
    let g = addGrowth(level, initialGrowth, level.tiers[0]);
    expect(g.tier).toBe(1);
    g = addGrowth(level, g, level.tiers[1] - level.tiers[0]);
    expect(g.tier).toBe(2);
    expect(g.complete).toBe(false);
    g = addGrowth(level, g, 1000);
    expect(g.complete).toBe(true);
    expect(growthProgress(level, g)).toBe(1);
  });

  it('maps tiers to sizes and clamps', () => {
    expect(playerSizeFor(level, 0)).toBe(level.playerSizes[0]);
    expect(playerSizeFor(level, 9)).toBe(level.playerSizes[2]);
  });

  it('rates time against par', () => {
    expect(blotsFor(level, level.parTime)).toBe(3);
    expect(blotsFor(level, level.parTime * 1.2)).toBe(2);
    expect(blotsFor(level, level.parTime * 3)).toBe(1);
  });
});

describe('save', () => {
  it('ignores malformed storage', () => {
    expect(parseSave('not json').levels).toEqual({});
    expect(parseSave('{"levels":{"a":{"bestScore":"x"}}}').levels).toEqual({});
    expect(parseSave(null).levels).toEqual({});
  });

  it('keeps best results', () => {
    let s = recordResult(parseSave(null), 'a', 100, 2);
    s = recordResult(s, 'a', 50, 3);
    expect(s.levels.a).toEqual({ bestScore: 100, blots: 3 });
  });

  it('opens levels sequentially', () => {
    const ids = ['a', 'b', 'c'];
    const s = recordResult(parseSave(null), 'a', 1, 1);
    expect(isLevelOpen(s, ids, 'a')).toBe(true);
    expect(isLevelOpen(s, ids, 'b')).toBe(true);
    expect(isLevelOpen(s, ids, 'c')).toBe(false);
    expect(isLevelOpen(s, ids, 'zzz')).toBe(false);
  });

  it('opens every listed level with the dev all-levels flag, but nothing unlisted', () => {
    const ids = ['a', 'b', 'c'];
    const fresh = parseSave(null);
    expect(ids.every((id) => isLevelOpen(fresh, ids, id, true))).toBe(true);
    expect(isLevelOpen(fresh, ids, 'c', false)).toBe(false);
    expect(isLevelOpen(fresh, ids, 'zzz', true)).toBe(false);
  });

  it('round-trips through a store and survives store failures', () => {
    const map = new Map<string, string>();
    const store = { getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => void map.set(k, v) };
    persistSave(store, recordResult(parseSave(null), 'a', 5, 1));
    expect(map.has(SAVE_KEY)).toBe(true);
    expect(loadSave(store).levels.a?.bestScore).toBe(5);
    const broken = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('full'); } };
    expect(loadSave(broken).levels).toEqual({});
    expect(() => persistSave(broken, parseSave(null))).not.toThrow();
  });
});

describe('parseChapters', () => {
  it('accepts valid chapters', () => {
    expect(parseChapters([DEMO_CHAPTER])[0]!.levels).toHaveLength(DEMO_CHAPTER.levels.length);
  });

  it('rejects malformed data', () => {
    expect(() => parseChapters({})).toThrow();
    expect(() => parseChapters([{ id: 2, name: 'x', levels: [{ id: 'bad' }] }])).toThrow(/malformed/);
    expect(() => parseChapters([{ name: 'x' }])).toThrow(/malformed/);
  });
});

describe('parseChapters ranges', () => {
  const good = DEMO_CHAPTER.levels[0]!;
  const wrap = (level: object): unknown => [{ id: 2, name: 'x', levels: [level] }];

  it('rejects non-ascending or zero tiers', () => {
    expect(() => parseChapters(wrap({ ...good, tiers: [10, 5, 20] }))).toThrow();
    expect(() => parseChapters(wrap({ ...good, tiers: [0, 5, 20] }))).toThrow();
  });

  it('rejects bad worlds and spawn weights', () => {
    expect(() => parseChapters(wrap({ ...good, world: { width: 0, height: 100 } }))).toThrow();
    expect(() => parseChapters(wrap({ ...good, spawns: [{ species: 'minnow', weight: -1, size: [8, 14] }] }))).toThrow();
    expect(() => parseChapters(wrap({ ...good, spawns: [{ species: 'minnow', weight: 1, size: [14, 8] }] }))).toThrow();
  });
});

describe('creatures met (fish guide)', () => {
  it('survive a save round trip, without duplicates', () => {
    const save = markSeen(markSeen(parseSave(null), ['minnow', 'perch']), ['perch', 'tern']);
    expect(save.seen).toEqual(['minnow', 'perch', 'tern']);
    expect(parseSave(JSON.stringify(save)).seen).toEqual(['minnow', 'perch', 'tern']);
  });

  it('drop junk from untrusted storage, and old saves start empty', () => {
    expect(parseSave(JSON.stringify({ levels: {}, seen: ['eel', 5, null, 'x'.repeat(200), 'eel'] })).seen).toEqual(['eel']);
    expect(parseSave(JSON.stringify({ levels: {} })).seen).toEqual([]);
  });

  it('leave the save untouched when nothing is new', () => {
    const save = markSeen(parseSave(null), ['eel']);
    expect(markSeen(save, ['eel'])).toBe(save);
  });
});
