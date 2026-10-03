import { describe, expect, it } from 'vitest';
import { DEMO_CHAPTER } from '../src/levels/demo';
import type { LevelDef } from '../src/levels/types';
import { blotsFor } from '../src/logic/growth';
import { initialProgress, objectiveLine, objectiveOutcome, timeLeft } from '../src/logic/objective';

const base = DEMO_CHAPTER.levels[0]!;
const with_ = (o: Partial<LevelDef>): LevelDef => ({ ...base, ...o });

describe('objectives', () => {
  it('wins a grow level when fully grown', () => {
    expect(objectiveOutcome(base, initialProgress)).toBe('playing');
    expect(objectiveOutcome(base, { ...initialProgress, grown: true })).toBe('won');
  });

  it('loses a timed level when the clock runs out first', () => {
    const rush = with_({ modifiers: { timeLimit: 60 } });
    expect(objectiveOutcome(rush, { ...initialProgress, seconds: 59 })).toBe('playing');
    expect(objectiveOutcome(rush, { ...initialProgress, seconds: 60 })).toBe('lost');
    expect(objectiveOutcome(rush, { ...initialProgress, seconds: 60, grown: true })).toBe('won');
    expect(timeLeft(rush, { ...initialProgress, seconds: 45.2 })).toBe(15);
  });

  it('always needs growth on top of the twist task', () => {
    const collect = with_({ objective: { kind: 'collect', count: 3 } });
    expect(objectiveOutcome(collect, { ...initialProgress, collected: 3 })).toBe('playing');
    expect(objectiveOutcome(collect, { ...initialProgress, grown: true, collected: 2 })).toBe('playing');
    expect(objectiveOutcome(collect, { ...initialProgress, grown: true, collected: 3 })).toBe('won');
    expect(objectiveLine(collect, { ...initialProgress, collected: 3 }).text).toBe('Now grow to full size!');
    const bounty = with_({ objective: { kind: 'bounty', count: 3, species: 'perch', size: [18, 25] } });
    expect(objectiveOutcome(bounty, { ...initialProgress, grown: true, bounties: 3 })).toBe('won');
    expect(objectiveLine(bounty, { ...initialProgress, bounties: 1 }).text).toBe('Marked perch 1/3');
  });

  it('wins a boss level by growing and eating the giant', () => {
    const boss = with_({ objective: { kind: 'boss', species: 'pike', size: 44 } });
    expect(objectiveOutcome(boss, { ...initialProgress, grown: true })).toBe('playing');
    expect(objectiveLine(boss, { ...initialProgress, grown: true }).text).toMatch(/Now eat/);
    expect(objectiveOutcome(boss, { ...initialProgress, bossEaten: true })).toBe('playing');
    expect(objectiveOutcome(boss, { ...initialProgress, grown: true, bossEaten: true })).toBe('won');
  });

  it('rates every level by time', () => {
    expect(blotsFor(base, base.parTime)).toBe(3);
    expect(blotsFor(base, base.parTime * 2)).toBe(1);
  });
});
