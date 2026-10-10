import { describe, expect, it } from 'vitest';
import { BEACH_1 } from '../src/level/beach1';
import { levelGoal, shellLadder, START_SHELL } from '../src/level/build';
import { beachIndexOf, FREE_BEACHES, isBeachFinale, isFreeEnd } from '../src/level/levels';
import { beachTally, EMPTY_PROGRESS, MAX_BLOTS, recordResult } from '../src/logic/save';

describe('end of a beach', () => {
  it('knows which beach a level is on', () => {
    expect(beachIndexOf(BEACH_1[0]!.id)).toBe(0);
    expect(beachIndexOf('no-such-level')).toBe(-1);
  });

  it('celebrates only the last level of a beach', () => {
    expect(isBeachFinale(BEACH_1.at(-1)!.id)).toBe(true);
    for (const l of BEACH_1.slice(0, -1)) expect(isBeachFinale(l.id)).toBe(false);
    expect(isBeachFinale('no-such-level')).toBe(false);
  });

  it('offers the full game after the tenth, last free level', () => {
    expect(FREE_BEACHES).toBe(1);
    expect(BEACH_1).toHaveLength(10);
    expect(isFreeEnd(BEACH_1[9]!.id)).toBe(true);
    expect(isFreeEnd(BEACH_1[8]!.id)).toBe(false);
  });

  it('adds up a beach: blots of all possible, and best times', () => {
    const ids = BEACH_1.map((l) => l.id);
    const p = recordResult(recordResult(EMPTY_PROGRESS, ids[0]!, 3, 40), ids[9]!, 2, 500);
    expect(beachTally(p, ids)).toEqual({ blots: 5, maxBlots: 10 * MAX_BLOTS, finished: 2, time: 540 });
    expect(beachTally(EMPTY_PROGRESS, ids)).toEqual({ blots: 0, maxBlots: 30, finished: 0, time: 0 });
  });

  it('retells the climb from the first shell to the biggest, smallest first', () => {
    const finale = BEACH_1.at(-1)!;
    const ladder = shellLadder(finale);
    expect(ladder[0]).toEqual(START_SHELL);
    expect(ladder.at(-1)!.size).toBe(levelGoal(finale));
    // One shell a size, every size from the start to the goal.
    expect(ladder.map((s) => s.size)).toEqual(Array.from({ length: levelGoal(finale) - START_SHELL.size + 1 }, (_, i) => START_SHELL.size + i));
  });
});
