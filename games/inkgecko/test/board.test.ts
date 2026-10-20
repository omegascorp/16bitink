import { describe, expect, it } from 'vitest';
import type { LevelDef } from '../src/level/types';
import { Board, LIVES, NO_INPUT, REWIND_SHARE, type BoardEvent, type BoardInput } from '../src/logic/board';
import { D } from '../src/logic/line';

/** A straight track across the board above a pivot gecko. */
const PIVOT: LevelDef = {
  id: 'test-pivot', name: 'Test', shooter: { kind: 'pivot', x: 640, y: 600 },
  tracks: [{ points: [{ x: -20, y: 200 }, { x: 1300, y: 200 }] }],
  colours: 4, speed: 40, goal: 100, par: 60, charms: ['slow', 'burst'],
};

const RAIL: LevelDef = {
  ...PIVOT, id: 'test-rail', shooter: { kind: 'rail', y: 660, x0: 100, x1: 1180 }, charms: ['slow'],
};

/** A board with the burrow shut and the line laid out by hand. */
function quiet(level = PIVOT): Board {
  const b = new Board(level, 1);
  for (const l of b.lines) {
    l.spawning = false;
    l.rushing = false;
    l.marbles = [];
    l.tail = null;
  }
  return b;
}

/** Steps the board `seconds`, holding `input` (a fire only goes on the first step). */
function run(b: Board, seconds: number, input: BoardInput = NO_INPUT): BoardEvent[] {
  const events: BoardEvent[] = [];
  let first = true;
  for (let t = 0; t < seconds; t += 1 / 60) {
    events.push(...b.step(first ? input : { ...input, fire: false }, 1 / 60));
    first = false;
  }
  return events;
}

const of = <T extends BoardEvent['type']>(events: readonly BoardEvent[], type: T) => events.filter((e): e is Extract<BoardEvent, { type: T }> => e.type === type);

/** The board x of marble `i` on the straight test track (which starts at x = −20). */
const xOf = (b: Board, i: number): number => b.marbleAt(b.lines[0]!, b.lines[0]!.marbles[i]!).x;

describe('the board', () => {
  it('spits the loaded marble where the gecko aims, and it joins the line', () => {
    const b = quiet();
    b.lines[0]!.lay(['blue', 'yellow', 'green'], 600, true);
    b.loaded = 'red';
    const target = { x: xOf(b, 1), y: 200 };
    const first = b.step({ ...NO_INPUT, aim: target, fire: true }, 1 / 60);
    expect(of(first, 'spit')).toHaveLength(1);
    const events = run(b, 1, { ...NO_INPUT, aim: target });
    expect(of(events, 'stuck')).toHaveLength(1);
    expect(b.lines[0]!.marbles).toHaveLength(4);
  });

  it('pops a match and scores it', () => {
    const b = quiet();
    b.lines[0]!.lay(['blue', 'red', 'red', 'blue'], 600, true);
    b.loaded = 'red';
    const events = run(b, 1, { ...NO_INPUT, aim: { x: xOf(b, 1) + D / 2, y: 200 }, fire: true });
    const pops = of(events, 'pop');
    expect(pops.length).toBeGreaterThanOrEqual(1);
    expect(pops[0]!.count).toBe(3);
    expect(b.score).toBeGreaterThanOrEqual(30);
  });

  it('closes the burrows once the bar fills, and is won when the last marble pops', () => {
    const b = quiet();
    b.score = 90;
    b.lines[0]!.lay(['red', 'red'], 600, true);
    b.loaded = 'red';
    const events = run(b, 2, { ...NO_INPUT, aim: { x: xOf(b, 0), y: 200 }, fire: true });
    expect(of(events, 'filled')).toHaveLength(1);
    expect(b.lines[0]!.spawning).toBe(false);
    expect(of(events, 'won')).toHaveLength(1);
    expect(b.state).toBe('won');
  });

  it('loses a life and rolls the line back when a marble reaches the well', () => {
    const b = quiet();
    const line = b.lines[0]!;
    line.lay(['red', 'blue'], line.path.length - D - 4, true);
    const events = run(b, 0.3);
    expect(of(events, 'well')).toHaveLength(1);
    expect(b.lives).toBe(LIVES - 1);
    expect(line.rewind).toBeGreaterThan(0);
    run(b, 2);
    expect(line.front()).toBeLessThan(line.path.length * (1 - REWIND_SHARE) + 100);
  });

  it('is lost when the last life goes', () => {
    const b = quiet();
    b.lives = 1;
    const line = b.lines[0]!;
    line.lay(['red'], line.path.length - 2, true);
    const events = run(b, 0.2);
    expect(of(events, 'lost')).toHaveLength(1);
    expect(b.state).toBe('lost');
  });

  it('only gives the gecko colours still in the line', () => {
    const b = quiet();
    b.lines[0]!.lay(['green', 'green', 'blue'], 600, true);
    b.loaded = 'red';
    b.next = 'yellow';
    run(b, 0.1);
    expect(['green', 'blue']).toContain(b.loaded);
    expect(['green', 'blue']).toContain(b.next);
  });

  it('swaps the loaded marble with the one on its tail', () => {
    const b = quiet();
    b.lines[0]!.lay(['green', 'blue'], 600, true);
    b.loaded = 'green';
    b.next = 'blue';
    b.step({ ...NO_INPUT, swap: true }, 1 / 60);
    expect([b.loaded, b.next]).toEqual(['blue', 'green']);
  });

  it('uses a charm when its marble pops', () => {
    const b = quiet();
    b.lines[0]!.lay(['blue', 'red', 'red', 'blue'], 600, true);
    b.lines[0]!.marbles[1]!.charm = 'slow';
    b.loaded = 'red';
    const events = run(b, 1, { ...NO_INPUT, aim: { x: xOf(b, 2) + D / 2, y: 200 }, fire: true });
    expect(of(events, 'charm').map((e) => e.charm)).toEqual(['slow']);
    expect(b.timers.slow).toBeGreaterThan(0);
  });

  it('pays a bonus for a shot that flies through a gap before it pops', () => {
    const level: LevelDef = { ...PIVOT, tracks: [{ points: [{ x: -20, y: 300 }, { x: 1300, y: 300 }] }, { points: [{ x: -20, y: 150 }, { x: 1300, y: 150 }] }] };
    const b = quiet(level);
    const [near, far] = b.lines as [Board['lines'][number], Board['lines'][number]];
    // The near line has a wide gap right above the gecko; beyond it, a pair of reds.
    near.lay(['yellow'], 400, true);
    near.lay(['green'], 900);
    far.lay(['red', 'red'], 640, true);
    b.loaded = 'red';
    const events = run(b, 1, { ...NO_INPUT, aim: { x: 640, y: 0 }, fire: true });
    expect(of(events, 'pop')).toHaveLength(1);
    expect(of(events, 'gap')[0]).toMatchObject({ gaps: 1 });
  });
});

describe('the rail', () => {
  it('runs the gecko under the pointer before spitting straight up', () => {
    const b = quiet(RAIL);
    b.lines[0]!.lay(['red', 'blue', 'green'], 600, true);
    const aim = { x: 300, y: 400 };
    const first = b.step({ ...NO_INPUT, aim, fire: true }, 1 / 60);
    expect(of(first, 'spit')).toHaveLength(0);
    const events = run(b, 1, { ...NO_INPUT, aim });
    expect(b.gecko.x).toBeCloseTo(300, 0);
    const spit = of(events, 'spit');
    expect(spit).toHaveLength(1);
    expect(spit[0]!.x).toBeCloseTo(300, 0);
  });

  it('pops a match spat straight up into the line', () => {
    const b = quiet(RAIL);
    b.lines[0]!.lay(['blue', 'red', 'red', 'blue'], 600, true);
    b.loaded = 'red';
    const events = run(b, 1.5, { ...NO_INPUT, aim: { x: xOf(b, 1), y: 400 }, fire: true });
    expect(of(events, 'stuck')).toHaveLength(1);
    expect(of(events, 'pop')).toHaveLength(1);
  });

  it('keeps the gecko on its branch', () => {
    const b = quiet(RAIL);
    run(b, 2, { ...NO_INPUT, aim: { x: 5000, y: 0 } });
    expect(b.gecko.x).toBe(1180);
  });

  it('drops a charm every few pops, caught by running under it', () => {
    const b = quiet(RAIL);
    b.drops.push({ id: 999, charm: 'slow', x: 400, y: 300, vy: 0 });
    const events = run(b, 3, { ...NO_INPUT, aim: { x: 400, y: 0 } });
    expect(of(events, 'caught')).toHaveLength(1);
    expect(b.timers.slow).toBeGreaterThan(0);
    expect(b.drops).toHaveLength(0);
  });

  it('lets a charm fall past when the gecko is elsewhere', () => {
    const b = quiet(RAIL);
    b.drops.push({ id: 999, charm: 'slow', x: 1000, y: 300, vy: 0 });
    const events = run(b, 3, { ...NO_INPUT, aim: { x: 200, y: 0 } });
    expect(of(events, 'caught')).toHaveLength(0);
    expect(b.drops).toHaveLength(0);
  });
});
