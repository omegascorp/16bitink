import type { LevelDef } from '../logic/level';
import { COIN, LAVA, WATER } from '../logic/particles';
import { CH1, PIN_T, T } from './common';

/**
 * Level 4: three guards between Nib and the chest, each beaten its own way,
 * and one big tank of water with two jobs.
 * 1. Burn: the first boar paces the first hall, under a shaft with a small
 *    tank of lava L and a big tank of water W stacked on top of it. The big
 *    water right over the boar is the obvious pull, and the trap: it lands on
 *    the lava still in its tank, which sets there as stone (and holds the
 *    water up for good), so the boar lives and Nib walks into it. Lava first:
 *    it pours down, scorches the boar and lies hot across the hall.
 * 2. Cool, and keep the water: then W falls through the empty lava tank and
 *    turns the pool to stone, and the rest of it stays in the first hall,
 *    held there by Nib's gate G on one side and the dam D on the other.
 *    G is pinned shut by L's pin until the lava is out. Open G on the hot
 *    pool and the lava runs into Nib's corner. Open D before the water has
 *    cooled the pool and the lava runs through into the second hall and
 *    melts its gold (with D open from the start, as soon as L is pulled).
 * 3. Wash: D lets the water on into the second hall, where it washes the
 *    second boar away. Open G before D and the water runs down into Nib's
 *    corner, below the new stone, and too little is left for the boar.
 * 4. Squash: a porcupine paces a pit on the way to the chest. Drop the crate
 *    K on it: the crate squashes it and stays in the pit as a step to climb
 *    out on. Let Nib out before that and he drops onto the spikes.
 * The chest is up a vine on a ledge at the far end.
 * Winning orders: L, W, D, G, with K any time before G (L, W, D, K, G is the hint).
 */
export const GUARD: LevelDef = {
  id: 'guard',
  chapter: CH1,
  name: 'The Guard',
  goal: 'Get past three guards, take the chest and pick up 88 coins',
  tip: 'Lava scorches a guard and water cools lava to stone. Keep the water in the first hall until it has a guard to wash.',
  rooms: [
    [[40, 800], [700, 800], [700, 1100], [40, 1100]], // Nib's corner and the first hall
    [[380, 380], [580, 380], [580, 800], [380, 800]], // the shaft: the big tank of water over the lava
    [[700, 700], [1300, 700], [1300, 1100], [700, 1100]], // the second boar's hall
    [[1300, 740], [1480, 740], [1480, 860], [1300, 860]], // the high passage
    [[1400, 860], [1480, 860], [1480, 1360], [1400, 1360]], // the shaft down
    // The porcupine's hall: the crate's alcove over the pit, and the chest's ledge.
    [[1400, 1360], [1652, 1360], [1652, 1260], [1728, 1260], [1728, 1360], [2120, 1360], [2120, 1600], [1748, 1600], [1748, 1684], [1632, 1684], [1632, 1600], [1400, 1600]],
  ],
  walls: [
    { ax: 40, ay: 800, bx: 380, by: 800, t: T }, // 0 ceiling over Nib's corner
    { ax: 40, ay: 800, bx: 40, by: 1100, t: T }, // 1 left wall
    { ax: 40, ay: 1100, bx: 1300, by: 1100, t: T }, // 2 floor of the first two halls
    { ax: 380, ay: 380, bx: 380, by: 800, t: T }, // 3 the shaft
    { ax: 580, ay: 380, bx: 580, by: 800, t: T }, // 4
    { ax: 380, ay: 380, bx: 580, by: 380, t: T }, // 5
    { ax: 580, ay: 800, bx: 700, by: 800, t: T }, // 6 the first hall's ceiling
    { ax: 700, ay: 700, bx: 700, by: 800, t: T }, // 7 the second hall's left wall
    { ax: 700, ay: 800, bx: 700, by: 960, t: T }, // 8 between the halls, over the dam
    { ax: 700, ay: 700, bx: 1300, by: 700, t: T }, // 9 second hall's ceiling
    { ax: 1300, ay: 700, bx: 1300, by: 740, t: T }, // 10 its right wall, over the high passage
    { ax: 1300, ay: 860, bx: 1300, by: 1100, t: T }, // 11 under it
    { ax: 1300, ay: 740, bx: 1480, by: 740, t: T }, // 12 passage ceiling
    { ax: 1300, ay: 860, bx: 1400, by: 860, t: T }, // 13 passage floor
    { ax: 1400, ay: 860, bx: 1400, by: 1600, t: T }, // 14 the shaft's left wall, down to the last hall
    { ax: 1480, ay: 740, bx: 1480, by: 1360, t: T }, // 15 the shaft's right wall
    { ax: 1480, ay: 1360, bx: 1652, by: 1360, t: T }, // 16 last hall's ceiling
    { ax: 1652, ay: 1260, bx: 1652, by: 1360, t: T }, // 17 the crate's alcove
    { ax: 1728, ay: 1260, bx: 1728, by: 1360, t: T }, // 18
    { ax: 1652, ay: 1260, bx: 1728, by: 1260, t: T }, // 19
    { ax: 1728, ay: 1360, bx: 2120, by: 1360, t: T }, // 20 last hall's ceiling
    { ax: 2120, ay: 1360, bx: 2120, by: 1600, t: T }, // 21 right wall
    { ax: 1400, ay: 1600, bx: 1632, by: 1600, t: T }, // 22 the floor from the shaft's foot to the pit
    { ax: 1632, ay: 1600, bx: 1632, by: 1684, t: T }, // 23 the porcupine's pit, too deep to climb out of
    { ax: 1632, ay: 1684, bx: 1748, by: 1684, t: T }, // 24
    { ax: 1748, ay: 1600, bx: 1748, by: 1684, t: T }, // 25
    { ax: 1748, ay: 1600, bx: 2120, by: 1600, t: T }, // 26 the floor on to the chest
    { ax: 40, ay: 900, bx: 140, by: 900, t: T }, // 27 the ledge with the bonus gold
    { ax: 380, ay: 800, bx: 380, by: 864, t: T }, // 28 over Nib's gate
    { ax: 2010, ay: 1460, bx: 2120, by: 1460, t: T }, // 29 the chest's ledge
  ],
  bars: [8, 27, 28, 29],
  pins: [
    { id: 'W', ax: 596, ay: 580, bx: 364, by: 580, t: PIN_T },
    // L reaches over Nib's gate: G can't slide up until L is out.
    { id: 'L', ax: 596, ay: 660, bx: 364, by: 660, t: PIN_T },
    { id: 'G', ax: 380, ay: 872, bx: 380, by: 1094, t: PIN_T },
    { id: 'D', ax: 700, ay: 968, bx: 700, by: 1094, t: PIN_T },
    { id: 'K', ax: 1760, ay: 1352, bx: 1640, by: 1352, t: PIN_T },
  ],
  fills: [
    { kind: WATER, x0: 388, x1: 572, y1: 573, count: 330 }, // the big tank: cools the pool, then washes the second boar
    { kind: LAVA, x0: 388, x1: 572, y1: 653, count: 100 },
    { kind: COIN, x0: 48, x1: 124, y1: 892, count: 6 },
    { kind: COIN, x0: 704, x1: 800, y1: 1092, count: 44 }, // just past the dam, where hot lava would reach first
    { kind: COIN, x0: 1150, x1: 1240, y1: 1092, count: 20 },
    { kind: COIN, x0: 2020, x1: 2110, y1: 1592, count: 30 },
  ],
  crates: [{ x: 1690, y: 1323 }],
  nib: { x: 100, y: 1068 },
  blots: [
    { x: 540, y: 1070 },
    { x: 1000, y: 1070 },
    { x: 1690, y: 1654, spiky: true },
  ],
  chest: { x: 2080, y: 1430 },
  coinsNeeded: 88,
  vines: [
    { x: 176, top: 892, bottom: 1092 },
    { x: 1266, top: 852, bottom: 1092 },
    { x: 1436, top: 852, bottom: 1592 },
    { x: 1976, top: 1452, bottom: 1592 },
  ],
  solution: ['L', 'W', 'D', 'K', 'G'],
  stops: [{ x: 640 }, { x: 1180 }, { x: 1266, y: 850 }, { x: 1436, y: 1590 }, { x: 1900 }, { x: 2110 }, { x: 1976, y: 1450 }, { x: 2080 }],
  torches: [{ x: 120, y: 850 }, { x: 300, y: 860 }, { x: 640, y: 860 }, { x: 800, y: 780 }, { x: 1200, y: 780 }, { x: 1390, y: 800 }, { x: 1440, y: 1420 }, { x: 1850, y: 1420 }, { x: 2060, y: 1400 }],
  view: { x: 0, y: 190, w: 2160, h: 1560 },
};
