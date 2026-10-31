import type { LevelDef } from '../../logic/level';
import { COIN, LAVA, WATER } from '../../logic/particles';
import { CH2, PIN_T, T } from '../common';

/**
 * Level 4 of the Volcano Shrine: three salamanders bathe in the springs, and
 * lava never troubles them. One cistern of cold water has to cool the great
 * spring between Nib and the far one, wash the salamander in it, and run on
 * to the far spring and wash the last one; the boulder saves it a third job.
 * 1. The back terrace, behind Nib: a salamander lounges by a dry ditch it
 *    won't step into, under a lava tap (L) and a boulder in its chute (B).
 *    The lava tap is the tempting pull, a guard under lava, and the trap:
 *    it's only a warm bath, the lava fills the ditch, and the salamander
 *    wades across it, sloshing lava over the bathers' coins on Nib's
 *    landing, and up the step to Nib. The boulder squashes it. The lava is
 *    never needed: with the salamander gone it just overflows the ditch onto
 *    Nib's landing, where he picks up the coins.
 * 2. The great spring, in front of Nib's gate (G): a salamander bathes in its
 *    lava under the great cistern (W). The cistern cools it to stone, washes
 *    its salamander away, and fills it into a cold moat (a salamander that
 *    gets in later is washed too). Open the gate on the hot spring and Nib
 *    walks into it.
 * 3. The far spring: the cistern's overflow runs over the far bank and down
 *    the slope into the far spring, cools it and washes the last salamander.
 *    That's the cistern's second job, so none of it can be spared.
 * 4. The cistern's side tap (D) is the second trap: its aqueduct runs back
 *    over Nib's head to the back salamander, and it does wash it away, but it
 *    empties the whole cistern there, and the flood sweeps the coins on Nib's
 *    landing down the grate by the step. After the cistern has poured, the
 *    side tap is empty and does nothing.
 * 5. The gold: the basket (K) over the far spring drops its coins into it.
 *    Before the cistern, they melt in its lava; after, they sink into the cold
 *    water, where Nib dives for them. He needs them and the landing's coins.
 * The grate along the top of the step drinks the water Nib drips coming out of
 * the moat, so it never puts out the lava tap's bath.
 * Winning order (the hint): B, W, K, G. B any time; W before K, G and D.
 * Neither tap is ever needed: the side tap is empty once W has poured, and
 * the lava tap only does no harm once the goal is met.
 */
export const SPRINGS: LevelDef = {
  id: 'salamander-springs',
  chapter: CH2,
  ruin: 'volcano',
  name: 'Salamander Springs',
  goal: 'Wash away every salamander and pick up 48 coins',
  tip: 'Salamanders bathe in lava and wade right through it: it never hurts them. Only water or a boulder gets rid of one.',
  clear: true,
  rooms: [
    // Nib's hall: the back terrace, the dry ditch, Nib's landing and the step up to his gate.
    [[40, 560], [500, 560], [500, 976], [360, 976], [360, 1000], [250, 1000], [250, 1040], [160, 1040], [160, 1000], [40, 1000]],
    // The great hall: the great spring, the far bank and the far spring.
    [[500, 330], [1600, 330], [1600, 1150], [1400, 1150], [1400, 1072], [1240, 1000], [880, 1000], [880, 1070], [500, 1070]],
  ],
  walls: [
    { ax: 40, ay: 560, bx: 500, by: 560, t: T }, // 0 Nib's hall ceiling
    { ax: 40, ay: 560, bx: 40, by: 1000, t: T }, // 1 left wall
    { ax: 40, ay: 1000, bx: 160, by: 1000, t: T }, // 2 the back terrace
    { ax: 160, ay: 1000, bx: 160, by: 1040, t: T }, // 3 the dry ditch: a drop to a salamander, a dip to Nib
    { ax: 160, ay: 1040, bx: 250, by: 1040, t: T }, // 4
    { ax: 250, ay: 1040, bx: 250, by: 1000, t: T }, // 5
    { ax: 250, ay: 1000, bx: 360, by: 1000, t: T }, // 6 Nib's landing
    { ax: 360, ay: 1000, bx: 360, by: 966, t: T }, // 7 the step up to his gate, with a lip: lava pushed along stays below it
    { ax: 360, ay: 976, bx: 500, by: 976, t: T }, // 8 the top of the step, by the gate
    { ax: 68, ay: 760, bx: 68, by: 840, t: T }, // 9 the boulder's chute, over the back terrace
    { ax: 144, ay: 760, bx: 144, by: 840, t: T }, // 10
    { ax: 196, ay: 764, bx: 196, by: 860, t: T }, // 11 the lava tap, over the ditch
    { ax: 256, ay: 764, bx: 256, by: 860, t: T }, // 12
    { ax: 500, ay: 330, bx: 500, by: 560, t: T }, // 13 the great hall's left wall
    { ax: 500, ay: 560, bx: 500, by: 640, t: T }, // 14 between the halls, over the aqueduct
    { ax: 500, ay: 330, bx: 1600, by: 330, t: T }, // 15 the great hall's ceiling
    { ax: 500, ay: 976, bx: 500, by: 1070, t: T }, // 16 the great spring, too deep to climb out of
    { ax: 500, ay: 1070, bx: 880, by: 1070, t: T }, // 17
    { ax: 880, ay: 1070, bx: 880, by: 1000, t: T }, // 18
    { ax: 880, ay: 1000, bx: 1240, by: 1000, t: T }, // 19 the far bank
    { ax: 1240, ay: 1000, bx: 1400, by: 1072, t: T }, // 20 the slope down to the far spring
    { ax: 1400, ay: 1072, bx: 1400, by: 1150, t: T }, // 21 the far spring
    { ax: 1400, ay: 1150, bx: 1600, by: 1150, t: T }, // 22
    { ax: 1600, ay: 330, bx: 1600, by: 1150, t: T }, // 23 right wall
    { ax: 600, ay: 400, bx: 600, by: 592, t: T }, // 24 the great cistern, over its side tap
    { ax: 780, ay: 400, bx: 780, by: 640, t: T }, // 25
    { ax: 582, ay: 654, bx: 176, by: 745, t: T }, // 26 the side tap's aqueduct, over Nib's head to the back terrace
    { ax: 500, ay: 700, bx: 500, by: 840, t: T }, // 27 between the halls, under the aqueduct and over Nib's gate
    { ax: 1460, ay: 560, bx: 1460, by: 672, t: T }, // 28 the coin basket over the far spring
    { ax: 1540, ay: 560, bx: 1540, by: 672, t: T }, // 29
  ],
  bars: [9, 10, 11, 12, 14, 24, 25, 26, 27, 28, 29],
  pins: [
    { id: 'B', ax: 152, ay: 848, bx: 60, by: 848, t: PIN_T },
    { id: 'L', ax: 264, ay: 868, bx: 188, by: 868, t: PIN_T },
    { id: 'G', ax: 500, ay: 848, bx: 500, by: 970, t: PIN_T },
    { id: 'W', ax: 788, ay: 648, bx: 592, by: 648, t: PIN_T },
    { id: 'D', ax: 600, ay: 600, bx: 600, by: 640, t: PIN_T },
    { id: 'K', ax: 1548, ay: 680, bx: 1452, by: 680, t: PIN_T },
  ],
  fills: [
    { kind: LAVA, x0: 204, x1: 248, y1: 860, count: 44 },
    { kind: LAVA, x0: 508, x1: 872, y1: 1062, count: 114 },
    { kind: WATER, x0: 608, x1: 772, y1: 640, count: 360 },
    { kind: COIN, x0: 266, x1: 322, y1: 992, count: 15 },
    { kind: COIN, x0: 1468, x1: 1532, y1: 672, count: 40 },
    { kind: LAVA, x0: 1408, x1: 1592, y1: 1142, count: 38 },
  ],
  // A grate at the foot of the step, where the side tap's flood takes the landing's coins, and one along its top, where the water Nib drips runs away.
  drains: [
    { x0: 334, x1: 354, y0: 976, y1: 994 },
    { x0: 366, x1: 490, y0: 952, y1: 970 },
  ],
  boulders: [{ x: 106, y: 814 }],
  nib: { x: 430, y: 944 },
  blots: [
    { x: 100, y: 970, animal: 'salamander' },
    { x: 690, y: 1040, animal: 'salamander' },
    { x: 1500, y: 1120, animal: 'salamander' },
  ],
  coinsNeeded: 48,
  solution: ['B', 'W', 'K', 'G'],
  stops: [{ x: 690 }, { x: 1140 }, { x: 1500 }, { x: 1140 }, { x: 690 }, { x: 278 }, { x: 384 }],
  torches: [{ x: 300, y: 800 }, { x: 560, y: 800 }, { x: 960, y: 800 }, { x: 1320, y: 820 }, { x: 1570, y: 900 }],
  view: { x: 0, y: 300, w: 1640, h: 900 },
};
