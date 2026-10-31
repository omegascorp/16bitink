import type { LevelDef } from '../src/logic/level';
import { World, type WorldEvent } from '../src/logic/world';

/**
 * A small made-up tomb room for the chapter 3 mechanics tests: a box
 * 40..760 by 300..900 with whatever walls, pins, plates, doors and fills a
 * test adds. Nib stands at the left (x 80), the chest out of reach.
 */
export const T = 8;
export const BOX = [
  { ax: 40, ay: 300, bx: 760, by: 300, t: T },
  { ax: 40, ay: 300, bx: 40, by: 900, t: T },
  { ax: 760, ay: 300, bx: 760, by: 900, t: T },
  { ax: 40, ay: 900, bx: 760, by: 900, t: T },
];
/** The floor's top surface. */
export const FLOOR = 892;

export const tombRoom = (extra: Partial<LevelDef>): LevelDef => ({
  id: 'tomb-test',
  chapter: 'test',
  name: 'test',
  goal: '',
  ruin: 'tomb',
  rooms: [[[40, 300], [760, 300], [760, 900], [40, 900]]],
  walls: BOX,
  bars: [],
  pins: [],
  fills: [],
  nib: { x: 80, y: FLOOR - 24 },
  blots: [],
  chest: { x: 740, y: 330 },
  coinsNeeded: 0,
  solution: [],
  torches: [],
  view: { x: 0, y: 260, w: 800, h: 680 },
  ...extra,
});

export const run = (w: World, steps: number): void => {
  for (let s = 0; s < steps && !w.finished; s++) w.step();
};

/** Runs until an event of the type fires (or the steps run out); returns the steps it took, or -1. */
export const stepsUntil = (w: World, type: WorldEvent['type'], steps: number): number => {
  for (let s = 1; s <= steps && !w.finished; s++) {
    w.step();
    if (w.events.some((ev) => ev.type === type)) return s;
  }
  return -1;
};

/** Runs until `test` holds (or the steps run out); returns the steps it took, or -1. */
export const stepsWhile = (w: World, done: () => boolean, steps: number): number => {
  for (let s = 1; s <= steps && !w.finished; s++) {
    w.step();
    if (done()) return s;
  }
  return -1;
};

export const count = (w: World, kind: number, test: (x: number, y: number) => boolean = () => true): number => {
  const g = w.grains;
  let n = 0;
  for (let i = 0; i < g.count; i++) if (g.kind[i] === kind && test(g.x[i]!, g.y[i]!)) n++;
  return n;
};

/**
 * A 40-px roof vent at x 380..420 through the ceiling at `y`: the ceiling
 * in two halves, a chimney up to a drain box, and the vent pin V across the gap.
 */
export const vent = (y: number, x0 = 250, x1 = 550, lip = 50) => ({
  walls: [
    { ax: x0, ay: y, bx: 380, by: y, t: T },
    { ax: 420, ay: y, bx: x1, by: y, t: T },
    { ax: 380, ay: y, bx: 380, by: y - 90, t: T },
    { ax: 420, ay: y, bx: 420, by: y - 90, t: T },
    { ax: x0, ay: y, bx: x0, by: y + lip, t: T },
    { ax: x1, ay: y, bx: x1, by: y + lip, t: T },
  ],
  drain: { x0: 380, x1: 420, y0: y - 90, y1: y - 40 },
  pin: { id: 'V', ax: 368, ay: y, bx: 432, by: y, t: 7 },
});
