import type { LevelDef } from '../logic/level';
import { COIN, WATER } from '../logic/particles';
import { CH1, PIN_T, T } from './common';

/**
 * Level 8, Loot: the flooded stair, where the crates ride the water down.
 * One rain tank (W) floods the stair from the top, and three crates each
 * have their own job on the way down.
 * 1. The top step: a crate stands at the edge of the drop. The flood lifts
 *    it off the edge and down the drop into the slot at the bottom, a
 *    crate's width and too deep to climb out of (water runs out through a
 *    grate in its floor), where it wedges as the bridge.
 * 2. The well: the flood runs on along a shelf into a deep well under the
 *    far ledge, too high to climb or float up to. The well's own crate rides
 *    up on the water and is the step; a gap low in the well's side lets the
 *    rest run off to a grate, so the water stops at just that height.
 * 3. The porcupine's slot: a crate hangs over it on a pin (X). Drop it and
 *    it squashes the porcupine flat and fills the slot.
 * Open Nib's door (N) last: let out before the porcupine's crate falls (or
 * before the flood, which carries Nib along), Nib walks into the porcupine.
 * Winning orders: W, X, N or X, W, N.
 */
export const STAIR: LevelDef = {
  id: 'stair',
  chapter: CH1,
  name: 'The Flooded Stair',
  goal: 'Pick up 90 coins',
  rooms: [
    [
      [40, 340], [720, 340], [720, 736], [1000, 736], [1000, 680], [2000, 680], [2000, 860], [1172, 860], [1172, 930], [1100, 930], [1100, 860],
      [1000, 860], [1000, 900], [900, 900], [900, 1080], [804, 1080], [804, 980], [600, 980], [600, 700], [40, 700],
    ],
    [[540, 950], [600, 950], [600, 1040], [540, 1040]],
  ],
  walls: [
    { ax: 40, ay: 340, bx: 720, by: 340, t: T }, // 0 ceiling
    { ax: 40, ay: 340, bx: 40, by: 700, t: T }, // 1 left wall
    { ax: 40, ay: 700, bx: 600, by: 700, t: T }, // 2 the top step
    { ax: 720, ay: 340, bx: 720, by: 736, t: T }, // 3 the drop's far side
    { ax: 720, ay: 736, bx: 1000, by: 736, t: T }, // 4 ceiling
    { ax: 1000, ay: 736, bx: 1000, by: 680, t: T }, // 5
    { ax: 1000, ay: 680, bx: 2000, by: 680, t: T }, // 6
    { ax: 2000, ay: 680, bx: 2000, by: 860, t: T }, // 7 right wall
    { ax: 1172, ay: 860, bx: 2000, by: 860, t: T }, // 8 the bottom step
    { ax: 1172, ay: 860, bx: 1172, by: 930, t: T }, // 9 the porcupine's slot
    { ax: 1100, ay: 930, bx: 1172, by: 930, t: T }, // 10
    { ax: 1100, ay: 930, bx: 1100, by: 860, t: T }, // 11
    { ax: 900, ay: 900, bx: 1000, by: 900, t: T }, // 12 the far ledge, and a step up off it: the well's water never gets this far
    { ax: 1000, ay: 900, bx: 1000, by: 860, t: T }, // 13
    { ax: 1000, ay: 860, bx: 1100, by: 860, t: T }, // 14
    { ax: 900, ay: 900, bx: 900, by: 1080, t: T }, // 15 the well
    { ax: 804, ay: 1080, bx: 900, by: 1080, t: T }, // 16
    { ax: 804, ay: 980, bx: 804, by: 1080, t: T }, // 17
    { ax: 600, ay: 980, bx: 804, by: 980, t: T }, // 18 where the well overflows
    { ax: 600, ay: 700, bx: 600, by: 950, t: T }, // 19 the drop's near side
    { ax: 540, ay: 950, bx: 600, by: 950, t: T }, // 20 a sump with a grate, under the overflow
    { ax: 540, ay: 950, bx: 540, by: 1040, t: T }, // 21
    { ax: 540, ay: 1040, bx: 600, by: 1040, t: T }, // 22
    { ax: 600, ay: 980, bx: 600, by: 1040, t: T }, // 23
    // The slot at the foot of the drop, a crate's width, and a ramp out of it to the well.
    { ax: 672, ay: 840, bx: 672, by: 892, t: T }, // 24
    { ax: 600, ay: 892, bx: 616, by: 892, t: T }, // 25 a grate in its floor
    { ax: 656, ay: 892, bx: 672, by: 892, t: T }, // 26
    { ax: 672, ay: 840, bx: 720, by: 808, t: T }, // 27
    { ax: 720, ay: 808, bx: 830, by: 808, t: T }, // 28 a shelf over the well
    { ax: 804, ay: 830, bx: 804, by: 930, t: T }, // 29 the well's side, with a gap under it: the well overflows at just this height
    // The rain tank.
    { ax: 216, ay: 340, bx: 216, by: 560, t: T }, // 30
    { ax: 460, ay: 340, bx: 460, by: 560, t: T }, // 31
    // Nib's room.
    { ax: 40, ay: 560, bx: 200, by: 560, t: T }, // 32
  ],
  bars: [24, 25, 26, 27, 28, 29, 30, 31, 32],
  pins: [
    { id: 'N', ax: 200, ay: 568, bx: 200, by: 692, t: PIN_T },
    { id: 'W', ax: 468, ay: 568, bx: 224, by: 568, t: PIN_T },
    { id: 'X', ax: 1190, ay: 790, bx: 1116, by: 790, t: PIN_T },
  ],
  fills: [
    { kind: WATER, x0: 224, x1: 452, y1: 560, count: 380 },
    { kind: COIN, x0: 1700, x1: 1990, y1: 852, count: 100 },
  ],
  crates: [{ x: 560, y: 666 }, { x: 852, y: 1046 }, { x: 1136, y: 756 }],
  drains: [{ x0: 548, x1: 592, y0: 990, y1: 1036 }],
  nib: { x: 110, y: 668 },
  blots: [{ x: 1136, y: 900, spiky: true }],
  coinsNeeded: 90,
  solution: ['W', 'X', 'N'],
  stops: [{ x: 500 }, { x: 760 }, { x: 860 }, { x: 1000 }, { x: 1400 }, { x: 1800 }, { x: 1990 }],
  torches: [{ x: 120, y: 480 }, { x: 500, y: 480 }, { x: 700, y: 950 }, { x: 1300, y: 830 }, { x: 1700, y: 830 }],
  view: { x: 0, y: 190, w: 2040, h: 940 },
};
