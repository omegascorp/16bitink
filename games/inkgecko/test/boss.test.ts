import { describe, expect, it } from 'vitest';
import type { BossDef, LevelDef } from '../src/level/types';
import { Board, NO_INPUT, type BoardEvent } from '../src/logic/board';
import { Boss, BOSS_R, bossPose, type Arena, type BossEvent, type ShotLike } from '../src/logic/boss';
import { Line } from '../src/logic/line';
import { buildPath } from '../src/logic/path';

const SPOTS = [{ x: 400, y: 400 }, { x: 640, y: 420 }, { x: 880, y: 400 }];

/** An arena with one straight line of marbles across the top, recording what the boss does to it. */
function arena(): Arena & { shoves: number; drops: number; stones: number } {
  let id = 1;
  const line = new Line(buildPath([{ x: -20, y: 200 }, { x: 1300, y: 200 }]), () => ({ colour: 'red' }), () => id++);
  line.lay(['red', 'blue', 'green', 'red', 'blue', 'green'], 300, true);
  const a = {
    lines: [line], palette: ['red', 'blue', 'green'] as const, gecko: { x: 640, y: 650 }, shoves: 0, drops: 0, stones: 0,
    random: () => 0.5,
    shove: () => {
      a.shoves++;
    },
    dropInto: () => {
      a.drops++;
      return true;
    },
    petrify: (_li: number, ids: readonly number[]) => {
      a.stones += ids.length;
      return ids.length;
    },
    crumble: () => undefined,
  };
  return a;
}

const shot = (over: Partial<ShotLike> = {}): ShotLike => ({ x: 0, y: 0, colour: 'red', bounces: 0, glances: 0, wild: false, pierce: false, ...over });

function make(kind: BossDef['kind'], spots = SPOTS, hp = 3) {
  const a = arena();
  return { a, b: new Boss({ kind, hp, spots, line: 0 }, a) };
}

/** Steps the boss until `until` holds (or `max` seconds pass), returning its events. */
function until(b: Boss, until: () => boolean, max = 30): BossEvent[] {
  const events: BossEvent[] = [];
  for (let t = 0; t < max && !until(); t += 1 / 60) b.step(1 / 60, events);
  return events;
}

describe('the mole', () => {
  it('can only be hit while it is up, shoves the line as it comes up, and dives when hit', () => {
    const { a, b } = make('mole');
    expect(b.hit(shot(), [])).toBe('pass');
    until(b, () => b.phase === 'up');
    expect(a.shoves).toBe(1);
    expect(bossPose(b, 0)).toBe('up');
    expect(b.hit(shot(), [])).toBe('hurt');
    expect(b.hp).toBe(2);
    expect(b.phase).toBe('dive');
  });
});

describe('the frog', () => {
  it('swallows shots while croaking, is hurt sitting, and is out of reach mid-leap', () => {
    const { b } = make('frog');
    expect(b.hit(shot(), [])).toBe('hurt');
    until(b, () => b.phase === 'croak');
    expect(b.hit(shot(), [])).toBe('swallowed');
    until(b, () => b.phase === 'leap');
    expect(b.hit(shot(), [])).toBe('pass');
    until(b, () => b.phase === 'sit');
    expect(b.spot).not.toBe(0);
  });
});

describe('the snail', () => {
  it('crawls its loop and hides in its shell after each hit', () => {
    const { b } = make('snail');
    until(b, () => false, 2);
    expect(b.x).toBeGreaterThan(SPOTS[0]!.x);
    expect(b.hit(shot(), [])).toBe('hurt');
    expect(b.hit(shot(), [])).toBe('blocked');
    until(b, () => b.phase === 'crawl');
    expect(b.hit(shot(), [])).toBe('hurt');
  });
});

describe('the magpie', () => {
  it('drops a bud into a line each time it lands', () => {
    const { a, b } = make('magpie');
    until(b, () => b.phase === 'fly');
    expect(b.hit(shot(), [])).toBe('pass');
    const events = until(b, () => b.phase === 'perch');
    expect(a.drops).toBe(1);
    expect(events.some((e) => e.type === 'bossDrop')).toBe(true);
  });
});

describe('the tortoise', () => {
  it('leads its line, shrugs off shots, is hurt by pops beside it, and stamps marbles to stone', () => {
    const { a, b } = make('tortoise', [], 3);
    b.step(1 / 60, []);
    const line = a.lines[0]!;
    expect(b.s).toBeGreaterThan(line.front());
    expect(b.hit(shot(), [])).toBe('blocked');
    const events: BossEvent[] = [];
    b.popped(0, line.marbles.slice(0, 2), 0, events);
    expect(b.hp).toBe(3);
    b.popped(0, line.marbles.slice(-3), 1, events);
    expect(b.hp).toBe(1);
    until(b, () => a.stones > 0, 12);
    expect(a.stones).toBe(2);
  });
});

describe('the scarecrow', () => {
  it('is hurt in the body, its sleeves stop shots, and it spins faster when hit', () => {
    const { b } = make('scarecrow', [{ x: 640, y: 360 }]);
    expect(b.touches({ x: 640 + 60, y: 360 }, 16)).toBe(true);
    expect(b.touches({ x: 640, y: 360 + 60 }, 16)).toBe(false);
    expect(b.hit(shot({ x: 700, y: 360 }), [])).toBe('blocked');
    expect(b.hit(shot({ x: 650, y: 360 }), [])).toBe('hurt');
    const a0 = b.sleeves;
    b.step(1, []);
    expect(b.sleeves - a0).toBeGreaterThan(1);
  });
});

describe('the chameleon', () => {
  it('is hurt only by marbles of its colour (or a Geode)', () => {
    const { b } = make('chameleon');
    expect(b.hit(shot({ colour: b.colour === 'red' ? 'blue' : 'red' }), [])).toBe('blocked');
    expect(b.hit(shot({ colour: b.colour }), [])).toBe('hurt');
    expect(b.hit(shot({ colour: 'green', wild: true }), [])).toBe('hurt');
    const before = b.colour;
    until(b, () => b.colour !== before, 6);
    expect(b.colour).not.toBe(before);
  });
});

describe('the cat and the lion', () => {
  it('the cat swats straight shots and is hurt by banked ones', () => {
    const { b } = make('cat', [{ x: 200, y: 60 }, { x: 1080, y: 60 }]);
    expect(b.hit(shot(), [])).toBe('swatted');
    expect(b.hit(shot({ bounces: 1 }), [])).toBe('hurt');
  });

  it('the lion shrugs off straight shots, is hurt by ones off a column, and roars the lines on', () => {
    const { a, b } = make('lion', [{ x: 640, y: 300 }]);
    expect(b.hit(shot(), [])).toBe('blocked');
    expect(b.hit(shot({ glances: 1 }), [])).toBe('hurt');
    until(b, () => a.shoves > 0, 12);
    expect(b.phase).toBe('roar');
  });
});

describe('the owl', () => {
  it('hoots as it lands, closing the night in', () => {
    const { b } = make('owl');
    until(b, () => b.phase === 'fly');
    const events = until(b, () => b.phase === 'perch');
    expect(events.some((e) => e.type === 'bossHoot')).toBe(true);
    expect(b.hoot).toBeGreaterThan(0);
  });
});

describe('a boss level', () => {
  const LEVEL: LevelDef = {
    id: 'test-boss', name: 'Boss', shooter: { kind: 'pivot', x: 640, y: 650 },
    tracks: [{ points: [{ x: -20, y: 120 }, { x: 1300, y: 120 }] }],
    colours: 3, speed: 30, goal: 100, par: 60, charms: [], boss: { kind: 'lion', hp: 2, spots: [{ x: 640, y: 380 }] },
  };

  it('fills its bar with the boss\'s hits, not points, and shuts the burrows when it is beaten', () => {
    const b = new Board(LEVEL, 1);
    b.score = 5000;
    b.step(NO_INPUT, 1 / 60);
    expect(b.filled).toBe(false);
    b.boss!.hp = 1;
    expect(b.progress).toBe(0.5);
    // A shot straight at the lion is shrugged off.
    b.step({ ...NO_INPUT, aim: { x: 640, y: 380 }, fire: true }, 1 / 60);
    const events: BoardEvent[] = [];
    for (let t = 0; t < 0.5; t += 1 / 60) events.push(...b.step(NO_INPUT, 1 / 60));
    expect(events.some((e) => e.type === 'bossBlock')).toBe(true);
    b.boss!.hp = 0;
    const after = b.step(NO_INPUT, 1 / 60);
    expect(after.some((e) => e.type === 'filled')).toBe(true);
    expect(b.lines.every((l) => !l.spawning)).toBe(true);
    expect(BOSS_R.lion).toBeGreaterThan(30);
  });
});
