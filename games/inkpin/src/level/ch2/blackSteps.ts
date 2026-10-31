import type { LevelDef } from '../../logic/level';
import { COIN, LAVA, WATER } from '../../logic/particles';
import { CH2, PIN_T, T } from '../common';

/**
 * Chapter 2, level 1: meet the black ledges. Nib picks his way down a cliff
 * of crumbling basalt ledges, each of which falls once he steps off it, so
 * when he walks is part of the order. Only chapter 1's materials.
 * 1. The gold bridge: the first ledge (over the fire pit) is the way off
 *    Nib's shelf, and the hopper's gold (C) pours onto it. Pour it first and
 *    Nib picks it up as he crosses. Walk first and the ledge falls into the
 *    fire behind him, and the gold, poured later, melts in the pit.
 * 2. The lid: the second ledge hangs over a shaft down to a seat with a hole
 *    in it, where the chute from the two tanks comes in. When Nib walks on,
 *    its slab drops onto the seat and shuts the hole, and the tanks' pours run
 *    over it and off the spout into the armadillo's pen. Pour the lava (V)
 *    before the slab is down and it falls through the hole onto the cellar's
 *    gold, which melts.
 * 3. The black steps: three more ledges zig-zag down to the crater floor,
 *    falling behind Nib. Nib's gate (G) holds him at their foot.
 * 4. The pen: the armadillo (spiky, never stomped) paces a pen too deep to
 *    climb out of, between Nib and the cellar with the chest. The lava
 *    scorches it, and the water (W) cools the lava to stone to cross on; or
 *    the water washes it first and the lava sets on the water. Open the gate
 *    on a live armadillo and Nib walks (or drops) into it; on hot lava, and
 *    he burns.
 * Winning orders: C, then a walk down to the gate, then V and W either way
 * round, then G (or W, G, with V any time after). The hint is C, V, W, G,
 * with Nib walked down to the gate after C.
 */
export const BLACK_STEPS: LevelDef = {
  id: 'black-steps',
  chapter: CH2,
  ruin: 'volcano',
  name: 'Black Steps',
  goal: 'Take the chest and pick up 70 coins',
  tip: 'A black ledge holds Nib once: step off it and it cracks and falls. When Nib walks is part of the order: cross a ledge while you still need it, and drop one where its stone does a job.',
  rooms: [
    // The cliff top: Nib's shelf, the first ledge over the fire pit, then two steps down.
    [[60, 300], [700, 300], [700, 380], [1180, 380], [1180, 460], [2120, 460], [2120, 680], [1120, 680], [1120, 580], [670, 580], [670, 480], [60, 480]],
    // The fire pit under the first ledge.
    [[490, 480], [670, 480], [700, 700], [460, 700], [490, 560]],
    // The two tanks, over the chute to the seat.
    [[760, 596], [1000, 596], [1000, 860], [760, 730]],
    // The shaft under the second ledge, down to its seat.
    [[1000, 580], [1120, 580], [1120, 876], [1000, 876]],
    // The hole in the seat, down to the cellar.
    [[1030, 876], [1090, 876], [1090, 980], [1030, 980]],
    // The crater: the cellar with the chest, the pen, and the black steps down from the cliff top.
    [[560, 980], [1120, 980], [1120, 680], [2120, 680], [2120, 1180], [1310, 1180], [1310, 1252], [1110, 1252], [1110, 1180], [560, 1180]],
  ],
  walls: [
    { ax: 60, ay: 300, bx: 700, by: 300, t: T }, // 0 ceiling, stepping down with the cliff
    { ax: 60, ay: 300, bx: 60, by: 480, t: T }, // 1 left wall
    { ax: 60, ay: 480, bx: 490, by: 480, t: T }, // 2 Nib's shelf
    { ax: 490, ay: 480, bx: 490, by: 560, t: T }, // 3 the fire pit, wider at its foot so the slab sinks into the lava
    { ax: 490, ay: 560, bx: 460, by: 700, t: T }, // 4
    { ax: 460, ay: 700, bx: 700, by: 700, t: T }, // 5
    { ax: 670, ay: 580, bx: 700, by: 700, t: T }, // 6
    { ax: 670, ay: 580, bx: 1000, by: 580, t: T }, // 7 the first step down
    { ax: 1000, ay: 580, bx: 1000, by: 790, t: T }, // 8 the shaft under the second ledge
    { ax: 1120, ay: 680, bx: 1120, by: 800, t: T }, // 9
    { ax: 1120, ay: 680, bx: 1990, by: 680, t: T }, // 10 the second step down, over the crater
    { ax: 2120, ay: 460, bx: 2120, by: 1180, t: T }, // 11 right wall
    // The tanks, and the chute under them to the seat.
    { ax: 760, ay: 596, bx: 760, by: 730, t: T }, // 12
    { ax: 880, ay: 596, bx: 880, by: 724, t: T }, // 13 between the tanks
    { ax: 760, ay: 730, bx: 1000, by: 860, t: T }, // 14 the chute
    { ax: 1000, ay: 860, bx: 1000, by: 876, t: T }, // 15 the seat: the slab drops in flush with the chute
    { ax: 1000, ay: 876, bx: 1030, by: 876, t: T }, // 16
    { ax: 1090, ay: 876, bx: 1110, by: 876, t: T }, // 17
    { ax: 1110, ay: 876, bx: 1170, by: 900, t: T }, // 18 the spout over the pen
    { ax: 1030, ay: 876, bx: 1030, by: 980, t: T }, // 19 the hole
    { ax: 1090, ay: 876, bx: 1090, by: 980, t: T }, // 20
    // The crater.
    { ax: 560, ay: 980, bx: 1030, by: 980, t: T }, // 21 the cellar's roof
    { ax: 560, ay: 980, bx: 560, by: 1180, t: T }, // 22
    { ax: 560, ay: 1180, bx: 1110, by: 1180, t: T }, // 23 the cellar's floor, back under the cliff to the chest
    { ax: 1110, ay: 1180, bx: 1110, by: 1252, t: T }, // 24 the pen: too deep for the armadillo to climb out
    { ax: 1110, ay: 1252, bx: 1310, by: 1252, t: T }, // 25
    { ax: 1310, ay: 1180, bx: 1310, by: 1252, t: T }, // 26
    { ax: 1310, ay: 1180, bx: 2120, by: 1180, t: T }, // 27 the crater floor, and the black steps' foot
    { ax: 516, ay: 300, bx: 516, by: 400, t: T }, // 28 the hopper over the first ledge
    { ax: 644, ay: 300, bx: 644, by: 400, t: T }, // 29
    { ax: 700, ay: 300, bx: 700, by: 380, t: T }, // 30 the ceiling's steps
    { ax: 700, ay: 380, bx: 1180, by: 380, t: T }, // 31
    { ax: 1180, ay: 380, bx: 1180, by: 460, t: T }, // 32
    { ax: 1180, ay: 460, bx: 2120, by: 460, t: T }, // 33
  ],
  bars: [10, 13, 18, 19, 20],
  pins: [
    { id: 'C', ax: 660, ay: 408, bx: 500, by: 408, t: PIN_T },
    { id: 'W', ax: 752, ay: 708, bx: 888, by: 708, t: PIN_T },
    // Clear of the shaft, so the slab falls past it to the seat.
    { id: 'V', ax: 872, ay: 724, bx: 1000, by: 724, t: PIN_T },
    { id: 'G', ax: 1690, ay: 1040, bx: 1690, by: 1174, t: PIN_T },
  ],
  fills: [
    { kind: COIN, x0: 524, x1: 636, y1: 401, count: 40 },
    { kind: WATER, x0: 768, x1: 872, y1: 701, count: 100 },
    { kind: LAVA, x0: 888, x1: 992, y1: 717, count: 60 },
    { kind: LAVA, x0: 470, x1: 690, y1: 692, count: 50 }, // the fire pit
    { kind: COIN, x0: 920, x1: 1050, y1: 1172, count: 40 }, // the cellar's gold, under the hole
  ],
  ledges: [
    { x0: 500, x1: 660, y: 472 }, // the gold bridge
    { x0: 1010, x1: 1110, y: 572 }, // the lid
    // The black steps.
    { x0: 2010, x1: 2110, y: 792 },
    { x0: 1885, x1: 1985, y: 892 },
    { x0: 1760, x1: 1860, y: 992 },
  ],
  nib: { x: 110, y: 448 },
  blots: [{ x: 1210, y: 1222, animal: 'armadillo' }],
  chest: { x: 620, y: 1150 },
  coinsNeeded: 70,
  solution: ['C', 'V', 'W', 'G'],
  stops: [{ x: 950 }, { x: 1600 }, { x: 2060 }, { x: 600 }],
  torches: [
    { x: 240, y: 400 },
    { x: 880, y: 500 },
    { x: 1500, y: 600 },
    { x: 1900, y: 600 },
    { x: 760, y: 1090 },
    { x: 1500, y: 1090 },
    { x: 1950, y: 1100 },
  ],
  view: { x: 0, y: 190, w: 2160, h: 1110 },
};
