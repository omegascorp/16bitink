import type { LevelDef } from '../../logic/level';
import { COIN, GAS, LAVA, WATER } from '../../logic/particles';
import { CH3, PIN_T, T } from '../common';

/**
 * Chapter 3, level 7 (Level 27): the Deep Shaft. A tall level: Nib's
 * shelter at the foot, the gas well beside it, and one long stair climbing
 * the shaft to the vault at the top. The shaft's sloping roof carries the
 * well's gas up to the fire bowl by the vault, and the fire runs back
 * down it.
 * 1. The boulder: B drops it onto the cracked chute in the roof, and it
 *    rolls down into the eye closet. Its weight holds the eye door at the
 *    head of the stair down. After the blast the chute is broken: the
 *    boulder drops through the roof and rolls down the stair onto Nib
 *    ('crushed'), and the eye door stays up ('sealed').
 * 2. The blast: G frees the well. The gas rises, runs up under the roof
 *    and pools by the cracked bar, where it lights at the bowl. The bar
 *    breaks, and so does the chute. S, the stone across the shelter's
 *    doorway, holds Nib (and any lava brimming down the stair) back until
 *    the climb. (The fire doesn't run back down to the shelter: the well
 *    has emptied up the long roof before the gas lights, so S early is no
 *    loss.)
 * 3. The flood: X's cistern over the bowl. After the blast it puts the
 *    spent bowl out and runs down the stair into the stair's pit. Pulled
 *    before G (the tempting first pull) it puts the bowl out first: the gas
 *    pools unlit and the bar stands ('sealed').
 * 4. The lava step: L's vat over the pit. On the water its lava sets into
 *    the step out of the pit. With no water there it stays hot and brims
 *    down the stair, and Nib walks into it ('burnt'); before G it runs on
 *    down onto the well's lid and lights the gas low, so the bar stands
 *    ('sealed').
 * 5. The gold: K's hopper over the pit. Before the stone has set, its gold
 *    lands in hot lava ('melted').
 * Winning order: B, G, S, X, walk up the stair, L, K, walk across the stone
 * and on up to the vault.
 */
export const DEEP_SHAFT: LevelDef = {
  id: 'deep-shaft',
  chapter: CH3,
  ruin: 'tomb',
  name: 'The Deep Shaft',
  goal: 'Blast the cracked wall, climb the shaft, take the chest and pick up 14 coins',
  rooms: [
    [[52, 1416], [164, 1416], [164, 1500], [52, 1500]], // Nib's shelter
    [[100, 1560], [168, 1520], [168, 1500], [224, 1500], [224, 1520], [292, 1560], [292, 1676], [100, 1676]], // the gas well
    [
      [164, 1300], [650, 1016], [700, 1016], [800, 958], [984, 850], [984, 1104], [860, 1104], [860, 1148],
      [804, 1148], [804, 1192], [748, 1192], [748, 1236], [692, 1236], [692, 1280], [636, 1280], [636, 1372],
      [524, 1372], [524, 1324], [468, 1324], [468, 1368], [412, 1368], [412, 1412], [356, 1412], [356, 1456],
      [300, 1456], [300, 1500], [164, 1500],
    ], // the shaft and its stair
    [[984, 830], [1080, 830], [1080, 1104], [984, 1104]], // the vault
    [[520, 870], [601, 870], [601, 1046], [520, 1092]], // the lava vat L
    [[601, 930], [640, 930], [640, 1022], [601, 1046]], // the gold hopper K
    [[650, 860], [850, 860], [850, 935], [800, 958], [700, 1016], [650, 1016]], // the boulder's ledge and the eye closet
    [[926, 760], [984, 760], [984, 850], [926, 884]], // the cistern X
  ],
  walls: [
    { ax: 52, ay: 1416, bx: 164, by: 1416, t: T }, // 0 the shelter's roof
    { ax: 52, ay: 1416, bx: 52, by: 1500, t: T }, // 1
    { ax: 52, ay: 1500, bx: 168, by: 1500, t: T }, // 2 the shelter's floor
    { ax: 164, ay: 1300, bx: 164, by: 1416, t: T }, // 3 the shaft's foot, over the doorway
    { ax: 168, ay: 1500, bx: 168, by: 1520, t: T }, // 4 the well's neck (40 px: the fire runs down it)
    { ax: 224, ay: 1500, bx: 224, by: 1520, t: T }, // 5
    { ax: 100, ay: 1560, bx: 168, by: 1520, t: T }, // 6 the well's roof, sloping up to the neck
    { ax: 224, ay: 1520, bx: 292, by: 1560, t: T }, // 7
    { ax: 100, ay: 1560, bx: 100, by: 1676, t: T }, // 8
    { ax: 292, ay: 1560, bx: 292, by: 1676, t: T }, // 9
    { ax: 100, ay: 1676, bx: 292, by: 1676, t: T }, // 10
    { ax: 224, ay: 1500, bx: 300, by: 1500, t: T }, // 11 the stair's foot
    { ax: 300, ay: 1460, bx: 300, by: 1500, t: T }, // 12 the stair: treads tilt down to the left, so water runs down
    { ax: 300, ay: 1460, bx: 356, by: 1456, t: T }, // 13
    { ax: 356, ay: 1416, bx: 356, by: 1456, t: T }, // 14
    { ax: 356, ay: 1416, bx: 412, by: 1412, t: T }, // 15
    { ax: 412, ay: 1372, bx: 412, by: 1412, t: T }, // 16
    { ax: 412, ay: 1372, bx: 468, by: 1368, t: T }, // 17
    { ax: 468, ay: 1328, bx: 468, by: 1368, t: T }, // 18
    { ax: 468, ay: 1328, bx: 524, by: 1324, t: T }, // 19
    { ax: 524, ay: 1324, bx: 524, by: 1372, t: T }, // 20 the stair's pit
    { ax: 524, ay: 1372, bx: 636, by: 1372, t: T }, // 21
    { ax: 636, ay: 1284, bx: 636, by: 1372, t: T }, // 22 too high to climb out of until the stone sets
    { ax: 636, ay: 1284, bx: 692, by: 1280, t: T }, // 23
    { ax: 692, ay: 1240, bx: 692, by: 1280, t: T }, // 24
    { ax: 692, ay: 1240, bx: 748, by: 1236, t: T }, // 25
    { ax: 748, ay: 1196, bx: 748, by: 1236, t: T }, // 26
    { ax: 748, ay: 1196, bx: 804, by: 1192, t: T }, // 27
    { ax: 804, ay: 1152, bx: 804, by: 1192, t: T }, // 28
    { ax: 804, ay: 1152, bx: 860, by: 1148, t: T }, // 29
    { ax: 860, ay: 1108, bx: 860, by: 1148, t: T }, // 30
    { ax: 860, ay: 1108, bx: 984, by: 1102, t: T }, // 31 the stair's head
    { ax: 984, ay: 1104, bx: 1080, by: 1104, t: T }, // 32 the vault's floor
    { ax: 164, ay: 1300, bx: 556, by: 1071, t: T }, // 33 the shaft's roof, rising to the vault
    { ax: 640, ay: 1022, bx: 650, by: 1016, t: T }, // 34
    { ax: 650, ay: 1016, bx: 700, by: 1016, t: T }, // 35 the eye closet's floor
    { ax: 700, ay: 1016, bx: 800, by: 958, t: T }, // 36 the cracked chute: the boulder's way into the closet
    { ax: 800, ay: 958, bx: 926, by: 884, t: T }, // 37 the roof on up to the cistern
    { ax: 984, ay: 858, bx: 984, by: 1094, t: T }, // 38 the cracked bar to the vault
    { ax: 984, ay: 830, bx: 1080, by: 830, t: T }, // 39 the vault
    { ax: 1080, ay: 830, bx: 1080, by: 1104, t: T }, // 40
    { ax: 926, ay: 760, bx: 926, by: 884, t: T }, // 41 the cistern X
    { ax: 926, ay: 760, bx: 984, by: 760, t: T }, // 42
    { ax: 984, ay: 760, bx: 984, by: 830, t: T }, // 43
    { ax: 650, ay: 940, bx: 650, by: 1016, t: T }, // 44 the eye closet's back wall: Nib never gets up here
    { ax: 940, ay: 946, bx: 964, by: 946, t: T }, // 45 the bowl's shelf, the bowl at its tip
    { ax: 520, ay: 870, bx: 520, by: 1092, t: T }, // 46 the lava vat: more than the pit holds
    { ax: 601, ay: 870, bx: 601, by: 1040, t: T }, // 47 the vat's side and the hopper's
    { ax: 640, ay: 930, bx: 640, by: 1022, t: T }, // 48 the gold hopper
  ],
  bars: [36, 38, 45],
  cracked: [36, 38],
  pins: [
    { id: 'B', ax: 836, ay: 932, bx: 770, by: 932, t: PIN_T }, // holds the boulder over the chute
    { id: 'G', ax: 160, ay: 1512, bx: 232, by: 1512, t: PIN_T }, // the well's lid, in its neck
    { id: 'S', ax: 158, ay: 1420, bx: 158, by: 1496, t: PIN_T }, // the stone across the shelter's doorway
    { id: 'X', ax: 982, ay: 851, bx: 922, by: 886, t: PIN_T }, // the cistern's floor, over the bowl
    { id: 'L', ax: 552, ay: 1073, bx: 600, by: 1046, t: PIN_T }, // the vat's floor, over the pit
    { id: 'K', ax: 644, ay: 1020, bx: 602, by: 1044, t: PIN_T }, // the hopper's floor, over the pit
  ],
  fills: [
    { kind: GAS, x0: 100, x1: 292, y1: 1568, count: 150 }, // the well, held from above: rows pack down from under its roof
    { kind: WATER, x0: 932, x1: 978, y1: 844, count: 30 }, // the cistern: puts the bowl out, then wets the pit
    { kind: LAVA, x0: 524, x1: 597, y1: 1040, count: 90 }, // the vat: the pit's step
    { kind: COIN, x0: 604, x1: 637, y1: 1016, count: 18 }, // the hopper's gold
  ],
  nib: { x: 126, y: 1476 },
  blots: [],
  boulders: [{ x: 800, y: 897 }],
  plates: [{ id: 'A', x0: 656, x1: 696, y: 1008 }],
  doors: [{ id: 'D', ax: 872, ay: 1200, bx: 872, by: 1040, t: T, plate: 'A' }],
  seals: [{ door: 'D', side: 'right' }, { wall: 38, side: 'right' }],
  braziers: [{ x: 960, y: 938 }],
  chest: { x: 1010, y: 1080 },
  coinsNeeded: 14,
  solution: ['B', 'G', 'S', 'X', '@440~0.5', 'L', 'K', '@720~0.5', '@1010'],
  stops: [],
  torches: [{ x: 80, y: 1450 }, { x: 1040, y: 900 }],
  view: { x: 40, y: 690, w: 1060, h: 1000 },
};
