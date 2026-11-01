import type { LevelDef } from '../../logic/level';
import { COIN, GAS, WATER } from '../../logic/particles';
import { CH3, PIN_T, T } from '../common';

/**
 * Chapter 3, level 6 (Level 26): the Weighing Room, the chapter's one level
 * where a single pin does two jobs. The pan of the tomb's great scale is a
 * long pit whose floor is the scales plate P. Its grooves run to two doors:
 * the vault door A (open while the pan is weighed) and the cistern's sluice C
 * (its sign upside down: open while the pan is bare). So whatever weighs the
 * pan first decides whether the water can still come in.
 * Four stages on 1370 x 810: the cistern and its sluice, the scale hall
 * (Nib's nook, the gold bin and gas cup, K's hopper), the shaft up to the
 * crypt, and the vault behind the crypt's cracked bar.
 * 1. The cistern: W drops its water into the basin, out through the open
 *    sluice and down the channel into the pan. The pan goes down, A rises and
 *    C shuts behind the water; what's left drains down the basin's grate.
 * 2. The hatch: H, the crypt's floor over the shaft (the salamander paces
 *    behind a curb, by the fire bowl).
 * 3. The pull with two jobs: X is the gold bin's floor and the gas cup's lid.
 *    The gold drops into the pan; the gas runs up the sloped roof, up the
 *    shaft, through the open hatch and lights at the crypt's bowl: the blast
 *    takes the salamander and breaks the cracked bar to the vault.
 * 4. S, Nib's floor: he drops into the wet pan and swims through the gold,
 *    and K's hopper at the pan's far end drops the rest in front of him. The
 *    water keeps the pan down while he takes the gold, so A stays up.
 * Losses: the gold first (X or K before W): it weighs the pan, A rises and
 * all looks right, but C shuts with the cistern still full; once Nib takes
 * the gold the pan lifts and A drops in front of him ('sealed', late). S
 * before W: Nib weighs the dry pan himself and the water never comes in
 * ('sealed'). X before H: the gas pools under the shut hatch and leaks out of
 * the cracked nook beside it; the bar stands ('sealed'). The trap D, the
 * little cistern over the bowl (it looks like the way to keep the blast off
 * Nib): before X it puts the bowl out and the bar stands; any time, its water
 * fills the bowl's basin, plate Q, and the chest's door E (open only while Q
 * is dry) drops ('sealed').
 * Winning order: W, H, S, X, walk, K, walk (W and H either way round).
 */
export const WEIGHING_ROOM: LevelDef = {
  id: 'weighing-room',
  chapter: CH3,
  ruin: 'tomb',
  name: 'The Weighing Room',
  goal: 'Break into the vault, take the chest and pick up 46 coins',
  tip: 'Weight on the sun pan holds the vault door open. The sluice with the slashed sun works the other way: it is open only while the pan is bare.',
  rooms: [
    [[96, 560], [216, 560], [216, 690], [96, 690]], // the cistern
    [[996, 280], [1030, 280], [1030, 360], [996, 360]], // the little cistern over the bowl
    [[80, 690], [216, 690], [216, 700], [264, 700], [264, 776], [80, 744]], // the basin and the sluice
    [
      [264, 700], [330, 700], [330, 720], [630, 720], [740, 660], [740, 360], [1040, 360], [1040, 480], [910, 480], [910, 520], [880, 520], [880, 700],
      [1040, 700], [1040, 800], [1370, 800], [1370, 968], [960, 968], [960, 1008], [264, 1008],
    ], // the scale hall, the shaft, the crypt and the vault
  ],
  walls: [
    { ax: 96, ay: 560, bx: 96, by: 690, t: T }, // 0 the cistern
    { ax: 216, ay: 560, bx: 216, by: 700, t: T }, // 1
    { ax: 96, ay: 560, bx: 216, by: 560, t: T }, // 2
    { ax: 80, ay: 690, bx: 80, by: 744, t: T }, // 3 the basin
    { ax: 80, ay: 744, bx: 264, by: 776, t: T }, // 4 the basin's floor, down to the sluice
    { ax: 216, ay: 700, bx: 330, by: 700, t: T }, // 5 the roof over the sluice and the channel
    { ax: 264, ay: 776, bx: 264, by: 1008, t: T }, // 6 the channel's fall into the pan
    { ax: 330, ay: 700, bx: 330, by: 860, t: T }, // 7
    { ax: 330, ay: 720, bx: 630, by: 720, t: T }, // 8 the hall's roof
    { ax: 410, ay: 720, bx: 410, by: 880, t: T }, // 9 Nib's nook over the pan
    { ax: 510, ay: 720, bx: 510, by: 880, t: T }, // 10
    { ax: 540, ay: 720, bx: 540, by: 800, t: T }, // 11 the gold bin
    { ax: 630, ay: 720, bx: 630, by: 920, t: T }, // 12 the bin's side and the gas cup's
    { ax: 736, ay: 800, bx: 736, by: 920, t: T }, // 13 the gas cup
    { ax: 630, ay: 920, bx: 736, by: 920, t: T }, // 14
    { ax: 630, ay: 720, bx: 740, by: 660, t: T }, // 15 the sloped roof up to the shaft
    { ax: 740, ay: 660, bx: 740, by: 360, t: T }, // 16 the shaft and the crypt
    { ax: 740, ay: 360, bx: 992, by: 360, t: T }, // 17 the crypt's roof
    { ax: 880, ay: 480, bx: 1030, by: 480, t: T }, // 18 the crypt's floor, where the bowl stands
    { ax: 880, ay: 520, bx: 880, by: 700, t: T }, // 19 the shaft
    { ax: 880, ay: 700, bx: 1032, by: 700, t: T }, // 20 the hall's roof past the shaft
    { ax: 1040, ay: 360, bx: 1040, by: 960, t: T }, // 21 the cracked bar to the vault
    { ax: 896, ay: 700, bx: 896, by: 780, t: T }, // 22 K's hopper, over the pan's far end
    { ax: 952, ay: 700, bx: 952, by: 780, t: T }, // 23
    { ax: 996, ay: 280, bx: 996, by: 360, t: T }, // 24 the little cistern over the fire bowl: the trap
    { ax: 1030, ay: 280, bx: 1030, by: 352, t: T }, // 25
    { ax: 264, ay: 1008, bx: 960, by: 1008, t: T }, // 26 the pan: plate P
    { ax: 960, ay: 968, bx: 960, by: 1008, t: T }, // 27 the pan's 40-px rim
    { ax: 960, ay: 968, bx: 1370, by: 968, t: T }, // 28 the floor to the vault
    { ax: 1048, ay: 800, bx: 1370, by: 800, t: T }, // 29 the vault's roof
    { ax: 1370, ay: 800, bx: 1370, by: 968, t: T }, // 30
    { ax: 80, ay: 690, bx: 96, by: 690, t: T }, // 31
    { ax: 996, ay: 280, bx: 1030, by: 280, t: T }, // 34 the little cistern's roof
    { ax: 880, ay: 520, bx: 910, by: 520, t: T }, // 35 the cracked nook under H: gas held there leaks out
    { ax: 910, ay: 480, bx: 910, by: 520, t: T }, // 36
    { ax: 1056, ay: 360, bx: 1056, by: 792, t: T }, // 37 the rock behind the bar, over the vault
    { ax: 888, ay: 418, bx: 888, by: 480, t: T }, // 32 the crypt's curb: the salamander paces on H, the gas flows over
    { ax: 1032, ay: 440, bx: 990, by: 440, t: T }, // 33 the bowl's basin off the bar: its floor is plate Q
    { ax: 990, ay: 408, bx: 990, by: 440, t: T }, // 38 the basin's lip
    { ax: 1030, ay: 408, bx: 1030, by: 440, t: T }, // 39 its back, so it holds water once the bar is gone
  ],
  bars: [0, 1, 2, 9, 10, 11, 12, 13, 14, 21, 22, 23, 24, 25, 32, 33, 34, 38, 39],
  cracked: [21],
  pins: [
    { id: 'W', ax: 88, ay: 690, bx: 224, by: 690, t: PIN_T }, // the cistern's floor
    { id: 'H', ax: 736, ay: 480, bx: 884, by: 480, t: PIN_T }, // the crypt's floor over the shaft
    { id: 'S', ax: 516, ay: 888, bx: 406, by: 888, t: PIN_T }, // Nib's floor, over the pan
    { id: 'X', ax: 536, ay: 800, bx: 742, by: 800, t: PIN_T }, // the gold bin's floor and the gas cup's lid
    { id: 'K', ax: 958, ay: 788, bx: 890, by: 788, t: PIN_T }, // K's hopper floor
    { id: 'D', ax: 988, ay: 360, bx: 1036, by: 360, t: PIN_T }, // the trap: the little cistern's floor, over the bowl
  ],
  fills: [
    { kind: WATER, x0: 104, x1: 208, y1: 683, count: 120 },
    { kind: COIN, x0: 548, x1: 622, y1: 793, count: 28 },
    { kind: GAS, x0: 638, x1: 728, y1: 807, count: 90 },
    { kind: COIN, x0: 904, x1: 944, y1: 781, count: 24 },
    { kind: WATER, x0: 1002, x1: 1028, y1: 353, count: 10 },
  ],
  nib: { x: 460, y: 857 },
  blots: [{ x: 950, y: 450, animal: 'salamander' }],
  braziers: [{ x: 1018, y: 432 }],
  plates: [
    { id: 'P', x0: 272, x1: 956, y: 1000, need: 20 }, // the scale's pan
    { id: 'Q', x0: 996, x1: 1024, y: 432, need: 5 }, // the fire bowl's basin
  ],
  doors: [
    { id: 'A', ax: 1190, ay: 800, bx: 1190, by: 952, t: T, plate: 'P' }, // the vault door: open while the pan is weighed
    { id: 'C', ax: 252, ay: 708, bx: 252, by: 758, t: T, plate: 'P', invert: true }, // the sluice: open while the pan is bare
    { id: 'E', ax: 1250, ay: 800, bx: 1250, by: 952, t: T, plate: 'Q', invert: true }, // the chest's door: open while the bowl's basin is dry
  ],
  seals: [{ door: 'A', side: 'right' }, { wall: 21, side: 'right' }, { door: 'E', side: 'right' }],
  drains: [
    { x0: 220, x1: 244, y0: 756, y1: 778 }, // the basin's grate: water held at the shut sluice drains away
    { x0: 892, x1: 904, y0: 488, y1: 512 }, // the crack at the top of the shaft: gas held under H leaks out
  ],
  chest: { x: 1310, y: 936 },
  coinsNeeded: 46,
  solution: ['W', 'H', 'S', 'X', '@860', 'K', '@1310'],
  walkHeights: [976, 936],
  stops: [],
  torches: [{ x: 370, y: 790 }, { x: 1100, y: 880 }],
  view: { x: 40, y: 250, w: 1370, h: 810 },
};
