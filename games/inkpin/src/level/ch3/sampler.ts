import type { LevelDef } from '../../logic/level';
import { GAS, WATER } from '../../logic/particles';
import { CH3, PIN_T, T } from '../common';

/**
 * The Desert Tomb's engine sampler: not a chapter level (it isn't in
 * CHAPTER_3), but the shortest example of every new part, for the dev
 * page (?sample=tomb) and for level agents to copy.
 * 1. The plate and the door: the boulder on B drops onto the plate A, and
 *    its weight holds the stone door D open (it slides up into the wall).
 * 2. The bowl by Nib: W's water douses it (steam, an empty bowl).
 * 3. The gas: a rain frog floats puffed up in the gas of the dome over the
 *    vault door, two rows deep, just clear of the bowl's flame on its shelf.
 *    G is the lid of a gas pit under the floor: pulled, its gas rises into
 *    the dome, the pool deepens and reaches the flame, and the blast breaks
 *    the cracked bar (wall 9) to the chest and takes the frog.
 * Winning order: B, W, G (any order wins; it's a sampler, not a puzzle).
 */
export const TOMB_SAMPLER: LevelDef = {
  id: 'tomb-sampler',
  chapter: CH3,
  ruin: 'tomb',
  name: 'Tomb Sampler',
  goal: 'Open the door, break the wall and take the chest',
  rooms: [[[40, 420], [1100, 420], [1100, 900], [880, 900], [880, 956], [800, 956], [800, 900], [40, 900]]],
  walls: [
    { ax: 40, ay: 420, bx: 1100, by: 420, t: T }, // 0 ceiling (the dome's roof over x 760..960)
    { ax: 40, ay: 420, bx: 40, by: 900, t: T }, // 1
    { ax: 1100, ay: 420, bx: 1100, by: 900, t: T }, // 2
    { ax: 40, ay: 900, bx: 800, by: 900, t: T }, // 3 floor
    { ax: 880, ay: 900, bx: 1100, by: 900, t: T }, // 4 floor past the gas pit
    { ax: 800, ay: 900, bx: 800, by: 956, t: T }, // 5 the gas pit, shallow enough to climb out of
    { ax: 880, ay: 900, bx: 880, by: 956, t: T }, // 6
    { ax: 800, ay: 956, bx: 880, by: 956, t: T }, // 7
    { ax: 420, ay: 420, bx: 420, by: 760, t: T }, // 8 over the door
    { ax: 960, ay: 420, bx: 960, by: 892, t: T }, // 9 the cracked bar to the vault
    { ax: 916, ay: 510, bx: 952, by: 510, t: T }, // 10 the bowl's shelf
    { ax: 760, ay: 560, bx: 760, by: 420, t: T }, // 11 the dome's left side
  ],
  bars: [9, 11],
  cracked: [9],
  pins: [
    { id: 'B', ax: 150, ay: 712, bx: 270, by: 712, t: PIN_T }, // holds the boulder over the plate
    { id: 'W', ax: 290, ay: 688, bx: 370, by: 688, t: PIN_T }, // the water tank's floor, over the near bowl
    { id: 'G', ax: 790, ay: 900, bx: 890, by: 900, t: PIN_T }, // the gas pit's lid, flush with the floor
  ],
  fills: [
    { kind: WATER, x0: 300, x1: 360, y1: 680, count: 12 },
    { kind: GAS, x0: 800, x1: 880, y1: 907, count: 28 }, // held from above: rows pack down from under the lid
    { kind: GAS, x0: 768, x1: 952, y1: 428, count: 36 }, // the dome's own gas, two rows, just clear of the flame
  ],
  nib: { x: 100, y: 868 },
  blots: [{ x: 860, y: 452, animal: 'frog' }],
  boulders: [{ x: 210, y: 678 }],
  plates: [{ id: 'A', x0: 160, x1: 260, y: 892 }],
  doors: [{ id: 'D', ax: 420, ay: 760, bx: 420, by: 892, t: T, plate: 'A' }],
  seals: [{ door: 'D', side: 'right' }, { wall: 9, side: 'right' }],
  braziers: [{ x: 330, y: 892 }, { x: 934, y: 502 }],
  chest: { x: 1040, y: 868 },
  coinsNeeded: 0,
  solution: ['B', 'W', 'G'],
  torches: [],
  view: { x: 0, y: 380, w: 1140, h: 640 },
};
