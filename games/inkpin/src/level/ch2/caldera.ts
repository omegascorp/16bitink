import type { LevelDef } from '../../logic/level';
import { COIN, LAVA, WATER } from '../../logic/particles';
import { CH2, PIN_T, T } from '../common';

/**
 * Level 7, two screens tall: Nib climbs down a crater to the chest at its
 * bottom. There are no vines here, so the way down is a stair Nib pours
 * himself, and then crumbling ledges that fall behind him: once he is down,
 * there's no climbing back up to wait.
 * 1. The rim: Nib's shelf, behind his door N, the pin nearest him and the
 *    obvious first pull. Open it first and he climbs over the curb and drops
 *    into the first of three empty moulds, too deep to climb out of, right
 *    under the vent: the vent's lava comes down on him.
 * 2. The stair: the vent V fills the three moulds stepping down the crater
 *    wall, and the cistern C, whose baffle sends its rain back to the top
 *    mould, sets them into a stair of stone. Open the door on the hot moulds
 *    and Nib walks into the lava. Rain first and the empty moulds drink it
 *    all: the lava still sets in them, but nothing runs on down the crater.
 * 3. The ledges: the rain that gets past the stair runs off the landing
 *    onto the two black ledges and waits there, over the armadillo's bank.
 *    As Nib walks down them, each ledge he steps off falls (onto the scree,
 *    a step too high for the armadillo, so no slab lands on it) and tips its
 *    rain down the scree onto the armadillo, which washes away. The route
 *    closes behind him: once he is on the bank there is no going back up.
 *    If the moulds drank the rain, the ledges are dry and the armadillo is
 *    waiting for him at the bottom. (A pile of coins on the scree, under the
 *    last ledge's far end, is the reason to step off that end.)
 * 4. The lake: the crater's floor is a lake of lava between the bank and the
 *    chest's shelf. Its tank W sets it to stone, and only then may the
 *    hopper K drop the gold onto it (into the hot lake, the gold melts). Down
 *    the crater before the lake is set, and Nib walks off the bank into it.
 * Winning orders: V before C, C before N; W before K and before N (the hint:
 * V, C, W, K, N; W and K may come any time, N may come before K).
 */
export const CALDERA: LevelDef = {
  id: 'caldera',
  chapter: CH2,
  ruin: 'volcano',
  name: 'The Caldera',
  goal: 'Climb down to the chest and pick up 60 coins',
  tip: 'No vines here: pour your own stair, lava first and then the rain to set it. Black ledges fall once Nib steps off them, so there is no way back up.',
  rooms: [
    [
      [560, 320], [1540, 320], [1540, 1930], [1170, 1930], [1170, 2000], [752, 2000], [752, 2040], [718, 2040], [718, 2000], [700, 2000],
      [700, 2050], [300, 2050], [300, 2000], [40, 2000], [40, 1200], [560, 800],
    ],
  ],
  walls: [
    { ax: 560, ay: 320, bx: 1540, by: 320, t: T }, // 0 ceiling
    { ax: 560, ay: 800, bx: 40, by: 1200, t: T }, // 1 the crater's left side
    { ax: 40, ay: 1200, bx: 40, by: 2000, t: T }, // 2
    { ax: 1540, ay: 320, bx: 1540, by: 1930, t: T }, // 3
    { ax: 560, ay: 320, bx: 560, by: 800, t: T }, // 4 behind Nib's shelf
    { ax: 560, ay: 800, bx: 700, by: 800, t: T }, // 5 Nib's shelf, behind his door
    { ax: 700, ay: 760, bx: 700, by: 906, t: T }, // 6 the first mould, with a curb
    { ax: 700, ay: 906, bx: 810, by: 906, t: T }, // 7
    { ax: 810, ay: 840, bx: 810, by: 946, t: T }, // 8
    { ax: 810, ay: 946, bx: 920, by: 946, t: T }, // 9 the second
    { ax: 920, ay: 880, bx: 920, by: 986, t: T }, // 10
    { ax: 920, ay: 986, bx: 1030, by: 986, t: T }, // 11 the third
    { ax: 1030, ay: 920, bx: 1030, by: 1000, t: T }, // 12
    { ax: 1030, ay: 1000, bx: 1180, by: 1000, t: T }, // 13 the landing
    { ax: 712, ay: 680, bx: 600, by: 400, t: T }, // 14 the vent
    { ax: 778, ay: 400, bx: 778, by: 680, t: T }, // 15
    { ax: 830, ay: 380, bx: 830, by: 520, t: T }, // 16 the cistern
    { ax: 1020, ay: 380, bx: 1020, by: 520, t: T }, // 17
    { ax: 1050, ay: 640, bx: 790, by: 712, t: T }, // 18 its baffle, back over the first mould
    // The crater floor: the chest's shelf, the lake sunk below it, the bank, the scree under the ledges.
    { ax: 40, ay: 2000, bx: 300, by: 2000, t: T }, // 19
    { ax: 300, ay: 2000, bx: 300, by: 2050, t: T }, // 20 the lake
    { ax: 300, ay: 2050, bx: 700, by: 2050, t: T }, // 21
    { ax: 700, ay: 1972, bx: 700, by: 2050, t: T }, // 22 its curb on the bank's side
    { ax: 700, ay: 2000, bx: 718, by: 2000, t: T }, // 23 the bank, and its grate
    { ax: 752, ay: 2000, bx: 1170, by: 2000, t: T }, // 24
    { ax: 1170, ay: 1930, bx: 1170, by: 2000, t: T }, // 25 the scree, too high a step for the armadillo
    { ax: 1170, ay: 1930, bx: 1540, by: 1930, t: T }, // 26
    { ax: 480, ay: 1700, bx: 480, by: 1820, t: T }, // 27 the lake's tank
    { ax: 680, ay: 1700, bx: 680, by: 1820, t: T }, // 28
    { ax: 320, ay: 1660, bx: 320, by: 1800, t: T }, // 29 the gold's hopper
    { ax: 460, ay: 1660, bx: 460, by: 1800, t: T }, // 30
  ],
  bars: [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 27, 28, 29, 30],
  pins: [
    { id: 'N', ax: 680, ay: 792, bx: 680, by: 708, t: PIN_T },
    { id: 'V', ax: 770, ay: 688, bx: 712, by: 688, t: PIN_T },
    { id: 'C', ax: 1038, ay: 528, bx: 822, by: 528, t: PIN_T },
    { id: 'W', ax: 688, ay: 1828, bx: 472, by: 1828, t: PIN_T },
    { id: 'K', ax: 312, ay: 1808, bx: 468, by: 1808, t: PIN_T },
  ],
  fills: [
    { kind: LAVA, x0: 720, x1: 770, y1: 680, count: 80 },
    { kind: LAVA, x0: 662, x1: 770, y1: 540, count: 85 },
    { kind: WATER, x0: 838, x1: 1012, y1: 520, count: 100 },
    { kind: LAVA, x0: 308, x1: 692, y1: 2042, count: 70 },
    { kind: WATER, x0: 488, x1: 672, y1: 1820, count: 70 },
    { kind: COIN, x0: 328, x1: 452, y1: 1800, count: 60 },
    { kind: COIN, x0: 1474, x1: 1532, y1: 1922, count: 12 }, // on the scree, under the last ledge's far end
  ],
  ledges: [
    { x0: 1190, x1: 1320, y: 992 },
    { x0: 1340, x1: 1460, y: 1300 },
  ],
  drains: [{ x0: 726, x1: 744, y0: 1996, y1: 2040 }],
  nib: { x: 610, y: 768 },
  blots: [{ x: 950, y: 1970, animal: 'armadillo' }],
  chest: { x: 150, y: 1960 },
  coinsNeeded: 60,
  solution: ['V', 'C', 'W', 'K', 'N'],
  stops: [{ x: 640 }, { x: 1100 }, { x: 1420 }, { x: 1510 }, { x: 900 }, { x: 400 }, { x: 150 }],
  torches: [{ x: 600, y: 700 }, { x: 1200, y: 760 }, { x: 1440, y: 1060 }, { x: 260, y: 1420 }, { x: 900, y: 1820 }, { x: 1360, y: 1800 }, { x: 140, y: 1860 }],
  view: { x: 0, y: 200, w: 1580, h: 2000 },
};
