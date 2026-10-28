import type { LevelDef } from '../logic/level';
import { COIN, LAVA, WATER } from '../logic/particles';
import { CH1, PIN_T, T } from './common';

/**
 * Level 2, Loot: four hoppers of gold, each with its own way to lose it.
 * 1. The hall: a hopper over a ramp that runs down to the drain. Pull the
 *    ramp B first and the gold falls into the hall instead.
 * 2. The trough: under the next hopper a steep trough runs down to a curb
 *    pin C over a drain. The trough R can't come out while C is in, so the
 *    hopper must wait: C, then R, then H. Pull H first and the gold sits in
 *    the trough with nowhere to go but the drain.
 * 3. The trapdoor: the gold lands on F, the trapdoor down to the lower hall.
 *    Pick it up before pulling F, or it falls down the shaft into the grate.
 * 4. The lava pit: the last hopper K hangs over a pit of lava in the lower
 *    hall's floor; gold that falls in melts. Pull the water tank W first: its
 *    water runs down a ramp onto the lava and turns it to stone, which the
 *    gold lands on and Nib walks across. Pull F before W and Nib, dropping
 *    down the shaft, walks into the lava; pull K before W and the gold melts.
 * Winning order: B, A, G, C, R, H, T, W, F, K (W may come any time before F).
 */
export const GOLD_RUSH: LevelDef = {
  id: 'gold-rush',
  chapter: CH1,
  name: 'Gold Rush',
  goal: 'Pick up 470 coins, and keep the gold out of the lava',
  tip: 'Lava melts gold and burns Nib. Pour water on it first and it turns to stone.',
  rooms: [
    [[125, 420], [440, 420], [440, 790], [680, 790], [680, 1100], [125, 1100]],
    [[40, 700], [125, 700], [125, 1100], [40, 1100]],
    [[680, 420], [1240, 420], [1240, 1100], [680, 1100]],
    [[1124, 1100], [1196, 1100], [1196, 1130], [1124, 1130]],
    [[1240, 560], [1760, 560], [1760, 1100], [1240, 1100]],
    [[1392, 1100], [1648, 1100], [1648, 1830], [1392, 1830]],
    [[1648, 1450], [1760, 1450], [1760, 1800], [1648, 1800]],
    [[1760, 700], [2120, 700], [2120, 1800], [2060, 1800], [2060, 1850], [1920, 1850], [1920, 1800], [1760, 1800]],
  ],
  walls: [
    // 1. The hall.
    { ax: 125, ay: 420, bx: 440, by: 420, t: T }, // 0 hopper ceiling
    { ax: 125, ay: 420, bx: 125, by: 730, t: T }, // 1 hopper's left side, above the way into the chute
    { ax: 440, ay: 420, bx: 440, by: 790, t: T }, // 2 hopper's right side
    { ax: 440, ay: 790, bx: 680, by: 790, t: T }, // 3 hall ceiling
    { ax: 40, ay: 1100, bx: 1124, by: 1100, t: T }, // 4 floor of the hall and the trough room
    { ax: 125, ay: 832, bx: 125, by: 1100, t: T }, // 5 the chute's wall
    { ax: 40, ay: 700, bx: 125, by: 700, t: T }, // 6 chute ceiling
    { ax: 40, ay: 700, bx: 40, by: 1100, t: T }, // 7 chute's back wall
    { ax: 560, ay: 790, bx: 560, by: 852, t: T }, // 8 over Nib's gate
    // 2. The trough.
    { ax: 680, ay: 420, bx: 1240, by: 420, t: T }, // 9 ceiling
    { ax: 680, ay: 420, bx: 680, by: 790, t: T }, // 10 over the way in from the hall
    { ax: 772, ay: 470, bx: 772, by: 632, t: T }, // 11 hopper sides
    { ax: 948, ay: 470, bx: 948, by: 632, t: T }, // 12
    { ax: 1040, ay: 1068, bx: 1040, by: 1100, t: T }, // 13 a curb between the hall and the drain
    { ax: 1124, ay: 1100, bx: 1124, by: 1130, t: T }, // 14 the drain's dip
    { ax: 1196, ay: 1100, bx: 1196, by: 1130, t: T }, // 15
    { ax: 1124, ay: 1130, bx: 1152, by: 1130, t: T }, // 16
    { ax: 1168, ay: 1130, bx: 1196, by: 1130, t: T }, // 17
    { ax: 1240, ay: 420, bx: 1240, by: 560, t: T }, // 18 over the way on
    // 3. The trapdoor.
    { ax: 1240, ay: 560, bx: 1760, by: 560, t: T }, // 19 ceiling
    { ax: 1196, ay: 1100, bx: 1392, by: 1100, t: T }, // 20 floor up to the trapdoor
    { ax: 1648, ay: 1100, bx: 1760, by: 1100, t: T }, // 21 floor past it
    { ax: 1760, ay: 560, bx: 1760, by: 1450, t: T }, // 22 between the trapdoor room and the ramps' room
    { ax: 1432, ay: 600, bx: 1432, by: 772, t: T }, // 23 hopper sides
    { ax: 1608, ay: 600, bx: 1608, by: 772, t: T }, // 24
    { ax: 1270, ay: 1068, bx: 1270, by: 1100, t: T }, // 25 a curb, keeping the gold out of the trough room's drain
    // The shaft down and the lower hall.
    { ax: 1392, ay: 1100, bx: 1392, by: 1830, t: T }, // 26 shaft's left wall
    { ax: 1648, ay: 1100, bx: 1648, by: 1450, t: T }, // 27 shaft's right wall
    { ax: 1392, ay: 1830, bx: 1648, by: 1830, t: T }, // 28 the grate at the bottom
    { ax: 1648, ay: 1800, bx: 1648, by: 1830, t: T }, // 29 the step up out of it
    { ax: 1648, ay: 1450, bx: 1760, by: 1450, t: T }, // 30 passage ceiling
    { ax: 1648, ay: 1800, bx: 1920, by: 1800, t: T }, // 31 lower floor
    { ax: 1700, ay: 1772, bx: 1700, by: 1800, t: T }, // 32 a curb, keeping the gold out of the grate
    // 4. The lava pit.
    { ax: 1760, ay: 700, bx: 2120, by: 700, t: T }, // 33 ceiling
    { ax: 2120, ay: 700, bx: 2120, by: 1800, t: T }, // 34 right wall
    { ax: 1932, ay: 720, bx: 1932, by: 892, t: T }, // 35 hopper sides, over the pit
    { ax: 2052, ay: 720, bx: 2052, by: 892, t: T }, // 36
    { ax: 1920, ay: 1800, bx: 1920, by: 1850, t: T }, // 37 the lava pit
    { ax: 1920, ay: 1850, bx: 2060, by: 1850, t: T }, // 38
    { ax: 2060, ay: 1800, bx: 2060, by: 1850, t: T }, // 39
    { ax: 2060, ay: 1800, bx: 2120, by: 1800, t: T }, // 40 floor past the pit
    { ax: 1800, ay: 760, bx: 1800, by: 900, t: T }, // 41 water tank sides
    { ax: 1876, ay: 760, bx: 1876, by: 900, t: T }, // 42
    { ax: 1760, ay: 980, bx: 1990, by: 1090, t: T }, // 43 the ramp carrying the water over the pit
  ],
  bars: [5, 8, 11, 12, 13, 23, 24, 25, 32, 35, 36, 41, 42, 43],
  pins: [
    { id: 'A', ax: 108, ay: 600, bx: 448, by: 600, t: PIN_T },
    { id: 'B', ax: 462, ay: 626, bx: 138, by: 814, t: PIN_T },
    { id: 'G', ax: 560, ay: 860, bx: 560, by: 1094, t: PIN_T },
    { id: 'H', ax: 980, ay: 640, bx: 764, by: 640, t: PIN_T },
    { id: 'R', ax: 1086, ay: 1006, bx: 740, by: 660, t: PIN_T },
    { id: 'C', ax: 1100, ay: 790, bx: 1100, by: 1092, t: PIN_T },
    { id: 'T', ax: 1630, ay: 780, bx: 1424, by: 780, t: PIN_T },
    { id: 'F', ax: 1660, ay: 1100, bx: 1384, by: 1100, t: PIN_T },
    { id: 'W', ax: 1776, ay: 908, bx: 1892, by: 908, t: PIN_T },
    { id: 'K', ax: 2096, ay: 900, bx: 1916, by: 900, t: PIN_T },
  ],
  fills: [
    { kind: COIN, x0: 133, x1: 432, y1: 593, count: 180 },
    { kind: COIN, x0: 782, x1: 938, y1: 632, count: 110 },
    { kind: COIN, x0: 1442, x1: 1598, y1: 772, count: 120 },
    { kind: COIN, x0: 1942, x1: 2042, y1: 892, count: 140 },
    { kind: WATER, x0: 1808, x1: 1868, y1: 900, count: 50 },
    { kind: LAVA, x0: 1928, x1: 2052, y1: 1842, count: 44 },
  ],
  drains: [
    { x0: 48, x1: 118, y0: 1050, y1: 1100 },
    { x0: 1132, x1: 1188, y0: 1106, y1: 1170 },
    { x0: 1400, x1: 1640, y0: 1790, y1: 1840 },
  ],
  nib: { x: 620, y: 1068 },
  blots: [],
  coinsNeeded: 470,
  solution: ['B', 'A', 'G', 'C', 'R', 'H', 'T', 'W', 'F', 'K'],
  stops: [{ x: 300 }, { x: 160 }, { x: 860 }, { x: 1060 }, { x: 1520 }, { x: 1720 }, { x: 1840 }, { x: 1990 }, { x: 2090 }],
  torches: [{ x: 620, y: 880 }, { x: 290, y: 860 }, { x: 860, y: 520 }, { x: 1320, y: 660 }, { x: 1700, y: 1520 }, { x: 1820, y: 780 }],
  view: { x: 0, y: 190, w: 2160, h: 1720 },
};
