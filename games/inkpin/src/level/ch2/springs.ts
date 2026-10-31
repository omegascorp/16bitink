import type { LevelDef } from '../../logic/level';
import { COIN, LAVA, WATER } from '../../logic/particles';
import { CH2, PIN_T, T } from '../common';

/**
 * Level 4 of the Volcano Shrine: three salamanders bathe in the springs, and
 * lava never troubles them. One cistern of cold water serves all three, by
 * three outlets at three heights, and an outlet only gets the water above it:
 * pull a low one first and it takes the shares of the ones above too. So the
 * cistern is emptied from the top down, and the top tap serves the far spring,
 * the room furthest from Nib; the back salamander, behind him, comes last.
 * 1. The top tap (E), high on the cistern's right wall: its aqueduct runs over
 *    the far bank and pours its share on the far spring. It cools the spring
 *    to stone and washes away its salamander.
 *    - The gold basket (K) over the far spring before E: it drops into the
 *      lava (melted, at once).
 * 2. The spout (W), mid-height under the top tap: its chute pours straight
 *    down into the great spring in front of Nib's gate. It cools it to stone
 *    and washes its salamander, and the stone is a floor Nib climbs out of
 *    onto the far bank by. The grate on the far bank drinks any overflow, so
 *    the great spring can never pass water on to the far one.
 *    - W before E: the spout takes the top tap's share too; the far spring
 *      stays hot, and the gold dropped in later melts (melted), or Nib walks
 *      into it (burnt). It looks right until then: the great spring cools and
 *      its salamander goes.
 *    - Nib's gate (G) before W: he walks into the hot great spring (burnt).
 * 3. The bottom tap (D), at the foot of the cistern's left wall: its aqueduct
 *    runs back over Nib's head to the back terrace and washes the salamander
 *    lounging there by its dry ditch. It drains the cistern to the floor.
 *    - D first, the order a reader tries ("wash the guard behind Nib"): it
 *      washes the back salamander with the whole cistern, and both springs
 *      stay hot (burnt at the gate, or the gold melts).
 *    - D between E and W: the far spring is fine, the great spring stays hot
 *      (burnt at the gate).
 * 4. The lava tap (L) over the back ditch is the tempting trap: lava on a
 *    salamander is only a warm bath. With the back salamander still there, it
 *    wades across the ditch and sloshes the lava up the step onto Nib (burnt).
 *    It is never needed; after D it just fills the ditch.
 * 5. The gold: the basket (K) drops its coins into the far spring once E has
 *    cooled it, and Nib dives for them once the gate is open.
 * Winning order (the hint): E, W, D, K, G (K any time after E; G any time
 * after W; L never, or after D).
 */
export const SPRINGS: LevelDef = {
  id: 'salamander-springs',
  chapter: CH2,
  ruin: 'volcano',
  name: 'Salamander Springs',
  goal: 'Wash away every salamander and pick up 48 coins',
  tip: 'Salamanders bathe in lava and wade right through it: it never hurts them. Only water gets rid of one.',
  clear: true,
  rooms: [
    // Nib's hall: the back terrace, the dry ditch, the cold pool and the step up to his gate.
    [[40, 560], [500, 560], [500, 976], [360, 976], [360, 1000], [250, 1000], [250, 1040], [160, 1040], [160, 1000], [40, 1000]],
    // The great hall: the great spring, the far bank and the far spring.
    [[500, 440], [1300, 440], [1300, 1120], [1000, 1120], [1000, 1020], [880, 1020], [880, 1100], [500, 1100]],
  ],
  walls: [
    { ax: 40, ay: 560, bx: 500, by: 560, t: T }, // 0 Nib's hall ceiling
    { ax: 40, ay: 560, bx: 40, by: 1000, t: T }, // 1 left wall
    { ax: 40, ay: 1000, bx: 160, by: 1000, t: T }, // 2 the back terrace
    { ax: 160, ay: 1000, bx: 160, by: 1040, t: T }, // 3 the dry ditch: a drop no salamander steps into
    { ax: 160, ay: 1040, bx: 250, by: 1040, t: T }, // 4
    { ax: 250, ay: 1040, bx: 250, by: 1000, t: T }, // 5
    { ax: 250, ay: 1000, bx: 360, by: 1000, t: T }, // 6 Nib's landing
    { ax: 360, ay: 1000, bx: 360, by: 966, t: T }, // 7 the step up to Nib, with a lip
    { ax: 360, ay: 976, bx: 500, by: 976, t: T }, // 8 Nib's floor, by the gate
    { ax: 196, ay: 764, bx: 196, by: 880, t: T }, // 9 the lava tap over the ditch, lidded against the side tap's spray
    { ax: 256, ay: 764, bx: 256, by: 880, t: T }, // 10
    { ax: 196, ay: 764, bx: 256, by: 764, t: T }, // 11 its lid
    { ax: 500, ay: 440, bx: 500, by: 560, t: T }, // 12 the great hall's left wall
    { ax: 500, ay: 560, bx: 500, by: 640, t: T }, // 13 between the halls, over the aqueduct
    { ax: 500, ay: 700, bx: 500, by: 840, t: T }, // 14 between the halls, under the aqueduct and over Nib's gate
    { ax: 500, ay: 440, bx: 1300, by: 440, t: T }, // 15 the great hall's ceiling
    { ax: 500, ay: 976, bx: 500, by: 1100, t: T }, // 16 the great spring, too deep to climb out of
    { ax: 500, ay: 1100, bx: 880, by: 1100, t: T }, // 17
    { ax: 880, ay: 1100, bx: 880, by: 1020, t: T }, // 18
    { ax: 880, ay: 1020, bx: 1000, by: 1020, t: T }, // 19 the far bank
    { ax: 1000, ay: 1020, bx: 1000, by: 1120, t: T }, // 20 the far spring
    { ax: 1000, ay: 1120, bx: 1300, by: 1120, t: T }, // 21
    { ax: 1300, ay: 440, bx: 1300, by: 1120, t: T }, // 22 right wall
    { ax: 600, ay: 470, bx: 600, by: 592, t: T }, // 23 the cistern's left wall, over the bottom tap
    { ax: 600, ay: 640, bx: 840, by: 640, t: T }, // 24 the cistern's floor
    { ax: 840, ay: 470, bx: 840, by: 512, t: T }, // 25 the cistern's right wall, over the top tap
    { ax: 840, ay: 570, bx: 840, by: 570, t: T }, // 26 between the top tap and the spout
    { ax: 840, ay: 616, bx: 840, by: 640, t: T }, // 27 under the spout
    { ax: 582, ay: 654, bx: 176, by: 745, t: T }, // 28 the bottom tap's aqueduct, over Nib's head to the back terrace
    { ax: 848, ay: 574, bx: 1075, by: 690, t: T }, // 29 the top tap's aqueduct, over the far bank to the far spring
    { ax: 872, ay: 602, bx: 872, by: 640, t: T }, // 30 the spout's chute, under the aqueduct: the spout pours straight down
    { ax: 1180, ay: 560, bx: 1180, by: 672, t: T }, // 31 the coin basket over the far spring
    { ax: 1260, ay: 560, bx: 1260, by: 672, t: T }, // 32
  ],
  bars: [9, 10, 11, 13, 14, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32],
  pins: [
    { id: 'L', ax: 264, ay: 888, bx: 188, by: 888, t: PIN_T },
    { id: 'G', ax: 500, ay: 848, bx: 500, by: 970, t: PIN_T },
    { id: 'D', ax: 600, ay: 600, bx: 600, by: 640, t: PIN_T },
    { id: 'W', ax: 840, ay: 610, bx: 840, by: 584, t: PIN_T },
    { id: 'E', ax: 840, ay: 520, bx: 840, by: 556, t: PIN_T },
    { id: 'K', ax: 1268, ay: 680, bx: 1172, by: 680, t: PIN_T },
  ],
  fills: [
    { kind: LAVA, x0: 204, x1: 248, y1: 880, count: 44 },
    { kind: LAVA, x0: 508, x1: 872, y1: 1092, count: 114 },
    { kind: WATER, x0: 608, x1: 832, y1: 632, count: 260 },
    { kind: COIN, x0: 1188, x1: 1252, y1: 672, count: 55 },
    { kind: LAVA, x0: 1008, x1: 1292, y1: 1112, count: 38 },
  ],
  // A grate along the far bank: the great spring's overflow runs away down it, never on to the far spring.
  drains: [{ x0: 886, x1: 996, y0: 990, y1: 1012 }],
  nib: { x: 430, y: 944 },
  blots: [
    { x: 100, y: 970, animal: 'salamander' },
    { x: 665, y: 1070, animal: 'salamander' },
    { x: 1080, y: 1090, animal: 'salamander' },
  ],
  coinsNeeded: 48,
  solution: ['E', 'W', 'D', 'K', 'G'],
  stops: [{ x: 1170 }, { x: 1250 }],
  torches: [{ x: 120, y: 700 }, { x: 420, y: 800 }, { x: 560, y: 900 }, { x: 960, y: 820 }, { x: 1150, y: 900 }],
  view: { x: 0, y: 420, w: 1340, h: 760 },
};
