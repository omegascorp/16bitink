import type { LevelDef } from '../../logic/level';
import { COIN, LAVA, WATER } from '../../logic/particles';
import { CH2, PIN_T, T } from '../common';

/** Nib's floor, a little higher than the moat's lip on the gold's side, so the moat brims over that way; the moat and its lip. */
const NIB_FLOOR = 980;
const MOAT_L = 250;
const MOAT_R = 580;
const MOAT_BOTTOM = 1090;
/** A step inside the moat by its lip, so Nib can climb out onto the shelf. */
const STEP_Y = 1040;
const LIP = 1000;
/** The gold's shelf below the lip, and its slope down to the drain. */
const SHELF = 1036;
const SLOPE_L = 780;
const DRAIN_L = 900;
const DRAIN_R = 970;
const DRAIN_BOTTOM = 1100;
/** The walk on to the far pool's well, and the chest's floor past it. */
const WALK = 1060;
const WELL_L = 1100;
const WELL_R = 1170;
const WELL_BOTTOM = 1160;
const CHEST_FLOOR = WALK;
const END = 1640;
/** The cistern over the moat: its gate G is the hole in its floor at the right end, its side door S opens onto the aqueduct. */
const CIS_L = 300;
const CIS_R = 560;
const CIS_TOP = 530;
const GATE_Y = 740;
const HOLE_L = 528;
/** The bowl under the gate: it must brim over (at its low left rim) before any water reaches the moat. */
const BOWL_L = 440;
const BOWL_RIM = 780;
const BOWL_BOTTOM = 880;

/**
 * Level 6: the gate pin, on its own. One cistern of water has two jobs, and
 * its floor is a gate: it goes back in, so how much water each job gets is
 * the puzzle.
 * 1. The moat: the cistern hangs over a lava moat between Nib and the gold.
 *    Its gate G pours into a bowl, and only once the bowl brims
 *    over does the water reach the moat and set it to stone. Cut it too soon
 *    (before the bowl brims over) and the moat stays hot: Nib walks into it.
 * 2. The gold's shelf: past the moat's lip, the gold lies on a shelf over a
 *    slope down to a drain. Leave the gate out and the moat fills up, brims
 *    over the lip and washes the gold down the drain. The cue to push the
 *    gate back in is on the board: the moat has gone black, all stone (about
 *    4.2 s after the pull; the window runs from about 2 s to 9 s).
 * 3. The hopper H, right over the moat and nearest Nib, is the tempting pin:
 *    its gold drops straight into the moat, and melts there unless the moat
 *    is already stone.
 * 4. The switch: the cistern's side door S. With the gate back in, the floor
 *    leads the rest of the water out of S and down the aqueduct to the far
 *    pool's well, which Nib can't climb out of until it floats him up to the
 *    chest's floor. Open S first and, with the gate in, the whole cistern
 *    runs off to the well: the moat stays hot, and Nib walks into it.
 * Winning order: G, then G back in once the moat is stone, then H and S in
 * either order (G, G~4.5, H, S is the hint).
 */
export const JUST_ENOUGH: LevelDef = {
  id: 'just-enough',
  chapter: CH2,
  ruin: 'volcano',
  name: 'Just Enough',
  goal: 'Take the chest and pick up 82 coins',
  tip: 'A gate pin goes back in! Tap it again to cut the water: once the moat is stone, before it brims over onto the gold.',
  rooms: [
    [
      [40, 500], [END, 500], [END, CHEST_FLOOR], [WELL_R, CHEST_FLOOR], [WELL_R, WELL_BOTTOM], [WELL_L, WELL_BOTTOM], [WELL_L, WALK], [DRAIN_R, WALK], [DRAIN_R, DRAIN_BOTTOM],
      [DRAIN_L, DRAIN_BOTTOM], [DRAIN_L, 1070], [SLOPE_L, SHELF], [MOAT_R, SHELF], [MOAT_R, MOAT_BOTTOM], [MOAT_L, MOAT_BOTTOM], [MOAT_L, NIB_FLOOR], [40, NIB_FLOOR],
    ],
  ],
  walls: [
    { ax: 40, ay: 500, bx: END, by: 500, t: T }, // 0 ceiling
    { ax: 40, ay: 500, bx: 40, by: NIB_FLOOR, t: T }, // 1 left wall
    { ax: 40, ay: NIB_FLOOR, bx: MOAT_L, by: NIB_FLOOR, t: T }, // 2 Nib's floor
    { ax: MOAT_L, ay: NIB_FLOOR, bx: MOAT_L, by: MOAT_BOTTOM, t: T }, // 3 the moat
    { ax: MOAT_L, ay: MOAT_BOTTOM, bx: MOAT_R, by: MOAT_BOTTOM, t: T }, // 4
    { ax: MOAT_R, ay: MOAT_BOTTOM, bx: MOAT_R, by: LIP, t: T }, // 5 its lip, over the gold's shelf
    { ax: MOAT_R, ay: SHELF, bx: SLOPE_L, by: SHELF, t: T }, // 6 the gold's shelf, and its slope down to the drain
    { ax: SLOPE_L, ay: SHELF, bx: DRAIN_L, by: 1070, t: T }, // 7
    { ax: DRAIN_L, ay: 1070, bx: DRAIN_L, by: DRAIN_BOTTOM, t: T }, // 8 the drain's dip
    { ax: DRAIN_L, ay: DRAIN_BOTTOM, bx: DRAIN_R, by: DRAIN_BOTTOM, t: T }, // 9
    { ax: DRAIN_R, ay: DRAIN_BOTTOM, bx: DRAIN_R, by: WALK, t: T }, // 10
    { ax: DRAIN_R, ay: WALK, bx: WELL_L, by: WALK, t: T }, // 11 on to the far pool
    { ax: WELL_L, ay: WALK, bx: WELL_L, by: WELL_BOTTOM, t: T }, // 12 the far pool's well
    { ax: WELL_L, ay: WELL_BOTTOM, bx: WELL_R, by: WELL_BOTTOM, t: T }, // 13
    { ax: WELL_R, ay: WELL_BOTTOM, bx: WELL_R, by: CHEST_FLOOR, t: T }, // 14
    { ax: WELL_R, ay: CHEST_FLOOR, bx: END, by: CHEST_FLOOR, t: T }, // 15 the chest's floor
    { ax: END, ay: 500, bx: END, by: CHEST_FLOOR, t: T }, // 16
    // The cistern over the moat, its floor tipped down to the gate's hole and the side door.
    { ax: CIS_L, ay: CIS_TOP, bx: CIS_L, by: GATE_Y - 20, t: T }, // 17
    { ax: CIS_L, ay: GATE_Y - 20, bx: HOLE_L, by: GATE_Y - 4, t: T }, // 18
    { ax: CIS_R, ay: CIS_TOP, bx: CIS_R, by: GATE_Y - 66, t: T }, // 19
    // The aqueduct from the side door to the far pool.
    { ax: CIS_R, ay: GATE_Y + 8, bx: WELL_L - 10, by: GATE_Y + 8 + (WELL_L - 10 - CIS_R) * 0.21, t: T }, // 20
    // The bowl under the gate: its far side high, its near rim low.
    { ax: CIS_R, ay: GATE_Y + 8, bx: CIS_R, by: BOWL_BOTTOM, t: T }, // 21
    { ax: BOWL_L, ay: BOWL_BOTTOM, bx: CIS_R, by: BOWL_BOTTOM, t: T }, // 22
    { ax: BOWL_L, ay: BOWL_RIM, bx: BOWL_L, by: BOWL_BOTTOM, t: T }, // 23
    // The gold's hopper over the moat.
    { ax: 312, ay: 800, bx: 312, by: 880, t: T }, // 24
    { ax: 396, ay: 800, bx: 396, by: 880, t: T }, // 25
    { ax: 312, ay: 800, bx: 396, by: 800, t: T }, // 26 its roof, which keeps the bowl's spill out
    { ax: MOAT_R - 24, ay: STEP_Y, bx: MOAT_R, by: STEP_Y, t: T }, // 27 a step out of the moat
  ],
  bars: [17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27],
  pins: [
    { id: 'G', ax: HOLE_L - 8, ay: GATE_Y + 4, bx: CIS_R + 8, by: GATE_Y + 4, t: PIN_T, gate: true },
    { id: 'S', ax: CIS_R, ay: GATE_Y - 72, bx: CIS_R, by: GATE_Y - 2, t: PIN_T },
    { id: 'H', ax: 304, ay: 888, bx: 404, by: 888, t: PIN_T },
  ],
  fills: [
    { kind: WATER, x0: CIS_L + 8, x1: CIS_R - 8, y1: GATE_Y - 26, count: 440 },
    { kind: LAVA, x0: MOAT_L + 8, x1: MOAT_R - 8, y1: MOAT_BOTTOM - 8, count: 56 },
    { kind: COIN, x0: 320, x1: 388, y1: 880, count: 36 },
    { kind: COIN, x0: MOAT_R + 8, x1: 740, y1: SHELF - 8, count: 50 },
  ],
  drains: [{ x0: DRAIN_L + 8, x1: DRAIN_R - 8, y0: 1064, y1: DRAIN_BOTTOM + 30 }],
  nib: { x: 100, y: NIB_FLOOR - 32 },
  blots: [],
  chest: { x: END - 60, y: CHEST_FLOOR - 30 },
  coinsNeeded: 82,
  solution: ['G', 'G~4.5', 'H', 'S'],
  stops: [{ x: 310 }, { x: 740 }, { x: (WELL_L + WELL_R) / 2 }, { x: END - 60 }],
  torches: [{ x: 120, y: 880 }, { x: 240, y: 640 }, { x: 660, y: 920 }, { x: 1020, y: 960 }, { x: 1320, y: 960 }, { x: 1600, y: 940 }],
  view: { x: 0, y: 460, w: END + 40, h: 760 },
};
