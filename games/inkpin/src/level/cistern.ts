import type { LevelDef } from '../logic/level';
import { COIN, WATER } from '../logic/particles';
import { CH1, PIN_T, T } from './common';

/** The cistern's walls and floor, and the boulder-sized dip by its sluice (with the drain in it). */
const CL = 140;
const CR = 320;
const FLOOR = 1100;
const DIP = 1130;
const DIP_L = 210;
/** The boulder's niche in the cistern's side, over the dip, behind its pin: its floor tips out, so the boulder rolls out and drops into the dip. */
const NICHE_TOP = 640;
const NICHE_FLOOR = 730;
const NICHE_R = 390;
/** The passage out of the top of the cistern, which Nib floats up to. */
const PASS_TOP = 780;
const PASS = 908;
/** The sluice: a door in the cistern's foot into the porcupine's tunnel, which runs down to a spout high in the lock room's wall. */
const DOOR_TOP = 1000;
const SPOUT = 1150;
/** The lock room, its floor running down to the crate's pit at the foot of the ledge (70 px up, too high to climb), and the ceiling over the ledge. */
const LL = 630;
const LF = 1300;
const PIT = 954;
const PIT_R = 1034;
const PIT_BOTTOM = 1460;
const LEDGE = 1230;
const CEIL = 1110;
/** Top of the overflow slot: the pit's water can rise no higher, so a floating crate's top is a step to the ledge and Nib alone can't swim up to it. */
const SPILL = 1290;
/** The last hall, below the ledge, with the chest up on a shelf at its far end and the seed at its foot. */
const HALL_L = 1300;
const HALL_R = 1800;
const HALL = 1460;
const SHELF = 1260;
const SHELF_L = 1660;

/**
 * Level 3: one tank of rain, and it does every job on the way to the chest,
 * if it's sent on in the right order and Nib is in the right place.
 * 1. The cistern: Nib is down a dry cistern. The rain W (with the gold in
 *    it) pours down its far side, onto the sluice's dip, and the drain is
 *    in that dip. The boulder S waits in a niche over it: pull its pin and
 *    it rolls out and plugs the drain. Then the rain floats Nib up to the
 *    passage out, and the gold pours over him on the way. Rain first and
 *    the gold runs straight down the drain. And the boulder comes down
 *    right where Nib stands to wait by the sluice: drop it before he goes
 *    over there, or it lands on him.
 * 2. The sluice X opens the cistern's foot into a tunnel where a porcupine
 *    paces. Open it while Nib is still down the cistern and the porcupine
 *    walks in and gets him. Open it once the rain has floated him out, and
 *    the cistern's water rushes down the tunnel and washes it away: the
 *    rain's second job.
 * 3. The crate's pit: the passage drops Nib into the lock room, at the foot
 *    of a ledge too high to climb, with a narrow pit at its foot. The crate
 *    hangs over the pit on C: drop it in before Nib goes down there, or it
 *    lands on him. The water from the tunnel's spout fills the pit up to its
 *    overflow and the crate floats up, Nib on it, a step up to the ledge
 *    (the overflow keeps the water too low for Nib to swim up by himself).
 * 4. The last hall: the overflow runs on down a pipe and waters the seed
 *    under the chest's shelf, and it grows into the vine up to the chest.
 * Winning order: S, C, W, X. (A patient player can drop the crate any time
 * before Nib goes down the pit, and the boulder any time Nib isn't under
 * it, as long as it comes before the rain.)
 */
export const CISTERN: LevelDef = {
  id: 'cistern',
  chapter: CH1,
  name: 'The Rain Cistern',
  goal: 'Take the chest and pick up 60 coins',
  tip: 'Nib floats, and so do crates! One tank of rain does every job here, in the right order.',
  rooms: [
    // The rain tank over the cistern, and the cistern with its dip.
    [[40, 300], [CR, 300], [CR, NICHE_TOP], [NICHE_R, NICHE_TOP], [NICHE_R, NICHE_FLOOR - 5], [CR, NICHE_FLOOR], [CR, DIP], [DIP_L, DIP], [DIP_L, FLOOR], [CL, FLOOR], [CL, 484], [40, 430]],
    [[CR, PASS_TOP], [LL, PASS_TOP], [LL, PASS], [CR, PASS]], // the passage out of the cistern
    [[CR, DOOR_TOP], [LL, SPOUT - 70], [LL, SPOUT], [CR, FLOOR]], // the porcupine's tunnel
    // The lock room, with the crate's pit at the foot of the ledge.
    [[LL, PASS_TOP], [PIT_R, PASS_TOP], [PIT_R, PIT_BOTTOM], [PIT, PIT_BOTTOM], [PIT, LF], [LL, LF - 20]],
    // The ledge, and the last hall below it.
    [[PIT_R, CEIL], [HALL_R, CEIL], [HALL_R, HALL], [SHELF_L, HALL], [HALL_L, HALL - 20], [HALL_L, LEDGE], [PIT_R, LEDGE]],
    // The overflow's pipe down to the last hall.
    [[PIT_R, SPILL - 8], [HALL_L, 1370], [HALL_L, 1410], [PIT_R, SPILL + 28]],
  ],
  walls: [
    { ax: 40, ay: 300, bx: CR, by: 300, t: T }, // 0 tank ceiling
    { ax: 40, ay: 300, bx: 40, by: 430, t: T }, // 1 tank's back wall
    { ax: 40, ay: 430, bx: 260, by: 548, t: T }, // 2 tank floor, steep, so the gold slides to the outlet
    { ax: CR, ay: 300, bx: CR, by: NICHE_TOP, t: T }, // 3 the tank's and the cistern's right wall
    // The boulder's niche in the cistern's side, its floor tipped so the boulder rolls out over the dip.
    { ax: CR, ay: NICHE_TOP, bx: NICHE_R, by: NICHE_TOP, t: T }, // 4
    { ax: NICHE_R, ay: NICHE_TOP, bx: NICHE_R, by: NICHE_FLOOR - 5, t: T }, // 5
    { ax: NICHE_R, ay: NICHE_FLOOR - 5, bx: CR, by: NICHE_FLOOR, t: T }, // 6
    { ax: CR, ay: NICHE_FLOOR, bx: CR, by: PASS_TOP, t: T }, // 7 the cistern's right wall, under the niche
    { ax: CL, ay: 484, bx: CL, by: FLOOR, t: T }, // 8 cistern's left wall
    { ax: CL, ay: FLOOR, bx: DIP_L, by: FLOOR, t: T }, // 9 cistern floor
    { ax: DIP_L, ay: FLOOR, bx: DIP_L, by: DIP, t: T }, // 10 the dip by the sluice, with the drain in it
    { ax: DIP_L, ay: DIP, bx: CR, by: DIP, t: T }, // 11
    { ax: CR, ay: FLOOR, bx: CR, by: DIP, t: T }, // 12 the dip's far side, under the sluice
    // The passage out of the top of the cistern.
    { ax: CR, ay: PASS_TOP, bx: LL, by: PASS_TOP, t: T }, // 13
    { ax: CR, ay: PASS, bx: LL, by: PASS, t: T }, // 14
    { ax: CR, ay: PASS, bx: CR, by: DOOR_TOP, t: T }, // 15 cistern's right wall, over the sluice
    // The porcupine's tunnel: down from the sluice to a spout high in the lock room's wall (too high for it to jump down).
    { ax: CR, ay: DOOR_TOP, bx: LL, by: SPOUT - 70, t: T }, // 16
    { ax: CR, ay: FLOOR, bx: LL, by: SPOUT, t: T }, // 17
    // The lock room.
    { ax: LL, ay: PASS_TOP, bx: PIT_R, by: PASS_TOP, t: T }, // 18 its ceiling
    { ax: LL, ay: PASS, bx: LL, by: SPOUT - 70, t: T }, // 19 its near wall, over the spout
    { ax: LL, ay: SPOUT, bx: LL, by: LF - 20, t: T }, // 20 and under it
    { ax: LL, ay: LF - 20, bx: PIT, by: LF, t: T }, // 21 its floor, sloping down to the pit
    { ax: PIT, ay: LF, bx: PIT, by: PIT_BOTTOM, t: T }, // 22 the crate's pit: just wide enough for it, so the water stands deep
    { ax: PIT, ay: PIT_BOTTOM, bx: PIT_R, by: PIT_BOTTOM, t: T }, // 23
    { ax: PIT_R, ay: LEDGE, bx: PIT_R, by: SPILL - 8, t: T }, // 24 the pit's far side, up to the ledge (over the overflow)
    { ax: PIT_R, ay: SPILL + 28, bx: PIT_R, by: PIT_BOTTOM, t: T }, // 25
    { ax: PIT_R, ay: PASS_TOP, bx: PIT_R, by: CEIL, t: T }, // 26 the lock room's far wall, over the ledge
    // The ledge, and the last hall below it.
    { ax: PIT_R, ay: CEIL, bx: HALL_R, by: CEIL, t: T }, // 27
    { ax: PIT_R, ay: LEDGE, bx: HALL_L, by: LEDGE, t: T }, // 28 the ledge, to its edge over the last hall
    // The overflow: a slot in the pit's far side and a pipe down to the last hall.
    { ax: PIT_R, ay: SPILL - 8, bx: HALL_L, by: 1370, t: T }, // 29
    { ax: PIT_R, ay: SPILL + 28, bx: HALL_L, by: 1410, t: T }, // 30
    { ax: HALL_L, ay: LEDGE, bx: HALL_L, by: 1370, t: T }, // 31 the last hall's near wall
    { ax: HALL_L, ay: 1410, bx: HALL_L, by: HALL, t: T }, // 32
    { ax: HALL_L, ay: HALL - 20, bx: SHELF_L, by: HALL, t: T }, // 33 the hall floor, sloping down to the seed
    { ax: SHELF_L, ay: HALL, bx: HALL_R, by: HALL, t: T }, // 34
    { ax: HALL_R, ay: CEIL, bx: HALL_R, by: HALL, t: T }, // 35
    { ax: SHELF_L, ay: SHELF, bx: HALL_R, by: SHELF, t: T }, // 36 the chest's shelf
    { ax: SHELF_L, ay: SHELF, bx: SHELF_L, by: HALL, t: T }, // 37
  ],
  bars: [2, 36, 37],
  pins: [
    { id: 'W', ax: CR + 20, ay: 556, bx: 254, by: 556, t: PIN_T },
    { id: 'S', ax: CR, ay: NICHE_FLOOR + 4, bx: CR, by: NICHE_TOP + 4, t: PIN_T },
    { id: 'X', ax: CR, ay: DOOR_TOP + 4, bx: CR, by: FLOOR - 6, t: PIN_T },
    { id: 'C', ax: PIT_R + 20, ay: 1104, bx: PIT - 8, by: 1104, t: PIN_T },
  ],
  fills: [
    { kind: COIN, x0: 200, x1: 312, y1: 516, count: 70 },
    { kind: WATER, x0: 48, x1: 312, y1: 430, count: 290 },
    { kind: COIN, x0: 1690, x1: 1750, y1: SHELF - 8, count: 30 },
  ],
  boulders: [{ x: CR + 34, y: NICHE_FLOOR - 40 }],
  crates: [{ x: (PIT + PIT_R) / 2, y: 1068 }],
  drains: [
    { x0: DIP_L + 8, x1: CR - 8, y0: 1094, y1: 1140 }, // the cistern's, in the dip: anything that gets down into it is gone, unless the boulder fills it
  ],
  vines: [{ x: SHELF_L - 26, top: SHELF - 8, bottom: HALL - 8, seed: true }],
  nib: { x: 180, y: 1068 },
  blots: [{ x: 480, y: 1096, spiky: true }],
  chest: { x: 1760, y: SHELF - 30 },
  coinsNeeded: 60,
  solution: ['S', 'C', 'W', 'X'],
  stops: [{ x: (PIT + PIT_R) / 2 }, { x: 1250 }, { x: SHELF_L - 26, y: SHELF - 6 }, { x: 1760 }],
  torches: [{ x: 230, y: 820 }, { x: 470, y: 840 }, { x: 800, y: 900 }, { x: 1150, y: 1160 }, { x: 1500, y: 1300 }, { x: 1720, y: 1180 }, { x: 180, y: 380 }],
  view: { x: 0, y: 220, w: 1840, h: 1290 },
};
