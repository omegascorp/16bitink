import { describe, expect, it } from 'vitest';
import type { ColourId } from '../src/logic/colours';
import { D, Line, SETTLE, type LineEvent } from '../src/logic/line';
import { buildPath } from '../src/logic/path';

const path = buildPath([{ x: 0, y: 0 }, { x: 2000, y: 0 }]);

/** A line on a long straight track that never spawns on its own unless told to. */
function makeLine(spawn: ColourId[] = []): Line {
  let id = 1;
  const queue = [...spawn];
  return new Line(path, () => queue.shift() ?? 'red', () => id++);
}

/** Steps the line `seconds` at `speed`, collecting its events. */
function run(line: Line, seconds: number, speed = 0): LineEvent[] {
  const events: LineEvent[] = [];
  for (let t = 0; t < seconds; t += 1 / 60) line.step(1 / 60, speed, events);
  return events;
}

const colours = (line: Line): ColourId[] => line.marbles.map((m) => m.colour);
const pops = (events: readonly LineEvent[]) => events.filter((e) => e.type === 'pop');

describe('the line of marbles', () => {
  it('comes out of the burrow and rolls along at its speed', () => {
    const line = makeLine(['red', 'blue', 'red', 'blue', 'red', 'blue']);
    line.rushing = false;
    run(line, 1, 60);
    expect(line.marbles.length).toBeGreaterThan(1);
    const front = line.front();
    run(line, 1, 60);
    expect(line.front() - front).toBeCloseTo(60, 0);
  });

  it('rushes in at the start of a level', () => {
    const line = makeLine();
    run(line, 1, 60);
    expect(line.front()).toBeGreaterThan(200);
  });

  it('pops three of a colour once a shot settles in', () => {
    const line = makeLine();
    line.spawning = false;
    line.lay(['blue', 'red', 'red', 'blue'], 400);
    line.insert(1, 'front', 'red', 7, []);
    expect(colours(line)).toEqual(['blue', 'red', 'red', 'red', 'blue']);
    const events = run(line, SETTLE + 0.05);
    const popped = pops(events);
    expect(popped).toHaveLength(1);
    expect(popped[0]).toMatchObject({ combo: 0, shot: 7 });
    expect(colours(line)).toEqual(['blue', 'blue']);
  });

  it('makes room by pushing the marbles ahead', () => {
    const line = makeLine();
    line.spawning = false;
    line.lay(['blue', 'yellow', 'green'], 400);
    const before = line.marbles.map((m) => m.s);
    line.insert(0, 'front', 'red', null, []);
    const after = line.marbles.map((m) => m.s);
    expect(after[0]).toBe(before[0]);
    expect(after[1]).toBeCloseTo(before[0]! + D);
    expect(after[3]).toBeCloseTo(before[2]! + D);
  });

  it('rolls the front back when the colours either side of a gap match, and pops again as a combo', () => {
    const line = makeLine();
    line.spawning = false;
    line.lay(['blue', 'blue', 'red', 'red', 'blue'], 400);
    line.insert(3, 'front', 'red', null, []);
    const events = run(line, 2);
    expect(events.some((e) => e.type === 'pull')).toBe(true);
    const popped = pops(events);
    expect(popped.map((p) => p.type === 'pop' && p.combo)).toEqual([0, 1]);
    expect(line.marbles).toHaveLength(0);
  });

  it('leaves the front standing when the colours either side of a gap differ', () => {
    const line = makeLine();
    line.spawning = false;
    line.lay(['yellow', 'red', 'red', 'blue'], 400);
    line.insert(2, 'front', 'red', null, []);
    run(line, SETTLE + 0.05);
    const blue = line.marbles.find((m) => m.colour === 'blue')!.s;
    run(line, 1);
    expect(line.marbles.find((m) => m.colour === 'blue')!.s).toBe(blue);
  });

  it('pushes a standing part on when the line behind catches up', () => {
    const line = makeLine();
    line.spawning = false;
    line.lay(['yellow'], 300, true);
    line.lay(['blue'], 400);
    run(line, 2, 60);
    const [y, b] = line.marbles;
    expect(b!.s - y!.s).toBeCloseTo(D, 0);
    expect(b!.s).toBeGreaterThan(400);
  });

  it('stands still once nothing pushes it: the tail popped after the burrow closed', () => {
    const line = makeLine();
    line.spawning = false;
    line.lay(['red', 'red'], 300, true);
    line.lay(['blue'], 500);
    line.insert(1, 'front', 'red', null, []);
    run(line, SETTLE + 0.05, 60);
    const blue = line.marbles[0]!.s;
    run(line, 1, 60);
    expect(line.marbles[0]!.s).toBe(blue);
  });

  it('puts a shot against the marble it hit, even with a gap beyond it', () => {
    const line = makeLine();
    line.spawning = false;
    line.lay(['red', 'blue'], 100, true);
    line.lay(['green', 'green'], 400);
    line.insert(1, 'front', 'yellow', null, []);
    expect(colours(line)).toEqual(['red', 'blue', 'yellow', 'green', 'green']);
    expect(line.marbles[2]!.s).toBeCloseTo(132 + D);
    line.insert(3, 'back', 'purple', null, []);
    expect(line.marbles[3]!.s).toBeCloseTo(400 - D);
  });

  it('pushes a standing part on when a shot fills the last of the gap', () => {
    const line = makeLine();
    line.spawning = false;
    line.lay(['red'], 100, true);
    line.lay(['blue'], 100 + 2 * D);
    const events: LineEvent[] = [];
    line.insert(0, 'front', 'yellow', null, events);
    expect(events.some((e) => e.type === 'join')).toBe(true);
  });

  it('opens a rollback at every gap a burst leaves', () => {
    const line = makeLine();
    line.spawning = false;
    line.lay(['red', 'green', 'red', 'blue', 'yellow', 'blue'], 400);
    const events: LineEvent[] = [];
    line.popIds(new Set([line.marbles[1]!.id, line.marbles[4]!.id]), 0, null, events);
    expect(events.filter((e) => e.type === 'pull')).toHaveLength(2);
  });

  it('lets only one marble a step fall in the well', () => {
    const line = makeLine();
    line.spawning = false;
    line.lay(['red', 'blue', 'green'], path.length + 10);
    const events: LineEvent[] = [];
    line.step(1 / 60, 0, events);
    expect(events.filter((e) => e.type === 'fell')).toHaveLength(1);
  });

  it('drops a marble that reaches the well', () => {
    const line = makeLine();
    line.spawning = false;
    line.lay(['red', 'blue'], path.length - D - 5, true);
    const events = run(line, 0.5, 60);
    expect(events.filter((e) => e.type === 'fell')).toHaveLength(1);
    expect(colours(line)).toEqual(['red']);
  });

  it('rolls everything back after a marble falls in', () => {
    const line = makeLine();
    line.spawning = false;
    line.lay(['red', 'blue'], 1000, true);
    line.rewind = 300;
    run(line, 0.2, 60);
    expect(line.rewind).toBeGreaterThan(0);
    run(line, 1, 0);
    expect(line.marbles[0]!.s).toBeCloseTo(700, 0);
  });

  it('lets a charm fade if it is not popped in time', () => {
    const line = makeLine();
    line.spawning = false;
    line.lay(['red'], 400);
    line.marbles[0]!.charm = 'slow';
    run(line, 13);
    expect(line.marbles[0]!.charm).toBeNull();
  });

  it('pops a set of marbles by id, opening a gap that pulls', () => {
    const line = makeLine();
    line.spawning = false;
    line.lay(['blue', 'green', 'blue', 'blue'], 400);
    const events: LineEvent[] = [];
    line.popIds(new Set([line.marbles[1]!.id]), 0, null, events);
    expect(pops(events)).toHaveLength(1);
    const more = run(line, 1);
    expect(pops(more)).toHaveLength(1);
    expect(line.marbles).toHaveLength(0);
  });
});
