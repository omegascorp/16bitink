import type { LevelDef } from '../logic/level';
import { COIN, LAVA, WATER } from '../logic/particles';
import { CH1, PIN_T, T } from './common';

/**
 * Level 9, lights out: only Nib's lamp, the torches and the glowing lava
 * light the temple. Lava is the light here, and the danger.
 * 1. The stone step: a trough of lava glows by Nib's start, below a ledge
 *    too high to climb. Pour the tank (W) on it and it sets into a stone
 *    step up to the ledge. Walk on early and Nib steps into the lava.
 * 2. The seed in the dark: a seed at the foot of a high shelf. Its tank (S)
 *    grows it into a vine up to the shelf and its gold, and the shelf leads
 *    to the shaft down to the lower hall.
 * 3. The porcupine pit: a porcupine waits at the foot of the shaft. The
 *    shaft's tanks hang over it, water (Q) over lava (P): lava first, to
 *    scorch it, then the water through the empty tank to cool the lava to
 *    stone. Water first sets the lava in its tank and the porcupine lives;
 *    grow the vine before then and Nib drops onto spines or into lava.
 * 4. The lower hall: the gold and the chest.
 * Winning order: W, P, Q, S (W first, or Nib walks into the trough; S
 * last, once the pit has cooled).
 */
export const TORCHES: LevelDef = {
  id: 'torches',
  chapter: CH1,
  name: 'Torches Out',
  goal: 'Take the chest and pick up 90 coins',
  tip: 'Lights out! Lava glows in the dark: water turns it to stone you can walk on.',
  dark: true,
  rooms: [
    // The upper hall: Nib's floor, the lava trough, the ledge and the high shelf.
    [[40, 460], [1240, 460], [1240, 956], [540, 956], [540, 1040], [380, 1040], [380, 1000], [40, 1000]],
    // The shaft, with its tanks at the top and the porcupine's pit at its foot.
    [[1240, 460], [1440, 460], [1440, 1704], [1240, 1704]],
    // The lower hall.
    [[40, 1240], [1240, 1240], [1240, 1640], [40, 1640]],
  ],
  walls: [
    { ax: 40, ay: 460, bx: 1240, by: 460, t: T }, // 0 ceiling
    { ax: 40, ay: 460, bx: 40, by: 1000, t: T }, // 1 left wall
    { ax: 40, ay: 1000, bx: 380, by: 1000, t: T }, // 2 Nib's floor
    { ax: 380, ay: 976, bx: 380, by: 1000, t: T }, // 3 the trough's curb
    { ax: 380, ay: 1000, bx: 380, by: 1040, t: T }, // 4 the trough
    { ax: 380, ay: 1040, bx: 540, by: 1040, t: T }, // 5
    { ax: 540, ay: 956, bx: 540, by: 1040, t: T }, // 6 the ledge's face
    { ax: 540, ay: 956, bx: 1240, by: 956, t: T }, // 7 the ledge
    { ax: 1240, ay: 460, bx: 1240, by: 620, t: T }, // 8 over the way into the shaft
    { ax: 1240, ay: 700, bx: 1240, by: 956, t: T }, // 9 under the shelf
    { ax: 900, ay: 700, bx: 1240, by: 700, t: T }, // 10 the high shelf
    { ax: 420, ay: 470, bx: 420, by: 600, t: T }, // 11 the trough's water tank
    { ax: 500, ay: 470, bx: 500, by: 600, t: T }, // 12
    { ax: 830, ay: 470, bx: 830, by: 600, t: T }, // 13 the seed's water tank
    { ax: 898, ay: 470, bx: 898, by: 600, t: T }, // 14
    { ax: 1240, ay: 460, bx: 1440, by: 460, t: T }, // 15 the shaft's roof
    { ax: 1440, ay: 460, bx: 1440, by: 1704, t: T }, // 16 its far side
    { ax: 1240, ay: 956, bx: 1240, by: 1240, t: T }, // 17 between the upper hall and the shaft
    { ax: 1280, ay: 470, bx: 1280, by: 620, t: T }, // 18 the shaft's tanks, water over lava
    { ax: 1400, ay: 470, bx: 1400, by: 620, t: T }, // 19
    { ax: 40, ay: 1240, bx: 1240, by: 1240, t: T }, // 20 the lower hall's ceiling
    { ax: 40, ay: 1240, bx: 40, by: 1640, t: T }, // 21 its left wall
    { ax: 40, ay: 1640, bx: 1240, by: 1640, t: T }, // 22 its floor
    { ax: 1240, ay: 1640, bx: 1240, by: 1704, t: T }, // 23 the porcupine's pit
    { ax: 1240, ay: 1704, bx: 1440, by: 1704, t: T }, // 24
  ],
  bars: [3, 10, 11, 12, 13, 14, 18, 19],
  pins: [
    { id: 'W', ax: 512, ay: 608, bx: 408, by: 608, t: PIN_T },
    { id: 'S', ax: 912, ay: 608, bx: 818, by: 608, t: PIN_T },
    { id: 'Q', ax: 1420, ay: 540, bx: 1268, by: 540, t: PIN_T },
    { id: 'P', ax: 1420, ay: 628, bx: 1268, by: 628, t: PIN_T },
  ],
  fills: [
    { kind: LAVA, x0: 388, x1: 532, y1: 1032, count: 68 },
    { kind: WATER, x0: 428, x1: 492, y1: 600, count: 40 },
    { kind: WATER, x0: 838, x1: 890, y1: 600, count: 40 },
    { kind: COIN, x0: 960, x1: 1232, y1: 692, count: 40 },
    { kind: WATER, x0: 1288, x1: 1392, y1: 532, count: 50 },
    { kind: LAVA, x0: 1288, x1: 1392, y1: 620, count: 60 },
    { kind: COIN, x0: 400, x1: 800, y1: 1632, count: 60 },
  ],
  nib: { x: 110, y: 968 },
  blots: [{ x: 1340, y: 1674, spiky: true }],
  chest: { x: 120, y: 1610 },
  coinsNeeded: 90,
  vines: [{ x: 864, top: 692, bottom: 948, seed: true }],
  solution: ['W', 'P', 'Q', 'S'],
  stops: [{ x: 700 }, { x: 864, y: 680 }, { x: 1100 }, { x: 1340 }, { x: 1000 }, { x: 400 }, { x: 120 }],
  torches: [
    { x: 200, y: 900 },
    { x: 700, y: 860 },
    { x: 1100, y: 880 },
    { x: 1100, y: 620 },
    { x: 1340, y: 900 },
    { x: 1340, y: 1400 },
    { x: 1000, y: 1560 },
    { x: 600, y: 1560 },
    { x: 260, y: 1560 },
  ],
  view: { x: 0, y: 190, w: 1480, h: 1570 },
};
