import type { LevelDef } from '../logic/level';
import { COIN, LAVA, WATER } from '../logic/particles';
import { CH1, PIN_T, T } from './common';

/** The boss hall sits this far right, past the approach. */
const DX = 1400;
/** The aqueduct: from the great tank's side door down to its end over the boss's cistern. */
const AQ_X0 = 1040;
const AQ_Y0 = 536;
const AQ_X1 = DX + 260;
const AQ_Y1 = 740;
/** The aqueduct's floor height at x. */
const aq = (x: number): number => AQ_Y0 + ((x - AQ_X0) * (AQ_Y1 - AQ_Y0)) / (AQ_X1 - AQ_X0);
/** The tunnel to the idol hall, tipped back toward the seed's room, and its height at x. */
const tunnel = (x: number): number => 818 - ((x - 1112) * 18) / (DX + 40 - 1112);
/** The crate's slot in the tunnel: its near side, its floor, and the ledges the crate sits on. */
const SLOT = 1250;
const SLOT_Y = 920;
const SEAT = 870;

/**
 * Level 10, the boss: save the water for the Great Boar. The great tank over
 * the lava moat holds the only flood in the temple, and the boar needs nearly
 * all of it at once. Nib's gate (G) holds him back while the way is made.
 * 1. The great tank: its floor (W) is right over the moat, the obvious pull,
 *    and its side door (A) lets it down the aqueduct to the cistern over the
 *    boar. Door first: the flood runs off to the cistern, and the tank's well
 *    under the door keeps back just enough for W to pour on the moat, which
 *    sets to stone, and on down the drop to the seed. Floor first and the
 *    whole flood is spent on the moat: it runs down the drop and away through
 *    the seed room's grate, and the cistern stays dry.
 * 2. The moat's gold (D) only once the moat is stone, or it melts. Open the
 *    gate on the hot moat and Nib walks into it.
 * 3. The seed's room: Nib drops into it, climbs the vine the tank's last water
 *    grew (it also reaches back up to the moat, for gold dropped late), and
 *    walks the tunnel to the idol hall over the crate's slot. Drop
 *    the crate (K) first and it settles in the slot, a bridge. Let Nib in
 *    before it and he falls into the slot, too deep to climb out of, and the
 *    crate comes down on him.
 * 4. The Great Boar paces its floor under the cistern, between two drains.
 *    It shrugs off a splash and dries as it goes, so only the flood all at
 *    once washes it away: let the flood into the cistern, then open it (R).
 *    Open it first and the aqueduct's stream drops past a baffle straight
 *    into a drain, missing the boar. Either way the flood is lost, the boar is
 *    waiting when Nib climbs down into the hall.
 * Winning order: K, A, W, D, R, G (K any time before G; A before W and R; W
 * before D and G; R before G).
 */
export const IDOL_HALL: LevelDef = {
  id: 'idol-hall',
  chapter: CH1,
  name: 'The Idol Hall',
  goal: 'Beat the Great Boar and take the idol',
  tip: 'A splash won’t do: the Great Boar needs nearly every drop at once. Spend only the water it can spare.',
  rooms: [
    // The approach: Nib's landing, the lava moat, the seed's room with the tunnel and the crate's slot, and the aqueduct over it all.
    [
      [40, 330], [DX + 40, 330], [DX + 40, 1100], [1420, 1100], [1420, 1130], [1340, 1130], [1340, 1100], [1124, 1100], [1124, 1116], [1040, 1116], [1040, 648],
      [960, 640], [960, 704], [780, 704], [780, 640], [40, 640],
    ],
    // The idol hall.
    [
      [DX + 40, 330], [DX + 680, 330], [DX + 680, 1130], [DX + 564, 1130], [DX + 564, 1100], [DX + 540, 1100], [DX + 540, 1130], [DX + 480, 1130], [DX + 480, 1100], [DX + 316, 1100],
      [DX + 316, 1130], [DX + 216, 1130], [DX + 216, 1100], [DX + 40, 1100],
    ],
  ],
  walls: [
    { ax: 40, ay: 330, bx: DX + 40, by: 330, t: T }, // 0 the approach's ceiling
    { ax: 40, ay: 330, bx: 40, by: 640, t: T }, // 1 its left wall
    { ax: 40, ay: 640, bx: 780, by: 640, t: T }, // 2 Nib's floor, up to the moat
    { ax: 220, ay: 330, bx: 220, by: 512, t: T }, // 3 over Nib's gate
    { ax: 780, ay: 640, bx: 780, by: 704, t: T }, // 4 the lava moat
    { ax: 780, ay: 704, bx: 960, by: 704, t: T }, // 5
    { ax: 960, ay: 640, bx: 960, by: 704, t: T }, // 6
    { ax: 960, ay: 640, bx: 1040, by: 648, t: T }, // 7 the floor past it, down to the drop
    { ax: 796, ay: 340, bx: 796, by: 520, t: T }, // 8 the moat's gold
    { ax: 892, ay: 340, bx: 892, by: 560, t: T }, // 9 ... and the great tank beside it
    { ax: 1040, ay: 340, bx: 1040, by: 400, t: T }, // 10 the tank's far side, over its door to the aqueduct
    { ax: 1040, ay: AQ_Y0, bx: 1040, by: 560, t: T }, // 11 ... and under the door: the tank's well, which keeps some water back
    { ax: AQ_X0, ay: AQ_Y0, bx: AQ_X1, by: AQ_Y1, t: T }, // 12 the aqueduct, down to the idol hall
    { ax: 1112, ay: aq(1112), bx: 1112, by: 740, t: T }, // 13 the drop's far side, a shaft down from the aqueduct
    { ax: 1040, ay: 648, bx: 1040, by: 1116, t: T }, // 14 the seed's room, the seed in a dip under the drop
    { ax: 1040, ay: 1116, bx: 1124, by: 1116, t: T }, // 15
    { ax: 1124, ay: 1116, bx: 1124, by: 1100, t: T }, // 16
    { ax: 1124, ay: 1100, bx: 1340, by: 1100, t: T }, // 17
    { ax: 1340, ay: 1100, bx: 1340, by: 1130, t: T }, // 18 a grate at its far end
    { ax: 1340, ay: 1130, bx: 1420, by: 1130, t: T }, // 19
    { ax: 1420, ay: 1100, bx: 1420, by: 1130, t: T }, // 20
    { ax: 1420, ay: 1100, bx: DX + 40, by: 1100, t: T }, // 21
    { ax: 1112, ay: 818, bx: SLOT, by: tunnel(SLOT), t: T }, // 22 the tunnel to the idol hall, tipped so a splash runs back
    { ax: SLOT + 72, ay: tunnel(SLOT + 72), bx: DX + 40, by: 800, t: T }, // 23
    { ax: SLOT, ay: tunnel(SLOT), bx: SLOT, by: SLOT_Y, t: T }, // 24 the crate's slot in it, a crate wide and too deep to climb out of
    { ax: SLOT + 72, ay: tunnel(SLOT + 72), bx: SLOT + 72, by: SLOT_Y, t: T }, // 25
    { ax: SLOT, ay: SLOT_Y, bx: SLOT + 72, by: SLOT_Y, t: T }, // 26
    { ax: SLOT, ay: SEAT, bx: SLOT + 16, by: SEAT, t: T }, // 27 ledges the crate settles on, its top level with the tunnel
    { ax: SLOT + 56, ay: SEAT, bx: SLOT + 72, by: SEAT, t: T }, // 28
    { ax: SLOT, ay: aq(SLOT), bx: SLOT, by: 712, t: T }, // 29 the crate's chute, down from the aqueduct
    { ax: SLOT + 72, ay: aq(SLOT + 72), bx: SLOT + 72, by: 712, t: T }, // 30
    // The idol hall; Nib comes in at the ledge.
    { ax: DX + 40, ay: 330, bx: DX + 680, by: 330, t: T }, // 31 ceiling
    { ax: DX + 40, ay: aq(DX + 40), bx: DX + 40, by: 700, t: T }, // 32 left wall, under the aqueduct and over the tunnel
    { ax: DX + 680, ay: 330, bx: DX + 680, by: 1130, t: T }, // 33 right wall
    { ax: DX + 40, ay: 800, bx: DX + 140, by: 800, t: T }, // 34 Nib's ledge
    { ax: DX + 40, ay: 1100, bx: DX + 216, by: 1100, t: T }, // 35 the floor under it
    { ax: DX + 216, ay: 1100, bx: DX + 216, by: 1130, t: T }, // 36 a drain under the aqueduct's end
    { ax: DX + 216, ay: 1130, bx: DX + 316, by: 1130, t: T }, // 37
    { ax: DX + 316, ay: 1130, bx: DX + 316, by: 1100, t: T }, // 38
    { ax: DX + 316, ay: 1100, bx: DX + 480, by: 1100, t: T }, // 39 the boar's floor
    { ax: DX + 480, ay: 1100, bx: DX + 480, by: 1130, t: T }, // 40 another drain past it
    { ax: DX + 480, ay: 1130, bx: DX + 540, by: 1130, t: T }, // 41
    { ax: DX + 540, ay: 1130, bx: DX + 540, by: 1100, t: T }, // 42
    { ax: DX + 540, ay: 1100, bx: DX + 564, by: 1100, t: T }, // 43
    { ax: DX + 556, ay: 1100, bx: DX + 556, by: 1070, t: T }, // 44 a curb, and a sunken corner where the idol's gold lies by the chest
    { ax: DX + 564, ay: 1100, bx: DX + 564, by: 1130, t: T }, // 45
    { ax: DX + 564, ay: 1130, bx: DX + 680, by: 1130, t: T }, // 46
    { ax: DX + 216, ay: 770, bx: DX + 216, by: 890, t: T }, // 47 the cistern over the boar, its near side under the aqueduct's end
    { ax: DX + 500, ay: 700, bx: DX + 500, by: 890, t: T }, // 48
    { ax: DX + 296, ay: 640, bx: DX + 296, by: 800, t: T }, // 49 a baffle: the aqueduct's stream drops straight down here
    { ax: DX + 40, ay: 800, bx: DX + 40, by: 1100, t: T }, // 50 left wall, under the ledge
  ],
  bars: [3, 8, 9, 10, 11, 12, 13, 22, 23, 24, 25, 26, 27, 28, 29, 30, 34, 44, 47, 48, 49],
  pins: [
    { id: 'G', ax: 220, ay: 520, bx: 220, by: 634, t: PIN_T },
    { id: 'K', ax: SLOT + 92, ay: 732, bx: SLOT - 20, by: 732, t: PIN_T },
    { id: 'D', ax: 776, ay: 528, bx: 888, by: 528, t: PIN_T },
    { id: 'W', ax: 880, ay: 572, bx: 1048, by: 572, t: PIN_T },
    { id: 'A', ax: 1040, ay: 408, bx: 1040, by: 530, t: PIN_T },
    { id: 'R', ax: DX + 492, ay: 898, bx: DX + 208, by: 898, t: PIN_T },
  ],
  fills: [
    { kind: LAVA, x0: 788, x1: 952, y1: 696, count: 64 },
    { kind: COIN, x0: 804, x1: 884, y1: 520, count: 60 },
    { kind: WATER, x0: 900, x1: 1032, y1: 564, count: 300 },
    { kind: COIN, x0: DX + 572, x1: DX + 672, y1: 1122, count: 56 },
  ],
  crates: [{ x: SLOT + 36, y: 680 }],
  drains: [
    { x0: 1348, x1: 1412, y0: 1104, y1: 1170 },
    { x0: DX + 224, x1: DX + 308, y0: 1104, y1: 1170 },
    { x0: DX + 488, x1: DX + 532, y0: 1104, y1: 1170 },
  ],
  nib: { x: 100, y: 608 },
  blots: [{ x: DX + 400, y: 1052, boss: true }],
  chest: { x: DX + 640, y: 1100 },
  coinsNeeded: 90,
  vines: [
    { x: 1076, top: 640, bottom: 1108, seed: true },
    { x: DX + 176, top: 792, bottom: 1092 },
  ],
  solution: ['K', 'A', 'W', 'D', 'R', 'G'],
  stops: [{ x: 870 }, { x: 1030 }, { x: 1076, y: 638 }, { x: 1076, y: 810 }, { x: DX + 90 }, { x: DX + 176, y: 790 }, { x: DX + 176, y: 1090 }, { x: DX + 640 }],
  torches: [
    { x: 140, y: 560 },
    { x: 640, y: 560 },
    { x: 1200, y: 1000 },
    { x: 1390, y: 740 },
    { x: DX + 80, y: 740 },
    { x: DX + 600, y: 560 },
    { x: DX + 620, y: 960 },
  ],
  view: { x: 0, y: 190, w: DX + 720, h: 990 },
};
