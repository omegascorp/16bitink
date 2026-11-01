import type { LevelDef } from '../../logic/level';
import { COIN, GAS, WATER } from '../../logic/particles';
import { CH3, PIN_T, T } from '../common';

/**
 * Chapter 3, level 2 (Level 22): Bad Air. Tomb gas rises, and it leaves
 * only through a roof vent: open the way out from the top down, then free
 * the gas.
 *
 * The board: the plate pit under the hall floor is full of gas, held in by
 * the slot lid G. Above it, the hall's ceiling slopes up to the right, past
 * a hatch (T) into a short flue with a roof vent (U), and on up into the
 * low gallery in front of the vault door. Gas loose under that ceiling runs
 * uphill into the gallery and stays there, on Nib's road, for good.
 * 1. The vent: U opens the flue's roof.
 * 2. The hatch: T opens the flue to the hall.
 * 3. The gas: G opens the slot. The pit's gas rises straight up through the
 *    hatch and out of the vent. With the hatch shut it runs up the ceiling
 *    into the gallery; with the vent shut the small flue fills and the rest
 *    spills out under it and up into the gallery. Either way Nib walks into
 *    it at the end ('gassed').
 * 4. The flood: F pours down the flue, through the open hatch and slot, into
 *    the pit and onto the plate, and the vault door rises. Poured before the
 *    slot is open it runs off down the grate, and the door stays shut
 *    ('sealed').
 * The trap: P, the plug in the pit's floor, looks like a way to let the gas
 *    out. Gas never goes down: P only drains the flood, the plate lifts and
 *    the door drops shut ('sealed'). No win pulls it.
 * Nib waits on his ledge (below no gas) until the pins are done, then walks
 * to the chest.
 * Winning order: U, T, G, F (U and T either way round).
 */
export const BAD_AIR: LevelDef = {
  id: 'bad-air',
  chapter: CH3,
  ruin: 'tomb',
  name: 'Bad Air',
  goal: 'Let the bad air out, flood the plate pit, take the chest and pick up 12 coins',
  tip: 'Gas rises and only leaves through a roof vent. Whatever gets loose under a ceiling runs uphill and stays there.',
  rooms: [
    // The hall: Nib's ledge, the sloping ceiling, the plate pit, the stairs, the low gallery and the vault.
    [
      [100, 690], [340, 630], [420, 610], [588, 568], [588, 540], [720, 540], [720, 572], [860, 572], [860, 652], [720, 652], [720, 636],
      [664, 636], [664, 670], [628, 670], [628, 705], [592, 705], [592, 740], [556, 740], [556, 775], [520, 775], [520, 810],
      [440, 810], [440, 920], [320, 920], [320, 810], [220, 810], [220, 740], [100, 740],
    ],
    [[372, 492], [420, 492], [420, 610], [340, 630], [340, 552], [372, 552]], // the flue and its vent
    [[230, 510], [340, 510], [340, 604], [230, 604]], // tank F
  ],
  walls: [
    { ax: 100, ay: 690, bx: 340, by: 630, t: T }, // 0 the hall's ceiling, sloping up to the right
    { ax: 420, ay: 610, bx: 588, by: 568, t: T }, // 1 ... past the hatch
    { ax: 588, ay: 568, bx: 588, by: 540, t: T }, // 2 the step up into the low gallery (kept off the stairs' risers: Nib needs headroom to climb)
    { ax: 588, ay: 540, bx: 720, by: 540, t: T }, // 3 the low gallery's ceiling: the highest place under the hall, where loose gas ends up
    { ax: 100, ay: 690, bx: 100, by: 740, t: T }, // 4 Nib's ledge
    { ax: 100, ay: 740, bx: 220, by: 740, t: T }, // 5
    { ax: 220, ay: 740, bx: 220, by: 810, t: T }, // 6
    { ax: 220, ay: 810, bx: 242, by: 810, t: T }, // 7 hall floor, left of the grate
    { ax: 290, ay: 810, bx: 336, by: 810, t: T }, // 8 ... between the grate and the slot
    { ax: 384, ay: 810, bx: 520, by: 810, t: T }, // 9 ... from the slot to the stairs
    { ax: 400, ay: 810, bx: 400, by: 780, t: T }, // 10 the dry step: spilled water stays on the slot's side
    { ax: 400, ay: 780, bx: 470, by: 780, t: T }, // 11
    { ax: 470, ay: 780, bx: 470, by: 810, t: T }, // 12
    { ax: 520, ay: 810, bx: 520, by: 775, t: T }, // 13 the stairs up to the low gallery
    { ax: 520, ay: 775, bx: 556, by: 775, t: T }, // 14
    { ax: 556, ay: 775, bx: 556, by: 740, t: T }, // 15
    { ax: 556, ay: 740, bx: 592, by: 740, t: T }, // 16
    { ax: 592, ay: 740, bx: 592, by: 705, t: T }, // 17
    { ax: 592, ay: 705, bx: 628, by: 705, t: T }, // 18
    { ax: 628, ay: 705, bx: 628, by: 670, t: T }, // 19
    { ax: 628, ay: 670, bx: 664, by: 670, t: T }, // 20
    { ax: 664, ay: 670, bx: 664, by: 636, t: T }, // 21
    { ax: 664, ay: 636, bx: 720, by: 636, t: T }, // 22 the low gallery's floor
    { ax: 720, ay: 540, bx: 720, by: 572, t: T }, // 23 the vault's lip: its ceiling is lower, so no gas gets in
    { ax: 320, ay: 810, bx: 320, by: 920, t: T }, // 24 the plate pit
    { ax: 440, ay: 810, bx: 440, by: 920, t: T }, // 25
    { ax: 320, ay: 920, bx: 366, by: 920, t: T }, // 26 its floor, left of the plugged grate
    { ax: 394, ay: 920, bx: 440, by: 920, t: T }, // 27 ... and right of it
    { ax: 340, ay: 552, bx: 340, by: 566, t: T }, // 28 the flue's left side, above F's window
    { ax: 340, ay: 604, bx: 340, by: 630, t: T }, // 29 ... below it
    { ax: 420, ay: 492, bx: 420, by: 610, t: T }, // 30 the flue's right side (and the vent's)
    { ax: 340, ay: 552, bx: 372, by: 552, t: T }, // 31 the flue's roof: a small flue, it can't hold the pit's gas
    { ax: 372, ay: 492, bx: 372, by: 552, t: T }, // 32 the vent's chimney
    { ax: 372, ay: 492, bx: 420, by: 492, t: T }, // 33
    { ax: 230, ay: 510, bx: 340, by: 510, t: T }, // 34 tank F
    { ax: 230, ay: 510, bx: 230, by: 604, t: T }, // 35
    { ax: 230, ay: 604, bx: 340, by: 604, t: T }, // 36
    { ax: 720, ay: 572, bx: 860, by: 572, t: T }, // 37 the vault
    { ax: 860, ay: 572, bx: 860, by: 652, t: T }, // 38
    { ax: 720, ay: 652, bx: 860, by: 652, t: T }, // 39
    { ax: 720, ay: 636, bx: 720, by: 652, t: T }, // 40
  ],
  bars: [28, 29, 30, 32],
  pins: [
    { id: 'U', ax: 428, ay: 552, bx: 364, by: 552, t: PIN_T }, // the flue's roof vent
    { id: 'T', ax: 340, ay: 630, bx: 420, by: 610, t: PIN_T }, // the hatch: the flue's floor, in the hall's ceiling
    { id: 'G', ax: 328, ay: 810, bx: 392, by: 810, t: PIN_T }, // the slot lid over the gas-filled plate pit
    { id: 'F', ax: 340, ay: 562, bx: 340, by: 608, t: PIN_T }, // tank F's window into the flue
    { id: 'P', ax: 404, ay: 920, bx: 356, by: 920, t: PIN_T }, // the trap: the plug in the pit's floor
  ],
  drains: [
    { x0: 380, x1: 412, y0: 498, y1: 542 }, // the roof vent
    { x0: 246, x1: 286, y0: 806, y1: 850 }, // the hall's grate: spilled water is gone
    { x0: 370, x1: 390, y0: 924, y1: 950 }, // the pit's grate, under P
  ],
  fills: [
    { kind: GAS, x0: 328, x1: 432, y1: 818, count: 90 }, // the plate pit, full of gas under the slot lid
    { kind: WATER, x0: 238, x1: 332, y1: 596, count: 56 }, // tank F: the plate's flood
    { kind: COIN, x0: 736, x1: 780, y1: 644, count: 16 }, // the vault's gold
  ],
  nib: { x: 190, y: 716 },
  blots: [],
  chest: { x: 806, y: 628 },
  coinsNeeded: 12,
  plates: [{ id: 'P', x0: 328, x1: 432, y: 912, need: 20 }],
  doors: [{ id: 'D', ax: 720, ay: 576, bx: 720, by: 628, t: T, plate: 'P' }],
  seals: [{ door: 'D', side: 'right' }],
  solution: ['U', 'T', 'G', 'F', '@806'],
  stops: [],
  torches: [{ x: 160, y: 712 }, { x: 290, y: 760 }, { x: 840, y: 600 }],
  view: { x: 60, y: 430, w: 840, h: 540 },
};
