import { describe, expect, it } from 'vitest';
import { ASHFORD } from '../src/level/chapter1';
import { mapById } from '../src/level/maps';
import { answerPrompt, endDay, startAdventure } from '../src/logic/adventure';
import { blotsFor, loadAdventure, mergeProgress, parseAdventure, parseProgress, recordWin, saveAdventure } from '../src/logic/save';

function memoryStore(): { getItem(k: string): string | null; setItem(k: string, v: string): void } {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
}

describe('saving', () => {
  it('round-trips an adventure through storage', () => {
    const store = memoryStore();
    const adv = endDay(answerPrompt(startAdventure(ASHFORD)));
    saveAdventure(store, { current: adv, dayStart: adv });
    expect(loadAdventure(store, mapById)?.current).toEqual(adv);
  });

  it('rejects tampered saves rather than playing them', () => {
    const adv = startAdventure(ASHFORD);
    const bad = (patch: object) => parseAdventure(JSON.parse(JSON.stringify({ ...adv, ...patch })), ASHFORD);
    expect(bad({})).not.toBeNull();
    expect(bad({ day: -1 })).toBeNull();
    expect(bad({ purse: { ...adv.purse, gold: 1.5 } })).toBeNull();
    expect(bad({ hero: { ...adv.hero, army: [{ creature: 'dragon', count: 9 }, null, null, null, null, null, null] } })).toBeNull();
    expect(bad({ hero: { ...adv.hero, x: 0, y: 0 } })).toBeNull();
    expect(bad({ explored: 'x' })).toBeNull();
    expect(parseAdventure('nonsense', ASHFORD)).toBeNull();
  });

  it('takes the map’s fixed parts from the map, not the save', () => {
    const adv = startAdventure(ASHFORD);
    const moved = { ...adv, objects: adv.objects.map((o) => ({ ...o, x: 0, y: 0, kind: 'chest', gold: 999999 })) };
    const parsed = parseAdventure(JSON.parse(JSON.stringify(moved)), ASHFORD)!;
    expect(parsed.objects).toEqual(ASHFORD.objects);
  });

  it('keeps the best result per map and merges two devices', () => {
    let p = recordWin({ maps: {} }, 'ashford', 2, 30);
    p = recordWin(p, 'ashford', 1, 18);
    expect(p.maps.ashford).toEqual({ blots: 2, bestDays: 18 });
    expect(mergeProgress(p, parseProgress({ maps: { ashford: { blots: 3, bestDays: 25 }, __proto__: { blots: 3, bestDays: 1 } } })).maps.ashford).toEqual({ blots: 3, bestDays: 18 });
    expect(parseProgress({ maps: { constructor: { blots: 3, bestDays: 2 } } }).maps).toEqual({});
  });

  it('gives a blot each for winning, par days and losing no stack', () => {
    expect(blotsFor(20, 21, 0)).toBe(3);
    expect(blotsFor(22, 21, 0)).toBe(2);
    expect(blotsFor(22, 21, 1)).toBe(1);
  });
});
