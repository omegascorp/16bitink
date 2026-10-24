import { describe, expect, it } from 'vitest';
import { D, Line, SETTLE, type LineEvent } from '../src/logic/line';
import { buildPath } from '../src/logic/path';

const path = buildPath([{ x: 0, y: 0 }, { x: 2000, y: 0 }]);

function makeLine(): Line {
  let id = 1;
  const line = new Line(path, () => ({ colour: 'red' }), () => id++);
  line.spawning = false;
  line.rushing = false;
  return line;
}

function run(line: Line, seconds: number): LineEvent[] {
  const events: LineEvent[] = [];
  for (let t = 0; t < seconds; t += 1 / 60) line.step(1 / 60, 0, events);
  return events;
}

describe('stones', () => {
  it('match nothing: a stone between two reds keeps them apart', () => {
    const line = makeLine();
    line.lay(['red', 'red', 'blue', 'red'], 400);
    line.marbles[2] = { ...line.marbles[2]!, stone: true, colour: 'red' };
    line.insert(1, 'front', 'blue', null, []);
    const events = run(line, SETTLE + 0.2);
    expect(events.filter((e) => e.type === 'pop')).toHaveLength(0);
  });

  it('break with a pop beside them', () => {
    const line = makeLine();
    line.lay(['blue', 'red', 'red', 'green'], 400);
    line.marbles[0] = { ...line.marbles[0]!, stone: true };
    line.insert(2, 'front', 'red', null, []);
    const events = run(line, SETTLE + 0.2);
    const pop = events.find((e) => e.type === 'pop');
    expect(pop && pop.type === 'pop' && pop.marbles.some((m) => m.stone)).toBe(true);
    expect(line.marbles.some((m) => m.stone)).toBe(false);
    expect(line.marbles.map((m) => m.colour)).toEqual(['green']);
  });

  it('break in a chain: a stone touching a breaking stone breaks too', () => {
    const line = makeLine();
    line.lay(['green', 'blue', 'blue', 'red', 'red'], 400);
    line.marbles[1] = { ...line.marbles[1]!, stone: true };
    line.marbles[2] = { ...line.marbles[2]!, stone: true };
    line.insert(4, 'front', 'red', null, []);
    run(line, SETTLE + 0.2);
    expect(line.marbles.map((m) => m.colour)).toEqual(['green']);
  });

  it('crumble once the burrow is shut and only stones are left', () => {
    const line = makeLine();
    line.lay(['blue'], 400);
    line.marbles[0] = { ...line.marbles[0]!, stone: true };
    const events = run(line, 0.1);
    expect(events.some((e) => e.type === 'pop')).toBe(true);
    expect(line.marbles).toHaveLength(0);
  });

  it('stay while the burrow still sends marbles', () => {
    const line = makeLine();
    line.lay(['blue'], 400);
    line.marbles[0] = { ...line.marbles[0]!, stone: true };
    line.spawning = true;
    run(line, 0.1);
    expect(line.marbles.some((m) => m.stone)).toBe(true);
  });

  it('a head of nothing but stones, apart from the pushed part, is stranded (the tortoise breaks it)', () => {
    const line = makeLine();
    line.lay(['red', 'blue'], 900);
    line.lay(['green', 'red', 'blue'], 100, true);
    expect(line.strandedHead()).toBeNull();
    line.marbles = line.marbles.map((m) => (m.s >= 900 ? { ...m, stone: true } : m));
    expect(line.strandedHead()?.length).toBe(2);
  });

  it("don't count as a colour in the line", () => {
    const line = makeLine();
    line.lay(['blue'], 400);
    line.marbles[0] = { ...line.marbles[0]!, stone: true };
    expect(line.colours().size).toBe(0);
  });

  it('never let a gap roll back across them', () => {
    const line = makeLine();
    line.lay(['red', 'blue', 'blue'], 300, true);
    line.lay(['red'], 300 + 6 * D);
    line.marbles[0] = { ...line.marbles[0]!, stone: true };
    line.marbles[3] = { ...line.marbles[3]!, stone: true };
    line.insert(2, 'front', 'blue', null, []);
    const events = run(line, 1);
    expect(events.some((e) => e.type === 'pull')).toBe(false);
  });
});

describe('buds', () => {
  it('blossom in a match instead of popping, then pop with the next one', () => {
    const line = makeLine();
    line.lay(['green', 'red', 'red', 'green'], 400);
    line.marbles[1]!.bud = true;
    line.insert(2, 'front', 'red', null, []);
    const events = run(line, SETTLE + 0.3);
    expect(events.some((e) => e.type === 'blossom')).toBe(true);
    // The two open reds popped; the bud stayed and opened.
    expect(line.marbles.map((m) => m.colour)).toEqual(['green', 'red', 'green']);
    expect(line.marbles[1]!.bud).toBe(false);
  });

  it('blossom instead of popping when a charm picks them', () => {
    const line = makeLine();
    line.lay(['red', 'red', 'blue'], 400);
    line.marbles[0]!.bud = true;
    const events: LineEvent[] = [];
    line.popIds(new Set(line.marbles.slice(0, 2).map((m) => m.id)), 0, null, events);
    expect(events.map((e) => e.type)).toEqual(['blossom', 'pop']);
    expect(line.marbles.map((m) => [m.colour, m.bud])).toEqual([['red', false], ['blue', undefined]]);
  });

  it('a run of buds only blossoms', () => {
    const line = makeLine();
    line.lay(['red', 'red'], 400);
    for (const m of line.marbles) m.bud = true;
    line.insert(1, 'front', 'red', null, []);
    line.marbles.forEach((m) => {
      m.bud = true;
    });
    const events = run(line, SETTLE + 0.05);
    expect(events.some((e) => e.type === 'pop')).toBe(false);
    expect(line.marbles.every((m) => !m.bud)).toBe(true);
  });
});
