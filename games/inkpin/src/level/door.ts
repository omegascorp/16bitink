import type { LevelDef } from '../logic/level';
import { COIN } from '../logic/particles';
import { CH1, PIN_T, T } from './common';

/**
 * Level 1, the tutorial: one pin between Nib and the chest, a pile of gold
 * on the way, and a vine up to a ledge of bonus coins.
 */
export const DOOR: LevelDef = {
  id: 'door',
  chapter: CH1,
  name: 'The Door',
  goal: 'Pull the pin and take the chest',
  tip: 'Tap the pin to pull it, then tap the floor by the chest to send Nib there. Tap the vine to climb it.',
  rooms: [[[40, 600], [680, 600], [680, 1100], [40, 1100]]],
  walls: [
    { ax: 40, ay: 600, bx: 680, by: 600, t: T }, // ceiling
    { ax: 40, ay: 600, bx: 40, by: 1100, t: T }, // left wall
    { ax: 680, ay: 600, bx: 680, by: 1100, t: T }, // right wall
    { ax: 40, ay: 1100, bx: 680, by: 1100, t: T }, // floor
    { ax: 40, ay: 868, bx: 196, by: 868, t: T }, // the high ledge with the bonus gold
    { ax: 330, ay: 600, bx: 330, by: 862, t: T }, // the wall the door hangs from
    { ax: 470, ay: 1100, bx: 530, by: 1072, t: T }, // a lip to hop
    { ax: 530, ay: 1072, bx: 560, by: 1100, t: T },
  ],
  bars: [4, 5],
  pins: [{ id: 'door', ax: 330, ay: 870, bx: 330, by: 1094, t: PIN_T }],
  fills: [
    { kind: COIN, x0: 360, x1: 450, y1: 1092, count: 40 },
    { kind: COIN, x0: 56, x1: 186, y1: 860, count: 24 },
  ],
  nib: { x: 110, y: 1068 },
  blots: [],
  chest: { x: 628, y: 1070 },
  coinsNeeded: 30,
  vines: [{ x: 232, top: 860, bottom: 1092 }],
  solution: ['door'],
  torches: [{ x: 120, y: 700 }, { x: 500, y: 700 }],
  view: { x: 0, y: 190, w: 720, h: 960 },
};
