import { describe, expect, it } from 'vitest';
import { TOMB_SAMPLER } from '../src/level/ch3/sampler';
import type { LevelDef } from '../src/logic/level';
import { COIN, GAS, LAVA, STEPS_PER_SECOND, STONE, WATER } from '../src/logic/particles';
import { World } from '../src/logic/world';
import { play } from './solver';
import { count, FLOOR, run, stepsUntil, stepsWhile, T, tombRoom, vent } from './tomb-room';

/** The Desert Tomb's mechanics, each in a small made-up room (see tomb-room.ts). */

const BASE = tombRoom({}).walls;
/** A 100-px pit (inside 350..450) whose floor carries the plate A, and a door D at x 600 that A holds open. */
const pit = { walls: [...BASE, { ax: 342, ay: 840, bx: 342, by: 900, t: T }, { ax: 458, ay: 840, bx: 458, by: 900, t: T }], plates: [{ id: 'A', x0: 350, x1: 450, y: FLOOR }] };
const door = (invert = false) => ({ id: 'D', ax: 600, ay: FLOOR - 92, bx: 600, by: FLOOR + 8, t: T, plate: 'A', invert });
/** A tank (x 360..440 over the pit) whose floor is the pin P. */
const tank = (kind: number, n: number): Partial<LevelDef> => ({
  walls: [...pit.walls, { ax: 360, ay: 520, bx: 360, by: 600, t: T }, { ax: 440, ay: 520, bx: 440, by: 600, t: T }],
  pins: [{ id: 'P', ax: 340, ay: 608, bx: 460, by: 608, t: 7 }],
  fills: [{ kind: kind as 1, x0: 360, x1: 440, y1: 600, count: n }],
});
const doorOpen = (w: World): boolean => w.doors[0]!.open >= w.doors[0]!.len;
const doorShut = (w: World): boolean => w.doors[0]!.open === 0;

describe('pressure plates', { timeout: 120_000 }, () => {
  it('Nib holds a door open; it shuts once he steps off', () => {
    const w = new World(tombRoom({ plates: [{ id: 'A', x0: 50, x1: 110, y: FLOOR }], doors: [door()] }));
    expect(doorOpen(w)).toBe(true);
    w.command({ kind: 'goto', x: 300 });
    expect(stepsUntil(w, 'doorShut', 600)).toBeGreaterThan(0);
  });

  it('25 water in a pit holds it down; 10 water does not', () => {
    for (const [n, down] of [[25, true], [10, false]] as const) {
      const w = new World(tombRoom({ ...tank(WATER, n), plates: pit.plates, doors: [door()] }));
      w.pull('P');
      run(w, 600);
      expect(w.plates[0]!.down, `${n} water`).toBe(down);
      expect(doorOpen(w), `${n} water`).toBe(down);
    }
  });

  it('holds through a pour (no flicker), and a leaking pit lets its door shut by itself', () => {
    const w = new World(tombRoom({ ...tank(WATER, 60), plates: pit.plates, doors: [door()] }));
    w.pull('P');
    let ups = 0;
    for (let s = 0; s < 600; s++) {
      w.step();
      if (w.events.some((e) => e.type === 'plateUp')) ups++;
    }
    expect(ups).toBe(0);
    const leak = new World(tombRoom({ ...tank(WATER, 80), plates: pit.plates, doors: [door()], drains: [{ x0: 394, x1: 406, y0: 884, y1: 905 }] }));
    leak.pull('P');
    const down = stepsUntil(leak, 'plateDown', 600);
    const shut = stepsUntil(leak, 'doorShut', 1200);
    console.log(`leaking pit (80 water, 12-px grate): plate down ${(down / STEPS_PER_SECOND).toFixed(2)} s after the pull, door shut again ${(shut / STEPS_PER_SECOND).toFixed(2)} s after that`);
    expect(down).toBeGreaterThan(0);
    expect(shut).toBeGreaterThan(0);
  });

  it('a boulder, a raft aground and a slab each weigh a plate down', () => {
    const b = new World(tombRoom({ walls: pit.walls, plates: pit.plates, doors: [door()], boulders: [{ x: 400, y: 700 }] }));
    run(b, 300);
    expect(doorOpen(b)).toBe(true);
    const r = new World(tombRoom({ rafts: [{ x: 400, y: FLOOR - 14 }], plates: [{ id: 'A', x0: 350, x1: 450, y: FLOOR, need: 20 }], doors: [door()] }));
    run(r, 300);
    expect(doorOpen(r)).toBe(true);
    // A ledge over the plate, cracked by Nib stepping off it, falls on it as a slab.
    const s = new World(tombRoom({ ledges: [{ x0: 341, x1: 459, y: 700 }], plates: [{ id: 'A', x0: 350, x1: 450, y: FLOOR }], doors: [door()], nib: { x: 400, y: 676 } }));
    s.command({ kind: 'goto', x: 200 });
    run(s, 900);
    expect(s.ledges[0]!.state).toBe('down');
    expect(s.plates[0]!.weight).toBeGreaterThanOrEqual(40);
    expect(doorOpen(s)).toBe(true);
  });

  it('lava cooled to stone on a plate holds it for good', () => {
    const w = new World(tombRoom({ ...tank(LAVA, 40), plates: pit.plates, doors: [door()] }));
    w.pull('P');
    run(w, 400);
    for (let k = 0; k < 3; k++) w.grains.add(WATER, 380 + k * 20, 760);
    run(w, 1800);
    expect(count(w, LAVA)).toBe(0);
    expect(count(w, STONE)).toBeGreaterThan(25);
    expect(w.plates[0]!.down).toBe(true);
  });

  it('collecting the coins off a plate shuts its door', () => {
    const w = new World(tombRoom({ plates: [{ id: 'A', x0: 350, x1: 450, y: FLOOR }], doors: [door()], fills: [{ kind: COIN, x0: 350, x1: 450, y1: FLOOR, count: 30 }] }));
    expect(doorOpen(w)).toBe(true);
    w.command({ kind: 'goto', x: 470 });
    run(w, 900);
    expect(w.coinsCollected).toBe(30);
    expect(doorShut(w)).toBe(true);
  });
});

describe('stone doors', { timeout: 120_000 }, () => {
  it('an inverse door shuts while its plate is down', () => {
    const w = new World(tombRoom({ plates: [{ id: 'A', x0: 50, x1: 110, y: FLOOR }], doors: [door(true)] }));
    expect(doorShut(w)).toBe(true);
    w.command({ kind: 'goto', x: 300 });
    expect(stepsWhile(w, () => doorOpen(w), 300)).toBeGreaterThan(0);
  });

  it('a closing door waits for Nib and for a boulder, and pushes grains aside', () => {
    const level = tombRoom({ plates: [{ id: 'A', x0: 50, x1: 110, y: FLOOR }], doors: [door()], fills: [{ kind: WATER, x0: 560, x1: 640, y1: FLOOR, count: 20 }] });
    const w = new World(level);
    expect(doorOpen(w)).toBe(true);
    // Nib in the doorway, off the plate.
    w.nib.x = 600;
    run(w, 900);
    expect(doorShut(w)).toBe(false);
    expect(w.doors[0]!.waiting).toBe(true);
    w.command({ kind: 'goto', x: 700 });
    expect(stepsUntil(w, 'doorShut', 600)).toBeGreaterThan(0);
    expect(count(w, WATER, (x, y) => Math.abs(x - 600) < T + 4 && y > FLOOR - 92)).toBe(0);
    const b = new World(tombRoom({ plates: [{ id: 'A', x0: 50, x1: 110, y: FLOOR }], doors: [door()], boulders: [{ x: 600, y: FLOOR - 26 }] }));
    b.command({ kind: 'goto', x: 300 });
    run(b, 900);
    expect(doorShut(b)).toBe(false);
  });

  it('a pin in its path holds it shut', () => {
    const w = new World(tombRoom({ plates: [{ id: 'A', x0: 50, x1: 110, y: FLOOR }], doors: [door(true)], pins: [{ id: 'P', ax: 560, ay: 780, bx: 640, by: 780, t: 7 }] }));
    w.command({ kind: 'goto', x: 300 });
    expect(stepsUntil(w, 'doorBlocked', 300)).toBeGreaterThan(0);
    run(w, 300);
    expect(w.doors[0]!.open).toBeLessThan(w.doors[0]!.len);
    w.pull('P');
    expect(stepsWhile(w, () => doorOpen(w), 300)).toBeGreaterThan(0);
  });

  it('a shut door holds back water and gas', () => {
    const level = tombRoom({
      walls: [...BASE, { ax: 600, ay: 300, bx: 600, by: FLOOR - 92, t: T }],
      plates: [{ id: 'A', x0: 700, x1: 750, y: FLOOR }],
      doors: [{ id: 'D', ax: 600, ay: FLOOR - 92, bx: 600, by: FLOOR + 8, t: T, plate: 'A' }, { id: 'E', ax: 400, ay: 300, bx: 400, by: 400, t: T, plate: 'A' }],
      fills: [{ kind: WATER, x0: 440, x1: 592, y1: FLOOR, count: 120 }, { kind: GAS, x0: 200, x1: 392, y1: 308, count: 40 }],
    });
    const w = new World(level);
    run(w, 600);
    expect(count(w, WATER, (x) => x > 608)).toBe(0);
    expect(count(w, GAS, (x) => x > 408)).toBe(0);
  });
});

/** A leaking plate holds the vault door open for a moment: pull W and stay, and the door shuts with Nib outside. */
const vault = (extraPin: boolean): LevelDef =>
  tombRoom({
    ...tank(WATER, 60),
    pins: [{ id: 'P', ax: 340, ay: 608, bx: 460, by: 608, t: 7 }, ...(extraPin ? [{ id: 'X', ax: 100, ay: 500, bx: 160, by: 500, t: 7 }] : [])],
    walls: [...tank(WATER, 1).walls!, { ax: 600, ay: 300, bx: 600, by: FLOOR - 92, t: T }],
    plates: pit.plates,
    doors: [door()],
    drains: [{ x0: 394, x1: 406, y0: 884, y1: 905 }],
    seals: [{ door: 'D', side: 'right' }],
  });

describe("the 'sealed' loss", { timeout: 120_000 }, () => {
  it("a wrong order ends 'sealed', not 'stuck' or 'playing'", () => {
    const w = new World(vault(false));
    w.pull('P');
    run(w, 1800);
    expect(w.status).toEqual({ state: 'lost', cause: 'sealed' });
  });

  it("never 'sealed' while a pin is still in", () => {
    const w = new World(vault(true));
    w.pull('P');
    run(w, 1800);
    expect(w.status.state).toBe('playing');
  });
});

describe('tomb gas', { timeout: 120_000 }, () => {
  const v = vent(500);
  const dome = (extra: Partial<LevelDef> = {}): LevelDef => tombRoom({ walls: [...BASE, ...v.walls], pins: [v.pin], drains: [v.drain], fills: [{ kind: GAS, x0: 250, x1: 550, y1: 508, count: 100 }], ...extra });

  it('rises and pools under a ceiling, counts as settled, and leaves by a roof vent', () => {
    const w = new World(dome());
    expect(stepsWhile(w, () => w.settled, 300)).toBeGreaterThan(0);
    expect(count(w, GAS, (_, y) => y > 500 && y < 560)).toBe(100);
    w.pull('V');
    expect(stepsWhile(w, () => count(w, GAS) <= 2, 1200)).toBeGreaterThan(0);
  });

  it('bubbles up through a pool, while the water falls through it', () => {
    const w = new World(tombRoom({
      walls: [...BASE, { ax: 300, ay: 450, bx: 300, by: 900, t: T }, { ax: 400, ay: 450, bx: 400, by: 900, t: T }],
      pins: [{ id: 'P', ax: 290, ay: 800, bx: 410, by: 800, t: 7 }],
      fills: [{ kind: WATER, x0: 300, x1: 400, y1: 792, count: 100 }, { kind: GAS, x0: 300, x1: 400, y1: 808, count: 30 }],
    }));
    w.pull('P');
    run(w, 240);
    expect(count(w, GAS, (_, y) => y < 700)).toBe(30);
    expect(count(w, WATER, (_, y) => y > 740)).toBeGreaterThan(90);
  });

  it('escapes from under a coin heap within 2 s', () => {
    const w = new World(tombRoom({
      pins: [{ id: 'P', ax: 280, ay: 800, bx: 520, by: 800, t: 7 }],
      walls: [...BASE, { ax: 300, ay: 700, bx: 300, by: 900, t: T }, { ax: 500, ay: 700, bx: 500, by: 900, t: T }],
      fills: [{ kind: COIN, x0: 300, x1: 500, y1: 792, count: 80 }, { kind: GAS, x0: 300, x1: 500, y1: 808, count: 40 }],
    }));
    w.pull('P');
    run(w, 2 * STEPS_PER_SECOND);
    expect(count(w, GAS, (_, y) => y > 700)).toBe(0);
  });

  it('gasses Nib, but one stray grain does not', () => {
    for (const [n, lost] of [[1, false], [3, true]] as const) {
      const w = new World(tombRoom({}));
      for (let k = 0; k < n; k++) w.grains.add(GAS, w.nib.x + 10 + k * 4, w.nib.y - 10);
      run(w, 10);
      expect(w.status.state === 'lost' && w.status.cause === 'gassed', `${n} grains`).toBe(lost);
    }
  });

  it('a closed dome is a diving bell: water rising past its lip does not spill it', () => {
    const w = new World(tombRoom({
      walls: [...BASE, { ax: 200, ay: 700, bx: 200, by: 900, t: T }, { ax: 600, ay: 700, bx: 600, by: 900, t: T }, { ax: 320, ay: 760, bx: 480, by: 760, t: T }, { ax: 320, ay: 760, bx: 320, by: 840, t: T }, { ax: 480, ay: 760, bx: 480, by: 840, t: T }, { ax: 210, ay: 500, bx: 210, by: 640, t: T }, { ax: 590, ay: 500, bx: 590, by: 640, t: T }],
      pins: [{ id: 'W', ax: 200, ay: 648, bx: 600, by: 648, t: 7 }],
      fills: [{ kind: GAS, x0: 320, x1: 480, y1: 768, count: 60 }, { kind: WATER, x0: 210, x1: 590, y1: 640, count: 350 }],
    }));
    w.pull('W');
    run(w, 900);
    expect(count(w, GAS, (x, y) => !(x > 320 && x < 480 && y > 760 && y < 840))).toBeLessThanOrEqual(3);
  });
});

describe('fire bowls and blasts', { timeout: 120_000 }, () => {
  it('the sampler: a bowl lights the gas that reaches it, the blast breaks the cracked bar and takes the frog, and the order wins', () => {
    const w = new World(TOMB_SAMPLER);
    w.pull('G');
    expect(stepsUntil(w, 'ignite', 600)).toBeGreaterThan(0);
    run(w, 240);
    expect(w.broken[9]).toBe(true);
    expect(w.blots[0]!.gone).toBe('blasted');
    expect(play(TOMB_SAMPLER, TOMB_SAMPLER.solution).status.state).toBe('won');
  });

  it('a doused bowl lights nothing', () => {
    const w = new World({ ...TOMB_SAMPLER, braziers: [{ x: 934, y: 502 }] });
    w.grains.add(WATER, 934, 474);
    run(w, 120);
    expect(w.bowls[0]!.lit).toBe(false);
    w.pull('G');
    run(w, 600);
    expect(count(w, GAS)).toBeGreaterThan(55);
    expect(w.broken[9]).toBe(false);
  });

  it('a lava pour into gas lights it', () => {
    const w = new World(tombRoom({
      walls: [...BASE, { ax: 300, ay: 450, bx: 300, by: 900, t: T }, { ax: 400, ay: 450, bx: 400, by: 900, t: T }],
      pins: [{ id: 'P', ax: 290, ay: 800, bx: 410, by: 800, t: 7 }],
      fills: [{ kind: LAVA, x0: 300, x1: 400, y1: 792, count: 20 }, { kind: GAS, x0: 300, x1: 400, y1: 808, count: 30 }],
    }));
    w.pull('P');
    expect(stepsUntil(w, 'ignite', 300)).toBeGreaterThan(0);
    run(w, 60);
    expect(count(w, GAS)).toBe(0);
  });

  it('the connected pocket burns; a pocket behind a wall does not, nor a cracked bar out of reach', () => {
    const w = new World(tombRoom({
      walls: [...BASE, { ax: 400, ay: 300, bx: 400, by: 380, t: T }, { ax: 520, ay: 300, bx: 520, by: 600, t: T }],
      bars: [5],
      cracked: [5],
      fills: [{ kind: GAS, x0: 60, x1: 392, y1: 308, count: 60 }, { kind: GAS, x0: 408, x1: 512, y1: 308, count: 20 }],
    }));
    run(w, 60);
    w.grains.burn[0] = 1;
    run(w, 120);
    expect(count(w, GAS, (x) => x < 400)).toBe(0);
    expect(count(w, GAS, (x) => x > 400)).toBe(20);
    expect(w.broken[5]).toBe(false);
  });

  it('cracks an up ledge, beats every guard animal (the salamander too), blasts Nib, and leaves gold, rubies, rafts and the boss be', () => {
    const animals = ['boar', 'salamander', 'armadillo', 'frog'] as const;
    const w = new World(tombRoom({
      walls: [...BASE, { ax: 40, ay: 600, bx: 760, by: 600, t: T }],
      ledges: [{ x0: 100, x1: 160, y: 380 }],
      blots: [...animals.map((animal, i) => ({ x: 220 + i * 120, y: 576, animal })), { x: 700, y: 552, boss: true, animal: 'toad' as const }],
      nib: { x: 80, y: 576 },
      rubies: [{ x: 560, y: 580 }],
      rafts: [{ x: 640, y: 578 }],
      fills: [{ kind: COIN, x0: 500, x1: 540, y1: 592, count: 6 }],
    }));
    run(w, 30);
    // A sheet of gas just over their heads, then a spark.
    for (let x = 60; x < 750; x += 10) w.grains.add(GAS, x, 520);
    w.grains.add(GAS, 130, 400);
    w.grains.burn[w.grains.count - 1] = 1;
    for (let s = 0; s < 3; s++) {
      for (let i = 0; i < w.grains.count; i++) if (w.grains.kind[i] === GAS) w.grains.burn[i] = Math.max(1, w.grains.burn[i]!);
      w.step();
    }
    run(w, 30);
    expect(w.status).toEqual({ state: 'lost', cause: 'blasted' });
    animals.forEach((a, i) => expect(w.blots[i]!.gone, a).toBe('blasted'));
    expect(w.blots[4]!.gone).toBeNull();
    expect(w.ledges[0]!.state).not.toBe('up');
    expect(count(w, COIN)).toBe(6);
    expect(w.rubies[0]!.lost || w.rubies[0]!.taken).toBe(false);
    expect(w.boulders[0]!.gone).toBe(false);
  });

  it('a save mid-blast and mid-door plays out the same as playing straight through', () => {
    const w = new World(TOMB_SAMPLER);
    w.pull('B');
    run(w, 100);
    w.pull('G');
    stepsUntil(w, 'ignite', 600);
    const saved = w.save();
    run(w, 400);
    const a = { status: w.status, steps: w.steps, door: w.doors[0]!.open, broken: w.broken.slice(), nib: w.nib.x };
    w.load(saved);
    run(w, 400);
    expect({ status: w.status, steps: w.steps, door: w.doors[0]!.open, broken: w.broken.slice(), nib: w.nib.x }).toEqual(a);
  });
});

describe('the rain frog', { timeout: 120_000 }, () => {
  it('puffs up in gas, rises, and is held under a pin; an unpuffed frog walks through thin gas', () => {
    const w = new World(tombRoom({
      walls: [...BASE, { ax: 300, ay: 300, bx: 300, by: 892, t: T }, { ax: 420, ay: 300, bx: 420, by: 892, t: T }],
      pins: [{ id: 'P', ax: 290, ay: 500, bx: 430, by: 500, t: 7 }],
      fills: [{ kind: GAS, x0: 300, x1: 420, y1: 508, count: 220 }],
      blots: [{ x: 360, y: 700, animal: 'frog' }, { x: 600, y: FLOOR - 22, animal: 'frog' }],
    }));
    expect(stepsUntil(w, 'frogPuff', 30)).toBeGreaterThan(0);
    run(w, 300);
    const f = w.blots[0]!;
    expect(f.puffed).toBe(true);
    expect(f.y).toBeLessThan(540);
    expect(f.y).toBeGreaterThan(500);
    // Thin gas round the floor frog: it walks on.
    for (let k = 0; k < 4; k++) w.grains.add(GAS, w.blots[1]!.x + 20, w.blots[1]!.y - 10 + k * 5);
    w.step();
    expect(w.blots[1]!.puffed).toBe(false);
  });

  it('drops when the gas is vented, and washes in the pool below', () => {
    const v = vent(650, 250, 550, 50);
    const w = new World(tombRoom({
      walls: [...BASE, ...v.walls],
      pins: [v.pin],
      drains: [v.drain],
      fills: [{ kind: GAS, x0: 250, x1: 550, y1: 658, count: 120 }, { kind: WATER, x0: 250, x1: 550, y1: FLOOR, count: 150 }],
      blots: [{ x: 300, y: 680, animal: 'frog' }],
    }));
    run(w, 120);
    expect(w.blots[0]!.puffed).toBe(true);
    w.pull('V');
    expect(stepsUntil(w, 'frogDrop', 1200)).toBeGreaterThan(0);
    expect(stepsUntil(w, 'washed', 600)).toBeGreaterThan(0);
  });

  it('weighs a plate down, and inks Nib when it lands on him', () => {
    const p = new World(tombRoom({ blots: [{ x: 400, y: 700, animal: 'frog' }], plates: [{ id: 'A', x0: 300, x1: 500, y: FLOOR }], doors: [door()] }));
    run(p, 150);
    expect(p.plates[0]!.down).toBe(true);
    const n = new World(tombRoom({ blots: [{ x: 80, y: 600, animal: 'frog' }] }));
    run(n, 240);
    expect(n.status).toEqual({ state: 'lost', cause: 'inked', by: 'frog' });
  });
});
