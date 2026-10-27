import type { LevelDef } from '../logic/level';
import { COIN, WATER } from '../logic/particles';
import { CH1, PIN_T, T } from './common';

/**
 * Level 10, the boss: the Great Boar guards the idol hall, waiting by the
 * altar under Nib's ledge. It shrugs off a splash and dries as it goes, and
 * the floor drains, so only all the water at once washes it away: let both
 * tanks down into the cistern over it, then open the cistern. Open early,
 * the cistern lets the tanks pour straight through its far end into the
 * drain, missing the boar. Winning orders: A and B, then R (the gold's pin C any time).
 */
export const IDOL_HALL: LevelDef = {
  id: 'idol-hall',
  chapter: CH1,
  name: 'The Idol Hall',
  goal: 'Beat the Great Boar and take the idol',
  tip: 'A splash won’t do. Bring all the water down on the Great Boar at once.',
  rooms: [[[40, 330], [680, 330], [680, 1130], [564, 1130], [564, 1100], [540, 1100], [540, 1130], [400, 1130], [400, 1100], [40, 1100]]],
  walls: [
    { ax: 40, ay: 330, bx: 680, by: 330, t: T }, // ceiling
    { ax: 40, ay: 330, bx: 40, by: 1100, t: T }, // left wall
    { ax: 680, ay: 330, bx: 680, by: 1130, t: T }, // right wall
    { ax: 40, ay: 1100, bx: 400, by: 1100, t: T }, // the hall floor
    { ax: 400, ay: 1100, bx: 400, by: 1130, t: T }, // a wide drain under the cistern's far end
    { ax: 400, ay: 1130, bx: 540, by: 1130, t: T },
    { ax: 540, ay: 1100, bx: 540, by: 1130, t: T },
    { ax: 540, ay: 1100, bx: 564, by: 1100, t: T },
    { ax: 556, ay: 1100, bx: 556, by: 1070, t: T }, // a curb, and a sunken corner that keeps the gold by the chest
    { ax: 564, ay: 1100, bx: 564, by: 1130, t: T },
    { ax: 564, ay: 1130, bx: 680, by: 1130, t: T },
    { ax: 40, ay: 800, bx: 140, by: 800, t: T }, // Nib's ledge
    { ax: 150, ay: 1100, bx: 150, by: 1030, t: T }, // the altar
    { ax: 150, ay: 1030, bx: 215, by: 1030, t: T },
    { ax: 215, ay: 1030, bx: 215, by: 1100, t: T },
    { ax: 380, ay: 330, bx: 380, by: 462, t: T }, // the upper tank
    { ax: 600, ay: 330, bx: 600, by: 462, t: T },
    { ax: 380, ay: 478, bx: 380, by: 632, t: T }, // the lower tank
    { ax: 600, ay: 478, bx: 600, by: 780, t: T }, // ... and the cistern's far side under it
    { ax: 216, ay: 660, bx: 216, by: 780, t: T }, // the cistern's near side, over the boar
    { ax: 608, ay: 740, bx: 608, by: 892, t: T }, // the idol's gold, low by the right wall
  ],
  bars: [8, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
  pins: [
    { id: 'B', ax: 616, ay: 470, bx: 372, by: 470, t: PIN_T },
    { id: 'A', ax: 364, ay: 640, bx: 608, by: 640, t: PIN_T },
    { id: 'R', ax: 590, ay: 788, bx: 216, by: 788, t: PIN_T },
    { id: 'C', ax: 594, ay: 900, bx: 676, by: 900, t: PIN_T },
  ],
  fills: [
    { kind: WATER, x0: 388, x1: 592, y1: 462, count: 262 },
    { kind: WATER, x0: 388, x1: 592, y1: 632, count: 70 },
    { kind: COIN, x0: 616, x1: 672, y1: 892, count: 56 },
  ],
  drains: [{ x0: 408, x1: 532, y0: 1104, y1: 1170 }],
  nib: { x: 90, y: 768 },
  blots: [{ x: 420, y: 1052, boss: true }],
  chest: { x: 640, y: 1100 },
  coinsNeeded: 40,
  vines: [{ x: 180, top: 792, bottom: 1022 }],
  solution: ['B', 'A', 'R', 'C'],
  stops: [{ x: 180, y: 1020 }, { x: 640 }],
  torches: [{ x: 90, y: 700 }, { x: 520, y: 960 }, { x: 300, y: 900 }],
  view: { x: 0, y: 190, w: 720, h: 960 },
};
