import type { LevelDef } from '../logic/level';
import { COIN, LAVA, WATER } from '../logic/particles';

/**
 * The prototype level: the gold vault under the Jungle Temple. Nib waits in a closet behind the gate pin; a Blot
 * waits in the pit below the chest's shelf. Water stands in the left shaft;
 * in the right one coins sit above lava. Releasing the coins first drops
 * them in the lava, opening the gate first lets the Blot in or drops Nib
 * into an empty pit, and the lava must meet the water before Nib walks.
 * Winning orders: W, L, C, gate (or L before W).
 */
const T = 8;
const PIN_T = 7;

export const CELLAR: LevelDef = {
  id: 'cellar',
  chapter: 'Chapter 1 · The Jungle Temple',
  name: 'The Gold Vault',
  goal: 'Take the chest and pick up 200 coins',
  rooms: [
    [[30, 1000], [250, 1000], [250, 960], [670, 960], [670, 1140], [590, 1140], [590, 1230], [230, 1230], [230, 1140], [30, 1140]],
    [[250, 330], [460, 330], [460, 960], [250, 960]],
    [[460, 330], [670, 330], [670, 960], [460, 960]],
  ],
  walls: [
    { ax: 250, ay: 330, bx: 250, by: 1000, t: T }, // left side of the water shaft
    { ax: 250, ay: 330, bx: 670, by: 330, t: T }, // ceiling
    { ax: 460, ay: 330, bx: 460, by: 960, t: T }, // divider between the shafts
    { ax: 670, ay: 330, bx: 670, by: 1140, t: T }, // right side
    { ax: 590, ay: 1140, bx: 670, by: 1140, t: T }, // the chest's shelf
    { ax: 672, ay: 978, bx: 588, by: 1030, t: T }, // a sloping roof over the shelf, so nothing pours onto the chest
    { ax: 590, ay: 1120, bx: 590, by: 1230, t: T }, // the shelf's face, with a lip that keeps spills off the shelf
    { ax: 230, ay: 1230, bx: 590, by: 1230, t: T }, // pit floor
    { ax: 230, ay: 1140, bx: 230, by: 1230, t: T }, // ledge face
    { ax: 30, ay: 1140, bx: 230, by: 1140, t: T }, // closet floor
    { ax: 30, ay: 1000, bx: 30, by: 1140, t: T }, // closet back wall
    { ax: 30, ay: 1000, bx: 250, by: 1000, t: T }, // closet ceiling
  ],
  bars: [2, 5],
  pins: [
    // The gate slides down into the ledge: pulled up, it would run into the water pin.
    { id: 'gate', ax: 215, ay: 1168, bx: 215, by: 994, t: PIN_T },
    { id: 'W', ax: 196, ay: 912, bx: 462, by: 912, t: PIN_T },
    { id: 'L', ax: 708, ay: 912, bx: 458, by: 912, t: PIN_T },
    { id: 'C', ax: 708, ay: 652, bx: 458, by: 652, t: PIN_T },
  ],
  fills: [
    { kind: WATER, x0: 258, x1: 452, y1: 905, count: 300 },
    { kind: LAVA, x0: 468, x1: 662, y1: 905, count: 180 },
    { kind: COIN, x0: 468, x1: 662, y1: 645, count: 280 },
  ],
  nib: { x: 110, y: 1108 },
  blots: [{ x: 420, y: 1200 }],
  chest: { x: 632, y: 1110 },
  coinsNeeded: 200,
  solution: ['W', 'L', 'C', 'gate'],
  torches: [{ x: 120, y: 1050 }, { x: 355, y: 470 }, { x: 565, y: 470 }, { x: 400, y: 1010 }],
  view: { x: 0, y: 190, w: 720, h: 1070 },
};
