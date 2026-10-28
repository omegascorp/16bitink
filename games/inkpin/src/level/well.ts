import type { LevelDef } from '../logic/level';
import { COIN, LAVA, WATER } from '../logic/particles';
import { CH1, PIN_T, T } from './common';

/**
 * Level 7, two screens tall: Nib climbs the well from the bottom to the
 * chest at the top, up four vines that are only seeds at first. One tank of
 * water at the top has to run all the way down the well and grow them all.
 * 1. The top: the tank's pin (W) is stuck behind the pin (L) of a pocket of
 *    lava hanging right over the top vine's seed. Tip the little cup (K) on
 *    the lava first: it sets to stone and stays up there. Pull L first and
 *    the lava pours down the shaft and burns the seed: no way to the top.
 * 2. The middle floor: the water runs down the shaft (watering the top
 *    seed in its dip), down a slot and a pipe into a basin with two more
 *    seeds in it, the way up and the gold ledge's vine. Its hatch (D) sits
 *    under the pipe: open it before the water comes and every drop runs
 *    straight through, and neither seed grows.
 * 3. The bottom: a porcupine in a pit between Nib and the first vine. The
 *    hatch lets the basin down a chute into the pit: it washes the porcupine
 *    away and spills on to the first vine's seed. Open Nib's door (N) before
 *    that and Nib walks into the pit.
 * Winning order: K, L, W, D, N.
 */
export const WELL: LevelDef = {
  id: 'well',
  chapter: CH1,
  name: 'The Well of Vines',
  goal: 'Climb to the chest and pick up 90 coins',
  tip: 'One tank waters every seed in the well: send it down in the right order',
  rooms: [[[40, 400], [1540, 400], [1540, 2080], [400, 2080], [400, 2150], [300, 2150], [300, 2080], [40, 2080]]],
  walls: [
    { ax: 40, ay: 400, bx: 1540, by: 400, t: T }, // 0 ceiling
    { ax: 40, ay: 400, bx: 40, by: 2080, t: T }, // 1 left wall
    { ax: 1540, ay: 400, bx: 1540, by: 2080, t: T }, // 2 right wall
    { ax: 40, ay: 2080, bx: 300, by: 2080, t: T }, // 3 the bottom floor: Nib's end
    { ax: 300, ay: 2080, bx: 300, by: 2150, t: T }, // 4 the porcupine's pit
    { ax: 300, ay: 2150, bx: 400, by: 2150, t: T }, // 5
    { ax: 400, ay: 2150, bx: 400, by: 2080, t: T }, // 6
    { ax: 400, ay: 2080, bx: 1540, by: 2080, t: T }, // 7 on to the first vine (and the hatch's water)
    // The top: the lava pocket (with its cup) and the water tank.
    { ax: 176, ay: 400, bx: 176, by: 760, t: T }, // 8
    { ax: 408, ay: 400, bx: 408, by: 640, t: T }, // 9
    { ax: 176, ay: 640, bx: 280, by: 752, t: T }, // 10 the tank's funnel: it lets the water out a little at a time
    { ax: 408, ay: 640, bx: 320, by: 752, t: T }, // 11
    // The top floor: down to the top vine's shaft on the left; the chest on the right.
    { ax: 176, ay: 920, bx: 440, by: 840, t: T }, // 12
    { ax: 440, ay: 840, bx: 1540, by: 840, t: T }, // 13
    { ax: 470, ay: 840, bx: 470, by: 810, t: T }, // 14 a curb: the water runs left
    // The third floor: the top vine's seed in a dip, and a slot the water runs on down.
    { ax: 40, ay: 1196, bx: 140, by: 1226, t: T }, // 15
    { ax: 140, ay: 1226, bx: 200, by: 1214, t: T }, // 16
    { ax: 200, ay: 1214, bx: 200, by: 1690, t: T }, // 17 the slot's pipe, down into the basin
    { ax: 248, ay: 1214, bx: 248, by: 1690, t: T }, // 18
    { ax: 248, ay: 1214, bx: 364, by: 1176, t: T }, // 19
    { ax: 364, ay: 1176, bx: 364, by: 1156, t: T }, // 20 a lip: the water runs back to the slot
    { ax: 436, ay: 1176, bx: 1540, by: 1176, t: T }, // 21
    // The second floor: the basin, its hatch, and the gold's ledge.
    { ax: 40, ay: 1730, bx: 200, by: 1730, t: T }, // 22 the deep end, with the hatch under the pipe
    { ax: 248, ay: 1730, bx: 300, by: 1730, t: T }, // 23
    { ax: 300, ay: 1730, bx: 300, by: 1700, t: T }, // 24 a step up to the seeds
    { ax: 300, ay: 1700, bx: 520, by: 1700, t: T }, // 25
    { ax: 520, ay: 1700, bx: 520, by: 1668, t: T }, // 26 by the first vine's shaft
    { ax: 596, ay: 1640, bx: 1540, by: 1640, t: T }, // 27
    { ax: 516, ay: 1450, bx: 900, by: 1450, t: T }, // 28 the gold's ledge
    { ax: 536, ay: 1450, bx: 536, by: 1434, t: T }, // 29 its curbs
    { ax: 880, ay: 1450, bx: 880, by: 1434, t: T }, // 30
    // Under the hatch, a chute down to the porcupine's pit.
    { ax: 180, ay: 1764, bx: 330, by: 1850, t: T }, // 31
  ],
  bars: [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31],
  pins: [
    { id: 'K', ax: 24, ay: 660, bx: 184, by: 660, t: PIN_T },
    { id: 'L', ax: 24, ay: 768, bx: 172, by: 768, t: PIN_T },
    { id: 'W', ax: 182, ay: 768, bx: 340, by: 768, t: PIN_T },
    { id: 'D', ax: 262, ay: 1730, bx: 188, by: 1730, t: PIN_T },
    { id: 'N', ax: 270, ay: 1960, bx: 270, by: 2072, t: PIN_T },
  ],
  fills: [
    { kind: LAVA, x0: 48, x1: 168, y1: 760, count: 36 },
    { kind: WATER, x0: 48, x1: 168, y1: 653, count: 30 },
    { kind: WATER, x0: 184, x1: 400, y1: 632, count: 300 },
    { kind: COIN, x0: 544, x1: 872, y1: 1442, count: 60 },
    { kind: COIN, x0: 1100, x1: 1300, y1: 832, count: 40 },
  ],
  nib: { x: 120, y: 2048 },
  blots: [{ x: 350, y: 2120, spiky: true }],
  chest: { x: 1480, y: 810 },
  coinsNeeded: 90,
  vines: [
    { x: 560, top: 1632, bottom: 2072, seed: true },
    { x: 400, top: 1168, bottom: 1692, seed: true },
    { x: 480, top: 1442, bottom: 1692, seed: true },
    { x: 140, top: 912, bottom: 1218, seed: true },
  ],
  solution: ['K', 'L', 'W', 'D', 'N'],
  stops: [
    { x: 520 },
    { x: 560, y: 1634 },
    { x: 480, y: 1444 },
    { x: 860 },
    { x: 480, y: 1690 },
    { x: 400, y: 1170 },
    { x: 140, y: 914 },
    { x: 800 },
    { x: 1480 },
  ],
  torches: [{ x: 700, y: 600 }, { x: 1200, y: 600 }, { x: 700, y: 1060 }, { x: 1200, y: 1450 }, { x: 300, y: 1450 }, { x: 600, y: 1900 }, { x: 1100, y: 1900 }],
  view: { x: 0, y: 190, w: 1580, h: 2000 },
};
