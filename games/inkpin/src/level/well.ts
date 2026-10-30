import type { LevelDef } from '../logic/level';
import { COIN, LAVA, WATER } from '../logic/particles';
import { CH1, PIN_T, T } from './common';

/**
 * Level 7, two screens tall: Nib climbs the well from the bottom to the
 * chest at the top, up four vines that are only seeds at first. One tank of
 * water at the top has to grow them all and wash away the porcupine on the
 * way down, and every wrong turn spends it where it does harm: on the
 * first vine, before the porcupine is gone, so Nib climbs straight into it.
 * 1. The top: a pocket of lava hangs on the long pin L over the top seed's
 *    dip, with a cup of water K over it. L also lies under both of the
 *    tank's taps (W under its funnel, X in its side) and tips whatever falls
 *    on it into the drop: a gutter, a shaft down the far side of the well
 *    and a chute back to the bottom floor, where it spills over the gold's
 *    pocket onto the first vine's seed. The big tank is the obvious first
 *    pull, and with L still in, the whole tank runs down the drop: the
 *    first vine grows, and Nib climbs straight up into a dry porcupine. The
 *    side tap does the same with the top of the tank. Pull L before the
 *    cup and the lava drops into the dip: it burns the top seed and melts
 *    the coins in the pocket by it. Cup first: the lava sets to stone and
 *    stays up there.
 * 2. The third floor: with K then L out, the tank runs down to the top seed
 *    in its dip, then down the slot into the cistern, which holds it on H.
 * 3. The basin: H lets the cistern down into the sump under it, which fills
 *    and spills over onto the porcupine's floor: it washes the porcupine
 *    away and waters the way-up and gold seeds. Open the sump's hatch D
 *    before that and the cistern falls straight through it to the bottom:
 *    the first vine grows and the porcupine is still dry. Nor is the side
 *    tap's share enough on its own: it is only the top of the tank, too
 *    little to fill the sump, so the hatch waits for the big tap too.
 * 4. The bottom: D lets the sump down the chute to the first vine, the way
 *    up. B drops the gold in the pocket at the drop's foot (any time: the
 *    drop stays dry when L goes before the taps).
 * Winning order: B, K, L, W, X, H, D (B any time; K, then L, before either
 * tap; D last of all, or at least after W and H).
 */
export const WELL: LevelDef = {
  id: 'well',
  chapter: CH1,
  name: 'The Well of Vines',
  goal: 'Climb to the chest and pick up 90 coins',
  tip: 'One tank waters every seed in the well, with not a drop to spare: send it down the right way',
  rooms: [[[40, 400], [1540, 400], [1540, 2080], [640, 2080], [600, 2104], [520, 2104], [480, 2080], [40, 2080]]],
  walls: [
    { ax: 40, ay: 400, bx: 1540, by: 400, t: T }, // 0 ceiling
    { ax: 40, ay: 400, bx: 40, by: 2080, t: T }, // 1 left wall
    { ax: 1540, ay: 400, bx: 1540, by: 2080, t: T }, // 2 right wall
    // The bottom floor: Nib's end, and the first vine's seed in a dip.
    { ax: 40, ay: 2080, bx: 480, by: 2080, t: T }, // 3
    { ax: 480, ay: 2080, bx: 520, by: 2104, t: T }, // 4
    { ax: 520, ay: 2104, bx: 600, by: 2104, t: T }, // 5
    { ax: 600, ay: 2104, bx: 640, by: 2080, t: T }, // 6
    { ax: 640, ay: 2080, bx: 1540, by: 2080, t: T }, // 7
    // The top: the lava pocket (with its cup), and the tank with its funnel and its side tap.
    { ax: 176, ay: 400, bx: 176, by: 792, t: T }, // 8
    { ax: 408, ay: 400, bx: 408, by: 596, t: T }, // 9 the tank's right wall, over the tap
    { ax: 176, ay: 640, bx: 280, by: 752, t: T }, // 10 the funnel: it lets the water out a little at a time
    { ax: 408, ay: 700, bx: 320, by: 752, t: T }, // 11
    { ax: 408, ay: 656, bx: 408, by: 700, t: T }, // 12 under the tap: the tap lets out only the top of the tank
    { ax: 444, ay: 590, bx: 444, by: 716, t: T }, // 13 the tap's spout: it pours straight down, onto L or the floor
    // The top floor: down to the top vine's shaft on the left; the drop's mouth; the chest on the right.
    { ax: 176, ay: 920, bx: 470, by: 866, t: T }, // 14
    { ax: 470, ay: 834, bx: 470, by: 900, t: T }, // 15 the drop's mouth, with a lip against splashes
    { ax: 524, ay: 806, bx: 524, by: 866, t: T }, // 16 its far side: what comes off L hits it and drops in
    { ax: 524, ay: 830, bx: 1540, by: 830, t: T }, // 17
    // The drop: a gutter under the top floor, a shaft down the far side, a chute back to the gold's pocket.
    { ax: 470, ay: 900, bx: 1500, by: 1130, t: T }, // 18
    { ax: 1440, ay: 1130, bx: 1440, by: 1690, t: T }, // 19
    { ax: 1540, ay: 1716, bx: 800, by: 1950, t: T }, // 20
    { ax: 648, ay: 1928, bx: 648, by: 1956, t: T }, // 21 the pocket's lip: anything more spills to the first vine
    // The third floor: the top vine's seed in a dip, a pocket of coins by it, and the slot down to the cistern.
    { ax: 40, ay: 1232, bx: 104, by: 1232, t: T }, // 22 the coins' pocket
    { ax: 104, ay: 1232, bx: 104, by: 1196, t: T }, // 23 its curb, to keep the water out
    { ax: 104, ay: 1214, bx: 140, by: 1226, t: T }, // 24 the dip
    { ax: 140, ay: 1226, bx: 200, by: 1214, t: T }, // 25
    { ax: 200, ay: 1214, bx: 200, by: 1256, t: T }, // 26 the slot
    { ax: 248, ay: 1214, bx: 248, by: 1256, t: T }, // 27
    { ax: 200, ay: 1256, bx: 120, by: 1300, t: T }, // 28 the cistern
    { ax: 120, ay: 1300, bx: 120, by: 1540, t: T }, // 29
    { ax: 120, ay: 1540, bx: 196, by: 1592, t: T }, // 30 its funnel, right over the hatch
    { ax: 248, ay: 1256, bx: 290, by: 1300, t: T }, // 31
    { ax: 290, ay: 1300, bx: 290, by: 1540, t: T }, // 32
    { ax: 290, ay: 1540, bx: 254, by: 1592, t: T }, // 33
    { ax: 248, ay: 1214, bx: 364, by: 1176, t: T }, // 34
    { ax: 364, ay: 1176, bx: 364, by: 1156, t: T }, // 35 a lip: the water runs back to the slot
    { ax: 436, ay: 1176, bx: 1432, by: 1176, t: T }, // 36
    // The basin: the sump under the cistern with its hatch, the porcupine's floor, the gold's ledge.
    { ax: 40, ay: 1730, bx: 196, by: 1730, t: T }, // 37
    { ax: 254, ay: 1730, bx: 300, by: 1730, t: T }, // 38
    { ax: 300, ay: 1730, bx: 300, by: 1700, t: T }, // 39 the sump's rim: it spills over onto the seeds
    { ax: 300, ay: 1700, bx: 520, by: 1700, t: T }, // 40 the porcupine's floor
    { ax: 520, ay: 1700, bx: 520, by: 1668, t: T }, // 41 by the first vine's shaft
    { ax: 596, ay: 1640, bx: 1432, by: 1640, t: T }, // 42
    { ax: 516, ay: 1450, bx: 900, by: 1450, t: T }, // 43 the gold's ledge
    { ax: 536, ay: 1450, bx: 536, by: 1434, t: T }, // 44 its curbs
    { ax: 880, ay: 1450, bx: 880, by: 1434, t: T }, // 45
    // Under the hatch, a chute down to the bottom floor.
    { ax: 180, ay: 1764, bx: 330, by: 1850, t: T }, // 46
  ],
  bars: [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46],
  pins: [
    { id: 'K', ax: 24, ay: 660, bx: 184, by: 660, t: PIN_T },
    { id: 'L', ax: 24, ay: 774, bx: 476, by: 842, t: PIN_T },
    { id: 'W', ax: 360, ay: 766, bx: 262, by: 766, t: PIN_T },
    { id: 'X', ax: 408, ay: 604, bx: 408, by: 648, t: PIN_T },
    { id: 'H', ax: 272, ay: 1604, bx: 180, by: 1604, t: PIN_T },
    { id: 'D', ax: 262, ay: 1730, bx: 188, by: 1730, t: PIN_T },
    { id: 'B', ax: 816, ay: 1962, bx: 640, by: 1962, t: PIN_T },
  ],
  fills: [
    { kind: LAVA, x0: 48, x1: 168, y1: 772, count: 36 },
    { kind: WATER, x0: 48, x1: 168, y1: 653, count: 30 },
    { kind: WATER, x0: 184, x1: 400, y1: 632, count: 220 },
    { kind: COIN, x0: 46, x1: 98, y1: 1224, count: 12 },
    { kind: COIN, x0: 544, x1: 872, y1: 1442, count: 38 },
    { kind: COIN, x0: 1100, x1: 1300, y1: 822, count: 20 },
    { kind: COIN, x0: 656, x1: 790, y1: 1954, count: 30 },
  ],
  nib: { x: 120, y: 2048 },
  blots: [{ x: 440, y: 1676, spiky: true }],
  chest: { x: 1480, y: 800 },
  coinsNeeded: 90,
  vines: [
    { x: 560, top: 1632, bottom: 2096, seed: true },
    { x: 400, top: 1168, bottom: 1692, seed: true },
    { x: 480, top: 1442, bottom: 1692, seed: true },
    { x: 140, top: 912, bottom: 1218, seed: true },
  ],
  solution: ['B', 'K', 'L', 'W', 'X', 'H', 'D'],
  stops: [
    { x: 840 },
    { x: 560, y: 2070 },
    { x: 560, y: 1634 },
    { x: 480, y: 1444 },
    { x: 860 },
    { x: 560, y: 1634 },
    { x: 480, y: 1690 },
    { x: 400, y: 1690 },
    { x: 400, y: 1170 },
    { x: 70 },
    { x: 140, y: 1210 },
    { x: 140, y: 914 },
    { x: 800 },
    { x: 1480 },
  ],
  torches: [{ x: 700, y: 600 }, { x: 1200, y: 600 }, { x: 700, y: 1060 }, { x: 1200, y: 1450 }, { x: 220, y: 1980 }, { x: 600, y: 1900 }, { x: 1100, y: 1900 }],
  view: { x: 0, y: 190, w: 1580, h: 2000 },
};
