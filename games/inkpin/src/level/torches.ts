import type { LevelDef } from '../logic/level';
import { COIN, WATER } from '../logic/particles';
import { CH1, PIN_T, T } from './common';

/**
 * Level 9, lights out: only Nib's lamp and the torches light the hall. A
 * drain in the floor keeps the boar on its side, until the boulder fills it;
 * the water (and the gold in it) needs that plug, and the boar needs the
 * water before Nib's door opens. Winning order: K, W, N.
 */
export const TORCHES: LevelDef = {
  id: 'torches',
  chapter: CH1,
  name: 'Torches Out',
  goal: 'Take the chest and pick up 50 coins',
  tip: 'Lights out! Only Nib’s lamp and a few torches light the hall.',
  dark: true,
  rooms: [[[40, 560], [680, 560], [680, 1100], [468, 1100], [468, 1130], [396, 1130], [396, 1100], [40, 1100]]],
  walls: [
    { ax: 40, ay: 560, bx: 680, by: 560, t: T }, // ceiling
    { ax: 40, ay: 560, bx: 40, by: 1100, t: T }, // left wall
    { ax: 680, ay: 560, bx: 680, by: 1100, t: T }, // right wall
    { ax: 40, ay: 1100, bx: 396, by: 1100, t: T }, // floor, left of the drain dip
    { ax: 468, ay: 1100, bx: 680, by: 1100, t: T }, // floor, right of it
    { ax: 396, ay: 1100, bx: 396, by: 1130, t: T }, // the dip
    { ax: 468, ay: 1100, bx: 468, by: 1130, t: T },
    { ax: 396, ay: 1130, bx: 424, by: 1130, t: T },
    { ax: 440, ay: 1130, bx: 468, by: 1130, t: T },
    { ax: 200, ay: 560, bx: 200, by: 872, t: T }, // over Nib's door
    { ax: 210, ay: 560, bx: 210, by: 760, t: T }, // the tank
    { ax: 370, ay: 560, bx: 370, by: 760, t: T },
    { ax: 396, ay: 560, bx: 396, by: 700, t: T }, // the boulder's alcove
    { ax: 468, ay: 560, bx: 468, by: 700, t: T },
    { ax: 560, ay: 820, bx: 680, by: 820, t: T }, // a shelf of bonus gold
  ],
  bars: [9, 10, 11, 12, 13, 14],
  pins: [
    { id: 'N', ax: 200, ay: 880, bx: 200, by: 1094, t: PIN_T },
    { id: 'W', ax: 384, ay: 768, bx: 218, by: 768, t: PIN_T },
    { id: 'K', ax: 488, ay: 704, bx: 388, by: 704, t: PIN_T },
  ],
  fills: [
    { kind: COIN, x0: 218, x1: 362, y1: 760, count: 60 },
    { kind: WATER, x0: 218, x1: 362, y1: 706, count: 175 },
    { kind: COIN, x0: 572, x1: 668, y1: 812, count: 20 },
  ],
  boulders: [{ x: 432, y: 671 }],
  // Anything that gets down into the dip is gone, unless the boulder fills it.
  drains: [{ x0: 404, x1: 460, y0: 1106, y1: 1170 }],
  nib: { x: 110, y: 1068 },
  blots: [{ x: 560, y: 1070 }],
  chest: { x: 630, y: 1070 },
  coinsNeeded: 50,
  vines: [{ x: 526, top: 812, bottom: 1092 }],
  solution: ['K', 'W', 'N'],
  torches: [{ x: 110, y: 960 }, { x: 610, y: 980 }, { x: 300, y: 860 }],
  view: { x: 0, y: 190, w: 720, h: 960 },
};
