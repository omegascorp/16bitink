import type { LevelDef } from '../logic/level';
import { COIN, WATER } from '../logic/particles';
import { CH1, PIN_T, T } from './common';

/** The lock room's floor, and the ledge past its crate pit (70 px higher). */
const LF = 1300;
const LEDGE = 1230;
/** The crate pit's near wall: 64 px clear to the far one, room for the crate (52) and a little water. */
const PIT = 1124;
/** Top of the overflow slot: the pit's water can rise no higher (about 60 px under the ledge). */
const SPILL = 1290;

/**
 * Level 3: one tank of rain, used twice on its way down through the temple.
 * 1. The cistern: Nib floats up out of it on the rain W, once the boulder S
 *    has plugged its drain (the rain brings gold with it, which runs away
 *    down an open drain).
 * 2. The crate pit: a high ledge at the end of the lock room, too high to
 *    climb, with a crate at the bottom of a narrow pit at its foot. The
 *    sluice X lets the cistern's top water down a pipe into the lock room;
 *    it fills the pit and the crate floats up on it, a step to the ledge.
 *    Pull X while Nib is still down the cistern and the water leaves without
 *    him.
 * 3. The hopper: the gold G hangs over a ramp R that runs down to a drain.
 *    Ramp first, and the gold falls to the floor by the chest.
 * Winning order: S, W, X, R, G (R and G any time, R before G; X once Nib is
 * out of the cistern).
 */
export const CISTERN: LevelDef = {
  id: 'cistern',
  chapter: CH1,
  name: 'The Rain Cistern',
  goal: 'Take the chest and pick up 90 coins',
  tip: 'Nib floats, and so do crates! Fill the pit and the crate rises: a step up to the ledge.',
  rooms: [
    // The rain tank and the cistern.
    [[40, 350], [270, 350], [270, 560], [450, 560], [450, 1100], [396, 1100], [396, 1130], [324, 1130], [324, 1100], [270, 1100], [270, 774], [40, 500]],
    [[450, 780], [800, 780], [800, 908], [450, 908]], // the ledge's passage
    [[450, 984], [800, LF - 76], [800, LF - 20], [450, 1036]], // the sluice pipe down to the lock room
    // The lock room, with the crate's pit at the foot of the ledge.
    [[800, 780], [1204, 780], [1204, 1460], [PIT, 1460], [PIT, LF], [800, LF - 20]],
    [[1204, 1110], [1400, 1110], [1400, LEDGE], [1204, LEDGE]], // the corridor from the ledge
    [[1204, SPILL - 8], [1270, SPILL - 8], [1270, SPILL + 60], [1204, SPILL + 60]], // the overflow
    [[1320, 1020], [1400, 1020], [1400, 1080], [1320, 1080]], // the drain at the ramp's foot
    // The hopper's hall, with the chest at the end.
    [[1400, 760], [1600, 760], [1600, 1110], [1760, 1110], [1760, LEDGE], [1400, LEDGE]],
  ],
  walls: [
    { ax: 40, ay: 350, bx: 270, by: 350, t: T }, // 0 tank ceiling
    { ax: 40, ay: 350, bx: 40, by: 510, t: T }, // 1 tank's back wall
    { ax: 40, ay: 500, bx: 270, by: 774, t: T }, // 2 tank floor, steep, so the gold slides straight out
    { ax: 270, ay: 350, bx: 270, by: 690, t: T }, // 3 between the tank and the cistern, over the outlet
    { ax: 270, ay: 774, bx: 270, by: 1100, t: T }, // 4 cistern's left wall
    { ax: 270, ay: 560, bx: 450, by: 560, t: T }, // 5 cistern ceiling
    { ax: 450, ay: 560, bx: 450, by: 780, t: T }, // 6 cistern's right wall, over the ledge
    { ax: 450, ay: 908, bx: 450, by: 984, t: T }, // 7 under the ledge, over the sluice
    { ax: 450, ay: 1036, bx: 450, by: 1100, t: T }, // 8 under the sluice: the water below it stays
    { ax: 270, ay: 1100, bx: 324, by: 1100, t: T }, // 9 cistern floor
    { ax: 396, ay: 1100, bx: 450, by: 1100, t: T }, // 10 cistern floor
    { ax: 324, ay: 1100, bx: 324, by: 1130, t: T }, // 11 a boulder-sized dip with the drain in it
    { ax: 396, ay: 1100, bx: 396, by: 1130, t: T }, // 12
    { ax: 324, ay: 1130, bx: 396, by: 1130, t: T }, // 13 a solid floor: water never seeps past the boulder
    { ax: 450, ay: 780, bx: 1204, by: 780, t: T }, // 14 passage ceiling, on over the lock room
    { ax: 450, ay: 908, bx: 800, by: 908, t: T }, // 15 the ledge and its passage
    { ax: 450, ay: 984, bx: 800, by: LF - 76, t: T }, // 16 sluice pipe ceiling (too low for Nib)
    { ax: 450, ay: 1036, bx: 800, by: LF - 20, t: T }, // 17 sluice pipe floor, down to the lock room's floor
    { ax: 800, ay: 908, bx: 800, by: LF - 76, t: T }, // 18 lock room's left wall
    { ax: 800, ay: LF - 20, bx: PIT, by: LF, t: T }, // 19 lock room floor, sloping down to the pit
    { ax: PIT, ay: LF, bx: PIT, by: 1460, t: T }, // 20 the crate's pit: just wide enough for it, so the water stands deep
    { ax: PIT, ay: 1460, bx: 1204, by: 1460, t: T }, // 21
    { ax: 1204, ay: LEDGE, bx: 1204, by: SPILL - 8, t: T }, // 22 the pit's far side, up to the ledge (over the overflow)
    { ax: 1204, ay: 780, bx: 1204, by: 1110, t: T }, // 23 lock room's right wall, over the corridor
    { ax: 1204, ay: 1110, bx: 1400, by: 1110, t: T }, // 24 corridor ceiling
    { ax: 1204, ay: LEDGE, bx: 1760, by: LEDGE, t: T }, // 25 the ledge, the corridor and the hall's floor
    { ax: 1400, ay: 760, bx: 1600, by: 760, t: T }, // 26 hopper ceiling
    { ax: 1400, ay: 760, bx: 1400, by: 1020, t: T }, // 27 hall's left wall, over the ramp's drain
    { ax: 1320, ay: 1020, bx: 1400, by: 1020, t: T }, // 28 the ramp's drain
    { ax: 1320, ay: 1020, bx: 1320, by: 1080, t: T }, // 29
    { ax: 1320, ay: 1080, bx: 1400, by: 1080, t: T }, // 30
    { ax: 1400, ay: 1080, bx: 1400, by: 1110, t: T }, // 31 between the drain and the corridor
    { ax: 1600, ay: 760, bx: 1600, by: 1110, t: T }, // 32 hall's right wall, over the chest
    { ax: 1600, ay: 1110, bx: 1760, by: 1110, t: T }, // 33 the chest's nook
    { ax: 1760, ay: 1110, bx: 1760, by: LEDGE, t: T }, // 34
    // The overflow: a slot in the pit's far side into a drain, so the water stands at SPILL, high enough
    // to float the crate up as a step to the ledge, too low to float Nib onto it.
    { ax: 1204, ay: SPILL + 28, bx: 1204, by: 1460, t: T }, // 35 the pit's far side, under the overflow
    { ax: 1204, ay: SPILL - 8, bx: 1270, by: SPILL - 8, t: T }, // 36 the overflow's ceiling
    { ax: 1270, ay: SPILL - 8, bx: 1270, by: SPILL + 60, t: T }, // 37
    { ax: 1204, ay: SPILL + 60, bx: 1270, by: SPILL + 60, t: T }, // 38 its floor
  ],
  bars: [3],
  pins: [
    { id: 'W', ax: 270, ay: 772, bx: 270, by: 698, t: PIN_T },
    { id: 'S', ax: 470, ay: 650, bx: 262, by: 650, t: PIN_T },
    { id: 'X', ax: 450, ay: 990, bx: 450, by: 1030, t: PIN_T },
    { id: 'G', ax: 1380, ay: 860, bx: 1620, by: 860, t: PIN_T },
    { id: 'R', ax: 1616, ay: 890, bx: 1396, by: 1060, t: PIN_T },
  ],
  fills: [
    { kind: COIN, x0: 150, x1: 262, y1: 640, count: 60 },
    { kind: WATER, x0: 48, x1: 262, y1: 560, count: 360 },
    { kind: COIN, x0: 1408, x1: 1592, y1: 853, count: 60 },
  ],
  boulders: [{ x: 360, y: 616 }],
  crates: [{ x: (PIT + 1204) / 2, y: 1426 }],
  // Anything that gets down into the dip is gone, unless the boulder fills it.
  drains: [
    { x0: 332, x1: 388, y0: 1106, y1: 1170 },
    { x0: 1328, x1: 1392, y0: 1026, y1: 1080 },
    { x0: 1214, x1: 1262, y0: SPILL + 4, y1: SPILL + 56 }, // the overflow's
  ],
  nib: { x: 302, y: 1068 },
  blots: [],
  chest: { x: 1720, y: LEDGE - 30 },
  coinsNeeded: 90,
  solution: ['S', 'W', 'X', 'R', 'G'],
  stops: [{ x: 1000 }, { x: 1300 }, { x: 1500 }, { x: 1720 }],
  torches: [{ x: 600, y: 840 }, { x: 150, y: 470 }, { x: 950, y: 900 }, { x: 1300, y: 1160 }, { x: 1500, y: 1100 }, { x: 1680, y: 1160 }],
  view: { x: 0, y: 190, w: 1800, h: 1320 },
};
