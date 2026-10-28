import type { LevelDef } from '../logic/level';
import { COIN, LAVA, WATER } from '../logic/particles';
import { CH1, PIN_T, T } from './common';

/**
 * Level 4: three guards between Nib and the chest, each beaten its own way.
 * 1. Burn: a boar paces the first hall, under a shaft with a tank of lava L
 *    and a tank of water C stacked over it. Lava first: it pours down and
 *    scorches the boar, and lies hot across the floor. Then the water falls
 *    through the empty lava tank and turns the pool to stone, and only then
 *    Nib's gate G. Water first and it lands on the lava still in its tank:
 *    the lava sets there as stone and the boar lives. Open the gate on the
 *    hot pool and Nib walks into it.
 * 2. Wash: the second boar's hall has a tank of water V over it, which
 *    washes the boar away; open its gate H before that and the boar is
 *    waiting.
 * 3. Squash: a porcupine paces a pit on the way to the chest. Drop the crate
 *    K on it: the crate squashes it and stays in the pit as a step to climb
 *    out on. Walk on without it and Nib drops onto the spikes (and the pit is
 *    too deep to climb out of anyway).
 * The chest is up a vine on a ledge at the far end.
 * Winning order: L, C, G, V, K, H (V and K any time before H, L before C
 * before G).
 */
export const GUARD: LevelDef = {
  id: 'guard',
  chapter: CH1,
  name: 'The Guard',
  goal: 'Get past three guards, take the chest and pick up 80 coins',
  tip: 'Lava scorches a guard and a falling crate squashes one. Cool the lava with water before Nib walks on.',
  rooms: [
    [[40, 800], [700, 800], [700, 1100], [40, 1100]], // Nib's corner and the first hall
    [[380, 460], [580, 460], [580, 800], [380, 800]], // the shaft with the lava and the water over it
    [[700, 700], [1300, 700], [1300, 1100], [700, 1100]], // the second boar's hall
    [[900, 440], [1100, 440], [1100, 700], [900, 700]], // its water tank
    [[1300, 740], [1480, 740], [1480, 860], [1300, 860]], // the high passage
    [[1400, 860], [1480, 860], [1480, 1360], [1400, 1360]], // the shaft down
    // The porcupine's hall: the crate's alcove over the pit, and the chest's ledge.
    [[1400, 1360], [1652, 1360], [1652, 1260], [1728, 1260], [1728, 1360], [2120, 1360], [2120, 1600], [1748, 1600], [1748, 1684], [1632, 1684], [1632, 1600], [1400, 1600]],
  ],
  walls: [
    { ax: 40, ay: 800, bx: 380, by: 800, t: T }, // 0 ceiling over Nib's corner and the hall
    { ax: 40, ay: 800, bx: 40, by: 1100, t: T }, // 1 left wall
    { ax: 40, ay: 1100, bx: 1300, by: 1100, t: T }, // 2 floor of the first two halls
    { ax: 380, ay: 460, bx: 380, by: 800, t: T }, // 3 the lava shaft
    { ax: 580, ay: 460, bx: 580, by: 800, t: T }, // 4
    { ax: 380, ay: 460, bx: 580, by: 460, t: T }, // 5
    { ax: 580, ay: 800, bx: 700, by: 800, t: T }, // 6 the first hall's ceiling
    { ax: 700, ay: 700, bx: 700, by: 800, t: T }, // 7 the second hall's left wall
    { ax: 700, ay: 800, bx: 700, by: 960, t: T }, // 8 between the halls, over the gate
    { ax: 700, ay: 700, bx: 900, by: 700, t: T }, // 9 second hall's ceiling
    { ax: 1100, ay: 700, bx: 1300, by: 700, t: T }, // 10
    { ax: 900, ay: 440, bx: 900, by: 700, t: T }, // 11 its water tank
    { ax: 1100, ay: 440, bx: 1100, by: 700, t: T }, // 12
    { ax: 900, ay: 440, bx: 1100, by: 440, t: T }, // 13
    { ax: 1300, ay: 700, bx: 1300, by: 740, t: T }, // 14 its right wall, over the high passage
    { ax: 1300, ay: 860, bx: 1300, by: 1100, t: T }, // 15 under it
    { ax: 1300, ay: 740, bx: 1480, by: 740, t: T }, // 16 passage ceiling
    { ax: 1300, ay: 860, bx: 1400, by: 860, t: T }, // 17 passage floor
    { ax: 1400, ay: 860, bx: 1400, by: 1600, t: T }, // 18 the shaft's left wall, down to the last hall
    { ax: 1480, ay: 740, bx: 1480, by: 1360, t: T }, // 19 the shaft's right wall
    { ax: 1480, ay: 1360, bx: 1652, by: 1360, t: T }, // 20 last hall's ceiling
    { ax: 1652, ay: 1260, bx: 1652, by: 1360, t: T }, // 21 the crate's alcove
    { ax: 1728, ay: 1260, bx: 1728, by: 1360, t: T }, // 22
    { ax: 1652, ay: 1260, bx: 1728, by: 1260, t: T }, // 23
    { ax: 1728, ay: 1360, bx: 2120, by: 1360, t: T }, // 24 last hall's ceiling
    { ax: 2120, ay: 1360, bx: 2120, by: 1600, t: T }, // 25 right wall
    { ax: 1400, ay: 1600, bx: 1632, by: 1600, t: T }, // 26 the floor from the shaft's foot to the pit
    { ax: 1632, ay: 1600, bx: 1632, by: 1684, t: T }, // 27 the porcupine's pit, too deep to climb out of
    { ax: 1632, ay: 1684, bx: 1748, by: 1684, t: T }, // 28
    { ax: 1748, ay: 1600, bx: 1748, by: 1684, t: T }, // 29
    { ax: 1748, ay: 1600, bx: 2120, by: 1600, t: T }, // 30 the floor on to the chest
    { ax: 40, ay: 900, bx: 140, by: 900, t: T }, // 31 the ledge with the bonus gold
    { ax: 220, ay: 800, bx: 220, by: 852, t: T }, // 32 over Nib's gate
    { ax: 2010, ay: 1460, bx: 2120, by: 1460, t: T }, // 33 the chest's ledge
  ],
  bars: [8, 31, 32, 33],
  pins: [
    { id: 'C', ax: 596, ay: 560, bx: 364, by: 560, t: PIN_T },
    { id: 'L', ax: 596, ay: 660, bx: 364, by: 660, t: PIN_T },
    { id: 'G', ax: 220, ay: 860, bx: 220, by: 1094, t: PIN_T },
    { id: 'V', ax: 1116, ay: 640, bx: 884, by: 640, t: PIN_T },
    { id: 'H', ax: 700, ay: 968, bx: 700, by: 1094, t: PIN_T },
    { id: 'K', ax: 1760, ay: 1352, bx: 1640, by: 1352, t: PIN_T },
  ],
  fills: [
    { kind: WATER, x0: 388, x1: 572, y1: 553, count: 60 },
    { kind: LAVA, x0: 388, x1: 572, y1: 653, count: 100 },
    { kind: WATER, x0: 908, x1: 1092, y1: 633, count: 150 },
    { kind: COIN, x0: 48, x1: 124, y1: 892, count: 18 },
    { kind: COIN, x0: 720, x1: 850, y1: 1092, count: 30 },
    { kind: COIN, x0: 1150, x1: 1240, y1: 1092, count: 30 },
    { kind: COIN, x0: 2020, x1: 2110, y1: 1592, count: 30 },
  ],
  crates: [{ x: 1690, y: 1323 }],
  nib: { x: 100, y: 1068 },
  blots: [
    { x: 460, y: 1070 },
    { x: 1000, y: 1070 },
    { x: 1690, y: 1654, spiky: true },
  ],
  chest: { x: 2080, y: 1430 },
  coinsNeeded: 80,
  vines: [
    { x: 176, top: 892, bottom: 1092 },
    { x: 1266, top: 852, bottom: 1092 },
    { x: 1436, top: 852, bottom: 1592 },
    { x: 1976, top: 1452, bottom: 1592 },
  ],
  solution: ['L', 'C', 'G', 'V', 'K', 'H'],
  stops: [{ x: 600 }, { x: 1266, y: 850 }, { x: 1436, y: 1590 }, { x: 1900 }, { x: 2110 }, { x: 1976, y: 1450 }, { x: 2080 }],
  torches: [{ x: 120, y: 850 }, { x: 330, y: 860 }, { x: 640, y: 860 }, { x: 800, y: 780 }, { x: 1200, y: 780 }, { x: 1390, y: 800 }, { x: 1440, y: 1420 }, { x: 1850, y: 1420 }, { x: 2060, y: 1400 }],
  view: { x: 0, y: 190, w: 2160, h: 1560 },
};
