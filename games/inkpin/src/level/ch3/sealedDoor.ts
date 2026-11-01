import type { LevelDef } from '../../logic/level';
import { COIN, LAVA, WATER } from '../../logic/particles';
import { CH3, PIN_T, T } from '../common';

/**
 * Level 21, the chapter opener: the gold that weighs the plate down is gold
 * Nib must take, so the boulder has to become the real weight, and it can
 * only get onto the plate while the gold still holds the way open.
 *
 * Four stages on 1320 x 620: Nib's ledge over the lava moat, the two-bay
 * closet hung over the moat, the vault door with a lava dip behind it, and
 * the vault with its drain. Sun plate P is the closet's whole floor, out of
 * Nib's reach (the kit's pattern 1), with nothing lying over it. Its weight
 * holds two stone doors up: the vault door D (between Nib and the chest) and
 * the hatch H in the boulder's shaft.
 * 1. The gold: C unplugs the hopper's spout, and its coins drip into the gold
 *    bay. They pile over the slot G plugs and spread onto the plate, and both
 *    doors rise. (The spout is narrow and right over the slot, so that with G
 *    already out the coins fall straight through and never weigh the plate.)
 * 2. The boulder: B drops it onto the hatch. While the hatch is open it falls
 *    on into its bay and weighs the plate for good (40). While the hatch is
 *    shut it waits there.
 * 3. The flood: W's low tank sets the lava moat into a stone floor, runs on
 *    through the open door, sets the dip behind it, falls into the vault and
 *    leaves down its drain. A grate on the doorstep lets a flood held back by
 *    the shut door leak away.
 * 4. The grab: Nib walks out under the closet, and G (the slot's plug) rains
 *    the gold onto him. The boulder keeps the plate down.
 * 5. The vault's own gold: V, at the foot of the flood's fall. Then Nib walks
 *    in over the set dip and drops to the chest.
 * Losses: G before B, the greedy grab: the gold leaves the plate, both doors
 * drop, and the boulder lands on the shut hatch ('sealed', after every pin).
 * C after G: the coins drip straight through ('sealed'). W before C: the shut
 * door holds the flood back, the dip stays hot ('burnt' on the walk in). Gold
 * let out before W falls into the hot moat ('melted'). V before W: the flood
 * washes the vault's gold down the drain ('drained').
 * Winning order: C, B, W, walk, G, V, walk.
 */
export const SEALED_DOOR: LevelDef = {
  id: 'sealed-door',
  chapter: CH3,
  ruin: 'tomb',
  name: 'The Sealed Door',
  goal: 'Open the vault door, take the chest and pick up 42 coins',
  tip: 'Weight on the sun plate holds its doors open. Take the weight off, and they shut.',
  rooms: [
    [[120, 700], [380, 700], [380, 814], [580, 814], [580, 720], [796, 720], [796, 760], [1350, 760], [1350, 970], [1050, 970], [1050, 900], [1020, 900], [1020, 960], [900, 960], [900, 868], [790, 868], [790, 898], [720, 898], [720, 960], [260, 960], [260, 880], [120, 880]],
    [[380, 460], [460, 460], [460, 806], [380, 806]],
    [[460, 684], [580, 684], [580, 806], [460, 806]],
    [[524, 460], [580, 460], [580, 712], [524, 712]],
    [[796, 460], [860, 460], [860, 760], [796, 760]],
  ],
  walls: [
    { ax: 120, ay: 700, bx: 380, by: 700, t: T }, // 0 the hall's low ceiling
    { ax: 120, ay: 700, bx: 120, by: 880, t: T }, // 1 left wall
    { ax: 120, ay: 880, bx: 260, by: 880, t: T }, // 2 Nib's ledge, a step above the moat
    { ax: 260, ay: 880, bx: 260, by: 960, t: T }, // 3 the moat's near bank
    { ax: 260, ay: 960, bx: 720, by: 960, t: T }, // 4 the moat's floor
    { ax: 720, ay: 898, bx: 720, by: 960, t: T }, // 5 the moat's far bank
    { ax: 720, ay: 898, bx: 790, by: 898, t: T }, // 6 the doorstep
    { ax: 790, ay: 868, bx: 790, by: 898, t: T }, // 7 the sill's 30-px step: water held at the shut door runs back off it
    { ax: 790, ay: 868, bx: 900, by: 868, t: T }, // 8 the sill: the flood's landing, its grate, the door
    { ax: 900, ay: 868, bx: 900, by: 960, t: T }, // 9 the dip behind the door
    { ax: 900, ay: 960, bx: 1020, by: 960, t: T }, // 10
    { ax: 1020, ay: 900, bx: 1020, by: 960, t: T }, // 11
    { ax: 1020, ay: 900, bx: 1050, by: 900, t: T }, // 12 the vault's lip
    { ax: 1050, ay: 900, bx: 1050, by: 970, t: T }, // 13 the drop into the vault, where the flood falls
    { ax: 1050, ay: 970, bx: 1350, by: 970, t: T }, // 14 the vault's floor: the flood runs along it to the drain
    { ax: 1350, ay: 760, bx: 1350, by: 970, t: T }, // 15 the vault's end wall
    { ax: 860, ay: 760, bx: 1350, by: 760, t: T }, // 16 the roof over the door and the vault
    { ax: 580, ay: 720, bx: 796, by: 720, t: T }, // 17 the roof over the moat's far end and the doorstep, high enough to climb the bank
    { ax: 796, ay: 460, bx: 796, by: 760, t: T }, // 18 the tank over the sill: its flood runs on through the door,
    { ax: 860, ay: 460, bx: 860, by: 760, t: T }, // 19 and back off the step into the moat
    { ax: 796, ay: 460, bx: 860, by: 460, t: T }, // 20 the tank's roof
    { ax: 380, ay: 460, bx: 380, by: 806, t: T }, // 21 the closet: the boulder's shaft
    { ax: 380, ay: 806, bx: 516, by: 806, t: T }, // 22 the closet's floor: plate P, under both bays
    { ax: 460, ay: 460, bx: 460, by: 782, t: T }, // 23 the divider, stopping short of the plate (too low a gap for a coin)
    { ax: 524, ay: 460, bx: 524, by: 684, t: T }, // 24 the gold hopper
    { ax: 580, ay: 460, bx: 580, by: 806, t: T }, // 25 the gold bay's outer wall: the slot is about Nib's width
    { ax: 524, ay: 684, bx: 536, by: 712, t: T }, // 26 the hopper's spout, right over the slot: the gold drips out,
    { ax: 580, ay: 684, bx: 566, by: 712, t: T }, // 27 so it falls straight through while G is out
    { ax: 380, ay: 460, bx: 580, by: 460, t: T }, // 28 the roof over the closet and the hopper
    { ax: 636, ay: 720, bx: 636, by: 788, t: T }, // 29 the hopper V, over the moat's far end
    { ax: 700, ay: 720, bx: 700, by: 788, t: T }, // 30
  ],
  bars: [18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30],
  pins: [
    { id: 'C', ax: 584, ay: 718, bx: 528, by: 718, t: PIN_T }, // plugs the gold hopper's spout
    { id: 'B', ax: 456, ay: 534, bx: 384, by: 534, t: PIN_T }, // holds the boulder over the hatch
    { id: 'W', ax: 868, ay: 768, bx: 788, by: 768, t: PIN_T }, // the tank's floor, over the sill
    { id: 'G', ax: 528, ay: 812, bx: 620, by: 812, t: PIN_T }, // plugs the gold bay's slot, beside the plate, over the moat
    { id: 'V', ax: 704, ay: 796, bx: 632, by: 796, t: PIN_T }, // V's floor, over the moat's far end
  ],
  fills: [
    { kind: WATER, x0: 804, x1: 852, y1: 761, count: 128 },
    { kind: LAVA, x0: 268, x1: 712, y1: 952, count: 176 },
    { kind: LAVA, x0: 908, x1: 1012, y1: 952, count: 40 },
    { kind: COIN, x0: 532, x1: 572, y1: 680, count: 40 },
    { kind: COIN, x0: 644, x1: 692, y1: 789, count: 14 },
  ],
  nib: { x: 225, y: 848 },
  blots: [],
  boulders: [{ x: 420, y: 500 }],
  // The boulder (40) or the gold piled over the plate's end holds it down; what's left after G doesn't.
  plates: [{ id: 'P', x0: 388, x1: 516, y: 806, need: 10 }],
  doors: [
    { id: 'D', ax: 886, ay: 760, bx: 886, by: 852, t: T, plate: 'P' }, // the vault door: rises into the rock, down to the sill
    { id: 'H', ax: 456, ay: 590, bx: 384, by: 590, t: T, plate: 'P' }, // the hatch in the boulder's shaft: opens right, into the rock
  ],
  seals: [{ door: 'D', side: 'right' }],
  drains: [
    { x0: 1290, x1: 1346, y0: 958, y1: 976 }, // the vault's drain: the flood leaves this way
    { x0: 864, x1: 878, y0: 852, y1: 870 }, // the sill's grate: a flood held at the shut door leaks away
  ],
  chest: { x: 1140, y: 938 },
  coinsNeeded: 42,
  solution: ['C', 'B', 'W', '@528', 'G', 'V', '@1140'],
  walkHeights: [882, 928],
  stops: [],
  torches: [{ x: 170, y: 760 }, { x: 1310, y: 820 }],
  view: { x: 75, y: 408, w: 1320, h: 620 },
};
