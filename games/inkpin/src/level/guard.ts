import type { LevelDef } from '../logic/level';
import { COIN, WATER } from '../logic/particles';
import { CH1, PIN_T, T } from './common';

/**
 * Level 4: the boar guards the chest. Its water hangs over a ramp that runs
 * to the drain: pull the ramp, then the water, and only then Nib's gate.
 * Opened early, the gate lets the boar in; Nib can wait up the vine.
 * Winning order: R, W, G.
 */
export const GUARD: LevelDef = {
  id: 'guard',
  chapter: CH1,
  name: 'The Guard',
  goal: 'Take the chest and pick up 40 coins',
  rooms: [
    [[290, 420], [680, 420], [680, 800], [290, 800]],
    [[40, 800], [680, 800], [680, 1100], [40, 1100]],
  ],
  walls: [
    { ax: 40, ay: 800, bx: 290, by: 800, t: T }, // ceiling over Nib's side
    { ax: 290, ay: 420, bx: 290, by: 800, t: T }, // the upper room's left wall
    { ax: 290, ay: 420, bx: 680, by: 420, t: T }, // its ceiling
    { ax: 680, ay: 420, bx: 680, by: 1100, t: T }, // right wall
    { ax: 40, ay: 1100, bx: 680, by: 1100, t: T }, // floor
    { ax: 40, ay: 800, bx: 40, by: 1100, t: T }, // left wall
    { ax: 548, ay: 420, bx: 548, by: 612, t: T }, // the tank's side
    { ax: 560, ay: 744, bx: 560, by: 800, t: T }, // the drain pit's lip
    { ax: 560, ay: 800, bx: 680, by: 800, t: T }, // the drain pit's floor
    { ax: 40, ay: 900, bx: 140, by: 900, t: T }, // the ledge with the bonus gold
    { ax: 220, ay: 800, bx: 220, by: 852, t: T }, // over Nib's gate
  ],
  bars: [6, 7, 8, 9, 10],
  pins: [
    { id: 'W', ax: 274, ay: 620, bx: 556, by: 620, t: PIN_T },
    { id: 'R', ax: 274, ay: 652, bx: 552, by: 734, t: PIN_T },
    { id: 'G', ax: 220, ay: 860, bx: 220, by: 1094, t: PIN_T },
  ],
  fills: [
    { kind: WATER, x0: 298, x1: 540, y1: 612, count: 260 },
    { kind: COIN, x0: 540, x1: 620, y1: 1092, count: 50 },
    { kind: COIN, x0: 48, x1: 124, y1: 892, count: 18 },
  ],
  drains: [{ x0: 568, x1: 672, y0: 770, y1: 800 }],
  nib: { x: 100, y: 1068 },
  blots: [{ x: 450, y: 1070 }],
  chest: { x: 630, y: 1070 },
  coinsNeeded: 40,
  vines: [{ x: 176, top: 892, bottom: 1092 }],
  solution: ['R', 'W', 'G'],
  torches: [{ x: 120, y: 850 }, { x: 400, y: 860 }, { x: 610, y: 480 }],
  view: { x: 0, y: 190, w: 720, h: 960 },
};
