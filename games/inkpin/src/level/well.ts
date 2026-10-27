import type { LevelDef } from '../logic/level';
import { COIN, WATER } from '../logic/particles';
import { CH1, PIN_T, T } from './common';

/**
 * Level 7, two screens tall: a well of floors joined by vines, down to the
 * boar's hall and the chest. The water runs down the same way, floor by
 * floor; let it go before Nib climbs down, or the boar is waiting.
 * Winning orders: W before G (the gold's pin C any time).
 */
export const WELL: LevelDef = {
  id: 'well',
  chapter: CH1,
  name: 'The Well of Vines',
  goal: 'Climb down to the chest and pick up 120 coins',
  rooms: [[[40, 400], [680, 400], [680, 1950], [40, 1950]]],
  walls: [
    { ax: 40, ay: 400, bx: 680, by: 400, t: T }, // ceiling
    { ax: 40, ay: 400, bx: 40, by: 1950, t: T }, // left wall
    { ax: 680, ay: 400, bx: 680, by: 1950, t: T }, // right wall
    { ax: 40, ay: 1950, bx: 680, by: 1950, t: T }, // the boar's hall floor
    { ax: 40, ay: 694, bx: 556, by: 706, t: T }, // floor 1, sloping to its gap
    { ax: 680, ay: 1094, bx: 164, by: 1106, t: T }, // floor 2
    { ax: 40, ay: 1494, bx: 556, by: 1506, t: T }, // floor 3
    { ax: 440, ay: 400, bx: 440, by: 592, t: T }, // the tank's side
    { ax: 300, ay: 706, bx: 300, by: 842, t: T }, // the gold's box under floor 1
    { ax: 440, ay: 706, bx: 440, by: 842, t: T },
    { ax: 200, ay: 400, bx: 200, by: 512, t: T }, // over Nib's door
    { ax: 260, ay: 1330, bx: 400, by: 1330, t: T }, // a shelf of bonus gold over floor 3
  ],
  bars: [4, 5, 6, 7, 8, 9, 10, 11],
  pins: [
    { id: 'G', ax: 200, ay: 520, bx: 200, by: 688, t: PIN_T },
    { id: 'W', ax: 694, ay: 600, bx: 432, by: 600, t: PIN_T },
    { id: 'C', ax: 286, ay: 850, bx: 448, by: 850, t: PIN_T },
  ],
  fills: [
    { kind: WATER, x0: 448, x1: 672, y1: 592, count: 300 },
    { kind: COIN, x0: 308, x1: 432, y1: 842, count: 110 },
    { kind: COIN, x0: 110, x1: 250, y1: 1942, count: 40 },
    { kind: COIN, x0: 268, x1: 384, y1: 1322, count: 24 },
  ],
  nib: { x: 90, y: 663 },
  blots: [{ x: 360, y: 1920 }],
  chest: { x: 80, y: 1920 },
  coinsNeeded: 120,
  vines: [
    { x: 592, top: 698, bottom: 1088 },
    { x: 130, top: 1098, bottom: 1488 },
    { x: 434, top: 1322, bottom: 1495 },
    { x: 590, top: 1498, bottom: 1942 },
  ],
  solution: ['W', 'C', 'G'],
  stops: [
    { x: 592, y: 690 },
    { x: 592, y: 1090 },
    { x: 130, y: 1090 },
    { x: 130, y: 1490 },
    { x: 590, y: 1490 },
    { x: 590, y: 1945 },
    { x: 80 },
  ],
  torches: [{ x: 120, y: 520 }, { x: 560, y: 900 }, { x: 200, y: 1300 }, { x: 560, y: 1700 }, { x: 260, y: 1760 }],
  view: { x: 0, y: 190, w: 720, h: 1840 },
};
