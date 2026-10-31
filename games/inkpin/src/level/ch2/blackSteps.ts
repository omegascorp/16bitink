import type { LevelDef } from '../../logic/level';
import { COIN, LAVA, WATER } from '../../logic/particles';
import { CH2, PIN_T, T } from '../common';

/**
 * Chapter 2, level 1: meet the black ledges. Nib crosses two crumbling
 * basalt ledges, each of which falls once he steps off it, so when he walks
 * is part of the order (the hint scripts his walks with '@x'). Only
 * chapter 1's materials. Five pins: C, H, V, W, G.
 * 1. The gold bridge: the first ledge (over a crack in the cliff) is the way
 *    off Nib's shelf, and the hopper's gold (C) pours onto it. Pour it first
 *    and Nib picks it up as he crosses. Walk first and the ledge falls into
 *    the crack, and the gold, poured later, goes down the crack after it
 *    (drained).
 * 2. The lid: the second ledge hangs over a cracked shaft down to a seat
 *    with a hole in it, and a second hopper (H) hangs over the ledge. Pour H
 *    before Nib crosses and he picks its gold up; pour it after and the gold
 *    falls down the shaft's crack (drained). When Nib walks on, the slab
 *    drops onto the seat and shuts the hole, and the tanks' pours run over it
 *    into the pen. Pour the lava (V) before the slab is down and it goes
 *    through the hole onto the cellar's gold (melted).
 * 3. The black step: the water tank (W) sits right over the lava tank (V).
 *    Pour the lava first: it runs into the pen and scorches the armadillo,
 *    and the water then falls through the empty tank after it and sets it
 *    to a black stone step out of the pen. Pour the water first and it sets
 *    the lava in its own tank: the gravel tumbles out when V opens, the
 *    armadillo lives, and pulling G sends it at Nib (inked). (A crack at the
 *    pen's lip keeps anything spilled into the cellar out of the pen.)
 * 4. The pen: Nib lands beside it, behind the gate (G), which is also the
 *    pen's wall. Pull G on a live armadillo and it comes for Nib (inked, or
 *    pricked if he drops onto it); on hot lava, and the lava runs out round
 *    his feet (burnt).
 * The obvious orders (C, W, V, H, G: nearest first and left to right) pour
 * the water first and lose.
 * Winning order: C, walk over the first ledge, H, walk over the lid, V, W,
 * G, walk to the chest (C and H either way round before the first walk).
 */
export const BLACK_STEPS: LevelDef = {
  id: 'black-steps',
  chapter: CH2,
  ruin: 'volcano',
  name: 'Black Steps',
  goal: 'Take the chest and pick up 80 coins',
  tip: 'A black ledge holds Nib once: step off it and it cracks and falls. When Nib walks is part of the order: cross a ledge while you still need it, and drop one where its stone does a job.',
  rooms: [
    // The cliff top: Nib's shelf, the first ledge over the crack, the step down to the lid, and the drop to the pen.
    [[60, 300], [700, 300], [700, 380], [1180, 380], [1180, 460], [1420, 460], [1420, 680], [1120, 680], [1120, 540], [670, 540], [670, 480], [60, 480]],
    // The crack under the first ledge.
    [[490, 480], [670, 480], [670, 700], [490, 700]],
    // The two tanks, one over the other, over the chute to the seat.
    [[740, 548], [1000, 548], [1000, 860], [740, 760]],
    // The shaft under the second ledge, down to its seat.
    [[1000, 540], [1120, 540], [1120, 876], [1000, 876]],
    // The lid's hopper, over the second ledge.
    [[1020, 300], [1100, 300], [1100, 400], [1020, 400]],
    // The hole in the seat, down to the cellar.
    [[1030, 876], [1098, 876], [1098, 980], [1030, 980]],
    // The crater: the cellar with the chest, the pen, and Nib's landing behind the gate.
    [[820, 980], [1120, 980], [1120, 680], [1420, 680], [1420, 1252], [1110, 1252], [1110, 1180], [820, 1180]],
  ],
  walls: [
    { ax: 60, ay: 300, bx: 700, by: 300, t: T }, // 0 ceiling, stepping down with the cliff
    { ax: 60, ay: 300, bx: 60, by: 480, t: T }, // 1 left wall
    { ax: 60, ay: 480, bx: 490, by: 480, t: T }, // 2 Nib's shelf
    { ax: 490, ay: 480, bx: 490, by: 700, t: T }, // 3 the crack
    { ax: 490, ay: 700, bx: 670, by: 700, t: T }, // 4
    { ax: 670, ay: 540, bx: 670, by: 700, t: T }, // 5
    { ax: 670, ay: 540, bx: 1000, by: 540, t: T }, // 6 the step down, over the tanks
    { ax: 1000, ay: 540, bx: 1000, by: 790, t: T }, // 7 the shaft under the second ledge
    { ax: 1120, ay: 680, bx: 1120, by: 800, t: T }, // 8
    { ax: 1120, ay: 680, bx: 1300, by: 680, t: T }, // 9 the ledge over the crater
    { ax: 1420, ay: 460, bx: 1420, by: 1252, t: T }, // 10 right wall
    // The tanks, water over lava, and the chute under them to the seat.
    { ax: 900, ay: 540, bx: 900, by: 640, t: T }, // 11
    { ax: 900, ay: 656, bx: 900, by: 750, t: T }, // 12
    { ax: 740, ay: 548, bx: 740, by: 760, t: T }, // 13
    { ax: 740, ay: 760, bx: 1000, by: 860, t: T }, // 14 the chute
    { ax: 1000, ay: 860, bx: 1000, by: 876, t: T }, // 15 the seat: the slab drops in flush with the chute
    { ax: 1000, ay: 876, bx: 1030, by: 876, t: T }, // 16
    { ax: 1098, ay: 876, bx: 1110, by: 876, t: T }, // 17
    { ax: 1110, ay: 876, bx: 1170, by: 900, t: T }, // 18 the spout over the pen
    { ax: 1030, ay: 876, bx: 1030, by: 980, t: T }, // 19 the hole
    { ax: 1098, ay: 876, bx: 1098, by: 980, t: T }, // 20
    // The crater.
    { ax: 820, ay: 980, bx: 1030, by: 980, t: T }, // 21 the cellar's roof
    { ax: 820, ay: 980, bx: 820, by: 1180, t: T }, // 22
    { ax: 820, ay: 1180, bx: 1110, by: 1180, t: T }, // 23 the cellar's floor, back under the cliff to the chest
    { ax: 1110, ay: 1180, bx: 1110, by: 1252, t: T }, // 24 the pen: too deep to climb out of
    { ax: 1110, ay: 1252, bx: 1420, by: 1252, t: T }, // 25 the pen's floor and Nib's landing
    { ax: 516, ay: 300, bx: 516, by: 400, t: T }, // 26 the hopper over the first ledge
    { ax: 644, ay: 300, bx: 644, by: 400, t: T }, // 27
    { ax: 700, ay: 300, bx: 700, by: 380, t: T }, // 28 the ceiling's steps
    { ax: 700, ay: 380, bx: 1020, by: 380, t: T }, // 29
    { ax: 1180, ay: 380, bx: 1180, by: 460, t: T }, // 30
    { ax: 1180, ay: 460, bx: 1420, by: 460, t: T }, // 31
    { ax: 1100, ay: 380, bx: 1180, by: 380, t: T }, // 32 the ceiling past the lid's hopper
    { ax: 1020, ay: 300, bx: 1020, by: 388, t: T }, // 33 the lid's hopper, over the second ledge
    { ax: 1100, ay: 300, bx: 1100, by: 388, t: T }, // 34
    { ax: 1020, ay: 300, bx: 1100, by: 300, t: T }, // 35
  ],
  bars: [9, 18, 19, 20],
  pins: [
    { id: 'C', ax: 660, ay: 408, bx: 500, by: 408, t: PIN_T },
    { id: 'W', ax: 888, ay: 640, bx: 1000, by: 640, t: PIN_T },
    { id: 'V', ax: 892, ay: 750, bx: 1000, by: 750, t: PIN_T },
    { id: 'H', ax: 1010, ay: 396, bx: 1110, by: 396, t: PIN_T },
    // The gate, and the pen's wall.
    { id: 'G', ax: 1250, ay: 1110, bx: 1250, by: 1246, t: PIN_T },
  ],
  fills: [
    { kind: COIN, x0: 524, x1: 636, y1: 401, count: 30 },
    { kind: WATER, x0: 908, x1: 992, y1: 633, count: 40 },
    { kind: LAVA, x0: 908, x1: 992, y1: 743, count: 55 },
    { kind: COIN, x0: 1030, x1: 1090, y1: 388, count: 30 }, // the lid's hopper
    { kind: COIN, x0: 920, x1: 1050, y1: 1172, count: 30 }, // the cellar's gold, under the hole
  ],
  drains: [
    { x0: 498, x1: 662, y0: 600, y1: 692 }, // the crack under the first ledge
    { x0: 1008, x1: 1112, y0: 600, y1: 760 }, // the crack in the shaft, under the lid
    { x0: 1100, x1: 1116, y0: 1140, y1: 1176 }, // the crack at the pen's lip, so the cellar's spills never reach the pen
  ],
  ledges: [
    { x0: 500, x1: 660, y: 472 }, // the gold bridge
    { x0: 1010, x1: 1110, y: 532 }, // the lid
  ],
  nib: { x: 70, y: 448 },
  blots: [{ x: 1180, y: 1222, animal: 'armadillo' }],
  chest: { x: 860, y: 1150 },
  coinsNeeded: 80,
  solution: ['C', '@760', 'H', '@1340', 'V', 'W', 'G', '@860'],
  stops: [],
  torches: [
    { x: 240, y: 400 },
    { x: 820, y: 460 },
    { x: 1300, y: 560 },
    { x: 960, y: 1080 },
    { x: 1350, y: 1100 },
  ],
  view: { x: 0, y: 190, w: 1460, h: 1110 },
};
