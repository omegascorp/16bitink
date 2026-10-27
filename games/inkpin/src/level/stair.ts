import type { LevelDef } from '../logic/level';
import { COIN, WATER } from '../logic/particles';
import { CH1, PIN_T, T } from './common';

/**
 * Level 8, Loot, the remix: two rooms down a stair, a boar in one and a
 * porcupine in the other (too spiky to land on). The water must fill the
 * first room to its lip and spill on into the second, so the boulder has to
 * plug the first room's drain before the water or the gold comes in.
 * Winning orders: K first, then W and C, with N after W.
 */
export const STAIR: LevelDef = {
  id: 'stair',
  chapter: CH1,
  name: 'The Flooded Stair',
  goal: 'Pick up 60 coins',
  rooms: [
    [[40, 360], [250, 360], [250, 420], [520, 420], [520, 760], [680, 760], [680, 1100], [520, 1100], [520, 900], [421, 900], [421, 930], [349, 930], [349, 900], [250, 900], [250, 760], [40, 760]],
  ],
  walls: [
    { ax: 40, ay: 360, bx: 250, by: 360, t: T }, // tank ceiling
    { ax: 40, ay: 360, bx: 40, by: 760, t: T }, // left wall
    { ax: 250, ay: 360, bx: 250, by: 520, t: T }, // between the tank and the first room
    { ax: 40, ay: 560, bx: 290, by: 660, t: T }, // the chute under the tank, Nib's ceiling
    { ax: 40, ay: 760, bx: 250, by: 760, t: T }, // Nib's floor
    { ax: 250, ay: 760, bx: 250, by: 900, t: T }, // the step down into the first room
    { ax: 250, ay: 420, bx: 520, by: 420, t: T }, // first room ceiling
    { ax: 250, ay: 900, bx: 349, by: 900, t: T }, // first room floor, with the drain dip
    { ax: 421, ay: 900, bx: 520, by: 900, t: T },
    { ax: 349, ay: 900, bx: 349, by: 930, t: T },
    { ax: 421, ay: 900, bx: 421, by: 930, t: T },
    { ax: 349, ay: 930, bx: 369, by: 930, t: T },
    { ax: 401, ay: 930, bx: 421, by: 930, t: T },
    { ax: 520, ay: 862, bx: 520, by: 1100, t: T }, // the lip, and the step down into the second room
    { ax: 520, ay: 420, bx: 520, by: 760, t: T }, // the hopper's outer side
    { ax: 428, ay: 420, bx: 428, by: 700, t: T }, // the hopper's inner side
    { ax: 349, ay: 420, bx: 349, by: 660, t: T }, // the boulder's alcove
    { ax: 421, ay: 420, bx: 421, by: 660, t: T },
    { ax: 520, ay: 760, bx: 680, by: 760, t: T }, // second room ceiling
    { ax: 680, ay: 760, bx: 680, by: 1100, t: T },
    { ax: 520, ay: 1100, bx: 680, by: 1100, t: T },
  ],
  bars: [3, 13, 15, 16, 17],
  pins: [
    { id: 'N', ax: 250, ay: 690, bx: 250, by: 754, t: PIN_T },
    { id: 'K', ax: 330, ay: 664, bx: 430, by: 664, t: PIN_T },
    { id: 'W', ax: 24, ay: 520, bx: 258, by: 520, t: PIN_T },
    { id: 'C', ax: 544, ay: 708, bx: 420, by: 708, t: PIN_T },
  ],
  fills: [
    { kind: WATER, x0: 48, x1: 242, y1: 512, count: 290 },
    { kind: COIN, x0: 436, x1: 512, y1: 700, count: 90 },
  ],
  boulders: [{ x: 385, y: 630 }],
  // Anything that gets down into the dip is gone, unless the boulder fills it.
  drains: [{ x0: 357, x1: 413, y0: 906, y1: 970 }],
  nib: { x: 100, y: 728 },
  blots: [{ x: 470, y: 870 }, { x: 610, y: 1070, spiky: true }],
  coinsNeeded: 60,
  solution: ['K', 'W', 'C', 'N'],
  stops: [{ x: 300 }, { x: 470 }, { x: 640 }],
  torches: [{ x: 120, y: 680 }, { x: 600, y: 860 }, { x: 300, y: 480 }],
  view: { x: 0, y: 190, w: 720, h: 960 },
};
