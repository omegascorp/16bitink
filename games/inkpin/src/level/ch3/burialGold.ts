import type { LevelDef } from '../../logic/level';
import { COIN, GAS, LAVA, WATER } from '../../logic/particles';
import { CH3, PIN_T, T } from '../common';

type Wall = { ax: number; ay: number; bx: number; by: number; t: number };

/** The hall's roof and floor (wall centre lines); the gutter room's floor is lower. */
const ROOF = 560;
const FLOOR = 880;
const GUTTER = 1230;
/** The burial chambers' middles: left, middle and right. Each chamber's floor spans 44 each side. */
const SX_L = 216;
const SX_M = 520;
const SX_R = 1040;
const HALF = 44;
/** The gas trench under the hall floor: its walls, the lid's height and its floor. */
const TX0 = 620;
const TX1 = 780;
const LID = 960;
const TRENCH_FLOOR = 1220;

const walls: Wall[] = [];
/** Adds a wall and returns its index (for `bars`, `cracked` and `seals`). */
const add = (ax: number, ay: number, bx: number, by: number): number => walls.push({ ax, ay, bx, by, t: T }) - 1;

// The hall: roof (broken by the three chamber floors), walls, floor.
add(100, ROOF, SX_L - HALF, ROOF);
add(SX_L + HALF, ROOF, SX_M - HALF, ROOF);
add(SX_M + HALF, ROOF, 788, 620); // the middle dome's roof slopes up to the bar, so its gas runs to the bowl
add(788, ROOF, SX_R - HALF, ROOF);
add(SX_R + HALF, ROOF, 1300, ROOF);
add(100, ROOF, 100, FLOOR); // the left wall
add(1300, ROOF, 1300, GUTTER); // the right wall
add(100, FLOOR, TX0, FLOOR); // the hall floor, under both coin pits
add(330, FLOOR, 330, FLOOR - 30); // the lip between the scarab pit and the ankh pit
add(580, FLOOR, 580, FLOOR - 30); // the ankh pit's right lip
// The middle dome over the ankh pit and the trench: lips deep enough for its gas, and the fire bowl's shelf.
add(440, ROOF, 440, 650);
add(788, ROOF, 788, 680);
const SHELF = add(440, 624, 464, 624); // the bowl stands at the shelf's tip
// The burial chambers over the roof.
const box = (sx: number): void => {
  add(sx - HALF, 470, sx - HALF, ROOF);
  add(sx + HALF, 470, sx + HALF, ROOF);
  add(sx - HALF, 470, sx + HALF, 470);
};
box(SX_L);
box(SX_M);
box(SX_R);
const BAR = add(SX_M - HALF, ROOF, SX_M + HALF, ROOF); // the middle chamber's floor: a cracked bar in the dome's roof
// The trench: the lid G holds the gas under it; the vat opens into it over the lid, W's cistern low down;
// the spillway to the gutter.
add(TX0, FLOOR, TX0, 1012);
add(TX0, 1058, TX0, TRENCH_FLOOR); // W's door 1020..1050, under the gas and over the lava's stone
add(TX0, TRENCH_FLOOR, TX1, TRENCH_FLOOR);
add(TX1, 962, TX1, 1054);
add(TX1, 1094, TX1, TRENCH_FLOOR); // the spillway 1062..1086: only water on top of the trench's stone reaches it
// The lava vat beside the trench, its door L just over the lid.
add(TX1, 790, TX1, 870);
add(TX1, 790, 900, 790);
add(900, 790, 900, LID);
add(TX1, LID, 900, LID);
// W's cistern under the hall floor, its floor level with the top of its door.
add(380, 1012, TX0, 1012);
add(380, 1012, 380, 1050);
add(380, 1050, TX0, 1050);
// The gutter room: the spillway's water runs down the gutter into the hoard's basin, where the lava lies.
add(TX1, 1120, 960, 1170);
add(960, 1170, 960, GUTTER);
add(960, GUTTER, 1300, GUTTER);
add(1150, GUTTER, 1150, GUTTER - 30); // the sill under the eye door: the lava lies on the hoard's side, Nib lands dry
// The hoard bin under the right chamber, narrowing to a 36-px spout over the basin.
add(SX_R - HALF, ROOF, SX_R - HALF, 880);
add(SX_R + HALF, ROOF, SX_R + HALF, 880);
add(SX_R - HALF, 880, SX_R - 26, 912);
add(SX_R + HALF, 880, SX_R + 26, 912);
// Nib's niche over the gutter.
add(1176, 900, 1176, 976);
add(1276, 900, 1276, 976);
// The eye door's housing over the basin, and the trap: the gold hopper P over the eye closet.
add(1150, 960, 1150, 1092);
add(1210, ROOF, 1210, 610);
add(1280, ROOF, 1280, 610);
add(1196, 650, 1196, 720);
add(1196, 720, 1300, 720);

/**
 * Chapter 3, level 25: The Burial Gold. Three burial chambers sit in the
 * hall's roof. Only the middle one can be opened by hand: its floor is a
 * cracked bar. Its gold weighs the ankh plate, which opens the left
 * chamber's floor; that gold weighs the scarab plate, which opens the right
 * chamber's floor, and the hoard drops into the bin K. So the gold comes out
 * middle, left, right: not the order of the rooms.
 * 1. The blast: G is the lid of the gas trench. The gas runs up the dome's
 *    sloped roof to the fire bowl at the shelf's tip, and the blast breaks
 *    the bar. The cascade runs on by itself (about 6 s). Nib never reaches
 *    the plates: they're on the hall floor, far above the gutter room.
 * 2. The stone: L's vat opens into the emptied trench, and W's cistern
 *    (its door under the gas) lets its water out onto the lava. The water
 *    sets it, stands on the stone up to the spillway, and runs down the
 *    gutter into the hoard's basin, whose lava sets too. Water let out
 *    first lies at the trench's bottom; the lava sets on it and keeps it
 *    there, so it never reaches the spillway.
 * 3. The hoard: K pours it into the basin through a narrow spout. S lets
 *    Nib down on the dry side of the sill, and he walks in for the gold.
 * 4. The eye door across the basin stands open while the eye closet is
 *    bare. P, the trap, drops a little gold into that closet: "more gold",
 *    but the door shuts between Nib and the hoard ('sealed').
 * Losses: L before G, its lava waits on the lid and the gas lights coming up
 * through it, low in the trench, far from the bar ('sealed'). W before L:
 * the basin stays hot and the hoard melts ('melted'). K before the basin
 * is set: 'melted'. S early is safe, but Nib walking in before the basin is
 * set burns ('burnt'). P, wherever it falls: 'sealed'.
 * Winning order: G, L, W, K, S, then the walk.
 */
export const BURIAL_GOLD: LevelDef = {
  id: 'burial-gold',
  chapter: CH3,
  ruin: 'tomb',
  name: 'The Burial Gold',
  goal: 'Open the burial chambers and pick up 30 coins of the hoard',
  tip: 'Gold on a plate works the door its groove leads to. Only the middle chamber breaks.',
  rooms: [
    [[108, 568], [SX_M + HALF, 568], [780, 620], [796, 568], [1292, 568], [1292, 1222], [968, 1222], [968, 1170], [788, 1112], [788, 968], [908, 968], [908, 782], [788, 782], [788, 872], [108, 872]], // the hall and the gutter room
    [[TX0 + 8, 872], [TX1 - 8, 872], [TX1 - 8, TRENCH_FLOOR - 8], [TX0 + 8, TRENCH_FLOOR - 8]], // the gas trench
    [[388, 1020], [612, 1020], [612, 1042], [388, 1042]], // W's cistern
    [[788, 798], [892, 798], [892, 952], [788, 952]], // the lava vat
    [[1218, 568], [1272, 568], [1272, 610], [1218, 610]], // the trap's gold hopper
    ...[SX_L, SX_M, SX_R].map((sx): [number, number][] => [[sx - 36, 478], [sx + 36, 478], [sx + 36, ROOF], [sx - 36, ROOF]]),
  ],
  walls,
  bars: [SHELF, BAR],
  cracked: [BAR],
  pins: [
    { id: 'G', ax: TX1 + 4, ay: LID, bx: TX0 - 4, by: LID, t: PIN_T }, // the gas trench's lid
    { id: 'W', ax: TX0, ay: 1066, bx: TX0, by: 1012, t: PIN_T }, // the cistern's door into the trench, under the gas
    { id: 'L', ax: TX1, ay: 862, bx: TX1, by: 944, t: PIN_T }, // the vat's door into the trench, just over the lid
    { id: 'K', ax: SX_R + HALF + 8, ay: 920, bx: SX_R - HALF - 4, by: 920, t: PIN_T }, // the hoard bin's spout
    { id: 'P', ax: 1290, ay: 618, bx: 1202, by: 618, t: PIN_T }, // the trap: the gold hopper's floor, over the eye closet
    { id: 'S', ax: 1284, ay: 984, bx: 1168, by: 984, t: PIN_T }, // Nib's floor, over the basin
  ],
  fills: [
    { kind: GAS, x0: TX0 + 8, x1: TX1 - 8, y1: LID + 7, count: 70 },
    { kind: LAVA, x0: 788, x1: 892, y1: LID - 8, count: 140 },
    { kind: WATER, x0: 388, x1: 612, y1: 1042, count: 60 },
    { kind: LAVA, x0: 968, x1: 1142, y1: GUTTER - 8, count: 45 },
    { kind: COIN, x0: 1218, x1: 1272, y1: 610, count: 8 },
    { kind: COIN, x0: SX_L - 36, x1: SX_L + 36, y1: ROOF - 8, count: 9 },
    { kind: COIN, x0: SX_M - 36, x1: SX_M + 36, y1: ROOF - 8, count: 9 },
    { kind: COIN, x0: SX_R - 36, x1: SX_R + 36, y1: ROOF - 8, count: 40 },
  ],
  nib: { x: 1226, y: 953 },
  blots: [],
  coinsNeeded: 30,
  plates: [
    { id: 'AN', x0: 338, x1: 572, y: FLOOR, need: 7 }, // the ankh pit, under the middle chamber
    { id: 'SC', x0: 108, x1: 322, y: FLOOR, need: 7 }, // the scarab pit, under the left chamber
    { id: 'EY', x0: 1204, x1: 1292, y: 720, need: 5 }, // the eye closet, out of Nib's reach
  ],
  doors: [
    { id: 'DL', ax: SX_L - HALF, ay: ROOF, bx: SX_L + HALF, by: ROOF, t: T, plate: 'AN' }, // the left chamber's floor
    { id: 'DR', ax: SX_R + HALF, ay: ROOF, bx: SX_R - HALF, by: ROOF, t: T, plate: 'SC' }, // the right chamber's floor
    { id: 'DB', ax: 1150, ay: 1100, bx: 1150, by: 1222, t: T, plate: 'EY', invert: true }, // the eye door across the basin: shut while its closet holds gold
  ],
  seals: [
    { wall: BAR, side: 'up' },
    { door: 'DL', side: 'up' },
    { door: 'DR', side: 'up' },
    { door: 'DB', side: 'left' },
  ],
  braziers: [{ x: 462, y: 616 }],
  solution: ['G', 'L', 'W', 'K', 'S', '@1000'],
  walkHeights: [1170],
  stops: [],
  torches: [{ x: 220, y: 700 }, { x: 1180, y: 760 }],
  view: { x: 50, y: 420, w: 1300, h: 860 },
};
