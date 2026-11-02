import type { LevelDef } from '../logic/level';
import { COIN, LAVA, WATER } from '../logic/particles';
import { CH1, PIN_T, T } from './common';

/**
 * Level 5, Loot, the lava level: the gold vault under the Jungle Temple.
 * One pit of lava does two jobs, and Nib follows it down: it scorches the
 * porcupine in the pen over it, then runs down the chute into the vault,
 * where it melts the hoard unless the vault's water got there first.
 * 1. Nib's hall: the boulder hangs over the spot by the pen's door where
 *    Nib waits; dropped (B), it rolls down the floor into the drain dip and
 *    plugs it. The gold's hopper (C) runs down a ramp into that dip: gold
 *    before the boulder goes down the drain, and a boulder dropped once Nib
 *    has walked over to the door lands on him.
 * 2. The pen: a porcupine paces a pen whose floor is a pin (F), over a pit
 *    of lava; the pen’s door G is the gate in Nib’s way (the tempting
 *    pull, the door straight ahead). Pull the floor and the porcupine drops into
 *    the lava. Open the door first and it comes out at Nib; open it with the
 *    lava still in the pit and Nib walks into it. Let the lava out (D, the
 *    pit's door) before the floor and the porcupine drops into an empty pit,
 *    and Nib drops in on top of it.
 * 3. The vault: the hoard lies in a pit at the foot of the chute, beside the
 *    step where the seed grows up to the chest's ledge. Water it (W) before
 *    the lava comes: the lava sets to stone in the water, a wall between it
 *    and the gold and the vine. Lava first runs into the dry pit and melts
 *    the hoard.
 * Nib goes the lava's way: through the pen, the pit and down the chute.
 * Winning order: B, C, F, W, D, G (B first; C any time before G; W any time
 * before D).
 */
export const CELLAR: LevelDef = {
  id: 'cellar',
  chapter: CH1,
  name: 'The Gold Vault',
  goal: 'Take the chest and pick up 170 coins',
  rooms: [
    // 1. Nib's hall, with the drain
    [[40, 420], [1000, 420], [1000, 730], [712, 760], [712, 790], [640, 790], [640, 760], [40, 760]],
    // 2. the pen, and the lava pit under it
    [[1000, 570], [1200, 570], [1200, 885], [1000, 815]],
    // 3. the chute and the vault
    [[1200, 760], [2140, 760], [2140, 1080], [1880, 1080], [1880, 1250], [1812, 1250], [1812, 1350], [1660, 1350], [1660, 1290], [1600, 1290], [1200, 885]],
  ],
  walls: [
    // 1. Nib's hall
    { ax: 40, ay: 420, bx: 1000, by: 420, t: T }, // 0 ceiling
    { ax: 40, ay: 420, bx: 40, by: 760, t: T }, // 1 left wall
    { ax: 40, ay: 760, bx: 640, by: 760, t: T }, // 2 floor, with the drain dip
    { ax: 640, ay: 760, bx: 640, by: 790, t: T }, // 3
    { ax: 640, ay: 790, bx: 668, by: 790, t: T }, // 4
    { ax: 684, ay: 790, bx: 712, by: 790, t: T }, // 5
    { ax: 712, ay: 790, bx: 712, by: 760, t: T }, // 6
    { ax: 712, ay: 760, bx: 1000, by: 730, t: T }, // 7 the floor up to the pen's door
    { ax: 1000, ay: 420, bx: 1000, by: 632, t: T }, // 8 over the pen's door
    { ax: 590, ay: 760, bx: 590, by: 730, t: T }, // 9 a curb that keeps the gold by the dip
    { ax: 930, ay: 420, bx: 930, by: 492, t: T }, // 10 the boulder's alcove, over the pen's door
    { ax: 744, ay: 420, bx: 744, by: 522, t: T }, // 11 the gold's hopper
    { ax: 876, ay: 420, bx: 876, by: 522, t: T }, // 12
    { ax: 868, ay: 538, bx: 740, by: 674, t: T }, // 13 its ramp, down into the dip
    // 2. the pen and the pit
    { ax: 1000, ay: 570, bx: 1200, by: 570, t: T }, // 14 the pen's ceiling
    { ax: 1200, ay: 570, bx: 1200, by: 776, t: T }, // 15 its right wall, down to the pit's door
    { ax: 1000, ay: 730, bx: 1000, by: 815, t: T }, // 16 the pit's left wall
    { ax: 1000, ay: 815, bx: 1200, by: 885, t: T }, // 17 its floor, down to its door
    // 3. the chute and the vault
    { ax: 1200, ay: 760, bx: 2140, by: 760, t: T }, // 18 ceiling
    { ax: 2140, ay: 760, bx: 2140, by: 1080, t: T }, // 19 right wall
    { ax: 1200, ay: 885, bx: 1600, by: 1290, t: T }, // 20 the chute
    { ax: 1600, ay: 1290, bx: 1660, by: 1290, t: T }, // 21 the foot of the chute
    { ax: 1880, ay: 1250, bx: 1880, by: 1080, t: T }, // 22 the chest's ledge
    { ax: 1880, ay: 1080, bx: 2140, by: 1080, t: T }, // 23
    { ax: 1754, ay: 760, bx: 1754, by: 960, t: T }, // 24 the water's tank, over the seed
    { ax: 1874, ay: 760, bx: 1874, by: 960, t: T }, // 25
    { ax: 1660, ay: 1290, bx: 1660, by: 1350, t: T }, // 26 the hoard's pit, beside the chute's foot
    { ax: 1660, ay: 1350, bx: 1812, by: 1350, t: T }, // 27
    { ax: 1812, ay: 1350, bx: 1812, by: 1250, t: T }, // 28 the seed's step
    { ax: 1812, ay: 1250, bx: 1880, by: 1250, t: T }, // 29
  ],
  bars: [9, 10, 11, 12, 13, 24, 25],
  pins: [
    // The boulder hangs over the spot where Nib waits at the pen's door.
    { id: 'B', ax: 912, ay: 500, bx: 996, by: 500, t: PIN_T },
    { id: 'C', ax: 724, ay: 530, bx: 884, by: 530, t: PIN_T },
    // The pen's door, its floor, and the pit's door (it slides down).
    { id: 'G', ax: 1000, ay: 640, bx: 1000, by: 724, t: PIN_T },
    { id: 'F', ax: 1220, ay: 730, bx: 992, by: 730, t: PIN_T },
    { id: 'D', ax: 1200, ay: 893, bx: 1200, by: 776, t: PIN_T },
    { id: 'W', ax: 1734, ay: 968, bx: 1894, by: 968, t: PIN_T },
  ],
  fills: [
    { kind: COIN, x0: 752, x1: 868, y1: 522, count: 110 },
    { kind: LAVA, x0: 1008, x1: 1192, y1: 806, count: 50 },
    { kind: WATER, x0: 1762, x1: 1866, y1: 960, count: 160 },
    { kind: COIN, x0: 1668, x1: 1804, y1: 1342, count: 80 },
  ],
  boulders: [{ x: 965, y: 466 }],
  // Anything that gets down into the dip is gone, unless the boulder fills it.
  drains: [{ x0: 648, x1: 704, y0: 766, y1: 830 }],
  nib: { x: 100, y: 728 },
  blots: [{ x: 1100, y: 700, spiky: true }],
  vines: [{ x: 1846, top: 1072, bottom: 1242, seed: true }],
  chest: { x: 2100, y: 1050 },
  coinsNeeded: 170,
  solution: ['B', 'C', 'F', 'W', 'D', 'G'],
  stops: [{ x: 420 }, { x: 676 }, { x: 960 }, { x: 1720 }, { x: 1846, y: 1060 }, { x: 2100 }],
  torches: [{ x: 160, y: 560 }, { x: 420, y: 560 }, { x: 1100, y: 640 }, { x: 1500, y: 880 }, { x: 1960, y: 900 }, { x: 2060, y: 900 }],
  view: { x: 0, y: 330, w: 2180, h: 1060 },
};
