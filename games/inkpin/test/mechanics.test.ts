import { describe, expect, it } from 'vitest';
import type { LevelDef } from '../src/logic/level';
import { COIN, LAVA, WATER, type Kind } from '../src/logic/particles';
import { World } from '../src/logic/world';

/**
 * Small made-up rooms for the growing vines and the floating crates: a tank
 * held by a pin over a floor, with a ledge high on the right.
 */
const T = 8;
const room = (extra: Partial<LevelDef>): LevelDef => ({
  id: 'test',
  chapter: 'test',
  name: 'test',
  goal: '',
  rooms: [[[40, 300], [760, 300], [760, 900], [40, 900]]],
  walls: [
    { ax: 40, ay: 300, bx: 760, by: 300, t: T },
    { ax: 40, ay: 300, bx: 40, by: 900, t: T },
    { ax: 760, ay: 300, bx: 760, by: 900, t: T },
    { ax: 40, ay: 900, bx: 760, by: 900, t: T },
    // The tank, its floor a pin.
    { ax: 300, ay: 340, bx: 300, by: 500, t: T },
    { ax: 500, ay: 340, bx: 500, by: 500, t: T },
    // The ledge, too high to jump to.
    { ax: 600, ay: 640, bx: 760, by: 640, t: T },
  ],
  bars: [4, 5, 6],
  pins: [{ id: 'P', ax: 280, ay: 508, bx: 520, by: 508, t: 7 }],
  fills: [],
  nib: { x: 120, y: 868 },
  blots: [],
  // A chest far off on the ledge's end, so the room stays in play.
  chest: { x: 740, y: 610 },
  coinsNeeded: 0,
  solution: ['P'],
  torches: [],
  view: { x: 0, y: 260, w: 800, h: 680 },
  ...extra,
});

const run = (w: World, steps: number): void => {
  for (let s = 0; s < steps; s++) w.step();
};

describe('growing vines', () => {
  const seedLevel = (kind: Kind): LevelDef =>
    room({
      fills: [{ kind, x0: 310, x1: 490, y1: 500, count: 120 }],
      vines: [{ x: 564, top: 632, bottom: 892, seed: true }],
    });

  it('a seed stays a seed until water reaches it, then grows into a vine Nib can climb', () => {
    const w = new World(seedLevel(WATER));
    const seed = w.vines[0]!;
    expect(seed.grown).toBe(0);
    w.command({ kind: 'goto', x: 564, y: 640 });
    run(w, 200);
    expect(w.onVine).toBe(false);
    w.pull('P');
    run(w, 900);
    expect(seed.grown).toBe(1);
    w.command({ kind: 'goto', x: 564, y: 630 });
    run(w, 1500);
    w.command({ kind: 'goto', x: 680 });
    run(w, 600);
    expect(w.nib.y).toBeLessThan(640);
  });

  it('lava burns a vine, and Nib drops off it', () => {
    const level = room({
      fills: [{ kind: LAVA, x0: 310, x1: 490, y1: 500, count: 150 }],
      vines: [{ x: 530, top: 632, bottom: 892 }],
      nib: { x: 530, y: 868 },
    });
    const w = new World(level);
    w.command({ kind: 'goto', x: 530, y: 700 });
    run(w, 400);
    expect(w.onVine).toBe(true);
    w.pull('P');
    let burnt = false;
    for (let s = 0; s < 900 && !burnt; s++) {
      w.step();
      burnt = w.events.some((e) => e.type === 'vineBurnt');
    }
    expect(burnt).toBe(true);
    expect(w.vines[0]!.burnt).toBe(true);
    expect(w.onVine).toBe(false);
  });

  it('a seed watered by gold does not grow', () => {
    const w = new World(seedLevel(COIN));
    w.pull('P');
    run(w, 900);
    expect(w.vines[0]!.grown).toBe(0);
  });

  it('winds back with the hearts: a grown vine is a seed again', () => {
    const w = new World(seedLevel(WATER));
    const save = w.save();
    w.pull('P');
    run(w, 900);
    expect(w.vines[0]!.grown).toBe(1);
    w.load(save);
    expect(w.vines[0]!.grown).toBe(0);
  });
});

describe('floating crates', () => {
  // A pit under the tank: dry, a crate at its bottom; water lifts it to the floor's height.
  const pitLevel = (kind: Kind): LevelDef => {
    const base = room({});
    return room({
      walls: [...base.walls, { ax: 300, ay: 700, bx: 300, by: 900, t: T }, { ax: 500, ay: 700, bx: 500, by: 900, t: T }],
      bars: [...base.bars, 7, 8],
      fills: [{ kind, x0: 310, x1: 490, y1: 500, count: kind === WATER ? 260 : 60 }],
      crates: [{ x: 400, y: 860 }],
    });
  };

  it('floats up on water', () => {
    const w = new World(pitLevel(WATER));
    const crate = w.boulders[0]!;
    const dry = crate.y;
    w.pull('P');
    run(w, 1200);
    expect(crate.gone).toBe(false);
    expect(crate.y).toBeLessThan(dry - 20);
  });

  it('burns away in lava', () => {
    const w = new World(pitLevel(LAVA));
    w.pull('P');
    let burnt = false;
    for (let s = 0; s < 900 && !burnt; s++) {
      w.step();
      burnt = w.events.some((e) => e.type === 'crateBurnt');
    }
    expect(burnt).toBe(true);
    expect(w.boulders[0]!.gone).toBe(true);
  });

  it('is square on top: Nib stands on it off-centre without sliding off', () => {
    const w = new World(room({ crates: [{ x: 400, y: 866 }], nib: { x: 384, y: 780 } }));
    run(w, 300);
    expect(w.nib.y).toBeLessThan(820);
    expect(Math.abs(w.nib.x - 384)).toBeLessThan(4);
  });
});

describe('gold on a slope', () => {
  it('slides down a 45° ramp in a few seconds instead of creeping', () => {
    const base = room({});
    const level = room({
      walls: [...base.walls, { ax: 280, ay: 560, bx: 600, by: 880, t: T }],
      bars: [...base.bars, 7],
      fills: [{ kind: COIN, x0: 310, x1: 490, y1: 500, count: 60 }],
    });
    const w = new World(level);
    w.pull('P');
    run(w, 600);
    const g = w.grains;
    let off = 0;
    for (let i = 0; i < g.count; i++) if (g.kind[i] === COIN && g.x[i]! > 590) off++;
    expect(off).toBeGreaterThan(50);
  });
});
