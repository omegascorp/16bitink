import { describe, expect, it } from 'vitest';
import type { LevelDef } from '../src/logic/level';
import { GAS, LAVA, STEPS_PER_SECOND } from '../src/logic/particles';
import { World } from '../src/logic/world';
import { count, FLOOR, run, stepsUntil, T, tombRoom } from './tomb-room';

declare const process: { readonly env: Readonly<Record<string, string | undefined>> };
const sec = (n: number): string => (n / STEPS_PER_SECOND).toFixed(2);

/**
 * The Tomb Guardian (item 10 of docs/inkpin-ch3-engine.md): the old toad in
 * its coffin at x 400, its mouth 852. The coffin's sides stand at x 283 and
 * 517 up to y 600; its lid is a 200-px ledge (x 300..500) whose underside
 * (702) is 150 px over the mouth. Nib waits outside on the left, in sight.
 * X is a harmless pin in the corner: its pull starts the beat.
 * With a fire bowl, the lid is shorter (x 330..500): a slab lands on any
 * shelf under it, so the bowl's shelf must stand clear of the lid's fall.
 */
const COFFIN = [
  { ax: 283, ay: 600, bx: 283, by: 892, t: T },
  { ax: 517, ay: 600, bx: 517, by: 892, t: T },
];
const LID = { x0: 300, x1: 500, y: 686 };
const coffin = (extra: Partial<LevelDef> = {}): LevelDef =>
  tombRoom({
    walls: [...tombRoom({}).walls, ...COFFIN, ...(extra.walls ?? [])],
    pins: [{ id: 'X', ax: 60, ay: 330, bx: 160, by: 330, t: 7 }, ...(extra.pins ?? [])],
    blots: [{ x: 400, y: FLOOR - 40, animal: 'toad', boss: true }],
    ledges: [LID],
    nib: { x: 140, y: FLOOR - 24 },
    breath: { every: 5, count: 24, max: 120 },
    ...Object.fromEntries(Object.entries(extra).filter(([k]) => k !== 'walls' && k !== 'pins')),
  });
/**
 * The bowl on a shelf inside the coffin on Nib's side (where the breath
 * pools), at the shelf's tip (a shelf reaching past the flame turns the gas
 * away from it), its flame 22 px under the lid and beside the lid's end,
 * where the breath spills up past it.
 */
const BOWL_SHELF = { ax: 291, ay: 766, bx: 312, by: 766, t: T };
const BOWL = { x: 310, y: 758 };
const SHORT_LID = { x0: 330, x1: 500, y: 686 };
const withBowl = { walls: [BOWL_SHELF], braziers: [BOWL], ledges: [SHORT_LID] };

/** The steps (from the first pull) at which the toad breathed, over `seconds`. */
const beats = (w: World, seconds: number): number[] => {
  const at: number[] = [];
  const start = w.steps;
  for (let s = 0; s < seconds * STEPS_PER_SECOND && !w.finished; s++) {
    w.step();
    if (w.events.some((e) => e.type === 'breath')) at.push(w.steps - start);
  }
  return at;
};

describe('the Tomb Guardian', () => {
  it('stays in its coffin and breathes nothing before the first pull', () => {
    const w = new World(coffin());
    run(w, 8 * STEPS_PER_SECOND);
    expect(count(w, GAS)).toBe(0);
    expect(Math.abs(w.blots[0]!.x - 400)).toBeLessThan(2);
  });

  it('breathes on the beat from the first pull, its throat swelling for the second before', () => {
    const w = new World(coffin());
    w.pull('X');
    let swollen = 0;
    const at: number[] = [];
    for (let s = 1; s <= 16 * STEPS_PER_SECOND; s++) {
      w.step();
      if (w.breathSwell > 0) swollen++;
      if (w.events.some((e) => e.type === 'breath')) at.push(s);
    }
    expect(at).toEqual([5, 10, 15].map((t) => t * STEPS_PER_SECOND));
    // ~1 s of swelling before each of the 3 breaths (and the start of the 4th).
    expect(swollen).toBeGreaterThan(3 * STEPS_PER_SECOND - 10);
    expect(swollen).toBeLessThan(4 * STEPS_PER_SECOND + 10);
    expect(count(w, GAS)).toBe(72);
    expect(Math.abs(w.blots[0]!.x - 400)).toBeLessThan(2);
  });

  it('holds its breath while Nib is out of sight (320 px sideways)', () => {
    const w = new World(coffin({ nib: { x: 730, y: FLOOR - 24 } }));
    w.pull('X');
    expect(beats(w, 12)).toEqual([]);
    expect(w.breathSwell).toBe(0);
    w.command({ kind: 'goto', x: 600 });
    expect(beats(w, 6).length).toBe(1);
  });

  it('keeps to its cap: breath that stays in play stops the next', () => {
    const w = new World(coffin({ breath: { every: 2, count: 24, max: 50 } }));
    w.pull('X');
    let most = 0;
    let breaths = 0;
    for (let s = 0; s < 12 * STEPS_PER_SECOND; s++) {
      w.step();
      if (w.events.some((e) => e.type === 'breath')) breaths++;
      most = Math.max(most, count(w, GAS));
    }
    expect(most).toBe(50);
    expect(breaths).toBe(3);
  });

  it('is unhurt by gas and blasts: a lit bowl burns its breath under the lid', () => {
    const w = new World(coffin(withBowl));
    w.pull('X');
    expect(stepsUntil(w, 'ignite', 8 * STEPS_PER_SECOND)).toBeGreaterThan(0);
    run(w, STEPS_PER_SECOND);
    expect(w.blots[0]!.gone === null || w.blots[0]!.gone === 'stomped').toBe(true);
    expect(w.blots[0]!.gone).not.toBe('blasted');
  });

  it('a lit bowl near the pooled breath cracks the lid, and the lid beats the boss', () => {
    const w = new World(coffin(withBowl));
    w.pull('X');
    const cracked = stepsUntil(w, 'crack', 8 * STEPS_PER_SECOND);
    expect(cracked).toBeGreaterThan(0);
    const beaten = stepsUntil(w, 'stomped', 2 * STEPS_PER_SECOND);
    expect(beaten).toBeGreaterThan(0);
    expect(w.blots[0]!.gone).toBe('stomped');
    expect(w.status.state).toBe('playing');
    if (process.env.MEASURE) console.log(`MEASURE lid: cracked ${sec(cracked)} s after the first pull; fell onto the toad ${sec(beaten)} s after the blast`);
  });

  it('lava at its mouth lights the breath there, and the lid stays up', () => {
    // A lava cup right in front of its mouth, on Nib's side.
    const cup = [
      { ax: 300, ay: 872, bx: 352, by: 872, t: T },
      { ax: 352, ay: 846, bx: 352, by: 872, t: T },
    ];
    const w = new World(coffin({ walls: cup, fills: [{ kind: LAVA, x0: 292, x1: 344, y1: 864, count: 12 }] }));
    w.pull('X');
    expect(stepsUntil(w, 'ignite', 6 * STEPS_PER_SECOND)).toBeGreaterThan(0);
    run(w, 12 * STEPS_PER_SECOND);
    expect(w.ledges[0]!.state).toBe('up');
    expect(w.blots[0]!.gone).toBeNull();
    expect(w.status.state).toBe('playing');
  });

  it('winds back through a save mid-breath to the same breath', () => {
    const straight = new World(coffin());
    straight.pull('X');
    run(straight, 5 * STEPS_PER_SECOND + 12);
    const saved = straight.save();
    run(straight, 3 * STEPS_PER_SECOND);
    const again = new World(coffin());
    again.load(saved);
    run(again, 3 * STEPS_PER_SECOND);
    expect(count(again, GAS)).toBe(count(straight, GAS));
    expect(again.grains.y.slice(0, again.grains.count)).toEqual(straight.grains.y.slice(0, straight.grains.count));
  });

  it.skipIf(!process.env.MEASURE)('measures: where one breath pools under the lid, and how long it takes', () => {
    const w = new World(coffin());
    w.pull('X');
    run(w, 5 * STEPS_PER_SECOND);
    const g = w.grains;
    let pooled = -1;
    for (let s = 1; s <= 4.5 * STEPS_PER_SECOND; s++) {
      w.step();
      let under = 0;
      for (let i = 0; i < g.count; i++) if (g.kind[i] === GAS && g.y[i]! < 702 + 30) under++;
      if (pooled < 0 && under === 24) pooled = s;
    }
    let lo = 9999;
    let hi = 0;
    let deep = 0;
    for (let i = 0; i < g.count; i++) {
      if (g.kind[i] !== GAS) continue;
      lo = Math.min(lo, g.x[i]!);
      hi = Math.max(hi, g.x[i]!);
      deep = Math.max(deep, g.y[i]! - 702);
    }
    console.log(`MEASURE breath: 24 grains all within 30 px under the lid ${sec(pooled)} s after the breath; pool x ${lo.toFixed(0)}..${hi.toFixed(0)}, deepest centre ${deep.toFixed(0)} px under the lid`);
  });
}, 120_000);
