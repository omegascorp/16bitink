import type { LevelDef } from '../../logic/level';
import { COIN, LAVA, WATER } from '../../logic/particles';
import { CH2, PIN_T, T } from '../common';

/** The river under the walkway: its floor, and where the raft docks at its far end. */
const RIVER_Y = 960;
const DOCK_X = 1180;
/** Where the raft lies moored, far enough down the river that the spill lands well behind it. */
const BERTH = 860;
/** The armadillo's hall: where the bank ends, and the drain at the foot of its sloping floor. */
const HALL_X = 1420;
const DRAIN_X = 2040;

/**
 * Level 3: pour your own floor, and let the rest of the lava ferry the gold.
 * One tank of lava has three jobs, in the order it flows: it fills the gap
 * in front of Nib, spills down the slot into the river and carries the raft
 * (with the gold on it) to the dock, and its overflow runs on under the bank
 * into the armadillos' hall.
 * 1. The gap: an armadillo paces its floor, and Nib waits behind his gate G.
 *    Let him out before the lava and he drops onto the armadillo's spikes.
 * 2. Pour it: the lava tank L empties slowly into the gap. It scorches the
 *    armadillo there, fills the gap to its lip, and the rest spills down the
 *    slot into the river, behind the moored raft: a long, steady push that
 *    carries the raft and its three coins to the dock. The overflow at the
 *    river's end runs down a channel into the hall and scorches the second
 *    armadillo on its sloping floor, then drains away.
 * 3. Cool it: the cistern under Nib's floor (W) opens at the foot of the gap.
 *    Its water meets the hot pool, a plug of stone seals the door, and the
 *    cold spreads through the resting lava: a stone bridge, while the river,
 *    below the slot, stays hot. Cool too early (W before L) and the lava
 *    lands on water: stone tumbles down the slot with the spill, the river
 *    sets around the raft and strands it, and its gold melts or is lost.
 *    Open G on the hot pool and Nib walks into it.
 * 4. The hall's gold (K) waits over the lava's path. Drop it before the lava
 *    has come and gone and the armadillo still living there kicks it down
 *    the drain (or the overflow melts it).
 * Nib crosses the bridge and the walkway, drops onto the docked raft for its
 * gold, and climbs onto the bank and down into the hall to the chest.
 * Winning orders: L, W, G with K any time after L (L, W, K, G is the hint).
 */
export const STONE_BRIDGE: LevelDef = {
  id: 'stone-bridge',
  chapter: CH2,
  ruin: 'volcano',
  name: 'The Stone Bridge',
  goal: 'Bridge the gap, take the chest and pick up 15 coins',
  tip: 'Lava fills the gap first, and the rest spills down into the river. Let it carry the raft to the dock before you cool the gap.',
  rooms: [
    // The shrine: Nib's ledge over the cistern, the gap, the river under the walkway, the bank and the armadillo's hall.
    [
      [40, 300], [2100, 300], [2100, 1110], [DRAIN_X, 1110], [DRAIN_X, 1090], [HALL_X, 1010], [HALL_X, 880], [DOCK_X, 880],
      [DOCK_X, RIVER_Y], [600, RIVER_Y], [600, 900], [380, 900], [380, 860], [40, 800],
    ],
    // The overflow's channel under the bank.
    [[DOCK_X, 892], [HALL_X, 892], [HALL_X, 1000], [DOCK_X, 940]],
  ],
  walls: [
    { ax: 40, ay: 300, bx: 2100, by: 300, t: T }, // 0 ceiling
    { ax: 40, ay: 300, bx: 40, by: 800, t: T }, // 1 left wall
    { ax: 40, ay: 756, bx: 380, by: 756, t: T }, // 2 Nib's floor
    { ax: 380, ay: 300, bx: 380, by: 640, t: T }, // 3 over G
    { ax: 380, ay: 756, bx: 380, by: 812, t: T }, // 4 gap, over the cistern's door
    { ax: 40, ay: 800, bx: 380, by: 860, t: T }, // 5 the cistern's floor, tipped toward its door
    { ax: 380, ay: 860, bx: 380, by: 900, t: T }, // 6 under its door
    { ax: 380, ay: 900, bx: 600, by: 900, t: T }, // 7 the gap's floor
    { ax: 600, ay: 800, bx: 600, by: RIVER_Y, t: T }, // 8 lip
    { ax: 640, ay: 800, bx: DOCK_X - 72, by: 800, t: T }, // 9 walkway, past the spillway slot
    { ax: 640, ay: 800, bx: 640, by: 860, t: T }, // 10 the slot's far side
    { ax: 600, ay: RIVER_Y, bx: DOCK_X, by: RIVER_Y, t: T }, // 11 river floor
    { ax: DOCK_X, ay: 880, bx: DOCK_X, by: 892, t: T }, // 12 river end, with the overflow under the bank
    { ax: DOCK_X, ay: 932, bx: DOCK_X, by: RIVER_Y, t: T }, // 13 under the overflow
    { ax: DOCK_X, ay: 940, bx: HALL_X, by: 994, t: T }, // 14 the overflow's channel under the bank, down to the armadillo's hall
    { ax: DOCK_X, ay: 880, bx: HALL_X, by: 880, t: T }, // 15 bank
    { ax: HALL_X, ay: 880, bx: HALL_X, by: 900, t: T }, // 16 the bank's end, over the channel's mouth
    { ax: HALL_X, ay: 1010, bx: DRAIN_X, by: 1090, t: T }, // 17 the hall's sloping floor
    { ax: DRAIN_X, ay: 1090, bx: DRAIN_X, by: 1110, t: T }, // 18 the drain at its foot
    { ax: DRAIN_X, ay: 1110, bx: 2100, by: 1110, t: T }, // 19 the drain's floor, on to the right wall
    { ax: 2100, ay: 300, bx: 2100, by: 1110, t: T }, // 20 right wall
    { ax: HALL_X, ay: 994, bx: HALL_X, by: 1010, t: T }, // 21 under the channel's mouth
    { ax: 1660, ay: 860, bx: 1660, by: 960, t: T }, // 22 the gold's hopper
    { ax: 1740, ay: 860, bx: 1740, by: 960, t: T }, // 23
    { ax: 392, ay: 380, bx: 392, by: 538, t: T }, // 24 lava tank left
    { ax: 592, ay: 380, bx: 592, by: 538, t: T }, // 25 lava tank right
    { ax: 392, ay: 538, bx: 550, by: 538, t: T }, // 26 lava tank floor, its spout at the right
  ],
  bars: [2, 3, 4, 8, 9, 10, 22, 23, 24, 25, 26],
  pins: [
    { id: 'K', ax: 1652, ay: 968, bx: 1748, by: 968, t: PIN_T },
    { id: 'G', ax: 380, ay: 648, bx: 380, by: 750, t: PIN_T },
    { id: 'W', ax: 380, ay: 852, bx: 380, by: 820, t: PIN_T },
    { id: 'L', ax: 604, ay: 546, bx: 540, by: 546, t: PIN_T },
  ],
  fills: [
    { kind: WATER, x0: 160, x1: 372, y1: 830, count: 140 },
    { kind: LAVA, x0: 400, x1: 584, y1: 530, count: 238 },
    { kind: LAVA, x0: 608, x1: DOCK_X - 8, y1: RIVER_Y - 8, count: 222 },
    { kind: COIN, x0: BERTH - 28, x1: BERTH - 16, y1: 896, count: 1 }, // the cargo: three single coins 22 px apart, so they never touch (a heap on a deck sheds coins into the lava)
    { kind: COIN, x0: BERTH - 6, x1: BERTH + 6, y1: 896, count: 1 },
    { kind: COIN, x0: BERTH + 16, x1: BERTH + 28, y1: 896, count: 1 },
    { kind: COIN, x0: 1676, x1: 1724, y1: 960, count: 12 }, // the hall's gold, over the lava's path
  ],
  rafts: [{ x: BERTH, y: 912 }],
  nib: { x: 100, y: 724 },
  drains: [{ x0: DRAIN_X + 4, x1: 2096, y0: 1094, y1: 1106 }],
  blots: [
    { x: 490, y: 860, animal: 'armadillo' }, // in the gap
    { x: 1560, y: 1010, animal: 'armadillo' }, // in the hall
  ],
  chest: { x: 1960, y: 1070 },
  coinsNeeded: 15,
  solution: ['L', 'W', 'K', 'G'],
  stops: [{ x: DOCK_X - 90 }, { x: DOCK_X - 44 }, { x: 1300 }, { x: 1700 }, { x: 1960 }],
  torches: [{ x: 120, y: 660 }, { x: 330, y: 460 }, { x: 760, y: 700 }, { x: 1050, y: 700 }, { x: 1320, y: 800 }, { x: 1560, y: 920 }, { x: 1880, y: 960 }, { x: 2040, y: 820 }],
  view: { x: 0, y: 260, w: 2140, h: 900 },
};
