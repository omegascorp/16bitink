import { describe, expect, it } from 'vitest';
import type { LevelDef } from '../src/level/types';
import { Board, NO_INPUT, type BoardEvent, type BoardInput } from '../src/logic/board';
import { D } from '../src/logic/line';
import { CALM_FOR, GUST_FOR, LEAF_R, SURGE_FACTOR, wanderAt } from '../src/logic/twists';

/** A straight track across the board above a pivot gecko. */
const PIVOT: LevelDef = {
  id: 'test-pivot', name: 'Test', shooter: { kind: 'pivot', x: 640, y: 600 },
  tracks: [{ points: [{ x: -20, y: 200 }, { x: 1300, y: 200 }] }],
  colours: 4, speed: 40, goal: 100, par: 60, charms: [],
};
const HOP: LevelDef = { ...PIVOT, id: 'test-hop', shooter: { kind: 'hop', pads: [{ x: 400, y: 560 }, { x: 880, y: 560 }] } };
const TWO: LevelDef = {
  ...PIVOT, id: 'test-two',
  tracks: [{ points: [{ x: -20, y: 200 }, { x: 1300, y: 200 }] }, { points: [{ x: -20, y: 320 }, { x: 1300, y: 320 }], opensAt: 0.5 }],
};

function run(b: Board, seconds: number, input: BoardInput = NO_INPUT): BoardEvent[] {
  const events: BoardEvent[] = [];
  for (let t = 0; t < seconds; t += 1 / 60) events.push(...b.step(input, 1 / 60));
  return events;
}

const of = <T extends BoardEvent['type']>(events: readonly BoardEvent[], type: T) => events.filter((e): e is Extract<BoardEvent, { type: T }> => e.type === type);

/** After `wait` seconds, fires one marble straight up from a gecko at the bottom middle and returns where it is `t` seconds later. */
function shotAfter(level: LevelDef, t: number, wait = 0): { x: number; y: number } | null {
  const b = new Board({ ...level, tracks: [{ points: [{ x: -20, y: 40 }, { x: 1300, y: 40 }] }] }, 3);
  for (const l of b.lines) {
    l.spawning = false;
    l.marbles = [];
  }
  run(b, wait);
  b.step({ ...NO_INPUT, aim: { x: 640, y: 0 }, fire: true }, 1 / 60);
  for (let s = 0; s < t; s += 1 / 60) b.step(NO_INPUT, 1 / 60);
  const shot = b.shots[0];
  return shot ? { x: shot.x, y: shot.y } : null;
}

describe('wind', () => {
  it('bends shots sideways during a gust, and blows from the other side after a calm', () => {
    const still = shotAfter(PIVOT, 0.3)!;
    const windy = new Board({ ...PIVOT, wind: 400 }, 3);
    run(windy, 1.8);
    expect(windy.twists.gust).toBeGreaterThan(0.9);
    const bent = shotAfter({ ...PIVOT, wind: 400 }, 0.3, 1.8)!;
    expect(Math.abs(bent.x - still.x)).toBeGreaterThan(5);
    const side = windy.twists.windDir;
    const events = run(windy, GUST_FOR + CALM_FOR);
    expect(of(events, 'gust').length).toBeGreaterThanOrEqual(1);
    expect(windy.twists.windDir).toBe(-side);
  });
});

describe('surges and tides', () => {
  it('warns of a surge, then rolls the line on faster for a moment', () => {
    const b = new Board({ ...PIVOT, surge: 5 }, 1);
    const events = run(b, 4.2);
    expect(of(events, 'surgeSoon')).toHaveLength(1);
    expect(of(events, 'surge')).toHaveLength(0);
    run(b, 0.9);
    expect(b.twists.surging).toBe(true);
    expect(b.twists.speed(40)).toBeCloseTo(40 * SURGE_FACTOR);
  });

  it('draws the line back by itself in a tide, and never once the burrows are shut', () => {
    const b = new Board({ ...PIVOT, tide: 3, speed: 40 }, 1);
    run(b, 2.9);
    const before = b.lines[0]!.front();
    const events = run(b, 0.6);
    expect(of(events, 'tide')).toHaveLength(1);
    expect(b.lines[0]!.front()).toBeLessThan(before);
    const shut = new Board({ ...PIVOT, tide: 1 }, 1);
    shut.filled = true;
    expect(of(run(shut, 3), 'tide')).toHaveLength(0);
  });
});

describe('late burrows and held colours', () => {
  it('keeps a late burrow shut until the bar is full enough', () => {
    const b = new Board({ ...TWO, goal: 1000 }, 1);
    run(b, 1);
    expect(b.lines[1]!.marbles).toHaveLength(0);
    b.score = 520;
    const events = run(b, 1);
    expect(of(events, 'burrowOpen')).toHaveLength(1);
    expect(b.lines[1]!.marbles.length).toBeGreaterThan(0);
  });

  it('never opens a late burrow as the bar fills by beating the boss', () => {
    const b = new Board({ ...TWO, boss: { kind: 'lion', hp: 2, spots: [{ x: 640, y: 500 }] }, pillars: [{ x: 300, y: 500, r: 20 }] }, 1);
    b.step(NO_INPUT, 1 / 60);
    b.boss!.hp = 0;
    const events = run(b, 0.5);
    expect(of(events, 'filled')).toHaveLength(1);
    expect(of(events, 'burrowOpen')).toHaveLength(0);
    expect(b.isShut(1)).toBe(true);
  });

  it('holds back the last colour until colourAt', () => {
    const b = new Board({ ...PIVOT, colours: 4, colourAt: 0.5, goal: 10000 }, 7);
    run(b, 3);
    const last = b.palette[3]!;
    expect(b.lines[0]!.marbles.some((m) => m.colour === last)).toBe(false);
    b.score = 5100;
    expect(of(run(b, 0.1), 'newColour')).toHaveLength(1);
  });
});

describe('the gecko', () => {
  it("can't swap on a noSwap level", () => {
    const b = new Board({ ...PIVOT, noSwap: true }, 1);
    run(b, 1);
    b.loaded = b.lines[0]!.marbles[0]!.colour;
    b.next = b.lines[0]!.marbles[1]!.colour;
    const [loaded, next] = [b.loaded, b.next];
    expect(of(b.step({ ...NO_INPUT, swap: true }, 1 / 60), 'swap')).toHaveLength(0);
    expect([b.loaded, b.next]).toEqual([loaded, next]);
  });

  it('paces a figure of eight through its spot on a wandering level', () => {
    const level: LevelDef = { ...PIVOT, wander: { rx: 60, ry: 30, period: 8 } };
    const b = new Board(level, 1);
    run(b, 2);
    expect(b.gecko.x).toBeCloseTo(wanderAt(level, { x: 640, y: 600 }, b.elapsed).x, 0);
    expect(Math.abs(b.gecko.x - 640)).toBeGreaterThan(30);
  });

  it('is tipped off a restless pad onto the next one', () => {
    const b = new Board({ ...HOP, restless: 3 }, 1);
    const events = run(b, 3.2);
    expect(of(events, 'padWarn')).toHaveLength(1);
    expect(of(events, 'tipped')).toHaveLength(1);
    expect(b.pad).toBe(1);
  });
});

describe('leaves', () => {
  it('stop shots that hit them', () => {
    const b = new Board({ ...PIVOT, leaves: 1 }, 2);
    for (const l of b.lines) {
      l.spawning = false;
      l.marbles = [];
    }
    const leaf = b.twists.leaves[0]!;
    leaf.x = 640;
    leaf.y = 420;
    leaf.vx = 0;
    leaf.vy = 0;
    b.step({ ...NO_INPUT, aim: { x: 640, y: 0 }, fire: true }, 1 / 60);
    const events = run(b, 0.4);
    expect(of(events, 'leafHit')).toHaveLength(1);
    expect(b.shots).toHaveLength(0);
    expect(LEAF_R).toBeGreaterThan(D / 2);
  });
});

describe('goals', () => {
  it('a hold-out fills its bar with time and shuts the burrows', () => {
    const b = new Board({ ...PIVOT, mode: { kind: 'holdout', seconds: 5 } }, 1);
    run(b, 2.5);
    expect(b.progress).toBeCloseTo(0.5, 1);
    expect(b.timeLeft).toBeCloseTo(2.5, 0);
    const events = run(b, 2.6);
    expect(of(events, 'filled')).toHaveLength(1);
    expect(b.lines.every((l) => !l.spawning)).toBe(true);
  });

  it('a blitz is lost when its clock runs out before the bar fills', () => {
    const b = new Board({ ...PIVOT, goal: 99999, mode: { kind: 'blitz', seconds: 2 } }, 1);
    const events = run(b, 2.2);
    expect(of(events, 'lost')[0]?.cause).toBe('time');
    expect(b.state).toBe('lost');
  });

  it('gold levels send out golden marbles and count them as they pop', () => {
    const b = new Board({ ...PIVOT, mode: { kind: 'gold', count: 3 } }, 5);
    run(b, 20);
    const golden = b.lines[0]!.marbles.filter((m) => m.gold);
    expect(golden.length).toBeGreaterThan(0);
    expect(golden.length).toBeLessThanOrEqual(5);
    expect(b.progress).toBe(0);
  });

  it('one-life levels start with one life', () => {
    expect(new Board({ ...PIVOT, lives: 1 }, 1).lives).toBe(1);
  });

  it('charmy levels put charms on marbles twice as often', () => {
    const plain = new Board({ ...PIVOT, charms: ['burst'], speed: 60 }, 1);
    const charmy = new Board({ ...PIVOT, charms: ['burst'], speed: 60, charmy: true }, 1);
    run(plain, 6);
    run(charmy, 6);
    const count = (b: Board) => b.lines[0]!.marbles.filter((m) => m.charm).length;
    expect(count(plain)).toBe(0);
    expect(count(charmy)).toBe(1);
  });

  it('a slower line keeps its own pace', () => {
    const b = new Board({ ...TWO, tracks: [TWO.tracks[0]!, { ...TWO.tracks[1]!, opensAt: undefined, pace: 0.5 }] }, 1);
    run(b, 8);
    expect(b.lines[1]!.front()).toBeLessThan(b.lines[0]!.front());
  });
});
