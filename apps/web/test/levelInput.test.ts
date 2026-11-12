import { describe, expect, it } from 'vitest';
import { pointerKind, watchLevelInput, type LevelInput } from '../src/lib/client/levelInput';

function setup() {
  let t = 0;
  const sent: LevelInput[] = [];
  const watch = watchLevelInput(() => t, (e) => sent.push(e));
  return { watch, sent, at: (ms: number) => { t = ms; } };
}
const start = { type: 'level_start', level: 'first-pebbles', n: 1, name: 'First Pebbles' } as const;

describe('watchLevelInput', () => {
  it("reports only a run's first press, timed from the level's start", () => {
    const { watch, sent, at } = setup();
    at(1000);
    watch.onGameEvent(start);
    at(3400);
    watch.onInput('touch');
    at(3500);
    watch.onInput('touch');
    expect(sent).toEqual([{ type: 'level_input', level: 'first-pebbles', n: 1, name: 'First Pebbles', ms: 2400, input: 'touch' }]);
  });

  it('ignores presses outside a level: on menus, and after the level ended', () => {
    const { watch, sent, at } = setup();
    watch.onInput('mouse');
    watch.onGameEvent(start);
    watch.onGameEvent({ type: 'level_end', level: 'first-pebbles', n: 1, result: 'quit', seconds: 9 });
    at(500);
    watch.onInput('mouse');
    expect(sent).toEqual([]);
  });

  it('times each new run (a retry) afresh', () => {
    const { watch, sent, at } = setup();
    watch.onGameEvent(start);
    at(100);
    watch.onInput('key');
    at(5000);
    watch.onGameEvent({ ...start, type: 'level_start' });
    at(5800);
    watch.onInput('key');
    expect(sent.map((e) => e.ms)).toEqual([100, 800]);
  });

  it('names pointer kinds, an unknown one as a mouse', () => {
    expect(['touch', 'pen', 'mouse', ''].map(pointerKind)).toEqual(['touch', 'pen', 'mouse', 'mouse']);
  });
});
