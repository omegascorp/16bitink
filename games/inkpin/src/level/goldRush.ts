import type { LevelDef } from '../logic/level';
import { COIN } from '../logic/particles';
import { CH1, PIN_T, T } from './common';

/**
 * Level 2, Loot: a hopper of gold over a ramp that runs down to the drain.
 * Pull the ramp away first and the gold falls into the hall instead.
 * Winning orders: B before A (Nib's gate G any time).
 */
export const GOLD_RUSH: LevelDef = {
  id: 'gold-rush',
  chapter: CH1,
  name: 'Gold Rush',
  goal: 'Pick up 150 coins',
  rooms: [
    [[125, 420], [440, 420], [440, 790], [680, 790], [680, 1100], [125, 1100]],
    [[40, 700], [125, 700], [125, 1100], [40, 1100]],
  ],
  walls: [
    { ax: 125, ay: 420, bx: 440, by: 420, t: T }, // hopper ceiling
    { ax: 125, ay: 420, bx: 125, by: 730, t: T }, // hopper's left side, above the way into the chute
    { ax: 440, ay: 420, bx: 440, by: 790, t: T }, // hopper's right side
    { ax: 440, ay: 790, bx: 680, by: 790, t: T }, // hall ceiling
    { ax: 680, ay: 790, bx: 680, by: 1100, t: T }, // right wall
    { ax: 40, ay: 1100, bx: 680, by: 1100, t: T }, // floor
    { ax: 125, ay: 832, bx: 125, by: 1100, t: T }, // the chute's wall
    { ax: 40, ay: 700, bx: 125, by: 700, t: T }, // chute ceiling
    { ax: 40, ay: 700, bx: 40, by: 1100, t: T }, // chute's back wall
    { ax: 560, ay: 790, bx: 560, by: 852, t: T }, // over Nib's gate
  ],
  bars: [6, 9],
  pins: [
    { id: 'A', ax: 108, ay: 600, bx: 448, by: 600, t: PIN_T },
    { id: 'B', ax: 462, ay: 626, bx: 138, by: 814, t: PIN_T },
    { id: 'G', ax: 560, ay: 860, bx: 560, by: 1094, t: PIN_T },
  ],
  fills: [{ kind: COIN, x0: 133, x1: 432, y1: 593, count: 220 }],
  drains: [{ x0: 48, x1: 118, y0: 1050, y1: 1100 }],
  nib: { x: 620, y: 1068 },
  blots: [],
  coinsNeeded: 150,
  solution: ['B', 'A', 'G'],
  stops: [{ x: 300 }, { x: 160 }],
  torches: [{ x: 620, y: 880 }, { x: 290, y: 860 }],
  view: { x: 0, y: 190, w: 720, h: 960 },
};
