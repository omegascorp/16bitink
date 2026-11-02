import type { LevelDef } from '../logic/level';
import { COIN, LAVA, WATER } from '../logic/particles';
import { CH1, PIN_T, T } from './common';

/**
 * Level 6: pins that block across rooms. Each stage's pin is jammed by a pin
 * in the next room along (a pin slides out past its ring by its own length,
 * and a pin still in that path stops it), so the order runs back and forth
 * across the whole level instead of room by room. The top floor (Nib's
 * corner and the boar's cell) ends at a drop onto the porcupine's slope,
 * which runs down to its gate and the chest's room.
 * 1. The boar's cell: the boar is shut in beside Nib's gate N, under a tank
 *    of water W. Water first, with the cell door K still shut: it comes down
 *    through a funnel, pools in the cell and washes the boar. Open the cell
 *    first and the boar comes out to glare at Nib's gate, and the water runs
 *    out of the open cell into the drain at its door; open Nib's gate and
 *    then the cell, and the boar comes out at Nib. But W can't slide out yet:
 *    it runs into P, the pin that is the far side of the lava tank hanging
 *    past the top floor's edge.
 * 2. The lava, the tempting pin (it frees the water and is aimed right at
 *    the porcupine): P pours the lava down the slope; it scorches the
 *    porcupine and runs down to the drain under its lid S. With the lid still
 *    in, it pools against the porcupine's gate E and seeps under it onto the
 *    gold, and Nib walks down into it. Pull the lid first.
 * 3. The porcupine's gate can't lift: its pin runs into the pin G of the gold
 *    shelf in the chest's room. Drop the gold first (it lands just past the
 *    gate); lift the gate with lava pooled against it, and the lava runs out
 *    over the gold.
 * 4. The barricade: a crate wedged under a low roof in the way to the chest.
 *    A trickle of lava (L) down a chute beside it burns it away and drains
 *    into a sump under the floor. Pull it while Nib waits at the crate, under
 *    the chute, and it pours onto him.
 * Winning order: S, P, W, K, N, G, L, E (S before P, P before W before K, G
 * before E, L before Nib reaches the crate; N any time).
 */
export const PIN_OVER_PIN: LevelDef = {
  id: 'pin-over-pin',
  chapter: CH1,
  name: 'Pin Over Pin',
  goal: 'Take the chest and pick up 110 coins',
  tip: 'A pin can’t slide out through another pin, even one in the next room.',
  rooms: [
    [
      [40, 560], [1500, 560], [1500, 1100], [2120, 1100], [2120, 1480], [1888, 1480], [1888, 1510], [1940, 1510], [1940, 1560],
      [1800, 1560], [1800, 1510], [1840, 1510], [1840, 1480], [1620, 1480], [1536, 1442], [1536, 1480], [1490, 1480], [1490, 1440],
      [1180, 1330], [1180, 1300], [1040, 1300], [1040, 1000], [40, 1000],
    ],
  ],
  walls: [
    { ax: 40, ay: 560, bx: 1500, by: 560, t: T }, // 0 ceiling
    { ax: 40, ay: 560, bx: 40, by: 1000, t: T }, // 1 left wall
    { ax: 40, ay: 1000, bx: 1100, by: 1000, t: T }, // 2 the top floor, out to its edge
    { ax: 340, ay: 560, bx: 340, by: 858, t: T }, // 3 over Nib's gate
    { ax: 460, ay: 560, bx: 460, by: 852, t: T }, // 4 over the cell door
    { ax: 700, ay: 560, bx: 700, by: 760, t: T }, // 5 the cell's water tank
    { ax: 940, ay: 560, bx: 940, by: 760, t: T }, // 6
    { ax: 980, ay: 1000, bx: 980, by: 960, t: T }, // 7 the cell's curb
    { ax: 700, ay: 778, bx: 806, by: 850, t: T }, // 8 the tank's funnel: the water comes down a little at a time
    { ax: 940, ay: 778, bx: 834, by: 850, t: T }, // 9
    // The lava tank hanging past the top floor's edge; its pin is its right side.
    { ax: 1110, ay: 560, bx: 1110, by: 840, t: T }, // 10
    { ax: 1110, ay: 840, bx: 1222, by: 840, t: T }, // 11
    // Down the drop: the ledge Nib lands on, and the porcupine's slope down to the drain.
    { ax: 1040, ay: 1000, bx: 1040, by: 1300, t: T }, // 12
    { ax: 1040, ay: 1300, bx: 1180, by: 1300, t: T }, // 13
    { ax: 1180, ay: 1300, bx: 1180, by: 1330, t: T }, // 14
    { ax: 1180, ay: 1330, bx: 1490, by: 1440, t: T }, // 15
    { ax: 1490, ay: 1440, bx: 1490, by: 1480, t: T }, // 16 the drain under the lid
    { ax: 1490, ay: 1480, bx: 1536, by: 1480, t: T }, // 17
    { ax: 1536, ay: 1480, bx: 1536, by: 1442, t: T }, // 18
    { ax: 1166, ay: 1300, bx: 1166, by: 1290, t: T }, // 19 a lip at the ledge's edge
    { ax: 1560, ay: 1100, bx: 1560, by: 1292, t: T }, // 20 over the porcupine's gate
    // The chest's room, under its low roof.
    { ax: 1500, ay: 560, bx: 1500, by: 1100, t: T }, // 21
    { ax: 1500, ay: 1100, bx: 2120, by: 1100, t: T }, // 22
    { ax: 2120, ay: 1100, bx: 2120, by: 1480, t: T }, // 23
    { ax: 1536, ay: 1442, bx: 1620, by: 1480, t: T }, // 24 under the gate, on into the chest's room
    { ax: 1620, ay: 1480, bx: 1840, by: 1480, t: T }, // 25
    { ax: 1840, ay: 1480, bx: 1840, by: 1510, t: T }, // 26 the slot down to the sump
    { ax: 1888, ay: 1480, bx: 1888, by: 1510, t: T }, // 27
    { ax: 1800, ay: 1510, bx: 1840, by: 1510, t: T }, // 28 the sump
    { ax: 1888, ay: 1510, bx: 1940, by: 1510, t: T }, // 29
    { ax: 1800, ay: 1510, bx: 1800, by: 1560, t: T }, // 30
    { ax: 1940, ay: 1510, bx: 1940, by: 1560, t: T }, // 31
    { ax: 1800, ay: 1560, bx: 1940, by: 1560, t: T }, // 32
    { ax: 1888, ay: 1480, bx: 2120, by: 1480, t: T }, // 33 on to the chest
    { ax: 1780, ay: 1408, bx: 1832, by: 1408, t: T }, // 34 the low roof over the crate
    { ax: 1888, ay: 1408, bx: 1960, by: 1408, t: T }, // 35
    { ax: 1832, ay: 1100, bx: 1832, by: 1408, t: T }, // 36 the lava's chute, beside the crate
    { ax: 1888, ay: 1100, bx: 1888, by: 1408, t: T }, // 37
    // The gold shelf over the porcupine's gate.
    { ax: 1580, ay: 1100, bx: 1580, by: 1232, t: T }, // 38
    { ax: 1690, ay: 1100, bx: 1690, by: 1232, t: T }, // 39
    { ax: 1760, ay: 1480, bx: 1760, by: 1468, t: T }, // 40 a lip that keeps the gold from the slot
  ],
  bars: [3, 4, 5, 6, 7, 8, 9, 10, 11, 19, 20, 34, 35, 36, 37, 38, 39, 40],
  pins: [
    { id: 'N', ax: 340, ay: 866, bx: 340, by: 994, t: PIN_T },
    { id: 'K', ax: 460, ay: 860, bx: 460, by: 994, t: PIN_T },
    // The water's pin slides right, into the lava tank's.
    { id: 'W', ax: 1098, ay: 768, bx: 692, by: 768, t: PIN_T },
    { id: 'P', ax: 1222, ay: 706, bx: 1222, by: 846, t: PIN_T },
    { id: 'S', ax: 1480, ay: 1440, bx: 1546, by: 1440, t: PIN_T },
    // The porcupine's gate hangs short of the floor, so lava runs under it; it slides up, into the gold shelf's pin.
    { id: 'E', ax: 1560, ay: 1300, bx: 1560, by: 1424, t: PIN_T },
    { id: 'G', ax: 1566, ay: 1240, bx: 1700, by: 1240, t: PIN_T },
    { id: 'L', ax: 1816, ay: 1352, bx: 1896, by: 1352, t: PIN_T },
  ],
  fills: [
    { kind: WATER, x0: 708, x1: 932, y1: 761, count: 110 },
    { kind: LAVA, x0: 1118, x1: 1214, y1: 833, count: 60 },
    { kind: LAVA, x0: 1840, x1: 1880, y1: 1345, count: 12 },
    { kind: COIN, x0: 1588, x1: 1682, y1: 1233, count: 60 },
    { kind: COIN, x0: 130, x1: 270, y1: 992, count: 30 },
    { kind: COIN, x0: 1050, x1: 1156, y1: 1292, count: 30 },
  ],
  // Wedged under the low roof in the way to the chest.
  crates: [{ x: 1892, y: 1446 }],
  // Water that runs out of the open cell, or over its curb, is gone; so is
  // whatever reaches the drain under the porcupine's lid.
  drains: [
    { x0: 404, x1: 450, y0: 940, y1: 996 },
    { x0: 988, x1: 1110, y0: 900, y1: 996 },
    { x0: 1498, x1: 1528, y0: 1446, y1: 1476 },
  ],
  nib: { x: 100, y: 968 },
  blots: [
    { x: 760, y: 968 },
    { x: 1300, y: 1332, spiky: true },
  ],
  chest: { x: 2070, y: 1450 },
  coinsNeeded: 110,
  solution: ['S', 'P', 'W', 'K', 'N', 'G', 'L', 'E'],
  stops: [{ x: 900 }, { x: 1600 }, { x: 2070 }],
  torches: [{ x: 160, y: 760 }, { x: 400, y: 760 }, { x: 1300, y: 640 }, { x: 1120, y: 1200 }, { x: 1400, y: 1200 }, { x: 1760, y: 1250 }, { x: 2040, y: 1250 }],
  view: { x: 0, y: 500, w: 2160, h: 1100 },
};
