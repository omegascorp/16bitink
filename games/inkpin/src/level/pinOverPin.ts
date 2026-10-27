import type { LevelDef } from '../logic/level';
import { COIN } from '../logic/particles';
import { CH1, PIN_T, T } from './common';

/**
 * Level 6: crossed pins. The gold's pin can't slide out past the boulder's,
 * and Nib's door opens straight away, onto a pit with a porcupine in it. Drop
 * the boulder on it first: it fills the pit, and frees the gold's pin.
 * Winning orders: B, C, N or B, N, C.
 */
export const PIN_OVER_PIN: LevelDef = {
  id: 'pin-over-pin',
  chapter: CH1,
  name: 'Pin Over Pin',
  goal: 'Take the chest and pick up 110 coins',
  tip: 'A pin can’t slide out through another pin.',
  rooms: [[[40, 600], [490, 600], [490, 440], [680, 440], [680, 1100], [448, 1100], [448, 1160], [372, 1160], [372, 1100], [40, 1100]]],
  walls: [
    { ax: 40, ay: 600, bx: 40, by: 1100, t: T }, // left wall
    { ax: 40, ay: 600, bx: 490, by: 600, t: T }, // ceiling
    { ax: 490, ay: 440, bx: 490, by: 700, t: T }, // the hopper's side
    { ax: 490, ay: 440, bx: 680, by: 440, t: T }, // hopper ceiling
    { ax: 680, ay: 440, bx: 680, by: 1100, t: T }, // right wall
    { ax: 448, ay: 1100, bx: 680, by: 1100, t: T }, // floor, right of the pit
    { ax: 448, ay: 1100, bx: 448, by: 1160, t: T }, // the boar's pit
    { ax: 372, ay: 1160, bx: 448, by: 1160, t: T },
    { ax: 372, ay: 1100, bx: 372, by: 1160, t: T },
    { ax: 40, ay: 1100, bx: 372, by: 1100, t: T }, // floor, left of the pit
    { ax: 372, ay: 600, bx: 372, by: 700, t: T }, // the boulder's alcove
    { ax: 448, ay: 600, bx: 448, by: 700, t: T },
    { ax: 200, ay: 600, bx: 200, by: 870, t: T }, // over Nib's door
  ],
  bars: [2, 10, 11, 12],
  pins: [
    { id: 'N', ax: 200, ay: 878, bx: 200, by: 1094, t: PIN_T },
    { id: 'B', ax: 350, ay: 700, bx: 458, by: 700, t: PIN_T },
    { id: 'C', ax: 480, ay: 700, bx: 674, by: 700, t: PIN_T },
  ],
  fills: [{ kind: COIN, x0: 498, x1: 672, y1: 693, count: 160 }],
  boulders: [{ x: 410, y: 666 }],
  nib: { x: 110, y: 1068 },
  blots: [{ x: 410, y: 1130, spiky: true }],
  chest: { x: 630, y: 1070 },
  coinsNeeded: 110,
  solution: ['B', 'C', 'N'],
  torches: [{ x: 120, y: 700 }, { x: 290, y: 820 }, { x: 560, y: 820 }],
  view: { x: 0, y: 190, w: 720, h: 1000 },
};
