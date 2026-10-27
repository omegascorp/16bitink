import type { LevelDef } from '../logic/level';
import { COIN, WATER } from '../logic/particles';
import { CH1, PIN_T, T } from './common';

/**
 * Level 3: the chest is on a ledge far too high to climb. Let the rain tank
 * in and Nib floats up to it, but only once the boulder has plugged the drain;
 * otherwise the water and the gold in it run away.
 * Winning order: S, W.
 */
export const CISTERN: LevelDef = {
  id: 'cistern',
  chapter: CH1,
  name: 'The Rain Cistern',
  goal: 'Take the chest and pick up 50 coins',
  tip: 'Nib floats! Fill the cistern and swim up to the ledge.',
  rooms: [
    [[40, 400], [270, 400], [270, 560], [450, 560], [450, 780], [680, 780], [680, 908], [450, 908], [450, 1100], [396, 1100], [396, 1130], [324, 1130], [324, 1100], [270, 1100], [270, 774], [40, 590]],
  ],
  walls: [
    { ax: 40, ay: 400, bx: 270, by: 400, t: T }, // tank ceiling
    { ax: 40, ay: 400, bx: 40, by: 600, t: T }, // tank's back wall
    { ax: 40, ay: 590, bx: 270, by: 774, t: T }, // tank floor, sloping steeply to its outlet
    { ax: 270, ay: 400, bx: 270, by: 690, t: T }, // between the tank and the cistern, over the outlet
    { ax: 270, ay: 774, bx: 270, by: 1100, t: T }, // cistern's left wall
    { ax: 270, ay: 560, bx: 450, by: 560, t: T }, // cistern ceiling
    { ax: 450, ay: 560, bx: 450, by: 780, t: T }, // cistern's right wall, over the ledge
    { ax: 450, ay: 908, bx: 450, by: 1100, t: T }, // cistern's right wall, under the ledge
    { ax: 270, ay: 1100, bx: 324, by: 1100, t: T }, // cistern floor
    { ax: 396, ay: 1100, bx: 450, by: 1100, t: T },
    { ax: 324, ay: 1100, bx: 324, by: 1130, t: T }, // a boulder-sized dip with the drain in it
    { ax: 396, ay: 1100, bx: 396, by: 1130, t: T },
    { ax: 324, ay: 1130, bx: 344, by: 1130, t: T },
    { ax: 376, ay: 1130, bx: 396, by: 1130, t: T },
    { ax: 450, ay: 780, bx: 680, by: 780, t: T }, // ledge ceiling
    { ax: 680, ay: 780, bx: 680, by: 908, t: T }, // ledge's end wall
    { ax: 450, ay: 908, bx: 680, by: 908, t: T }, // the ledge
  ],
  bars: [3],
  pins: [
    { id: 'W', ax: 270, ay: 772, bx: 270, by: 698, t: PIN_T },
    { id: 'S', ax: 470, ay: 650, bx: 262, by: 650, t: PIN_T },
  ],
  fills: [
    { kind: COIN, x0: 110, x1: 262, y1: 636, count: 70 },
    { kind: WATER, x0: 48, x1: 262, y1: 580, count: 380 },
  ],
  boulders: [{ x: 360, y: 616 }],
  // Anything that gets down into the dip is gone, unless the boulder fills it.
  drains: [{ x0: 332, x1: 388, y0: 1106, y1: 1170 }],
  nib: { x: 302, y: 1068 },
  blots: [],
  chest: { x: 626, y: 878 },
  coinsNeeded: 50,
  solution: ['S', 'W'],
  torches: [{ x: 560, y: 830 }, { x: 150, y: 470 }],
  view: { x: 0, y: 190, w: 720, h: 960 },
};
