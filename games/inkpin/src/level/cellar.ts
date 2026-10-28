import type { LevelDef } from '../logic/level';
import { COIN, LAVA, WATER } from '../logic/particles';
import { CH1, PIN_T, T } from './common';

/**
 * Level 5, Loot, the lava level: the gold vault under the Jungle Temple,
 * four rooms down a stair, each a drop below the last.
 * 1. The moat: lava between Nib and the way on, a little water and the gold
 *    over it. Water first makes a stone bridge; gold first melts.
 * 2. The porcupine pit: one tank, water over lava, above the pit. Lava first
 *    burns the porcupine, then the water sets it to stone; water first cools
 *    the lava in the tank and the porcupine lives. Open the gate early and
 *    Nib walks into the pit.
 * 3. The drain: a ramp runs the gold into a drain dip. Drop the boulder in
 *    the dip first, then the gold.
 * 4. The vault: the chest is up on a ledge, and the only way up is a seed in
 *    a basin under it. The gold's pin is stuck behind the lava's, and the
 *    lava pours onto the slope down into the basin. Water first grows the
 *    vine and fills the basin, and the lava sets to stone on the slope, a
 *    wall between it and the vine; lava first runs down into the dry basin
 *    and burns the seed (and Nib, waiting by it).
 * Winning order: W1, C1, L2, W2, G1, B3, G2, C3, W, L, C (W may come earlier,
 * so long as it is before L; R3 can stand in for B3).
 */
export const CELLAR: LevelDef = {
  id: 'cellar',
  chapter: CH1,
  name: 'The Gold Vault',
  goal: 'Take the chest and pick up 230 coins',
  rooms: [
    // 1. the moat
    [[40, 470], [620, 470], [620, 760], [510, 760], [510, 820], [290, 820], [290, 760], [40, 760]],
    // 2. the porcupine pit
    [[620, 680], [800, 680], [800, 880], [1180, 880], [1180, 1180], [1000, 1180], [1000, 1244], [880, 1244], [880, 1180], [620, 1180]],
    // 3. the drain
    [[1180, 1100], [1260, 1100], [1260, 1260], [1720, 1260], [1720, 1600], [1456, 1600], [1456, 1630], [1384, 1630], [1384, 1600], [1180, 1600]],
    // 4. the vault
    [[1720, 1050], [2140, 1050], [2140, 1400], [1986, 1400], [1986, 1616], [1850, 1616], [1744, 1580], [1744, 1600], [1720, 1600]],
  ],
  walls: [
    // 1. the moat
    { ax: 40, ay: 470, bx: 620, by: 470, t: T }, // 0 ceiling
    { ax: 40, ay: 470, bx: 40, by: 760, t: T }, // 1 left wall
    { ax: 40, ay: 760, bx: 290, by: 760, t: T }, // 2 Nib's floor
    { ax: 290, ay: 760, bx: 290, by: 820, t: T }, // 3 the moat
    { ax: 290, ay: 820, bx: 510, by: 820, t: T }, // 4
    { ax: 510, ay: 820, bx: 510, by: 760, t: T }, // 5
    { ax: 510, ay: 760, bx: 620, by: 760, t: T }, // 6 floor past the moat
    { ax: 620, ay: 470, bx: 620, by: 680, t: T }, // 7 over the way down
    { ax: 290, ay: 470, bx: 290, by: 600, t: T }, // 8 the water tank
    { ax: 400, ay: 470, bx: 400, by: 600, t: T }, // 9 between water and gold
    { ax: 510, ay: 470, bx: 510, by: 600, t: T }, // 10 the gold tank
    // 2. the porcupine pit
    { ax: 620, ay: 680, bx: 800, by: 680, t: T }, // 11 ceiling over the drop
    { ax: 800, ay: 680, bx: 800, by: 880, t: T }, // 12
    { ax: 800, ay: 880, bx: 1180, by: 880, t: T }, // 13 hall ceiling
    { ax: 1180, ay: 880, bx: 1180, by: 1100, t: T }, // 14 over the way down
    { ax: 620, ay: 760, bx: 620, by: 1180, t: T }, // 15 left wall
    { ax: 620, ay: 1180, bx: 880, by: 1180, t: T }, // 16 hall floor, with the porcupine's pit
    { ax: 880, ay: 1180, bx: 880, by: 1244, t: T }, // 17
    { ax: 880, ay: 1244, bx: 1000, by: 1244, t: T }, // 18
    { ax: 1000, ay: 1244, bx: 1000, by: 1180, t: T }, // 19
    { ax: 1000, ay: 1180, bx: 1180, by: 1180, t: T }, // 20
    { ax: 880, ay: 880, bx: 880, by: 1010, t: T }, // 21 the tank: water over lava
    { ax: 1000, ay: 880, bx: 1000, by: 1010, t: T }, // 22
    // 3. the drain
    { ax: 1180, ay: 1100, bx: 1260, by: 1100, t: T }, // 23 over the drop
    { ax: 1260, ay: 1100, bx: 1260, by: 1260, t: T }, // 24
    { ax: 1260, ay: 1260, bx: 1720, by: 1260, t: T }, // 25 ceiling
    { ax: 1180, ay: 1180, bx: 1180, by: 1600, t: T }, // 26 left wall
    { ax: 1180, ay: 1600, bx: 1384, by: 1600, t: T }, // 27 floor, with the drain dip
    { ax: 1384, ay: 1600, bx: 1384, by: 1630, t: T }, // 28
    { ax: 1456, ay: 1600, bx: 1456, by: 1630, t: T }, // 29
    { ax: 1384, ay: 1630, bx: 1412, by: 1630, t: T }, // 30
    { ax: 1428, ay: 1630, bx: 1456, by: 1630, t: T }, // 31
    { ax: 1456, ay: 1600, bx: 1744, by: 1600, t: T }, // 32 floor into the vault
    { ax: 1382, ay: 1260, bx: 1382, by: 1392, t: T }, // 33 the boulder's alcove
    { ax: 1458, ay: 1260, bx: 1458, by: 1392, t: T }, // 34
    { ax: 1488, ay: 1260, bx: 1488, by: 1362, t: T }, // 35 the gold's hopper
    { ax: 1620, ay: 1260, bx: 1620, by: 1362, t: T }, // 36
    // 4. the vault
    { ax: 1720, ay: 1050, bx: 1720, by: 1450, t: T }, // 37 over the way in
    { ax: 1720, ay: 1050, bx: 2140, by: 1050, t: T }, // 38 ceiling
    { ax: 2140, ay: 1050, bx: 2140, by: 1400, t: T }, // 39 right wall
    { ax: 1986, ay: 1400, bx: 2140, by: 1400, t: T }, // 40 the chest's ledge
    { ax: 1986, ay: 1400, bx: 1986, by: 1616, t: T }, // 41 its face
    { ax: 1850, ay: 1616, bx: 1986, by: 1616, t: T }, // 42 the seed's basin
    { ax: 1744, ay: 1580, bx: 1850, by: 1616, t: T }, // 43 the floor, down into the basin
    { ax: 1744, ay: 1600, bx: 1744, by: 1572, t: T }, // 44 a curb that keeps the water in the basin
    { ax: 1812, ay: 1050, bx: 1812, by: 1250, t: T }, // 45 the lava's tank, over the slope
    { ax: 1860, ay: 1050, bx: 1860, by: 1250, t: T }, // 46
    { ax: 1920, ay: 1050, bx: 1920, by: 1212, t: T }, // 47 the water's tank, over the seed
    { ax: 1980, ay: 1050, bx: 1980, by: 1212, t: T }, // 48
    { ax: 1996, ay: 1050, bx: 1996, by: 1250, t: T }, // 49 the gold's hopper, over the ledge
    // A curb that keeps the gold back from the vault, and lips that keep it in the moat.
    { ax: 1630, ay: 1600, bx: 1630, by: 1570, t: T }, // 50
    { ax: 290, ay: 726, bx: 290, by: 760, t: T }, // 51
    { ax: 510, ay: 726, bx: 510, by: 760, t: T }, // 52
  ],
  bars: [8, 9, 10, 21, 22, 33, 34, 35, 36, 44, 45, 46, 47, 48, 49, 50, 51, 52],
  pins: [
    { id: 'W1', ax: 274, ay: 608, bx: 406, by: 608, t: PIN_T },
    { id: 'C1', ax: 530, ay: 608, bx: 396, by: 608, t: PIN_T },
    { id: 'G1', ax: 598, ay: 780, bx: 598, by: 688, t: PIN_T },
    { id: 'W2', ax: 862, ay: 930, bx: 1008, by: 930, t: PIN_T },
    { id: 'L2', ax: 862, ay: 1010, bx: 1008, by: 1010, t: PIN_T },
    { id: 'G2', ax: 1158, ay: 1200, bx: 1158, by: 1108, t: PIN_T },
    { id: 'B3', ax: 1362, ay: 1400, bx: 1470, by: 1400, t: PIN_T },
    { id: 'C3', ax: 1640, ay: 1370, bx: 1480, by: 1370, t: PIN_T },
    { id: 'R3', ax: 1484, ay: 1514, bx: 1612, by: 1378, t: PIN_T },
    // The vault: the gold's pin slides out through the lava's.
    { id: 'W', ax: 1904, ay: 1220, bx: 1988, by: 1220, t: PIN_T },
    { id: 'L', ax: 1868, ay: 1258, bx: 1804, by: 1258, t: PIN_T },
    { id: 'C', ax: 1990, ay: 1258, bx: 2152, by: 1258, t: PIN_T },
  ],
  fills: [
    { kind: LAVA, x0: 298, x1: 502, y1: 812, count: 70 },
    { kind: WATER, x0: 298, x1: 392, y1: 600, count: 10 },
    { kind: COIN, x0: 408, x1: 502, y1: 600, count: 100 },
    { kind: WATER, x0: 888, x1: 992, y1: 923, count: 10 },
    { kind: LAVA, x0: 888, x1: 992, y1: 1003, count: 50 },
    { kind: COIN, x0: 1496, x1: 1612, y1: 1362, count: 110 },
    { kind: WATER, x0: 1928, x1: 1972, y1: 1212, count: 60 },
    { kind: LAVA, x0: 1820, x1: 1852, y1: 1250, count: 32 },
    { kind: COIN, x0: 2004, x1: 2132, y1: 1250, count: 70 },
  ],
  boulders: [{ x: 1420, y: 1366 }],
  // Anything that gets down into the dip is gone, unless the boulder fills it.
  drains: [{ x0: 1392, x1: 1448, y0: 1606, y1: 1670 }],
  nib: { x: 100, y: 728 },
  blots: [{ x: 940, y: 1214, spiky: true }],
  vines: [{ x: 1950, top: 1392, bottom: 1608, seed: true }],
  chest: { x: 2100, y: 1370 },
  coinsNeeded: 230,
  solution: ['W1', 'C1', 'L2', 'W2', 'G1', 'B3', 'G2', 'C3', 'W', 'L', 'C'],
  stops: [{ x: 340 }, { x: 560 }, { x: 1130 }, { x: 1670 }, { x: 1950, y: 1380 }, { x: 2100 }],
  torches: [{ x: 160, y: 640 }, { x: 700, y: 900 }, { x: 990, y: 1060 }, { x: 1320, y: 1480 }, { x: 1790, y: 1160 }, { x: 1790, y: 1480 }, { x: 2090, y: 1160 }],
  view: { x: 0, y: 190, w: 2180, h: 1520 },
};
