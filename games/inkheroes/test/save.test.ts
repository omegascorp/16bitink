import { describe, expect, it } from 'vitest';
import { ASHFORD, THORNWOOD } from '../src/level/borderMarch';
import { mapById } from '../src/level/maps';
import { answerPrompt, endDay, queueLevelUps, startAdventure } from '../src/logic/adventure';
import { blotsFor, loadAdventure, mergeProgress, parseAdventure, parseProgress, recordWin, saveAdventure } from '../src/logic/save';

function memoryStore(): { getItem(k: string): string | null; setItem(k: string, v: string): void } {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
}

describe('saving', () => {
  it('keeps a waiting day card, and a card saved as plain text before there were reports', () => {
    const store = memoryStore();
    const day = endDay(answerPrompt(startAdventure(ASHFORD)));
    saveAdventure(store, { current: day, dayStart: day });
    expect(loadAdventure(store, mapById)?.current.prompts).toEqual(day.prompts);
    const old = { ...day, prompts: [{ kind: 'message' as const, title: 'Month 1, Week 1, Day 2', text: 'Ashford pays 500 gold.' }] };
    saveAdventure(store, { current: old, dayStart: old });
    expect(loadAdventure(store, mapById)?.current.prompts).toEqual(old.prompts);
  });

  it('round-trips an adventure through storage', () => {
    const store = memoryStore();
    const adv = endDay(answerPrompt(startAdventure(ASHFORD)));
    saveAdventure(store, { current: adv, dayStart: adv });
    expect(loadAdventure(store, mapById)?.current).toEqual(adv);
  });

  it('deals the same level-up offer again after a reload', () => {
    const store = memoryStore();
    const start = { ...startAdventure(ASHFORD), prompts: [] };
    const adv = queueLevelUps({ ...start, hero: { ...start.hero, xp: 1000 } });
    const offer = adv.prompts.find((p) => p.kind === 'levelUp');
    expect(offer).toBeDefined();
    saveAdventure(store, { current: adv, dayStart: adv });
    const reloaded = loadAdventure(store, mapById)!.current;
    expect(reloaded.prompts.find((p) => p.kind === 'levelUp')).toEqual(offer);
  });

  it('rejects tampered saves rather than playing them', () => {
    const adv = startAdventure(ASHFORD);
    const bad = (patch: object) => parseAdventure(JSON.parse(JSON.stringify({ ...adv, ...patch })), ASHFORD);
    expect(bad({})).not.toBeNull();
    expect(bad({ day: -1 })).toBeNull();
    expect(bad({ purse: { ...adv.purse, gold: 1.5 } })).toBeNull();
    expect(bad({ hero: { ...adv.hero, army: [{ creature: 'wyvern', count: 9 }, null, null, null, null, null, null] } })).toBeNull();
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

  it('loads a save from before a map gained a monster, with the monster on the map', () => {
    const adv = startAdventure(THORNWOOD);
    const old = { ...adv, objects: adv.objects.filter((o) => o.id !== 'road-boars') };
    const parsed = parseAdventure(JSON.parse(JSON.stringify(old)), THORNWOOD)!;
    expect(parsed).not.toBeNull();
    expect(parsed.objects.find((o) => o.id === 'road-boars')).toMatchObject({ creature: 'boar', count: 10 });
  });

  it('still refuses a save missing anything but a monster', () => {
    const adv = startAdventure(THORNWOOD);
    const old = { ...adv, objects: adv.objects.filter((o) => o.id !== 'pile-gold-1') };
    expect(parseAdventure(JSON.parse(JSON.stringify(old)), THORNWOOD)).toBeNull();
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
