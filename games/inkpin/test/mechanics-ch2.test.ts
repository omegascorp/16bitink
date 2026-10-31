import { describe, expect, it } from 'vitest';
import { LEDGE_T } from '../src/logic/ledges';
import { parseStep, type LevelDef } from '../src/logic/level';
import { LAVA, STEPS_PER_SECOND, STONE, WATER } from '../src/logic/particles';
import { RAFT_HH } from '../src/logic/rafts';
import { RUBY_COINS } from '../src/logic/rubies';
import { World, type WorldEvent } from '../src/logic/world';
import { play } from './solver';

/**
 * The Volcano Shrine's mechanics, each in a small made-up room: a box
 * 40..760 by 300..900 with whatever walls, pins and fills a test adds.
 */
const T = 8;
const BOX = [
  { ax: 40, ay: 300, bx: 760, by: 300, t: T },
  { ax: 40, ay: 300, bx: 40, by: 900, t: T },
  { ax: 760, ay: 300, bx: 760, by: 900, t: T },
  { ax: 40, ay: 900, bx: 760, by: 900, t: T },
];
const room = (extra: Partial<LevelDef>): LevelDef => ({
  id: 'test',
  chapter: 'test',
  name: 'test',
  goal: '',
  ruin: 'volcano',
  rooms: [[[40, 300], [760, 300], [760, 900], [40, 900]]],
  walls: BOX,
  bars: [],
  pins: [],
  fills: [],
  nib: { x: 80, y: 868 },
  blots: [],
  // A chest out of reach, so the room stays in play.
  chest: { x: 740, y: 330 },
  coinsNeeded: 0,
  solution: [],
  torches: [],
  view: { x: 0, y: 260, w: 800, h: 680 },
  ...extra,
});

const run = (w: World, steps: number): void => {
  for (let s = 0; s < steps && !w.finished; s++) w.step();
};
/** Runs until an event of the type fires (or the steps run out); returns it. */
const runUntil = (w: World, type: WorldEvent['type'], steps: number): WorldEvent | undefined => {
  for (let s = 0; s < steps && !w.finished; s++) {
    w.step();
    const e = w.events.find((ev) => ev.type === type);
    if (e) return e;
  }
  return undefined;
};
const count = (w: World, kind: number, test: (x: number, y: number) => boolean): number => {
  const g = w.grains;
  let n = 0;
  for (let i = 0; i < g.count; i++) if (g.kind[i] === kind && test(g.x[i]!, g.y[i]!)) n++;
  return n;
};

/** A tank (x 300..500, y 340..500) whose floor is the gate G. */
const tank = { walls: [{ ax: 300, ay: 340, bx: 300, by: 500, t: T }, { ax: 500, ay: 340, bx: 500, by: 500, t: T }], gate: { id: 'G', ax: 280, ay: 508, bx: 520, by: 508, t: 7, gate: true } };

describe('steps', () => {
  it('reads a plain step and a timed one', () => {
    expect(parseStep('W')).toEqual({ id: 'W', wait: null });
    expect(parseStep('G~1.5')).toEqual({ id: 'G', wait: 1.5 });
    expect(() => parseStep('G~soon')).toThrow();
  });
});

describe('gate pins', { timeout: 120_000 }, () => {
  const pour = (): LevelDef => room({ walls: [...BOX, ...tank.walls], pins: [tank.gate], fills: [{ kind: WATER, x0: 310, x1: 490, y1: 500, count: 240 }] });

  /** How much water got out before the gate went back in, `wait` s after it was pulled. */
  const cut = (wait: number): { out: number; left: number } => {
    const w = new World(pour());
    expect(w.tap('G')).toBe(true);
    run(w, Math.round(wait * STEPS_PER_SECOND));
    expect(w.tap('G')).toBe(true);
    expect(w.pins[0]!.pulledAt).toBe(null);
    expect(w.pins[0]!.pushedAt).toBe(w.steps);
    run(w, 600);
    return { out: count(w, WATER, (_x, y) => y > 520), left: count(w, WATER, (x, y) => x > 300 && x < 500 && y < 500) };
  };

  it('cuts a pour: the longer it stays out, the more gets through', () => {
    const quick = cut(0.4);
    const slow = cut(1.2);
    expect(quick.out).toBeGreaterThan(10);
    expect(quick.left).toBeGreaterThan(100);
    expect(slow.out).toBeGreaterThan(quick.out + 40);
    expect(slow.left).toBeLessThan(quick.left);
  });

  it('fires gateIn, and can be pulled again', () => {
    const w = new World(pour());
    w.pull('G');
    run(w, 30);
    expect(w.push('G')).toBe(true);
    w.step();
    expect(w.events.some((e) => e.type === 'gateIn' && e.id === 'G')).toBe(true);
    expect(w.pull('G')).toBe(true);
  });

  it('only a gate that is out goes back in', () => {
    const plain = new World(room({ walls: [...BOX, ...tank.walls], pins: [{ ...tank.gate, gate: false }] }));
    plain.pull('G');
    expect(plain.push('G')).toBe(false);
    const gate = new World(pour());
    expect(gate.push('G')).toBe(false);
  });

  it('times a step in the bot’s orders: G~0.5 cuts the pour', () => {
    const level = pour();
    const once = play(level, ['G']);
    const cutShort = play(level, ['G', 'G~0.5']);
    expect(once.possible).toBe(true);
    expect(cutShort.possible).toBe(true);
    expect(cutShort.steps).toBeGreaterThan(0);
  });

  // A door gate standing on the floor: it slides up out of Nib's way.
  const door = room({ pins: [{ id: 'D', ax: 400, ay: 640, bx: 400, by: 894, t: 7, gate: true }], nib: { x: 200, y: 868 } });

  it('won’t go back into Nib: it jams', () => {
    const w = new World(door);
    w.pull('D');
    w.command({ kind: 'goto', x: 400 });
    run(w, 400);
    expect(Math.abs(w.nib.x - 400)).toBeLessThan(10);
    expect(w.push('D')).toBe(false);
    w.step();
    expect(w.events.some((e) => e.type === 'gateJammed' && e.id === 'D')).toBe(true);
    expect(w.pins[0]!.pulledAt).not.toBe(null);
    w.command({ kind: 'goto', x: 600 });
    run(w, 400);
    expect(w.push('D')).toBe(true);
  });

  it('pushes grains in its slot out of the way, to the nearer side', () => {
    const w = new World(room({ ...door, fills: [{ kind: WATER, x0: 360, x1: 440, y1: 892, count: 30 }] }));
    w.pull('D');
    run(w, 120);
    expect(w.push('D')).toBe(true);
    const inSlot = count(w, WATER, (x, y) => Math.abs(x - 400) < 7 + 6 && y > 640 && y < 894);
    expect(inSlot).toBe(0);
  });
});

describe('crumbling ledges', () => {
  // Nib's shelf on the left at y 600, the ledge beside it over a pit (288..432) where a boar paces.
  const cliff = (extra: Partial<LevelDef> = {}): LevelDef =>
    room({
      walls: [...BOX, { ax: 40, ay: 608, bx: 280, by: 608, t: T }, { ax: 280, ay: 608, bx: 280, by: 900, t: T }, { ax: 440, ay: 700, bx: 440, by: 900, t: T }],
      ledges: [{ x0: 290, x1: 430, y: 600 }],
      nib: { x: 360, y: 574 },
      blots: [{ x: 360, y: 870 }],
      ...extra,
    });

  it('holds Nib as long as he stands on it', () => {
    const w = new World(cliff());
    run(w, 600);
    expect(w.ledges[0]!.state).toBe('up');
    expect(w.nib.y).toBeLessThan(600 - 20);
    expect(w.status.state).toBe('playing');
  });

  it('cracks once he steps off, falls, squashes the guard under it, and lands as a floor', () => {
    const w = new World(cliff());
    const l = w.ledges[0]!;
    run(w, 30);
    w.command({ kind: 'goto', x: 120 });
    const crack = runUntil(w, 'crack', 400);
    expect(crack).toMatchObject({ type: 'crack', index: 0 });
    expect(l.state).toBe('cracking');
    const crackedAt = w.steps;
    // It wobbles a moment before it goes.
    run(w, 30);
    expect(l.state).toBe('cracking');
    expect(l.y).toBe(600);
    const down = runUntil(w, 'slabDown', 600);
    expect(down).toBeDefined();
    expect(w.steps - crackedAt).toBeLessThan(STEPS_PER_SECOND * 2);
    expect(w.blots[0]!.gone).toBe('stomped');
    expect(l.state).toBe('down');
    expect(l.y).toBeCloseTo(892 - 2 * LEDGE_T, 0);
    // Level all the way down, and it stays.
    expect(l.x0).toBe(290);
    expect(l.x1).toBe(430);
    // It's a floor now: Nib drops onto it, walks off, and it doesn't crumble again.
    w.nib.x = 360;
    w.nib.y = 800;
    w.nib.vy = 0;
    run(w, 200);
    expect(w.nib.y).toBeCloseTo(l.y - w.nib.r, -1);
    w.nib.x = 120;
    w.nib.y = 570;
    run(w, 300);
    expect(l.state).toBe('down');
    expect(w.status.state).toBe('playing');
  });

  it('a guard standing on a slab falls with it, unhurt', () => {
    const w = new World(cliff({ blots: [{ x: 360, y: 574 }], nib: { x: 100, y: 574 } }));
    const l = w.ledges[0]!;
    // As if Nib had been on it: the guard can't share it with him.
    l.stood = true;
    runUntil(w, 'slabDown', 900);
    expect(l.state).toBe('down');
    run(w, 60);
    const b = w.blots[0]!;
    expect(b.gone).toBe(null);
    expect(b.y).toBeCloseTo(l.y - b.r, -1);
  });

  it('crushes Nib when it comes down on him', () => {
    const w = new World(cliff({ blots: [] }));
    run(w, 30);
    // Nib leaves it, and is put back under it.
    w.nib.x = 120;
    w.nib.y = 570;
    runUntil(w, 'crack', 200);
    w.nib.x = 360;
    w.nib.y = 868;
    w.nib.vx = 0;
    w.nib.vy = 0;
    run(w, 400);
    expect(w.status).toEqual({ state: 'lost', cause: 'crushed' });
  });

  it('sinks slowly through lava, unhurt, pushing it aside, and stops on the floor', () => {
    const w = new World(
      room({
        walls: [...BOX, { ax: 40, ay: 708, bx: 200, by: 708, t: T }],
        fills: [{ kind: LAVA, x0: 210, x1: 750, y1: 892, count: 420 }],
        ledges: [{ x0: 210, x1: 330, y: 700 }],
        nib: { x: 270, y: 674 },
      }),
    );
    const l = w.ledges[0]!;
    const lava = w.grains.countOf(LAVA);
    run(w, 30);
    w.command({ kind: 'goto', x: 100 });
    runUntil(w, 'crack', 300);
    let sinking = 0;
    let fastest = 0;
    const surface = 892 - 70;
    for (let s = 0; s < 900 && l.state !== 'down'; s++) {
      w.step();
      if (l.y + 2 * LEDGE_T > surface + 20 && l.state === 'falling') {
        sinking++;
        fastest = Math.max(fastest, l.vy);
      }
    }
    expect(l.state).toBe('down');
    expect(l.y).toBeCloseTo(892 - 2 * LEDGE_T, 0);
    expect(sinking).toBeGreaterThan(20);
    // Slowed in the lava: well under a free fall's speed.
    expect(fastest).toBeLessThan(3);
    expect(w.grains.countOf(LAVA)).toBe(lava);
    // None trapped under it.
    expect(count(w, LAVA, (x, y) => x > l.x0 && x < l.x1 && y > l.y + LEDGE_T)).toBe(0);
    expect(w.status.state).toBe('playing');
  });
});

describe('pumice rafts', () => {
  // A lava river between two banks (floors 700 and 770), its upper part held back by the dam pin R: pulled, the lava surges on downstream.
  const river = (extra: Partial<LevelDef> = {}): LevelDef =>
    room({
      walls: [
        ...BOX,
        { ax: 40, ay: 708, bx: 200, by: 708, t: T },
        { ax: 200, ay: 708, bx: 200, by: 900, t: T },
        { ax: 470, ay: 778, bx: 760, by: 778, t: T },
        { ax: 470, ay: 778, bx: 470, by: 900, t: T },
      ],
      pins: [{ id: 'R', ax: 380, ay: 600, bx: 380, by: 894, t: 7 }],
      fills: [{ kind: LAVA, x0: 210, x1: 372, y1: 892, count: 220 }],
      rafts: [{ x: 330, y: 600 }],
      nib: { x: 60, y: 676 },
      ...extra,
    });

  it('floats on lava, about half under, and never burns', () => {
    const w = new World(river({ rafts: [{ x: 290, y: 600 }] }));
    const r = w.boulders[0]!;
    run(w, 1200);
    expect(r.gone).toBe(false);
    expect(r.raft).toBe(true);
    const g = w.grains;
    let surface = Infinity;
    for (let i = 0; i < g.count; i++) if (g.kind[i] === LAVA && g.x[i]! < 240) surface = Math.min(surface, g.y[i]!);
    expect(Math.abs(r.y - surface)).toBeLessThan(RAFT_HH);
  });

  it('floats on water too', () => {
    const w = new World(river({ fills: [{ kind: WATER, x0: 210, x1: 372, y1: 892, count: 220 }] }));
    const r = w.boulders[0]!;
    run(w, 1200);
    expect(r.y).toBeLessThan(892 - 60);
  });

  it('carries Nib across the river on the lava’s flow, without burning him', () => {
    const w = new World(river());
    const r = w.boulders[0]!;
    // Nib on the raft.
    w.nib.x = r.x;
    w.nib.y = r.y - RAFT_HH - w.nib.r - 1;
    run(w, 120);
    expect(w.nib.y).toBeLessThan(r.y - RAFT_HH);
    const raftFrom = r.x;
    const nibFrom = w.nib.x;
    w.pull('R');
    run(w, STEPS_PER_SECOND * 4);
    expect(w.status.state).toBe('playing');
    expect(r.x - raftFrom).toBeGreaterThan(40);
    // Nib rode along: he moved as far as the raft did, standing still on it.
    expect(Math.abs(w.nib.x - nibFrom - (r.x - raftFrom))).toBeLessThan(6);
    // And steps off onto the far bank.
    w.command({ kind: 'goto', x: 650 });
    run(w, 600);
    expect(w.status.state).toBe('playing');
    expect(w.nib.x).toBeGreaterThan(600);
    expect(w.nib.y).toBeLessThan(770);
    expect(r.gone).toBe(false);
  });

  it('carries a guard pacing on it', () => {
    const w = new World(river({ blots: [{ x: 330, y: 560 }] }));
    const r = w.boulders[0]!;
    const b = w.blots[0]!;
    run(w, 120);
    expect(Math.abs(b.x - r.x)).toBeLessThan(r.hw);
    const from = r.x;
    w.pull('R');
    run(w, STEPS_PER_SECOND * 3);
    expect(r.x - from).toBeGreaterThan(40);
    expect(b.gone).toBe(null);
    expect(Math.abs(b.x - r.x)).toBeLessThan(r.hw);
    expect(b.y).toBeLessThan(r.y - r.hh);
  });

  it('carries a ruby lying on it', () => {
    const w = new World(river({ rubies: [{ x: 320, y: 560 }] }));
    const r = w.boulders[0]!;
    const ruby = w.rubies[0]!;
    run(w, 60);
    expect(ruby.y).toBeLessThan(r.y - r.hh);
    const off = ruby.x - r.x;
    w.pull('R');
    run(w, STEPS_PER_SECOND * 3);
    expect(Math.abs(ruby.x - r.x - off)).toBeLessThan(4);
    expect(ruby.y).toBeLessThan(r.y - r.hh);
  });
});

describe('fire rubies', () => {
  // A basin of lava under a tank of water; Nib on the floor beside it.
  const pool = room({
    walls: [...BOX, { ax: 280, ay: 820, bx: 280, by: 900, t: T }, { ax: 520, ay: 820, bx: 520, by: 900, t: T }, ...tank.walls],
    pins: [{ ...tank.gate, gate: false, id: 'W' }],
    fills: [
      { kind: LAVA, x0: 290, x1: 510, y1: 892, count: 140 },
      { kind: WATER, x0: 310, x1: 490, y1: 500, count: 300 },
    ],
    rubies: [{ x: 400, y: 620 }],
    coinsNeeded: RUBY_COINS,
  });

  it('counts RUBY_COINS toward the treasure', () => {
    const w = new World(pool);
    expect(w.coinsTotal).toBe(RUBY_COINS);
    expect(w.treasure).toBe(RUBY_COINS);
  });

  it('drops heavier than a coin and sinks through lava to the floor, unhurt; Nib picks it up', () => {
    const w = new World(pool);
    const r = w.rubies[0]!;
    // Lift it back up after the level's settling, to watch it fall.
    r.y = 620;
    r.vy = 0;
    run(w, 60);
    // Free fall: about g t² / 2 in a second.
    expect(r.y).toBeGreaterThan(620 + 100);
    run(w, 400);
    expect(r.y).toBeGreaterThan(892 - 12);
    expect(r.lost || r.taken).toBe(false);
    // Cool the pool, then send Nib over it.
    w.pull('W');
    run(w, 900);
    expect(w.grains.countOf(LAVA)).toBe(0);
    expect(w.grains.countOf(STONE)).toBeGreaterThan(100);
    w.command({ kind: 'goto', x: 420 });
    const got = runUntil(w, 'ruby', 900);
    expect(got).toMatchObject({ type: 'ruby', id: 0 });
    expect(r.taken).toBe(true);
    expect(w.coinsCollected).toBe(RUBY_COINS);
    expect(w.goalMet).toBe(false); // the chest is still to take
  });

  it('a drain takes it, and with it the level', () => {
    const w = new World(
      room({
        walls: [BOX[0]!, BOX[1]!, BOX[2]!, { ax: 40, ay: 900, bx: 380, by: 900, t: T }, { ax: 420, ay: 900, bx: 760, by: 900, t: T }],
        drains: [{ x0: 380, x1: 420, y0: 900, y1: 960 }],
        rubies: [{ x: 600, y: 860 }],
        coinsNeeded: RUBY_COINS,
      }),
    );
    const r = w.rubies[0]!;
    expect(w.treasure).toBe(RUBY_COINS);
    r.x = 400;
    r.y = 600;
    const lost = runUntil(w, 'rubyLost', 600);
    expect(lost).toMatchObject({ type: 'rubyLost', id: 0 });
    expect(r.lost).toBe(true);
    expect(w.treasure).toBe(0);
    w.step();
    expect(w.status).toEqual({ state: 'lost', cause: 'drained' });
  });
});

describe('volcano guards', () => {
  // Nib's platform on the left (floor 852), a lava pit 40 px lower on the right.
  const pit = (extra: Partial<LevelDef>): LevelDef =>
    room({
      walls: [...BOX, { ax: 40, ay: 860, bx: 300, by: 860, t: T }, { ax: 300, ay: 860, bx: 300, by: 900, t: T }],
      fills: [{ kind: LAVA, x0: 310, x1: 750, y1: 892, count: 150 }],
      nib: { x: 150, y: 828 },
      ...extra,
    });

  it('a salamander wades through lava at a walk, climbs out and catches Nib', () => {
    const w = new World(pit({ blots: [{ x: 560, y: 870, animal: 'salamander' }] }));
    const b = w.blots[0]!;
    expect(b.animal).toBe('salamander');
    expect(b.spiky).toBe(false);
    run(w, STEPS_PER_SECOND);
    expect(b.gone).toBe(null);
    expect(560 - b.x).toBeGreaterThan(40);
    run(w, STEPS_PER_SECOND * 10);
    expect(b.gone).toBe(null);
    expect(w.status).toEqual({ state: 'lost', cause: 'inked', by: 'salamander' });
  });

  it('a salamander washes away in water', () => {
    const w = new World(
      room({
        walls: [...BOX, ...tank.walls],
        pins: [{ ...tank.gate, gate: false, id: 'W' }],
        fills: [{ kind: WATER, x0: 310, x1: 490, y1: 500, count: 300 }],
        blots: [{ x: 400, y: 870, animal: 'salamander' }],
        nib: { x: 700, y: 868 },
      }),
    );
    const b = w.blots[0]!;
    w.pull('W');
    // Keep it under the pour.
    for (let s = 0; s < 600 && !b.gone; s++) {
      b.x = 400;
      w.step();
    }
    expect(b.gone).toBe('washed');
  });

  it('an armadillo pricks a Nib that stomps it', () => {
    const w = new World(room({ blots: [{ x: 400, y: 870, animal: 'armadillo' }], nib: { x: 400, y: 780 } }));
    const b = w.blots[0]!;
    expect(b.spiky).toBe(true);
    w.nib.x = b.x;
    for (let s = 0; s < 200 && !w.finished; s++) w.step();
    expect(b.gone).toBe(null);
    expect(w.status).toEqual({ state: 'lost', cause: 'pricked', by: 'armadillo' });
  });

  it('an armadillo burns in lava', () => {
    const w = new World(pit({ blots: [{ x: 500, y: 860, animal: 'armadillo' }] }));
    run(w, 60);
    expect(w.blots[0]!.gone).toBe('scorched');
  });

  it('the Old Salamander wades on the pool’s floor, never sunk into it, even with a raft drifting over it', () => {
    const w = new World(
      room({
        walls: [...BOX, { ax: 40, ay: 420, bx: 140, by: 420, t: T }],
        fills: [{ kind: LAVA, x0: 160, x1: 750, y1: 892, count: 420 }],
        blots: [{ x: 560, y: 852, animal: 'salamander', boss: true }],
        rafts: [{ x: 560, y: 700 }],
        nib: { x: 80, y: 388 },
      }),
    );
    const b = w.blots[0]!;
    let lowest = 0;
    for (let s = 0; s < 900 && !w.finished; s++) {
      w.step();
      lowest = Math.max(lowest, b.y);
    }
    expect(b.gone).toBe(null);
    expect(lowest).toBeLessThan(892 - b.r + 1);
    expect(w.boulders[0]!.gone).toBe(false);
  });

  it('the Old Salamander is fireproof too', () => {
    const w = new World(pit({ blots: [{ x: 560, y: 852, animal: 'salamander', boss: true }] }));
    run(w, 240);
    expect(w.blots[0]!.boss).toBe(true);
    expect(w.blots[0]!.gone).toBe(null);
  });
});

describe('the Clear goal', () => {
  const hall = (clear: boolean): LevelDef =>
    room({
      walls: [...BOX, ...tank.walls],
      pins: [{ ...tank.gate, gate: false, id: 'W' }],
      fills: [{ kind: WATER, x0: 310, x1: 490, y1: 500, count: 300 }],
      blots: [{ x: 400, y: 870, animal: 'salamander' }],
      nib: { x: 700, y: 868 },
      chest: undefined,
      clear,
    });

  it('needs every guard gone', () => {
    const w = new World(hall(true));
    run(w, 120);
    expect(w.goalMet).toBe(false);
    w.pull('W');
    const b = w.blots[0]!;
    for (let s = 0; s < 900 && !b.gone; s++) {
      b.x = 400;
      w.step();
    }
    expect(b.gone).toBe('washed');
    w.step();
    expect(w.goalMet).toBe(true);
  });

  it('without it, the guard can stay', () => {
    const w = new World(hall(false));
    run(w, 5);
    expect(w.goalMet).toBe(true);
  });
});

describe('the heart rewind', () => {
  it('restores a falling slab, a pushed gate and a ruby', () => {
    const level = room({
      walls: [...BOX, ...tank.walls, { ax: 40, ay: 608, bx: 200, by: 608, t: T }],
      pins: [tank.gate],
      fills: [{ kind: WATER, x0: 310, x1: 490, y1: 500, count: 120 }],
      ledges: [{ x0: 210, x1: 290, y: 600 }],
      rubies: [{ x: 600, y: 860 }],
      nib: { x: 250, y: 574 },
    });
    const w = new World(level);
    const l = w.ledges[0]!;
    const pin = w.pins[0]!;
    w.pull('G');
    run(w, 30);
    const beforePush = w.save();
    w.push('G');
    run(w, 10);
    w.command({ kind: 'goto', x: 100 });
    for (let s = 0; s < 600 && !(l.state === 'falling' && l.vy > 1); s++) w.step();
    expect(l.state).toBe('falling');
    const midFall = w.save();
    const at = { y: l.y, vy: l.vy };
    const later = (): number => {
      run(w, 40);
      return l.y;
    };
    const y1 = later();
    runUntil(w, 'slabDown', 600);
    expect(l.state).toBe('down');
    w.rubies[0]!.taken = true;
    w.load(midFall);
    expect(l.state).toBe('falling');
    expect(l.y).toBe(at.y);
    expect(l.vy).toBe(at.vy);
    expect(pin.pulledAt).toBe(null);
    expect(pin.pushedAt).not.toBe(null);
    expect(w.rubies[0]!.taken).toBe(false);
    // And it plays out the same again.
    expect(later()).toBe(y1);
    w.load(beforePush);
    expect(pin.pulledAt).not.toBe(null);
    expect(pin.pushedAt).toBe(null);
    expect(l.state).toBe('up');
    expect(l.y).toBe(600);
  });
});
