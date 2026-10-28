import type { LevelDef } from '../logic/level';
import { COIN, LAVA, WATER } from '../logic/particles';
import { CH1, PIN_T, T } from './common';

/** The boss hall sits this far right, past the approach. */
const DX = 1400;

/**
 * Level 10, the boss. The approach is the chapter's finale, one stage for
 * each of its tricks, all set up while Nib's gate (G) holds him back:
 * 1. The crate raft: a crate bobs in a tank of water over a pit Nib can't
 *    climb out of. Let it down (K): the water runs out through the pit's
 *    grate and the crate settles in the pit, a bridge. Open the gate first
 *    and Nib walks into the pit, and the crate comes down on him.
 * 2. The lava moat: pour the tank (M) on it and it sets into a stone
 *    bridge; only then the gold over it (D), or the gold melts.
 * 3. The seed: Nib drops into the last room; its tank (S) grows the seed
 *    into a vine up to the tunnel to the idol hall.
 * 4. The Great Boar waits by the altar under Nib's ledge. It shrugs off a
 *    splash and dries as it goes, and the floor drains, so only all the
 *    water at once washes it away: let both tanks down into the cistern
 *    over it (B, A), then open the cistern (R). Open early, the cistern lets
 *    the tanks pour straight through its far end into the drain, missing
 *    the boar. The idol's gold (C) any time.
 * Winning order: K, M, D, G, S, then B, A, R, C (K and M in any order
 * before G, D after M, S any time).
 */
export const IDOL_HALL: LevelDef = {
  id: 'idol-hall',
  chapter: CH1,
  name: 'The Idol Hall',
  goal: 'Beat the Great Boar and take the idol',
  tip: 'A splash won’t do. Bring all the water down on the Great Boar at once.',
  rooms: [
    // The approach: Nib's landing, the crate's pit, the lava moat, and the seed's room down to the right.
    [
      [40, 330], [DX + 40, 330], [DX + 40, 1100], [1060, 1100], [1060, 640], [980, 640], [980, 704], [800, 704], [800, 640],
      [472, 640], [472, 760], [400, 760], [400, 640], [40, 640],
    ],
    // The idol hall.
    [[DX + 40, 330], [DX + 680, 330], [DX + 680, 1130], [DX + 564, 1130], [DX + 564, 1100], [DX + 540, 1100], [DX + 540, 1130], [DX + 400, 1130], [DX + 400, 1100], [DX + 40, 1100]],
  ],
  walls: [
    { ax: 40, ay: 330, bx: DX + 40, by: 330, t: T }, // 0 the approach's ceiling
    { ax: 40, ay: 330, bx: 40, by: 640, t: T }, // 1 its left wall
    { ax: 40, ay: 640, bx: 400, by: 640, t: T }, // 2 Nib's floor
    { ax: 400, ay: 340, bx: 400, by: 560, t: T }, // 3 the crate's tank
    { ax: 472, ay: 340, bx: 472, by: 560, t: T }, // 4
    { ax: 400, ay: 640, bx: 400, by: 760, t: T }, // 5 the pit under it, a grate in its floor
    { ax: 472, ay: 640, bx: 472, by: 760, t: T }, // 6
    { ax: 400, ay: 692, bx: 416, by: 692, t: T }, // 7
    { ax: 456, ay: 692, bx: 472, by: 692, t: T }, // 8
    { ax: 400, ay: 760, bx: 472, by: 760, t: T }, // 9
    { ax: 472, ay: 640, bx: 800, by: 640, t: T }, // 10 the floor up to the moat
    { ax: 620, ay: 616, bx: 620, by: 640, t: T }, // 11 a curb that keeps the crate's water from the moat
    { ax: 800, ay: 640, bx: 800, by: 704, t: T }, // 12 the lava moat
    { ax: 800, ay: 704, bx: 980, by: 704, t: T }, // 13
    { ax: 980, ay: 640, bx: 980, by: 704, t: T }, // 14
    { ax: 980, ay: 640, bx: 1060, by: 640, t: T }, // 15 the floor past it, to the drop
    { ax: 1036, ay: 616, bx: 1036, by: 640, t: T }, // 16 a curb at the edge
    { ax: 820, ay: 340, bx: 820, by: 540, t: T }, // 17 the moat's water tank
    { ax: 884, ay: 340, bx: 884, by: 540, t: T }, // 18
    { ax: 900, ay: 340, bx: 900, by: 520, t: T }, // 19 the moat's gold
    { ax: 964, ay: 340, bx: 964, by: 520, t: T }, // 20
    { ax: 1060, ay: 640, bx: 1060, by: 1100, t: T }, // 21 the seed's room
    { ax: 1060, ay: 1100, bx: DX + 40, by: 1100, t: T }, // 22
    { ax: 1116, ay: 340, bx: 1116, by: 500, t: T }, // 23 the seed's water tank
    { ax: 1172, ay: 340, bx: 1172, by: 500, t: T }, // 24
    { ax: 1180, ay: 800, bx: DX + 40, by: 800, t: T }, // 25 the tunnel to the idol hall
    { ax: 220, ay: 330, bx: 220, by: 512, t: T }, // 26 over Nib's gate
    // The idol hall, as it always was, shifted right; Nib comes in at the ledge.
    { ax: DX + 40, ay: 330, bx: DX + 680, by: 330, t: T }, // 27 ceiling
    { ax: DX + 40, ay: 330, bx: DX + 40, by: 700, t: T }, // 28 left wall, over the tunnel
    { ax: DX + 680, ay: 330, bx: DX + 680, by: 1130, t: T }, // 29 right wall
    { ax: DX + 40, ay: 1100, bx: DX + 400, by: 1100, t: T }, // 30 the hall floor
    { ax: DX + 400, ay: 1100, bx: DX + 400, by: 1130, t: T }, // 31 a wide drain under the cistern's far end
    { ax: DX + 400, ay: 1130, bx: DX + 540, by: 1130, t: T }, // 32
    { ax: DX + 540, ay: 1100, bx: DX + 540, by: 1130, t: T }, // 33
    { ax: DX + 540, ay: 1100, bx: DX + 564, by: 1100, t: T }, // 34
    { ax: DX + 556, ay: 1100, bx: DX + 556, by: 1070, t: T }, // 35 a curb, and a sunken corner that keeps the gold by the chest
    { ax: DX + 564, ay: 1100, bx: DX + 564, by: 1130, t: T }, // 36
    { ax: DX + 564, ay: 1130, bx: DX + 680, by: 1130, t: T }, // 37
    { ax: DX + 40, ay: 800, bx: DX + 140, by: 800, t: T }, // 38 Nib's ledge
    { ax: DX + 150, ay: 1100, bx: DX + 150, by: 1030, t: T }, // 39 the altar
    { ax: DX + 150, ay: 1030, bx: DX + 215, by: 1030, t: T }, // 40
    { ax: DX + 215, ay: 1030, bx: DX + 215, by: 1100, t: T }, // 41
    { ax: DX + 380, ay: 330, bx: DX + 380, by: 462, t: T }, // 42 the upper tank
    { ax: DX + 600, ay: 330, bx: DX + 600, by: 462, t: T }, // 43
    { ax: DX + 380, ay: 478, bx: DX + 380, by: 632, t: T }, // 44 the lower tank
    { ax: DX + 600, ay: 478, bx: DX + 600, by: 780, t: T }, // 45 ... and the cistern's far side under it
    { ax: DX + 216, ay: 660, bx: DX + 216, by: 780, t: T }, // 46 the cistern's near side, over the boar
    { ax: DX + 608, ay: 740, bx: DX + 608, by: 892, t: T }, // 47 the idol's gold, low by the right wall
    { ax: DX + 40, ay: 800, bx: DX + 40, by: 1100, t: T }, // 48 left wall, under the ledge
  ],
  bars: [3, 4, 7, 8, 11, 16, 17, 18, 19, 20, 23, 24, 25, 26, 35, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47],
  pins: [
    { id: 'G', ax: 220, ay: 520, bx: 220, by: 634, t: PIN_T },
    { id: 'K', ax: 492, ay: 568, bx: 380, by: 568, t: PIN_T },
    { id: 'M', ax: 800, ay: 548, bx: 892, by: 548, t: PIN_T },
    { id: 'D', ax: 984, ay: 528, bx: 892, by: 528, t: PIN_T },
    { id: 'S', ax: 1192, ay: 508, bx: 1096, by: 508, t: PIN_T },
    { id: 'B', ax: DX + 616, ay: 470, bx: DX + 372, by: 470, t: PIN_T },
    { id: 'A', ax: DX + 364, ay: 640, bx: DX + 608, by: 640, t: PIN_T },
    { id: 'R', ax: DX + 590, ay: 788, bx: DX + 216, by: 788, t: PIN_T },
    { id: 'C', ax: DX + 594, ay: 900, bx: DX + 676, by: 900, t: PIN_T },
  ],
  fills: [
    { kind: WATER, x0: 408, x1: 464, y1: 560, count: 40 },
    { kind: LAVA, x0: 808, x1: 972, y1: 696, count: 64 },
    { kind: WATER, x0: 828, x1: 876, y1: 540, count: 30 },
    { kind: COIN, x0: 908, x1: 956, y1: 520, count: 60 },
    { kind: WATER, x0: 1124, x1: 1164, y1: 500, count: 40 },
    { kind: WATER, x0: DX + 388, x1: DX + 592, y1: 462, count: 262 },
    { kind: WATER, x0: DX + 388, x1: DX + 592, y1: 632, count: 70 },
    { kind: COIN, x0: DX + 616, x1: DX + 672, y1: 892, count: 56 },
  ],
  crates: [{ x: 436, y: 456 }],
  drains: [
    { x0: 408, x1: 464, y0: 648, y1: 752 },
    { x0: DX + 408, x1: DX + 532, y0: 1104, y1: 1170 },
  ],
  nib: { x: 100, y: 608 },
  blots: [{ x: DX + 420, y: 1052, boss: true }],
  chest: { x: DX + 640, y: 1100 },
  coinsNeeded: 90,
  vines: [
    { x: 1144, top: 792, bottom: 1092, seed: true },
    { x: DX + 180, top: 792, bottom: 1022 },
  ],
  solution: ['K', 'M', 'D', 'G', 'S', 'B', 'A', 'R', 'C'],
  stops: [{ x: 600 }, { x: 1030 }, { x: 1100 }, { x: 1144, y: 790 }, { x: DX + 90 }, { x: DX + 180, y: 1020 }, { x: DX + 640 }],
  torches: [
    { x: 140, y: 560 },
    { x: 640, y: 560 },
    { x: 1020, y: 560 },
    { x: 1300, y: 1000 },
    { x: 1300, y: 720 },
    { x: DX + 90, y: 700 },
    { x: DX + 520, y: 960 },
    { x: DX + 300, y: 900 },
  ],
  view: { x: 0, y: 190, w: DX + 720, h: 990 },
};
