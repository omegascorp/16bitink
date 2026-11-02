import type { LevelDef } from '../logic/level';
import { COIN, LAVA, WATER } from '../logic/particles';
import { CH1, PIN_T, T } from './common';

/** The pit at the foot of the stair: its floor slopes down from the far ledge to the trapdoor under the boulder's shaft. */
const PIT_TOP = 950;
const PIT_FLOOR = 1060;
/** The porcupine's pen under the trapdoor, and the gold's floor below the pen's edge. */
const PEN = 1170;
const GOLD_FLOOR = 1250;

/**
 * Level 8, Loot, the chapter's Remix: one flood down the stair, a boulder
 * run, lava and a porcupine, and two pours of gold at the bottom.
 * 1. The flood: Nib's door (N) holds him in his room under the rain tank
 *    (W). The flood lifts the crate standing at the top step off the edge
 *    and down the drop into the slot at its foot, a crate's width (water
 *    runs out through a grate in its floor), where it wedges as the bridge;
 *    then it runs on along the shelf into the deep well under the far
 *    ledge, and the well's own crate rides up on it as the step to the
 *    ledge (a gap low in the well's side lets the rest run off to a sump,
 *    so the water stops at just that height). The far ledge rises away from
 *    the well, with a curb, so the flood's wave runs back and the pit
 *    beyond stays dry.
 * 2. The boulder run: high on the right a boulder sits on its run behind a
 *    stopper (B). Let go, it rolls down the run into a shaft and stops on
 *    the shaft's floor pin (K), right over the pit at the foot of the far
 *    ledge, where Nib waits; pull K and it drops into the pit onto the
 *    trapdoor (D). The porcupine paces its pen under the trapdoor: open D
 *    with the boulder on it and the boulder squashes the porcupine.
 *    Nib must stay out of its way: once the flood is down and his door is
 *    open he walks straight down the stair into the pit, under the shaft,
 *    and a boulder let down on him then squashes him. Open the trapdoor
 *    under him instead, before the boulder, and he drops onto the
 *    porcupine's spikes.
 * 3. The gold: one hopper over the pit (H) and one at the top of the ramp
 *    on the right (G), whose gold slides down to the floor below the pen's
 *    edge, where Nib ends up.
 * 4. The lava tank (L) hangs over the pit, right over the porcupine: the
 *    tempting pull. It does get the porcupine (with D open), but its lava
 *    pools in the pit and the pen on Nib's way down and melts any gold it
 *    meets; the flood never gets that far to cool it. Never pull it (or
 *    only once the gold is all picked up).
 * Winning order: B, K, W, N, H, D, G. The boulder must be down in the pit
 * (B and K, in either order; D too if you like) before Nib can walk there,
 * that is before the later of W and N; H and G any time; never L.
 */
export const STAIR: LevelDef = {
  id: 'stair',
  chapter: CH1,
  name: 'The Flooded Stair',
  goal: 'Pick up 100 coins',
  tip: 'A boulder squashes whatever it lands on, Nib too: drop it before he gets under it',
  rooms: [
    [
      [40, 340], [720, 340], [720, 736], [900, 736], [900, 600], [2000, 600], [2000, 893], [1490, GOLD_FLOOR], [1384, GOLD_FLOOR], [1384, PEN],
      [1288, PEN], [1288, PIT_FLOOR], [1120, PIT_TOP], [1120, 860], [900, 900], [900, 1080], [804, 1080], [804, 980], [600, 980], [600, 700], [40, 700],
    ],
    [[540, 950], [600, 950], [600, 1040], [540, 1040]],
  ],
  walls: [
    { ax: 40, ay: 340, bx: 720, by: 340, t: T }, // 0 ceiling
    { ax: 40, ay: 340, bx: 40, by: 700, t: T }, // 1 left wall
    { ax: 40, ay: 700, bx: 600, by: 700, t: T }, // 2 the landing
    { ax: 720, ay: 340, bx: 720, by: 736, t: T }, // 3 the drop's far side
    { ax: 720, ay: 736, bx: 900, by: 736, t: T }, // 4 ceiling over the shelf and the well
    { ax: 900, ay: 736, bx: 900, by: 600, t: T }, // 5
    { ax: 900, ay: 600, bx: 2000, by: 600, t: T }, // 6 the high ceiling
    { ax: 2000, ay: 600, bx: 2000, by: 893, t: T }, // 7 right wall
    { ax: 2000, ay: 893, bx: 1490, by: GOLD_FLOOR, t: T }, // 8 the gold's ramp
    { ax: 1384, ay: GOLD_FLOOR, bx: 1490, by: GOLD_FLOOR, t: T }, // 9 the gold's floor, under the pen's edge
    { ax: 1384, ay: PEN, bx: 1384, by: GOLD_FLOOR, t: T }, // 10
    { ax: 1288, ay: PEN, bx: 1384, by: PEN, t: T }, // 11 the pen's floor
    { ax: 1288, ay: PIT_FLOOR, bx: 1288, by: PEN, t: T }, // 12 the pen's back wall
    { ax: 1120, ay: PIT_TOP, bx: 1288, by: PIT_FLOOR, t: T }, // 13 the pit's sloping floor
    { ax: 1120, ay: 860, bx: 1120, by: PIT_TOP, t: T }, // 14
    { ax: 900, ay: 900, bx: 1120, by: 860, t: T }, // 15 the far ledge, rising from the well so the flood runs back
    { ax: 900, ay: 900, bx: 900, by: 1080, t: T }, // 16 the well
    { ax: 804, ay: 1080, bx: 900, by: 1080, t: T }, // 17
    { ax: 804, ay: 980, bx: 804, by: 1080, t: T }, // 18
    { ax: 600, ay: 980, bx: 804, by: 980, t: T }, // 19 where the well overflows
    { ax: 600, ay: 700, bx: 600, by: 950, t: T }, // 20 the drop's near side
    { ax: 540, ay: 950, bx: 600, by: 950, t: T }, // 21 a sump with a grate, under the overflow
    { ax: 540, ay: 950, bx: 540, by: 1040, t: T }, // 22
    { ax: 540, ay: 1040, bx: 600, by: 1040, t: T }, // 23
    { ax: 600, ay: 980, bx: 600, by: 1040, t: T }, // 24
    // The slot at the foot of the drop, a crate's width, and a ramp out of it to the well.
    { ax: 672, ay: 840, bx: 672, by: 892, t: T }, // 25
    { ax: 600, ay: 892, bx: 616, by: 892, t: T }, // 26 a grate in its floor
    { ax: 656, ay: 892, bx: 672, by: 892, t: T }, // 27
    { ax: 672, ay: 840, bx: 720, by: 808, t: T }, // 28
    { ax: 720, ay: 808, bx: 830, by: 808, t: T }, // 29 a shelf over the well
    { ax: 804, ay: 830, bx: 804, by: 930, t: T }, // 30 the well's side, with a gap under it: the well overflows at just this height
    // The rain tank.
    { ax: 216, ay: 340, bx: 216, by: 560, t: T }, // 31
    { ax: 460, ay: 340, bx: 460, by: 560, t: T }, // 32
    // Nib's room.
    { ax: 40, ay: 560, bx: 200, by: 560, t: T }, // 33
    // Over the pit: the gold's hopper, the lava tank and the boulder's shaft.
    { ax: 1128, ay: 680, bx: 1128, by: 782, t: T }, // 34
    { ax: 1208, ay: 680, bx: 1208, by: 812, t: T }, // 35
    { ax: 1296, ay: 680, bx: 1296, by: 940, t: T }, // 36 the shaft's near side
    { ax: 1368, ay: 800, bx: 1368, by: PIT_FLOOR, t: T }, // 37 the shaft's far side, down to the trapdoor
    { ax: 1376, ay: 800, bx: 1760, by: 700, t: T }, // 38 the boulder's run
    { ax: 1840, ay: 700, bx: 1840, by: 840, t: T }, // 39 the gold's hopper
    { ax: 1010, ay: 880, bx: 1010, by: 866, t: T }, // 40 a curb on the far ledge: the flood's wave runs back into the well
  ],
  bars: [25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40],
  pins: [
    { id: 'N', ax: 200, ay: 568, bx: 200, by: 692, t: PIN_T },
    { id: 'W', ax: 468, ay: 568, bx: 224, by: 568, t: PIN_T },
    { id: 'H', ax: 1120, ay: 790, bx: 1204, by: 790, t: PIN_T },
    { id: 'L', ax: 1204, ay: 820, bx: 1292, by: 820, t: PIN_T },
    { id: 'B', ax: 1686, ay: 612, bx: 1686, by: 690, t: PIN_T },
    { id: 'K', ax: 1376, ay: 960, bx: 1288, by: 960, t: PIN_T },
    { id: 'D', ax: 1376, ay: PIT_FLOOR, bx: 1288, by: PIT_FLOOR, t: PIN_T },
    { id: 'G', ax: 2008, ay: 848, bx: 1832, by: 848, t: PIN_T },
  ],
  fills: [
    { kind: WATER, x0: 224, x1: 452, y1: 560, count: 380 },
    { kind: COIN, x0: 1136, x1: 1200, y1: 782, count: 40 },
    { kind: LAVA, x0: 1216, x1: 1288, y1: 812, count: 40 },
    { kind: COIN, x0: 1848, x1: 1992, y1: 840, count: 80 },
  ],
  boulders: [{ x: 1719, y: 675 }],
  crates: [{ x: 560, y: 666 }, { x: 852, y: 1046 }],
  drains: [{ x0: 548, x1: 592, y0: 990, y1: 1036 }],
  nib: { x: 110, y: 668 },
  blots: [{ x: 1336, y: PEN - 30, spiky: true }],
  coinsNeeded: 100,
  solution: ['B', 'K', 'W', 'N', 'H', 'D', 'G'],
  stops: [{ x: 860 }, { x: 1336 }, { x: 1440 }, { x: 1580 }],
  torches: [{ x: 120, y: 480 }, { x: 560, y: 480 }, { x: 700, y: 940 }, { x: 1000, y: 800 }, { x: 1560, y: 820 }, { x: 1700, y: 1060 }],
  view: { x: 0, y: 280, w: 2040, h: 1080 },
};
