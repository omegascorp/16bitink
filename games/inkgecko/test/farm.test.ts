import { describe, expect, it } from 'vitest';
import type { LevelDef } from '../src/level/types';
import { Board, MAX_BOUNCES, NO_INPUT, SHIFT_EVERY, WALL_INSET, type BoardEvent, type BoardInput } from '../src/logic/board';
import { HEDGEHOG_EATS, RAIN_HALF } from '../src/logic/charms';
import { D, Line, SETTLE, type LineEvent } from '../src/logic/line';
import { buildPath } from '../src/logic/path';

/** A straight track across the board above a pivot gecko. */
const PIVOT: LevelDef = {
  id: 'test-pivot', name: 'Test', shooter: { kind: 'pivot', x: 640, y: 600 },
  tracks: [{ points: [{ x: -20, y: 200 }, { x: 1300, y: 200 }] }],
  colours: 4, speed: 0.01, goal: 100000, par: 60, charms: [],
};

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

/** Hands the gecko a charm as if it caught it where it stands. */
function give(b: Board, charm: 'hedgehog' | 'rain', x = b.gecko.x): void {
  b.drops.push({ id: 999, charm, x, y: b.gecko.y, vy: 0 });
}

describe('twine', () => {
  const path = buildPath([{ x: 0, y: 0 }, { x: 2000, y: 0 }]);

  it('ties a new marble to the one ahead, and the pair pops together', () => {
    let id = 1;
    let n = 0;
    const line = new Line(path, () => ({ colour: n++ % 2 ? 'red' : 'blue', tie: true }), () => id++);
    const events: LineEvent[] = [];
    for (let t = 0; t < 2; t += 1 / 60) line.step(1 / 60, 40, events);
    const tied = line.marbles.filter((m) => m.tie !== undefined);
    expect(tied.length).toBeGreaterThanOrEqual(2);
    // Each tie is mutual, and a marble is tied to one other at most.
    for (const m of tied) expect(line.marbles.find((q) => q.id === m.tie)?.tie).toBe(m.id);
    const a = tied[0]!;
    const pop: LineEvent[] = [];
    line.popIds(new Set([a.id]), 0, null, pop);
    const popped = pop.find((e) => e.type === 'pop');
    expect(popped && popped.type === 'pop' && popped.marbles.map((m) => m.id).sort()).toEqual([a.id, a.tie].sort());
  });

  it('frees a marble whose partner fell in', () => {
    let id = 1;
    const line = new Line(path, () => ({ colour: 'red' }), () => id++);
    line.spawning = false;
    line.lay(['red', 'blue'], path.length - D * 0.9);
    const [a, b] = line.marbles;
    a!.tie = b!.id;
    b!.tie = a!.id;
    line.step(0.1, 40, []);
    expect(line.marbles).toHaveLength(1);
    expect(line.marbles[0]!.tie).toBeUndefined();
  });
});

describe('the Hedgehog', () => {
  it('eats its way up the line nearest its well, then goes', () => {
    const b = quiet();
    b.lines[0]!.lay(Array.from({ length: 14 }, (_, i) => (['red', 'blue', 'green', 'yellow'] as const)[i % 4]!), 200, true);
    give(b, 'hedgehog');
    const events = run(b, 4);
    expect(of(events, 'hedgehog')).toHaveLength(1);
    expect(of(events, 'munch')).toHaveLength(HEDGEHOG_EATS);
    expect(of(events, 'hedgehogGone')).toHaveLength(1);
    expect(b.lines[0]!.marbles).toHaveLength(14 - HEDGEHOG_EATS);
    expect(b.hedgehog).toBeNull();
  });

  it('stops when the line runs out', () => {
    const b = quiet();
    b.lines[0]!.lay(['red', 'blue', 'green'], 500, true);
    give(b, 'hedgehog');
    run(b, 4);
    expect(b.lines[0]!.marbles).toHaveLength(0);
    expect(b.hedgehog).toBeNull();
  });
});

describe('Rain', () => {
  it('pops every open marble in a column under it', () => {
    const level: LevelDef = { ...PIVOT, tracks: [PIVOT.tracks[0]!, { points: [{ x: -20, y: 400 }, { x: 1300, y: 400 }], tunnels: [{ from: 0.4, to: 0.6 }] }] };
    const b = quiet(level);
    b.lines[0]!.lay(Array.from({ length: 30 }, (_, i) => (['red', 'blue', 'green'] as const)[i % 3]!), 100, true);
    b.lines[1]!.lay(Array.from({ length: 30 }, (_, i) => (['red', 'blue', 'green'] as const)[i % 3]!), 100, true);
    const x = 640;
    give(b, 'rain', x);
    const events = run(b, 0.1);
    expect(of(events, 'rain')).toHaveLength(1);
    const xs = (li: number) => b.lines[li]!.marbles.map((m) => b.marbleAt(b.lines[li]!, m).x);
    expect(xs(0).every((mx) => Math.abs(mx - x) > RAIN_HALF)).toBe(true);
    // The far line's marbles there are under a tunnel: they stay dry.
    expect(b.lines[1]!.marbles).toHaveLength(30);
  });
});

describe('chameleon marbles', () => {
  it('all take the next colour together, and a match they make pops', () => {
    const b = quiet({ ...PIVOT, chameleons: 0.2 });
    const line = b.lines[0]!;
    line.lay(['blue', 'blue', 'red', 'green'], 400, true);
    line.marbles[2] = { ...line.marbles[2]!, chameleon: true };
    line.marbles[3] = { ...line.marbles[3]!, chameleon: true };
    // red → yellow → blue: two shifts make the first chameleon blue beside two blues (the other, green → red → yellow, stays).
    const events = run(b, SHIFT_EVERY * 2 + SETTLE + 0.1);
    expect(of(events, 'shift')).toHaveLength(2);
    expect(of(events, 'pop')).toHaveLength(1);
    expect(line.marbles.map((m) => m.colour)).toEqual(['yellow']);
  });
});

describe('barn walls', () => {
  it('bounce a shot off the side wall into the line', () => {
    const b = quiet({ ...PIVOT, walls: true });
    b.lines[0]!.lay(['blue', 'blue'], 1000, true);
    b.loaded = 'blue';
    // Aim at the left wall so the shot comes off it up and right... into nothing; aim at a mirrored point instead.
    const target = b.marbleAt(b.lines[0]!, b.lines[0]!.marbles[0]!);
    const mirrored = { x: 2 * WALL_INSET - target.x, y: target.y };
    const events = run(b, 2, { ...NO_INPUT, aim: mirrored, fire: true });
    expect(of(events, 'bounce').length).toBeGreaterThanOrEqual(1);
    expect(of(events, 'stuck')).toHaveLength(1);
  });

  it('let a shot go after a few bounces, and never off an open board', () => {
    const walled = quiet({ ...PIVOT, walls: true });
    const events = run(walled, 6, { ...NO_INPUT, aim: { x: 0, y: 600 - 1 }, fire: true });
    expect(of(events, 'bounce').length).toBeLessThanOrEqual(MAX_BOUNCES);
    const open = quiet();
    expect(of(run(open, 2, { ...NO_INPUT, aim: { x: 0, y: 400 }, fire: true }), 'bounce')).toHaveLength(0);
  });
});

describe('losing', () => {
  it('pours what is left of the lines into the wells, a marble at a time', () => {
    const b = quiet();
    b.lines[0]!.lay(Array.from({ length: 40 }, (_, i) => (['red', 'blue'] as const)[Math.floor(i / 2) % 2]!), 100, true);
    b.state = 'lost';
    const events: BoardEvent[] = [];
    let done = false;
    for (let t = 0; t < 4 && !done; t += 1 / 60) done = b.drain(1 / 60, events);
    expect(done).toBe(true);
    expect(of(events, 'sink')).toHaveLength(40);
  });
});

describe('ruins pillars', () => {
  it('turn a shot that meets one, mirrored about its surface', () => {
    const b = quiet({ ...PIVOT, pillars: [{ x: 640, y: 400, r: 30 }] });
    b.lines[0]!.lay(['blue', 'blue'], 300, true);
    // Straight up at the pillar's centre: it comes straight back down.
    const events = run(b, 0.3, { ...NO_INPUT, aim: { x: 640, y: 0 }, fire: true });
    expect(of(events, 'bounce')).toHaveLength(1);
    expect(b.shots[0]?.vy ?? 1).toBeGreaterThan(0);
  });
});
