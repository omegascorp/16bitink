import type { LevelDef } from '../../logic/level';
import { COIN, GAS, WATER } from '../../logic/particles';
import { CH3, PIN_T, T } from '../common';

/**
 * Chapter 3, level 2 (Level 22): Bad Air. Tomb gas rises, and it leaves
 * only through a roof vent: open the way out from the top down, then free
 * the gas.
 *
 * Four stages, left to right: the cistern over Nib's ledge, the hall over
 * the gas pit, the low gallery at the top of the stairs on Nib's road, and
 * the vault below it. The hall's ankh plate is the floor of a pit full of
 * gas under the slot lid G. Straight above the slot is a narrow flue with
 * one roof vent (V), and the hall's ceiling slopes up from the flue's mouth
 * into the gallery. Gas loose under that ceiling runs uphill into the
 * gallery and stays there, on Nib's road, for good.
 * 1. The vent: V opens the flue's roof.
 * 2. The gas: G opens the slot. The pit's gas rises straight up the flue
 *    and out of the vent. With the vent shut the small flue fills and the
 *    rest spills out under it and up into the gallery, and Nib walks into it
 *    on the stairs ('gassed').
 * 3. The flood: F lets the cistern into the flue. Its water falls through
 *    the open slot into the pit and onto the plate, and the ankh door at the
 *    foot of the shaft rises. The pit's overflow runs off down the culvert
 *    under the stairs, out under the door onto the vault's shelf and off its
 *    edge into the grate. Poured before the slot is open it lands on the lid
 *    and runs off, and the door stays shut ('sealed').
 * 4. The gold: K drops the vault's gold onto that shelf. Before the flood,
 *    the overflow sweeps it off the edge and down the grate ('drained').
 * The trap: P, the plug in the pit's floor, looks like a way to let the gas
 *    out. Gas never goes down: P only drains the flood, the plate lifts and
 *    the door drops shut ('sealed'), wherever it comes in the order.
 * Nib waits at the top of the stairs while the flood runs, then drops down
 * the shaft to the door.
 * Winning order: V, G, walk, F, walk, walk down the shaft, K, walk.
 */
export const BAD_AIR: LevelDef = {
  id: 'bad-air',
  chapter: CH3,
  ruin: 'tomb',
  name: 'Bad Air',
  goal: 'Let the bad air out, flood the plate pit, take the chest and pick up 16 coins',
  tip: 'Gas rises, and it leaves only through a vent in the roof. Under any other ceiling it stays put.',
  rooms: [
    // The hall: Nib's ledge, the sloping ceiling, the stairs, the low gallery, the shaft, the doorway and the vault.
    [
      [100, 690], [424, 650], [500, 640], [800, 572], [800, 540], [1076, 540], [1076, 760], [1130, 760], [1130, 770],
      [1370, 770], [1370, 1000], [1252, 1000], [1252, 964], [1130, 964], [1130, 896],
      [960, 880], [960, 636], [894, 636], [894, 680], [838, 680], [838, 715], [782, 715], [782, 750], [726, 750],
      [726, 785], [670, 785], [670, 820], [612, 820], [488, 800], [436, 796], [352, 818], [300, 820], [300, 740],
      [100, 740],
    ],
    [[400, 806], [530, 806], [530, 950], [400, 950]], // the plate pit
    [[424, 480], [500, 480], [500, 640], [424, 650]], // the flue and its vent
    [[196, 456], [424, 456], [424, 616], [196, 616]], // the cistern F
    [[612, 820], [656, 820], [960, 888], [1130, 904], [1130, 952], [960, 932], [612, 862]], // the culvert under the stairs
  ],
  walls: [
    { ax: 100, ay: 690, bx: 424, by: 650, t: T }, // 0 the hall's ceiling over Nib's ledge, rising to the flue
    { ax: 500, ay: 640, bx: 800, by: 572, t: T }, // 1 ... and on up past the flue to the gallery
    { ax: 800, ay: 572, bx: 800, by: 540, t: T }, // 2 the gallery's step up: the highest place under the hall
    { ax: 800, ay: 540, bx: 1076, by: 540, t: T }, // 3 the gallery's low ceiling
    { ax: 1076, ay: 540, bx: 1076, by: 760, t: T }, // 4 the gallery's end and the shaft's far side
    { ax: 1076, ay: 760, bx: 1130, by: 760, t: T }, // 5 the doorway's roof
    { ax: 1130, ay: 760, bx: 1130, by: 800, t: T }, // 6 over the door
    { ax: 1130, ay: 770, bx: 1370, by: 770, t: T }, // 7 the vault
    { ax: 1370, ay: 770, bx: 1370, by: 1000, t: T }, // 8
    { ax: 1296, ay: 1000, bx: 1370, by: 1000, t: T }, // 9 the chest's floor, down past the grate
    { ax: 1130, ay: 962, bx: 1252, by: 967, t: T }, // 10 the vault's shelf, where K's gold lands at the foot of the doorway's step
    { ax: 1130, ay: 896, bx: 1130, by: 918, t: T }, // 11 the step down under the door, over the culvert's outlet
    { ax: 960, ay: 880, bx: 1130, by: 896, t: T }, // 12 the doorway's floor: the culvert's roof
    { ax: 960, ay: 636, bx: 960, by: 826, t: T }, // 13 the shaft down from the gallery (open below, so the door's groove runs clear)
    { ax: 894, ay: 636, bx: 960, by: 636, t: T }, // 14 the gallery's floor
    { ax: 894, ay: 636, bx: 894, by: 680, t: T }, // 15 the stairs
    { ax: 838, ay: 680, bx: 894, by: 680, t: T }, // 16
    { ax: 838, ay: 680, bx: 838, by: 715, t: T }, // 17
    { ax: 782, ay: 715, bx: 838, by: 715, t: T }, // 18
    { ax: 782, ay: 715, bx: 782, by: 750, t: T }, // 19
    { ax: 726, ay: 750, bx: 782, by: 750, t: T }, // 20
    { ax: 726, ay: 750, bx: 726, by: 785, t: T }, // 21
    { ax: 670, ay: 785, bx: 726, by: 785, t: T }, // 22
    { ax: 670, ay: 785, bx: 670, by: 820, t: T }, // 23
    { ax: 656, ay: 820, bx: 670, by: 820, t: T }, // 24
    { ax: 612, ay: 820, bx: 612, by: 862, t: T }, // 25 the culvert's mouth
    { ax: 612, ay: 862, bx: 960, by: 940, t: T }, // 26 the culvert's floor, steep under the stairs
    { ax: 960, ay: 940, bx: 1130, by: 960, t: T }, // 27 ... then under the doorway and out under the door onto the vault's shelf
    { ax: 488, ay: 800, bx: 612, by: 820, t: T }, // 28 the hall floor, falling from the slot to the culvert
    { ax: 352, ay: 818, bx: 436, by: 796, t: T }, // 29 ... and from the slot to the hall's grate
    { ax: 300, ay: 820, bx: 312, by: 820, t: T }, // 30
    { ax: 100, ay: 690, bx: 100, by: 740, t: T }, // 31 Nib's ledge
    { ax: 100, ay: 740, bx: 300, by: 740, t: T }, // 32
    { ax: 300, ay: 740, bx: 300, by: 820, t: T }, // 33
    { ax: 400, ay: 812, bx: 400, by: 950, t: T }, // 34 the plate pit
    { ax: 530, ay: 806, bx: 530, by: 950, t: T }, // 35
    { ax: 400, ay: 940, bx: 438, by: 950, t: T }, // 36 its floor, left of the plugged grate
    { ax: 490, ay: 950, bx: 530, by: 940, t: T }, // 37 ... and right of it
    { ax: 424, ay: 650, bx: 424, by: 628, t: T }, // 38 the flue's left side, under F's window
    { ax: 424, ay: 570, bx: 424, by: 456, t: T }, // 39 ... over it (the cistern's right side)
    { ax: 500, ay: 640, bx: 500, by: 480, t: T }, // 40 the flue's right side: a narrow flue, it can't hold the pit's gas
    { ax: 424, ay: 480, bx: 500, by: 480, t: T }, // 41 the vent's chimney
    { ax: 196, ay: 456, bx: 424, by: 456, t: T }, // 42 the cistern F
    { ax: 196, ay: 456, bx: 196, by: 616, t: T }, // 43
    { ax: 196, ay: 616, bx: 414, by: 616, t: T }, // 44
    { ax: 1146, ay: 770, bx: 1146, by: 830, t: T }, // 45 the vault's hopper K
    { ax: 1210, ay: 770, bx: 1210, by: 830, t: T }, // 46
    { ax: 1252, ay: 964, bx: 1252, by: 1010, t: T }, // 47 the shelf's edge, over the vault's grate
  ],
  bars: [38, 39, 40],
  pins: [
    { id: 'V', ax: 508, ay: 560, bx: 416, by: 560, t: PIN_T }, // the flue's roof vent
    { id: 'F', ax: 424, ay: 620, bx: 424, by: 578, t: PIN_T }, // the cistern's window into the flue
    { id: 'G', ax: 496, ay: 800, bx: 428, by: 800, t: PIN_T }, // the slot lid over the gas-filled plate pit
    { id: 'P', ax: 500, ay: 950, bx: 428, by: 950, t: PIN_T }, // the trap: the plug in the pit's floor
    { id: 'K', ax: 1218, ay: 836, bx: 1148, by: 836, t: PIN_T }, // the vault's hopper
  ],
  drains: [
    { x0: 432, x1: 492, y0: 486, y1: 552 }, // the roof vent (60 px)
    { x0: 316, x1: 348, y0: 816, y1: 846 }, // the hall's grate: water off the lid's left side is gone
    { x0: 444, x1: 484, y0: 954, y1: 980 }, // the pit's grate, under P
    { x0: 1256, x1: 1292, y0: 976, y1: 1010 }, // the vault's grate: the overflow leaves this way
  ],
  fills: [
    { kind: GAS, x0: 408, x1: 522, y1: 812, count: 140 }, // the plate pit, full of gas under the slot lid
    { kind: WATER, x0: 204, x1: 416, y1: 608, count: 260 }, // cistern F: the plate's flood
    { kind: COIN, x0: 1154, x1: 1202, y1: 829, count: 20 }, // the vault's gold
  ],
  nib: { x: 190, y: 716 },
  blots: [],
  chest: { x: 1346, y: 976 },
  coinsNeeded: 16,
  plates: [{ id: 'A', x0: 408, x1: 522, y: 942, need: 20 }],
  doors: [{ id: 'D', ax: 1130, ay: 804, bx: 1130, by: 888, t: T, plate: 'A' }],
  seals: [{ door: 'D', side: 'right' }],
  solution: ['V', 'G', '@700~1.5', 'F', '@920~1', '@1010', 'K', '@1346'],
  stops: [],
  torches: [{ x: 140, y: 712 }, { x: 1050, y: 860 }, { x: 1350, y: 930 }],
  view: { x: 60, y: 420, w: 1350, h: 600 },
};
