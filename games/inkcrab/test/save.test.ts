import { describe, expect, it } from 'vitest';
import { blotsFor, EMPTY_PROGRESS, isUnlocked, loadProgress, parseProgress, recordResult, saveProgress } from '../src/logic/save';

const order = ['pen-test', 'room-to-grow', 'underlined'];

describe('saved progress', () => {
  it('gives a blot for finishing, one for par time and one for no lives lost', () => {
    expect(blotsFor(30, 40, 0)).toBe(3);
    expect(blotsFor(50, 40, 0)).toBe(2);
    expect(blotsFor(30, 40, 1)).toBe(2);
    expect(blotsFor(50, 40, 2)).toBe(1);
  });

  it('keeps the best blots and the best time', () => {
    let p = recordResult(EMPTY_PROGRESS, 'pen-test', 2, 50);
    p = recordResult(p, 'pen-test', 1, 30);
    expect(p.levels['pen-test']).toEqual({ blots: 2, bestTime: 30 });
  });

  it('opens each level once the one before is finished', () => {
    expect(isUnlocked(EMPTY_PROGRESS, order, 'pen-test')).toBe(true);
    expect(isUnlocked(EMPTY_PROGRESS, order, 'room-to-grow')).toBe(false);
    const p = recordResult(EMPTY_PROGRESS, 'pen-test', 1, 60);
    expect(isUnlocked(p, order, 'room-to-grow')).toBe(true);
    expect(isUnlocked(p, order, 'underlined')).toBe(false);
  });

  it('drops anything malformed from saved data', () => {
    expect(parseProgress(null)).toEqual(EMPTY_PROGRESS);
    expect(parseProgress({ levels: 'x' })).toEqual(EMPTY_PROGRESS);
    const p = parseProgress({ levels: { 'pen-test': { blots: 3, bestTime: 20 }, bad: { blots: 9, bestTime: 1 }, 'NOPE!': { blots: 1, bestTime: 1 } } });
    expect(p.levels).toEqual({ 'pen-test': { blots: 3, bestTime: 20 } });
  });

  it('round-trips through storage, and survives broken storage', () => {
    const mem = new Map<string, string>();
    const store = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) };
    const p = recordResult(EMPTY_PROGRESS, 'pen-test', 3, 25);
    saveProgress(store, p);
    expect(loadProgress(store)).toEqual(p);
    mem.set('inkcrab.progress.v1', '{not json');
    expect(loadProgress(store)).toEqual(EMPTY_PROGRESS);
    expect(loadProgress(undefined)).toEqual(EMPTY_PROGRESS);
  });
});
