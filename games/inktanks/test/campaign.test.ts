import { describe, expect, it } from 'vitest';
import { CH1_LEVELS } from '../src/content/ch1/levels';
import { hasLevel, installPaidLevels, levelFor } from '../src/content/levels';
import { chapterOf, CHAPTERS, gate, levelOpen, nextLevel, spotState, type GateContext, type MedalBook } from '../src/logic/campaign';
import type { MatchReport } from '../src/logic/match/report';
import { applyOutcome, outcome } from '../src/logic/mission/outcome';
import { newProgress } from '../src/logic/workshop';
import { INKTANKS_PAID_LEVELS } from '../content/paid';

const ctx = (medals: MedalBook, over: Partial<GateContext> = {}): GateContext => ({ medals, owned: false, available: hasLevel, ...over });
const won = (...ns: number[]): MedalBook => Object.fromEntries(ns.map((n) => [n, [true, false, false] as const]));

function report(over: Partial<MatchReport> = {}): MatchReport {
  return {
    level: 1, passedMain: true, reason: 'done', playerAlive: true, kills: 4, victims: [], intel: { cannon: 2 }, intelCount: 2,
    usedKit: false, alarm: false, hullsUsed: ['light'], picks: [{ family: 'cannon', mk: 1 }], time: 120, truckHpShare: null, ...over,
  };
}

describe('campaign', () => {
  it('has 5 chapters of 10, numbers running on, only chapter 1 free', () => {
    expect(CHAPTERS.map((c) => [c.first, c.last, c.free])).toEqual([[1, 10, true], [11, 20, false], [21, 30, false], [31, 40, false], [41, 50, false]]);
    expect(chapterOf(11).name).toBe('Dust Flats');
    expect(chapterOf(10).index).toBe(0);
  });

  it('opens levels in order: 1 first, each after the one before is passed', () => {
    expect(levelOpen({}, 1)).toBe(true);
    expect(levelOpen({}, 2)).toBe(false);
    expect(levelOpen(won(1), 2)).toBe(true);
    expect(levelOpen(won(1), 3)).toBe(false);
    // A failed try (no main medal) doesn't open the next one.
    expect(levelOpen({ 1: [false, false, false] }, 2)).toBe(false);
    expect(levelOpen({}, 7, true)).toBe(true);
    expect(levelOpen({}, 51, true)).toBe(false);
  });

  it('highlights the first open unpassed level and marks the map spots', () => {
    expect(nextLevel(ctx({}))).toBe(1);
    expect(nextLevel(ctx(won(1, 2, 3)))).toBe(4);
    // All of chapter 1 passed and chapter 2 not made: stays on the last one.
    const all = won(1, 2, 3, 4, 5, 6, 7, 8, 9, 10);
    expect(nextLevel(ctx(all))).toBe(10);
    const c = ctx(won(1, 2));
    expect([1, 2, 3, 4].map((n) => spotState(n, c, 3))).toEqual(['done', 'done', 'next', 'locked']);
  });

  it('gates paid levels behind the purchase, and unmade chapters as coming', () => {
    const all = won(1, 2, 3, 4, 5, 6, 7, 8, 9, 10);
    // Chapter 2 is sold once it is made (readyChapters 2), whether or not its data is here yet.
    expect(gate(11, ctx(all, { readyChapters: 2 }))).toBe('paywall');
    expect(gate(15, ctx({}, { readyChapters: 2 }))).toBe('paywall');
    // Not made yet: nobody is offered it.
    expect(gate(11, ctx(all, { readyChapters: 1 }))).toBe('coming');
    // An owner plays it once loaded and the level before is passed; before it loads it is coming.
    const loaded = (n: number): boolean => n <= 20;
    expect(gate(11, ctx(all, { owned: true, available: loaded }))).toBe('play');
    expect(gate(12, ctx(all, { owned: true, available: loaded }))).toBe('locked');
    expect(gate(11, ctx(all, { owned: true }))).toBe('coming');
    // Owning the game never skips chapter 1's order.
    expect(gate(3, ctx(won(1), { owned: true }))).toBe('locked');
    expect(gate(2, ctx(won(1)))).toBe('play');
  });

  it('ships no paid levels to the client yet, and checks what the host sends', () => {
    expect(INKTANKS_PAID_LEVELS).toEqual([]);
    expect(levelFor(11)).toBeNull();
    expect(installPaidLevels([])).toBe(0);
    expect(() => installPaidLevels({})).toThrow();
    expect(() => installPaidLevels([{ ...CH1_LEVELS[0]!.def }])).toThrow(/number 1/);
    const l11 = { ...CH1_LEVELS[0]!.def, id: 'ch2-01', number: 11 };
    expect(installPaidLevels(JSON.parse(JSON.stringify([l11])))).toBe(1);
    expect(levelFor(11)?.def.name).toBe(CH1_LEVELS[0]!.def.name);
  });
});

describe('medals', () => {
  const def = CH1_LEVELS[0]!.def;

  it('a replay keeps the medals you already have', () => {
    const first = applyOutcome(newProgress(), def, report());
    expect(first.progress.medals[1]).toEqual([true, true, true]);
    const worse = applyOutcome(first.progress, def, report({ picks: [], usedKit: true }));
    expect(worse.outcome.done).toEqual([true, false, false]);
    expect(worse.progress.medals[1]).toEqual([true, true, true]);
    expect(worse.outcome.fresh).toEqual([false, false, false]);
  });

  it('a fail keeps old medals and the intel, and pays only kill XP', () => {
    const p = { ...newProgress(), medals: { 1: [true, false, true] as const } };
    const r = applyOutcome(p, def, report({ passedMain: false, kills: 2 }));
    expect(r.progress.medals[1]).toEqual([true, false, true]);
    expect(r.progress.intel.cannon).toBe(2);
    expect(r.outcome.xp).toBe(20);
  });

  it('only new medals pay objective XP', () => {
    const o = outcome(def, report({ kills: 0 }), [true, false, false]);
    expect(o.fresh).toEqual([false, true, true]);
    expect(o.firstWin).toBe(false);
    expect(o.xp).toBe(100);
  });
});
