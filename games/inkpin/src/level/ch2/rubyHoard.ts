import type { LevelDef } from '../../logic/level';
import { COIN, LAVA, WATER } from '../../logic/particles';
import { CH2, PIN_T, T } from '../common';

/** Nib's floor, high on the left, and its edge over the landing. */
const SHELF = 850;
const EDGE = 480;
/** The lava river's bed, and its far end, where the gold's ramp comes down to it. */
const BED = 1070;
const END = 1100;
/** The landing's pool under the cliff, deep enough to float the armadillo's raft. */
const POOL_X = 700;
const POOL_BED = 1100;
const RIGHT = 1440;
/** The gold's ramp: from the river's end up to the right wall, at 35°. */
const RAMP_Y = BED - 8;
const RAMP_TOP = Math.round(RAMP_Y - (RIGHT - END - 8) * 0.7);
/** The ceiling. */
const TOP = 260;
/** The hoard's hopper (between its walls), its floor's high and low ends, and the lip under its side door. */
const HOP_L = 592;
const HOP_R = 712;
const HOP_HIGH = 486;
const HOP_LOW = 578;
const LIP = 552;
/** The lava tank under the hopper, over the landing. */
const TANK_TOP = 600;
const TANK_FLOOR = 940;

/**
 * Level 5, Loot: the fire rubies go through the fire, the gold goes round it.
 * One hopper holds the hoard: 140 coins, and five fire rubies resting at the
 * low end of its sloping floor, against the lip under its side door. Under
 * the hopper hangs a tank of lava, low over the landing at the foot of Nib's
 * cliff, where an armadillo keeps watch from its pumice raft on the lava
 * pool. The tank of water above the hopper is the only water there is, and
 * its only way down is through the hopper.
 * 1. The hoard. The hopper's floor H is the obvious pull, and the trap: the
 *    whole hoard drops into the lava tank and the gold melts. Its side door
 *    S first: the gold slides over the lip and away down the long chute,
 *    over the river, to the ramp at its far end; the rubies are too big to
 *    roll over the lip and stay behind. Then H drops them through the
 *    lava, which can't hurt them.
 * 2. The landing. The lava tank's floor L pours the lava (and the rubies,
 *    if they're in it) onto the raft: it scorches the armadillo, floats the
 *    raft off down the river and fills it. Let Nib down (G) before that and
 *    he lands on the armadillo's spikes.
 * 3. The water. W pours through the empty hopper and the empty lava tank
 *    onto the landing, and the river sets to stone. Pulled while the hoard
 *    is still in the hopper it only pools on it, and the floor then drops
 *    water, rubies and gold into the lava together, gold first. Let Nib down
 *    on the hot river and he walks into the lava.
 * 4. The ramp. The gold waits at the foot of its ramp behind the pin C.
 *    Open C on the hot river, or before the gold has come down, and the
 *    gold slides straight into the lava; once the river is stone, it slides
 *    out onto it, to Nib.
 * Nib's gate G holds him on his cliff; he drops to the raft (a parapet keeps
 * the lava's splashes off his floor), digs the rubies out of the stone and
 * walks on to the gold.
 * Winning order: S, H, L, W, C, G (L any time before W, C after W, G last).
 * Another way works too: the water first, pooled on the hoard, then C and S
 * send it down the ramp with the gold, where it cools the river from its
 * far end and washes the armadillo off the landing.
 */
export const RUBY_HOARD: LevelDef = {
  id: 'ruby-hoard',
  chapter: CH2,
  ruin: 'volcano',
  name: 'The Ruby Hoard',
  goal: 'Pick up 160 in gold and rubies',
  tip: 'Lava can’t hurt a fire ruby, but it melts gold. Each ruby is worth 10 coins.',
  rooms: [
    [
      [40, TOP], [RIGHT, TOP], [RIGHT, RAMP_TOP], [END + 8, RAMP_Y], [END, BED], [POOL_X, BED], [POOL_X, POOL_BED], [EDGE, POOL_BED], [EDGE, SHELF], [40, SHELF],
    ],
  ],
  walls: [
    { ax: 40, ay: TOP, bx: RIGHT, by: TOP, t: T }, // 0 ceiling
    { ax: 40, ay: TOP, bx: 40, by: SHELF, t: T }, // 1 left wall
    { ax: 40, ay: SHELF, bx: EDGE, by: SHELF, t: T }, // 2 Nib's floor
    { ax: 180, ay: TOP, bx: 180, by: 726, t: T }, // 3 over Nib's gate
    { ax: EDGE, ay: SHELF, bx: EDGE, by: POOL_BED, t: T }, // 4 the drop to the landing
    { ax: EDGE, ay: POOL_BED, bx: POOL_X, by: POOL_BED, t: T }, // 5 the landing's pool, and the river's bed past it
    { ax: POOL_X, ay: BED, bx: POOL_X, by: POOL_BED, t: T }, // 6
    { ax: POOL_X, ay: BED, bx: END, by: BED, t: T }, // 7
    { ax: END + 8, ay: RAMP_Y, bx: RIGHT, by: RAMP_TOP, t: T }, // 8 the gold's ramp, down to the river's end
    { ax: RIGHT, ay: TOP, bx: RIGHT, by: RAMP_TOP, t: T }, // 9 right wall
    { ax: HOP_L, ay: TOP, bx: HOP_L, by: 330, t: T }, // 10 the water tank
    { ax: HOP_R, ay: TOP, bx: HOP_R, by: 330, t: T }, // 11
    { ax: HOP_L, ay: 346, bx: HOP_L, by: HOP_HIGH, t: T }, // 12 the hopper
    { ax: HOP_R, ay: 346, bx: HOP_R, by: 426, t: T }, // 13 over its side door
    { ax: HOP_R, ay: LIP, bx: HOP_R, by: HOP_LOW, t: T }, // 14 the lip
    { ax: HOP_R + 8, ay: HOP_LOW + 8, bx: 1180, by: 908, t: T }, // 15 the gold's chute, over the river to its ramp
    { ax: 584, ay: TANK_TOP, bx: 584, by: TANK_FLOOR - 8, t: T }, // 16 the lava tank
    { ax: 720, ay: TANK_TOP, bx: 720, by: TANK_FLOOR - 8, t: T }, // 17
    { ax: EDGE - 8, ay: SHELF - 24, bx: EDGE - 8, by: SHELF, t: T }, // 18 a parapet at the cliff's edge, against the lava's splashes
  ],
  bars: [3, 10, 11, 12, 13, 14, 15, 16, 17, 18],
  pins: [
    { id: 'G', ax: 180, ay: 734, bx: 180, by: SHELF - 6, t: PIN_T },
    { id: 'W', ax: HOP_R - 14, ay: 338, bx: HOP_L + 14, by: 338, t: PIN_T },
    { id: 'S', ax: HOP_R, ay: 426, bx: HOP_R, by: LIP - 8, t: PIN_T },
    { id: 'H', ax: HOP_L - 20, ay: HOP_HIGH, bx: HOP_R + 8, by: HOP_LOW, t: PIN_T },
    { id: 'L', ax: 736, ay: TANK_FLOOR, bx: 568, by: TANK_FLOOR, t: PIN_T },
    { id: 'C', ax: END, ay: 900, bx: END, by: BED - 6, t: PIN_T },
  ],
  fills: [
    { kind: WATER, x0: HOP_L + 8, x1: HOP_R - 8, y1: 330, count: 45 },
    { kind: COIN, x0: HOP_L + 8, x1: HOP_R - 8, y1: 506, count: 140 },
    { kind: LAVA, x0: 592, x1: 712, y1: TANK_FLOOR - 8, count: 90 },
    { kind: LAVA, x0: EDGE + 8, x1: POOL_X - 8, y1: POOL_BED - 8, count: 70 },
    { kind: LAVA, x0: POOL_X + 8, x1: END - 8, y1: BED - 8, count: 85 },
  ],
  rubies: [
    { x: 697, y: 545 },
    { x: 682, y: 536 },
    { x: 667, y: 526 },
    { x: 652, y: 517 },
    { x: 637, y: 508 },
  ],
  rafts: [{ x: 540, y: 1030 }],
  nib: { x: 100, y: SHELF - 32 },
  blots: [{ x: 540, y: 980, animal: 'armadillo' }],
  coinsNeeded: 160,
  solution: ['S', 'H', 'L', 'W', 'C', 'G'],
  stops: [{ x: 530 }, { x: 600 }, { x: 680 }, { x: 900 }, { x: 1060 }, { x: 1160 }],
  torches: [
    { x: 110, y: 760 },
    { x: 440, y: 560 },
    { x: 900, y: 480 },
    { x: 1300, y: 600 },
  ],
  view: { x: 0, y: 120, w: 1480, h: 1000 },
};
