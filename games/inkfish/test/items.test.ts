import { describe, expect, it } from 'vitest';
import { INKFISH_FULL_CHAPTERS } from '../content/paid';
import { DEMO_CHAPTER } from '../src/levels/demo';
import { ITEM_IDS, ITEM_INFO, itemsForLevel, MAX_BAD_ITEMS, MAX_GOOD_ITEMS, MAX_ITEMS_PER_LEVEL } from '../src/levels/items';
import { describeLevel } from '../src/levels/twists';

const levels = [DEMO_CHAPTER, ...INKFISH_FULL_CHAPTERS].flatMap((c) => c.levels);

describe('falling items', () => {
  it('never drops more than three kinds in a level', () => {
    for (let n = 1; n <= 100; n++) {
      expect(itemsForLevel(n, n % 3 === 0).length).toBeLessThanOrEqual(MAX_ITEMS_PER_LEVEL);
      expect(itemsForLevel(n, false).length).toBeGreaterThan(0);
    }
  });

  it('only drops items that have been unlocked by then', () => {
    expect(itemsForLevel(1, false)).toEqual(['can']);
    for (let n = 1; n <= 100; n++) {
      for (const id of itemsForLevel(n, false)) expect(ITEM_INFO[id].debut).toBeLessThanOrEqual(n);
    }
  });

  it('always includes an item on the level it debuts', () => {
    for (const id of ITEM_IDS) {
      expect(itemsForLevel(ITEM_INFO[id].debut, true)).toContain(id);
    }
  });

  it('drops at most two helpful kinds and one harmful kind per level', () => {
    for (let n = 1; n <= 100; n++) {
      for (const dark of [false, true]) {
        const items = itemsForLevel(n, dark);
        expect(items.filter((id) => ITEM_INFO[id].good).length).toBeLessThanOrEqual(MAX_GOOD_ITEMS);
        expect(items.filter((id) => !ITEM_INFO[id].good).length).toBeLessThanOrEqual(MAX_BAD_ITEMS);
      }
    }
  });

  it('keeps hazards to one kind per level, and only after the first one debuts', () => {
    for (let n = 1; n <= 100; n++) {
      const bad = itemsForLevel(n, false).filter((id) => !ITEM_INFO[id].good);
      expect(bad.length).toBeLessThanOrEqual(1);
      if (n < ITEM_INFO.bag.debut) expect(bad).toEqual([]);
    }
  });

  it('drops glow sticks only where it is dark', () => {
    expect(itemsForLevel(70, false)).not.toContain('glowstick');
    expect(itemsForLevel(66, true)).not.toContain('glowstick');
    expect(itemsForLevel(70, true)).toContain('glowstick');
  });

  it('wires items into every generated level and announces each debut once', () => {
    for (const l of levels) {
      expect(l.items.length).toBeGreaterThan(0);
      expect(l.items.length).toBeLessThanOrEqual(MAX_ITEMS_PER_LEVEL);
    }
    const notes = levels.flatMap((l) => describeLevel(l).notes.filter((n) => n.startsWith('New item') || n.startsWith('Watch out')));
    expect(notes.length).toBe(ITEM_IDS.filter((id) => id !== 'can').length);
  });
});
