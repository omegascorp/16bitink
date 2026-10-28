import type { LevelDef } from '../logic/level';
import { COIN, LAVA, WATER } from '../logic/particles';
import { CH1, PIN_T, T } from './common';

/**
 * Level 6: crossed pins. A pin can't slide out through another pin, so in
 * every room the question is which pin is really free first.
 * 1. The crate bridge: the gold's pin is stuck behind the pin holding a
 *    crate, and Nib's door opens straight away, onto a pit with a porcupine
 *    in it. Drop the crate first: it squashes the porcupine and fills the pit
 *    as a bridge, and frees the gold's pin.
 * 2. The boar's cell: the water's pin is stuck behind the cell door. Open
 *    the cell while Nib's gate is still shut, wash the boar, then the gate.
 *    Gate first, and the boar comes out at Nib.
 * 3. The ramp under the gold's hopper: gold first, and it slides down to
 *    Nib; pull the ramp first and the gold falls into the drain under it.
 * 4. The barricade: a crate is wedged under a low roof in the way to the
 *    chest. The second gold's pin is stuck behind the ramp, and the lava's
 *    pin behind the gold's. A little lava runs down a chute beside the crate,
 *    burns it away and drains into a sump under the floor. Keep the gate shut
 *    till then: open it first and Nib walks up to the crate, under the chute.
 * Winning order: B, N, C, J2, W2, G1, C3, R3, C4, L4, G3 (N may also come
 * after C).
 */
export const PIN_OVER_PIN: LevelDef = {
  id: 'pin-over-pin',
  chapter: CH1,
  name: 'Pin Over Pin',
  goal: 'Take the chest and pick up 190 coins',
  tip: 'A pin can’t slide out through another pin.',
  rooms: [
    // 1. the porcupine pit, and 2. the boar's cell
    [[40, 600], [490, 600], [490, 440], [680, 440], [680, 700], [1180, 700], [1180, 1100], [448, 1100], [448, 1160], [372, 1160], [372, 1100], [40, 1100]],
    // 3. the ramp, and 4. the barricade, with the lava's sump under it
    [
      [1180, 1000], [1260, 1000], [1260, 1230], [2120, 1230], [2120, 1500], [1888, 1500], [1888, 1530], [1940, 1530], [1940, 1580],
      [1800, 1580], [1800, 1530], [1840, 1530], [1840, 1500], [1516, 1500], [1516, 1530], [1444, 1530], [1444, 1500], [1180, 1500],
    ],
  ],
  walls: [
    // 1. the porcupine pit
    { ax: 40, ay: 600, bx: 40, by: 1100, t: T }, // 0 left wall
    { ax: 40, ay: 600, bx: 490, by: 600, t: T }, // 1 ceiling
    { ax: 490, ay: 440, bx: 490, by: 700, t: T }, // 2 the hopper's side
    { ax: 490, ay: 440, bx: 680, by: 440, t: T }, // 3 hopper ceiling
    { ax: 680, ay: 440, bx: 680, by: 700, t: T }, // 4 the hopper's right side
    { ax: 680, ay: 700, bx: 680, by: 990, t: T }, // 5 over Nib's gate into the boar's room
    { ax: 448, ay: 1100, bx: 1180, by: 1100, t: T }, // 6 floor, right of the pit, on into the boar's room
    { ax: 448, ay: 1100, bx: 448, by: 1160, t: T }, // 7 the porcupine's pit
    { ax: 372, ay: 1160, bx: 448, by: 1160, t: T }, // 8
    { ax: 372, ay: 1100, bx: 372, by: 1160, t: T }, // 9
    { ax: 40, ay: 1100, bx: 372, by: 1100, t: T }, // 10 floor, left of the pit
    { ax: 372, ay: 600, bx: 372, by: 700, t: T }, // 11 the boulder's alcove
    { ax: 448, ay: 600, bx: 448, by: 700, t: T }, // 12
    { ax: 200, ay: 600, bx: 200, by: 870, t: T }, // 13 over Nib's door
    // 2. the boar's cell
    { ax: 680, ay: 700, bx: 1180, by: 700, t: T }, // 14 ceiling
    { ax: 1180, ay: 700, bx: 1180, by: 1000, t: T }, // 15 over the way down
    { ax: 920, ay: 700, bx: 920, by: 852, t: T }, // 16 the water tank
    { ax: 1160, ay: 700, bx: 1160, by: 852, t: T }, // 17
    { ax: 1150, ay: 1100, bx: 1150, by: 1070, t: T }, // 18 curbs that keep the water in
    { ax: 740, ay: 1100, bx: 740, by: 1070, t: T }, // 19
    // 3. the ramp
    { ax: 1180, ay: 1000, bx: 1260, by: 1000, t: T }, // 20 over the drop
    { ax: 1260, ay: 1000, bx: 1260, by: 1230, t: T }, // 21
    { ax: 1260, ay: 1230, bx: 2120, by: 1230, t: T }, // 22 ceiling
    { ax: 1180, ay: 1100, bx: 1180, by: 1500, t: T }, // 23 left wall
    { ax: 1180, ay: 1500, bx: 1444, by: 1500, t: T }, // 24 floor, with the drain dip
    { ax: 1444, ay: 1500, bx: 1444, by: 1530, t: T }, // 25
    { ax: 1516, ay: 1500, bx: 1516, by: 1530, t: T }, // 26
    { ax: 1444, ay: 1530, bx: 1472, by: 1530, t: T }, // 27
    { ax: 1488, ay: 1530, bx: 1516, by: 1530, t: T }, // 28
    { ax: 1516, ay: 1500, bx: 1840, by: 1500, t: T }, // 29 floor on to the barricade
    { ax: 1420, ay: 1230, bx: 1420, by: 1340, t: T }, // 30 the gold's hopper
    { ax: 1540, ay: 1230, bx: 1540, by: 1340, t: T }, // 31
    { ax: 1664, ay: 1230, bx: 1664, by: 1360, t: T }, // 32 the second hopper
    { ax: 1744, ay: 1230, bx: 1744, by: 1360, t: T }, // 33
    // 4. the barricade
    { ax: 2120, ay: 1230, bx: 2120, by: 1500, t: T }, // 34 right wall
    { ax: 1888, ay: 1500, bx: 2120, by: 1500, t: T }, // 35 floor past the crate, to the chest
    { ax: 1840, ay: 1500, bx: 1840, by: 1530, t: T }, // 36 the slot down to the sump
    { ax: 1888, ay: 1500, bx: 1888, by: 1530, t: T }, // 37
    { ax: 1800, ay: 1530, bx: 1840, by: 1530, t: T }, // 38 the sump
    { ax: 1888, ay: 1530, bx: 1940, by: 1530, t: T }, // 39
    { ax: 1800, ay: 1530, bx: 1800, by: 1580, t: T }, // 40
    { ax: 1940, ay: 1530, bx: 1940, by: 1580, t: T }, // 41
    { ax: 1800, ay: 1580, bx: 1940, by: 1580, t: T }, // 42
    { ax: 1780, ay: 1428, bx: 1832, by: 1428, t: T }, // 43 the low roof over the crate
    { ax: 1888, ay: 1428, bx: 1960, by: 1428, t: T }, // 44
    { ax: 1832, ay: 1290, bx: 1832, by: 1428, t: T }, // 45 the lava's chute, beside the crate
    { ax: 1888, ay: 1290, bx: 1888, by: 1428, t: T }, // 46
  ],
  bars: [5, 11, 12, 13, 16, 17, 18, 19, 30, 31, 32, 33, 43, 44, 45, 46],
  pins: [
    { id: 'N', ax: 200, ay: 878, bx: 200, by: 1094, t: PIN_T },
    { id: 'B', ax: 350, ay: 700, bx: 458, by: 700, t: PIN_T },
    { id: 'C', ax: 480, ay: 700, bx: 674, by: 700, t: PIN_T },
    { id: 'G1', ax: 700, ay: 1120, bx: 700, by: 998, t: PIN_T },
    { id: 'J2', ax: 900, ay: 1120, bx: 900, by: 872, t: PIN_T },
    { id: 'W2', ax: 912, ay: 860, bx: 1168, by: 860, t: PIN_T },
    { id: 'C3', ax: 1560, ay: 1348, bx: 1412, by: 1348, t: PIN_T },
    { id: 'R3', ax: 1400, ay: 1494, bx: 1544, by: 1350, t: PIN_T },
    // The gate slides down into the floor.
    { id: 'G3', ax: 1640, ay: 1520, bx: 1640, by: 1420, t: PIN_T },
    { id: 'C4', ax: 1620, ay: 1368, bx: 1752, by: 1368, t: PIN_T },
    { id: 'L4', ax: 1816, ay: 1372, bx: 1896, by: 1372, t: PIN_T },
  ],
  fills: [
    { kind: COIN, x0: 498, x1: 672, y1: 693, count: 100 },
    { kind: WATER, x0: 928, x1: 1152, y1: 852, count: 100 },
    { kind: COIN, x0: 1428, x1: 1532, y1: 1340, count: 90 },
    { kind: COIN, x0: 1672, x1: 1736, y1: 1360, count: 30 },
    { kind: LAVA, x0: 1840, x1: 1880, y1: 1365, count: 12 },
  ],
  crates: [
    // Held over the porcupine's pit, and wedged under the low roof in the way to the chest.
    { x: 410, y: 666 },
    { x: 1892, y: 1466 },
  ],
  // Anything that gets down into the dip is gone. Water Nib splashes over
  // the boar room's curb runs away by the way down.
  drains: [
    { x0: 1158, x1: 1200, y0: 1060, y1: 1100 },
    { x0: 1452, x1: 1508, y0: 1506, y1: 1570 },
  ],
  nib: { x: 110, y: 1068 },
  blots: [
    { x: 410, y: 1130, spiky: true },
    { x: 1040, y: 1070 },
  ],
  chest: { x: 2070, y: 1470 },
  coinsNeeded: 190,
  solution: ['B', 'N', 'C', 'J2', 'W2', 'G1', 'C3', 'R3', 'C4', 'L4', 'G3'],
  stops: [{ x: 300 }, { x: 1100 }, { x: 1330 }, { x: 1600 }, { x: 1760 }, { x: 2070 }],
  torches: [{ x: 120, y: 700 }, { x: 290, y: 820 }, { x: 560, y: 820 }, { x: 800, y: 900 }, { x: 1340, y: 1300 }, { x: 1610, y: 1300 }, { x: 2020, y: 1340 }],
  view: { x: 0, y: 190, w: 2160, h: 1440 },
};
