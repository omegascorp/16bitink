import { describe, expect, it } from 'vitest';
import type { LevelDef } from '../src/logic/level';
import { GAS, STEPS_PER_SECOND, WATER } from '../src/logic/particles';
import { World } from '../src/logic/world';
import { count, FLOOR, run, stepsUntil, T, tombRoom, vent } from './tomb-room';

/**
 * How each chapter 3 mechanic reads on a board: the worked patterns in the
 * kit's "How each mechanic reads on a board", each a small board that works
 * with the numbers the kit gives. Run with --silent=false to see the times.
 */

const BASE = tombRoom({}).walls;
const sec = (n: number): string => (n / STEPS_PER_SECOND).toFixed(2);
const say = (s: string): void => console.log(`PATTERN ${s}`);
/** A 100-px stone door at x 600, open (slid up into the rock) while plate A is down. */
const DOOR = { id: 'D', ax: 600, ay: FLOOR - 92, bx: 600, by: FLOOR + 8, t: T, plate: 'A' };
const isOpen = (w: World): boolean => w.doors[0]!.open >= w.doors[0]!.len;
const isShut = (w: World): boolean => w.doors[0]!.open === 0;

describe('how each mechanic reads on a board', { timeout: 120_000 }, () => {
  /**
   * 1. A plate Nib must not touch: a closet whose wall comes right down to
   *    the floor (x 160, 650..892) holds plate A; the boulder on pin B drops
   *    into it from 180 px up. Nib can lean on the closet wall all he likes.
   */
  const closet = (): LevelDef =>
    tombRoom({
      walls: [...BASE, { ax: 160, ay: 650, bx: 160, by: 892, t: T }, { ax: 600, ay: 300, bx: 600, by: FLOOR - 92, t: T }],
      pins: [{ id: 'B', ax: 50, ay: 712, bx: 152, by: 712, t: 7 }],
      boulders: [{ x: 104, y: 678 }],
      plates: [{ id: 'A', x0: 56, x1: 150, y: FLOOR }],
      doors: [DOOR],
      nib: { x: 260, y: FLOOR - 24 },
    });

  it('1. a plate in a closet, held by a boulder Nib cannot reach', () => {
    const shut = new World(closet());
    shut.command({ kind: 'goto', x: 60 });
    run(shut, 3 * STEPS_PER_SECOND);
    expect(shut.nib.x).toBeGreaterThan(160);
    expect(shut.plates[0]!.weight).toBe(0);
    expect(isShut(shut)).toBe(true);
    const w = new World(closet());
    w.pull('B');
    const down = stepsUntil(w, 'plateDown', 2 * STEPS_PER_SECOND);
    const open = stepsUntil2(w, () => isOpen(w), STEPS_PER_SECOND);
    run(w, 3 * STEPS_PER_SECOND);
    expect(w.plates[0]!.weight).toBe(40);
    expect(isOpen(w)).toBe(true);
    say(`1 closet: boulder on the plate ${sec(down)} s after B, door open ${sec(open)} s later; weight ${w.plates[0]!.weight}`);
  });

  /**
   * 2. A door that seals Nib in: plate A (need 20) in a 100-px pit holds 50 water over
   *    a 12-px grate plugged by pin G; door D stands between Nib (held by
   *    pin S) and the chest. S first: he walks through. G first: the pit
   *    leaks, the door drops, and once S is out too he is 'sealed'.
   */
  const leakyVault = (): LevelDef =>
    tombRoom({
      walls: [...BASE, { ax: 342, ay: 840, bx: 342, by: 900, t: T }, { ax: 458, ay: 840, bx: 458, by: 900, t: T }, { ax: 600, ay: 300, bx: 600, by: FLOOR - 92, t: T }],
      pins: [
        { id: 'G', ax: 300, ay: 884, bx: 420, by: 884, t: 7 },
        { id: 'S', ax: 540, ay: 760, bx: 540, by: 884, t: 7 },
      ],
      fills: [{ kind: WATER, x0: 350, x1: 450, y1: 877, count: 50 }],
      // The plug pin lies in the pit and lifts the water: 50 water weigh only ~26, so need 20.
      plates: [{ id: 'A', x0: 350, x1: 450, y: FLOOR, need: 20 }],
      doors: [DOOR],
      drains: [{ x0: 394, x1: 406, y0: 884, y1: 905 }],
      seals: [{ door: 'D', side: 'right' }],
      nib: { x: 500, y: FLOOR - 24 },
      chest: { x: 700, y: FLOOR - 24 },
    });

  it("2. a leaking plate's door: the right order walks through, the wrong one ends 'sealed'", () => {
    // The pit's water settles onto the plate in the pre-settle; the door opens in the first moments of play.
    const right = new World(leakyVault());
    const opens = stepsUntil2(right, () => isOpen(right), STEPS_PER_SECOND);
    expect(opens).toBeGreaterThan(0);
    right.pull('S');
    right.command({ kind: 'goto', x: 700 });
    run(right, 4 * STEPS_PER_SECOND);
    expect(right.chestTaken).toBe(true);
    const wrong = new World(leakyVault());
    run(wrong, STEPS_PER_SECOND);
    wrong.pull('G');
    const up = stepsUntil(wrong, 'plateUp', 3 * STEPS_PER_SECOND);
    const shut = stepsUntil(wrong, 'doorShut', 3 * STEPS_PER_SECOND);
    expect(shut).toBeGreaterThan(0);
    wrong.pull('S');
    wrong.command({ kind: 'goto', x: 700 });
    const sealed = run2(wrong, 6 * STEPS_PER_SECOND);
    expect(wrong.status).toEqual({ state: 'lost', cause: 'sealed' });
    say(`2 door open ${sec(opens)} s into play; weight ${right.plates[0]!.weight}`);
    say(`2 sealed: G leaks the pit, plate up ${sec(up)} s after G, door shut ${sec(shut)} s later; S then ends 'sealed' ${sec(sealed)} s after it`);
  });

  /**
   * 3. Gas vented top-down: 100 gas under a 300-px dome (lips 50 px deep)
   *    whose roof has a chimney (a drain box 40..90 px up) plugged by pin V.
   *    Pulled, the gas leaves upward; it never spills under the lips.
   */
  it('3. a dome vented through its roof', () => {
    for (const [x0, x1] of [[380, 420], [370, 430]] as const) {
      const v = vent(500);
      const walls = v.walls.map((s, i) => (i === 0 ? { ...s, bx: x0 } : i === 1 ? { ...s, ax: x1 } : i === 2 ? { ...s, ax: x0, bx: x0 } : i === 3 ? { ...s, ax: x1, bx: x1 } : s));
      const w = new World(tombRoom({
        walls: [...BASE, ...walls],
        pins: [{ ...v.pin, ax: x0 - 12, bx: x1 + 12 }],
        drains: [{ ...v.drain, x0, x1 }],
        fills: [{ kind: GAS, x0: 250, x1: 550, y1: 508, count: 100 }],
      }));
      w.pull('V');
      const half = stepsUntil2(w, () => count(w, GAS) <= 50, 10 * STEPS_PER_SECOND);
      const gone = stepsUntil2(w, () => count(w, GAS) <= 2, 10 * STEPS_PER_SECOND);
      expect(gone).toBeGreaterThan(0);
      expect(count(w, GAS, (_, y) => y > 560)).toBe(0);
      say(`3 vent ${x1 - x0} px: half of 100 gas gone ${sec(half)} s after V, all but 2 ${sec(half + gone)} s`);
    }
  });

  /**
   * 4. A bowl lights a gas pocket and breaks a cracked bar: a 300-px dome
   *    (lip at x 400, the cracked bar at x 700) with a bowl at the tip of a
   *    shelf by the bar, its flame centre 22 px under the ceiling. Pin G is
   *    the lid of a 100-px gas pit in the floor (60 gas): pulled, the gas
   *    rises, spreads two rows deep under the dome, reaches the flame, and
   *    the blast breaks the bar. Nib waits 300 px away, safe.
   */
  it('4. a bowl, a gas pocket and a cracked bar', () => {
    const w = new World(tombRoom({
      rooms: [[[40, 300], [760, 300], [760, 900], [580, 900], [580, 1000], [480, 1000], [480, 900], [40, 900]]],
      walls: [
        BASE[0]!, BASE[1]!, BASE[2]!,
        { ax: 40, ay: 900, bx: 480, by: 900, t: T },
        { ax: 580, ay: 900, bx: 760, by: 900, t: T },
        { ax: 480, ay: 900, bx: 480, by: 1000, t: T },
        { ax: 580, ay: 900, bx: 580, by: 1000, t: T },
        { ax: 480, ay: 1000, bx: 580, by: 1000, t: T },
        { ax: 400, ay: 300, bx: 400, by: 420, t: T }, // 8 the dome's lip
        { ax: 700, ay: 300, bx: 700, by: 892, t: T }, // 9 the cracked bar
        { ax: 660, ay: 372, bx: 692, by: 372, t: T }, // 10 the bowl's shelf, its tip under the flame
      ],
      bars: [9],
      cracked: [9],
      pins: [{ id: 'G', ax: 472, ay: 900, bx: 588, by: 900, t: 7 }],
      fills: [{ kind: GAS, x0: 480, x1: 580, y1: 907, count: 60 }],
      braziers: [{ x: 660, y: 364 }],
      nib: { x: 180, y: FLOOR - 24 },
      chest: { x: 730, y: FLOOR - 24 },
    }));
    w.pull('G');
    const lit = stepsUntil(w, 'ignite', 4 * STEPS_PER_SECOND);
    const broke = stepsUntil(w, 'wallBroken', STEPS_PER_SECOND);
    expect(lit).toBeGreaterThan(0);
    expect(broke).toBeGreaterThan(0);
    run(w, STEPS_PER_SECOND);
    expect(w.broken[9]).toBe(true);
    expect(w.status.state).toBe('playing');
    say(`4 blast: lit ${sec(lit)} s after G, bar broken ${sec(broke)} s later`);
  });

  /**
   * 5. A frog dropped onto a plate: a puffed frog floats in 120 gas under a
   *    300-px dome (x 250..550, ceiling 650) with a 40-px roof vent at x
   *    380..420. Plate A is the floor of a 200-px pit 60 px deep right under
   *    the vent: the frog drifts toward the vent while the gas leaves, drops
   *    there, lands in the pit, and can't walk out of it, so its weight (30)
   *    holds the door open. On an open floor it walks off the plate again.
   */
  it('5. a frog dropped onto a plate under the vent', () => {
    const v = vent(650, 250, 550, 50);
    const w = new World(tombRoom({
      rooms: [[[40, 300], [760, 300], [760, 900], [500, 900], [500, 960], [300, 960], [300, 900], [40, 900]]],
      walls: [
        BASE[0]!, BASE[1]!, BASE[2]!,
        { ax: 40, ay: 900, bx: 300, by: 900, t: T },
        { ax: 500, ay: 900, bx: 760, by: 900, t: T },
        { ax: 300, ay: 900, bx: 300, by: 960, t: T },
        { ax: 500, ay: 900, bx: 500, by: 960, t: T },
        { ax: 300, ay: 960, bx: 500, by: 960, t: T },
        ...v.walls,
        { ax: 600, ay: 300, bx: 600, by: FLOOR - 92, t: T },
      ],
      pins: [v.pin],
      drains: [v.drain],
      fills: [{ kind: GAS, x0: 250, x1: 550, y1: 658, count: 120 }],
      blots: [{ x: 300, y: 680, animal: 'frog' }],
      plates: [{ id: 'A', x0: 308, x1: 492, y: 952 }],
      doors: [DOOR],
      nib: { x: 700, y: FLOOR - 24 },
    }));
    run(w, STEPS_PER_SECOND);
    expect(w.blots[0]!.puffed).toBe(true);
    w.pull('V');
    const drop = stepsUntil(w, 'frogDrop', 10 * STEPS_PER_SECOND);
    const dropX = w.blots[0]!.x;
    const down = stepsUntil(w, 'plateDown', 3 * STEPS_PER_SECOND);
    expect(drop).toBeGreaterThan(0);
    expect(down).toBeGreaterThan(0);
    const landX = w.blots[0]!.x;
    run(w, 5 * STEPS_PER_SECOND);
    expect(w.plates[0]!.weight).toBe(30);
    expect(isOpen(w)).toBe(true);
    say(`5 frog: dropped ${sec(drop)} s after V at x ${dropX.toFixed(0)} (it started at 300), on the plate ${sec(down)} s later at x ${landX.toFixed(0)}; 5 s on, weight ${w.plates[0]!.weight}, frog at x ${w.blots[0]!.x.toFixed(0)}`);
  });
});

/** Runs until `done` holds; returns the steps it took, or -1. */
function stepsUntil2(w: World, done: () => boolean, steps: number): number {
  for (let s = 1; s <= steps && !w.finished; s++) {
    w.step();
    if (done()) return s;
  }
  return -1;
}

/** Runs until the level ends; returns the steps it took. */
function run2(w: World, steps: number): number {
  let s = 0;
  while (s < steps && !w.finished) {
    w.step();
    s++;
  }
  return s;
}
