import type { LevelDef } from '../logic/level';
import { COIN, WATER } from '../logic/particles';
import { CH1, PIN_T, T } from './common';

/**
 * Level 1, the tutorial, four small rooms with one idea each, and nothing
 * that can go wrong:
 * 1. The door: pull the pin, walk through, hop the lip; a vine up to a ledge
 *    of bonus gold.
 * 2. Gold rain: pull the hopper's pin and the gold pours onto the floor.
 * 3. The seed: a wall too tall to step up, and a seed at its foot. Pull the
 *    tank's pin: the water pours onto the seed, it grows into a vine, and the
 *    vine takes Nib up to the ledge (the only way on).
 * 4. The deep door: drop down the shaft (its vine climbs back up), pull the
 *    last door and take the chest.
 * Any order wins; the hint's is door, gold, water, deep.
 */
export const DOOR: LevelDef = {
  id: 'door',
  chapter: CH1,
  name: 'The Door',
  goal: 'Grow the vine, take the chest and pick up 100 coins',
  tip: 'Tap a pin to pull it, then tap the floor to send Nib there. Water makes a seed grow into a vine: tap a vine to climb it.',
  rooms: [
    [[40, 600], [680, 600], [680, 1100], [40, 1100]],
    [[680, 520], [1240, 520], [1240, 1100], [680, 1100]],
    [[1240, 600], [1720, 600], [1720, 900], [1240, 900]],
    [[1560, 900], [1720, 900], [1720, 1700], [1560, 1700]],
    [[700, 1400], [1560, 1400], [1560, 1700], [700, 1700]],
  ],
  walls: [
    // 1. The door.
    { ax: 40, ay: 600, bx: 680, by: 600, t: T }, // 0 ceiling
    { ax: 40, ay: 600, bx: 40, by: 1100, t: T }, // 1 left wall
    { ax: 40, ay: 1100, bx: 1240, by: 1100, t: T }, // 2 floor of the first two rooms
    { ax: 40, ay: 868, bx: 196, by: 868, t: T }, // 3 the high ledge with the bonus gold
    { ax: 330, ay: 600, bx: 330, by: 862, t: T }, // 4 the wall the door hangs from
    { ax: 470, ay: 1100, bx: 530, by: 1072, t: T }, // 5 a lip to hop
    { ax: 530, ay: 1072, bx: 560, by: 1100, t: T }, // 6
    // 2. Gold rain.
    { ax: 680, ay: 520, bx: 680, by: 800, t: T }, // 7 over the way in
    { ax: 680, ay: 520, bx: 1240, by: 520, t: T }, // 8 ceiling
    { ax: 852, ay: 540, bx: 852, by: 712, t: T }, // 9 hopper sides
    { ax: 1048, ay: 540, bx: 1048, by: 712, t: T }, // 10
    // 3. The seed (its water tank is walls 21 and 22).
    { ax: 1240, ay: 520, bx: 1240, by: 600, t: T }, // 11
    { ax: 1240, ay: 900, bx: 1240, by: 1100, t: T }, // 12 the wall too tall to step up
    { ax: 1240, ay: 900, bx: 1560, by: 900, t: T }, // 13 the ledge
    { ax: 1240, ay: 600, bx: 1720, by: 600, t: T }, // 14 ceiling
    // 4. The deep door.
    { ax: 1720, ay: 600, bx: 1720, by: 1700, t: T }, // 15 the shaft's right wall
    { ax: 1560, ay: 900, bx: 1560, by: 1400, t: T }, // 16 the shaft's left wall
    { ax: 700, ay: 1400, bx: 1560, by: 1400, t: T }, // 17 lower hall ceiling
    { ax: 700, ay: 1700, bx: 1720, by: 1700, t: T }, // 18 lower hall floor
    { ax: 700, ay: 1400, bx: 700, by: 1700, t: T }, // 19 lower hall's end wall
    { ax: 1100, ay: 1400, bx: 1100, by: 1460, t: T }, // 20 the wall the deep door hangs from
    // 3. The seed's water tank, over the seed.
    { ax: 1140, ay: 540, bx: 1140, by: 690, t: T }, // 21
    { ax: 1228, ay: 540, bx: 1228, by: 690, t: T }, // 22
  ],
  bars: [3, 4, 7, 9, 10, 20, 21, 22],
  pins: [
    { id: 'door', ax: 330, ay: 870, bx: 330, by: 1094, t: PIN_T },
    { id: 'gold', ax: 830, ay: 720, bx: 1070, by: 720, t: PIN_T },
    { id: 'water', ax: 1250, ay: 698, bx: 1120, by: 698, t: PIN_T },
    { id: 'deep', ax: 1100, ay: 1468, bx: 1100, by: 1694, t: PIN_T },
  ],
  fills: [
    { kind: COIN, x0: 360, x1: 450, y1: 1092, count: 40 },
    { kind: COIN, x0: 56, x1: 186, y1: 860, count: 24 },
    { kind: COIN, x0: 862, x1: 1038, y1: 712, count: 70 },
    { kind: WATER, x0: 1148, x1: 1220, y1: 690, count: 60 },
    { kind: COIN, x0: 1330, x1: 1450, y1: 892, count: 20 },
    { kind: COIN, x0: 880, x1: 1060, y1: 1692, count: 50 },
  ],
  nib: { x: 110, y: 1068 },
  blots: [],
  chest: { x: 760, y: 1670 },
  coinsNeeded: 100,
  vines: [
    { x: 232, top: 860, bottom: 1092 },
    { x: 1204, top: 892, bottom: 1092, seed: true },
    { x: 1596, top: 892, bottom: 1692 },
  ],
  solution: ['door', 'gold', 'water', 'deep'],
  stops: [{ x: 232, y: 850 }, { x: 70 }, { x: 232, y: 1090 }, { x: 620 }, { x: 950 }, { x: 1204, y: 880 }, { x: 1420 }, { x: 1596, y: 880 }, { x: 1650 }, { x: 960 }, { x: 760 }],
  torches: [{ x: 120, y: 700 }, { x: 500, y: 700 }, { x: 760, y: 620 }, { x: 1400, y: 700 }, { x: 1640, y: 1000 }, { x: 900, y: 1500 }],
  view: { x: 0, y: 190, w: 1760, h: 1580 },
};
