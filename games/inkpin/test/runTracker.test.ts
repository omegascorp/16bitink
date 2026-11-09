import { describe, expect, it } from 'vitest';
import type { GameEvent } from '@16bitink/game-sdk';
import { progressNote, RunTracker, type RunView } from '../src/scenes/runTracker';
import { CHAPTER_1 } from '../src/level';

const view = (over: Partial<RunView> = {}): RunView => ({ pinsPulled: 2, pinsTotal: 4, coins: 30, coinsNeeded: 50, hasChest: true, chestTaken: false, ...over });

function setup(v: RunView = view()) {
  const events: GameEvent[] = [];
  let t = 1000;
  const run = new RunTracker({ id: 'door', name: 'The Door', n: 11 }, (e) => events.push(e), () => v, () => t);
  return { events, run, tick: (ms: number) => (t += ms) };
}

describe('RunTracker', () => {
  it('sends a start, then exactly one end', () => {
    const { events, run, tick } = setup();
    expect(events).toEqual([{ type: 'level_start', level: 'door', n: 11, name: 'The Door' }]);
    tick(12_400);
    run.win();
    run.quit();
    run.lose('crushed');
    expect(events).toHaveLength(2);
    expect(events[1]).toMatchObject({ type: 'level_end', result: 'win', seconds: 12, score: 30, progress: 'pins 2/4, gold 60%, chest 0/1', n: 11 });
  });

  it('reports a loss with its cause', () => {
    const { events, run } = setup();
    run.lose('drowned');
    expect(events[1]).toMatchObject({ result: 'lose', cause: 'drowned' });
  });

  it('reports a restart mid-run as a quit', () => {
    const { events, run } = setup();
    run.quit();
    expect(events[1]).toMatchObject({ result: 'quit' });
    expect('cause' in events[1]!).toBe(false);
  });

  it('keeps the note short and bucketed', () => {
    expect(progressNote(view({ coins: 33, hasChest: false }))).toBe('pins 2/4, gold 60%');
    expect(progressNote(view({ coins: 99 })).length).toBeLessThanOrEqual(60);
  });
});

describe('level order', () => {
  it('free chapter 1 comes first, so n runs 1..10 before paid levels', () => {
    expect(CHAPTER_1).toHaveLength(10);
  });
});
