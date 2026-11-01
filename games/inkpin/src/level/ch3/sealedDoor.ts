import type { LevelDef } from '../../logic/level';
import { COIN, LAVA, WATER } from '../../logic/particles';
import { CH3, PIN_T, T } from '../common';

/**
 * Level 21, the chapter opener: the gold that weighs the plate down is gold
 * Nib must take, so the boulder has to become the real weight, and it can
 * only get onto the plate while the gold still holds the way open.
 *
 * Plate P is the floor of a two-bay closet hung over the lava moat, out of
 * Nib's reach (the kit's pattern 1). Its weight holds two stone doors up:
 * the vault door D (between Nib and the chest) and the hatch H in the
 * boulder's shaft.
 * 1. The gold: C unplugs the hopper's spout, and 24 coins drip into the gold
 *    bay. They weigh the plate, and both doors rise. (The spout is narrow so
 *    that with G already out the coins fall straight through one by one and
 *    never weigh the plate, even for a moment.)
 * 2. The boulder: B drops it onto the hatch. While the hatch is open it falls
 *    on into its bay and weighs the plate for good (40). While the hatch is
 *    shut it waits there, and drops in once the gold opens the hatch.
 * 3. The flood: W's low tank sets the lava moat into a stone bridge, and the
 *    overflow runs through the open door and down to the vault's drain. A
 *    grate on the doorstep lets a flood held back by the shut door leak away.
 * 4. The grab: Nib walks out under the closet, and G (the gold bay's plug)
 *    rains the gold onto him. The boulder keeps the plate down.
 * 5. The vault's own gold: V. Then Nib walks in and drops to the chest.
 * Losses: G before B, the greedy grab: the gold leaves the plate, both doors
 * drop, and the boulder lands on the shut hatch ('sealed', after every pin).
 * Gold let out before W falls into the hot moat ('melted'). Nib's walk before
 * W: into the moat ('burnt').
 * Winning order: C, B, W, walk, G, V, walk.
 */
export const SEALED_DOOR: LevelDef = {
  id: 'sealed-door',
  chapter: CH3,
  ruin: 'tomb',
  name: 'The Sealed Door',
  goal: 'Open the vault door, take the chest and pick up 31 coins',
  tip: 'The gold holds the doors open, but you need that gold. Get the boulder onto the plate while the hatch is open.',
  rooms: [
    [[40, 500], [414, 500], [414, 760], [520, 760], [520, 900], [400, 900], [400, 990], [150, 990], [150, 900], [40, 900]],
    [[520, 760], [760, 760], [760, 970], [640, 970], [640, 900], [520, 900]],
  ],
  walls: [
    { ax: 40, ay: 500, bx: 414, by: 500, t: T }, // 0 ceiling
    { ax: 40, ay: 500, bx: 40, by: 900, t: T }, // 1 left wall
    { ax: 40, ay: 900, bx: 150, by: 900, t: T }, // 2 Nib's floor
    { ax: 150, ay: 900, bx: 150, by: 990, t: T }, // 3 the moat's near bank
    { ax: 150, ay: 990, bx: 400, by: 990, t: T }, // 4 the moat's floor
    { ax: 400, ay: 900, bx: 400, by: 990, t: T }, // 5 the moat's far bank
    { ax: 400, ay: 900, bx: 640, by: 900, t: T }, // 6 the doorstep, and the vault's shelf where V's gold lands
    { ax: 640, ay: 900, bx: 640, by: 970, t: T }, // 7 the shelf's 70-px drop: the armadillo can't climb it
    { ax: 160, ay: 540, bx: 160, by: 800, t: T }, // 8 the tank, hung low so its flood lands gently on the lava
    { ax: 238, ay: 540, bx: 238, by: 800, t: T }, // 9
    { ax: 262, ay: 500, bx: 262, by: 806, t: T }, // 10 the closet: the boulder's shaft
    { ax: 262, ay: 806, bx: 342, by: 806, t: T }, // 11 the boulder's bay (half of plate P)
    { ax: 342, ay: 500, bx: 342, by: 790, t: T }, // 12 the divider
    { ax: 414, ay: 500, bx: 414, by: 790, t: T }, // 13 the gold's shaft
    { ax: 414, ay: 790, bx: 398, by: 806, t: T }, // 14 the gold's bay: its floor is mostly the slot that G plugs (the other half of P)
    { ax: 414, ay: 760, bx: 760, by: 760, t: T }, // 15 the roof over the doorway and the vault
    { ax: 760, ay: 760, bx: 760, by: 970, t: T }, // 16 the vault
    { ax: 640, ay: 970, bx: 760, by: 970, t: T }, // 17 the vault's floor
    { ax: 644, ay: 760, bx: 644, by: 820, t: T }, // 18 the vault's hopper V, over the foot of the flood's fall
    { ax: 700, ay: 760, bx: 700, by: 820, t: T }, // 19
    { ax: 342, ay: 684, bx: 361, by: 712, t: T }, // 20 the gold hopper's spout: the gold drips out, so it never
    { ax: 414, ay: 684, bx: 395, by: 712, t: T }, // 21 piles up on the plate while G is out
  ],
  bars: [8, 9, 10, 11, 12, 14, 18, 19, 20, 21],
  pins: [
    { id: 'C', ax: 418, ay: 718, bx: 346, by: 718, t: PIN_T }, // plugs the gold hopper's spout
    { id: 'B', ax: 346, ay: 580, bx: 266, by: 580, t: PIN_T }, // holds the boulder over the hatch
    { id: 'W', ax: 152, ay: 804, bx: 246, by: 804, t: PIN_T }, // the tank's floor, over the moat
    { id: 'G', ax: 400, ay: 812, bx: 302, by: 812, t: PIN_T }, // plugs the gold bay's slot, over the moat
    { id: 'V', ax: 704, ay: 826, bx: 640, by: 826, t: PIN_T }, // the vault gold's floor, over the shelf
  ],
  fills: [
    { kind: WATER, x0: 168, x1: 230, y1: 797, count: 150 },
    { kind: LAVA, x0: 158, x1: 392, y1: 982, count: 184 },
    { kind: COIN, x0: 350, x1: 406, y1: 680, count: 24 },
    { kind: COIN, x0: 652, x1: 692, y1: 819, count: 12 },
  ],
  nib: { x: 110, y: 868 },
  blots: [],
  boulders: [{ x: 302, y: 546 }],
  // Both bays: the boulder (40) or the gold (~20 of its 24 coins in the zone) holds it down.
  plates: [{ id: 'P', x0: 270, x1: 406, y: 806, need: 14 }],
  doors: [
    { id: 'D', ax: 520, ay: 760, bx: 520, by: 870, t: T, plate: 'P' }, // the vault door: rises into the rock; a water slot under it
    { id: 'H', ax: 346, ay: 630, bx: 266, by: 630, t: T, plate: 'P' }, // the hatch in the boulder's shaft: opens right
  ],
  seals: [{ door: 'D', side: 'right' }],
  drains: [
    { x0: 700, x1: 756, y0: 958, y1: 976 }, // the vault's drain: the flood leaves this way
    { x0: 466, x1: 490, y0: 884, y1: 900 }, // the doorstep's grate: a flood held back by the shut door leaks away
  ],
  chest: { x: 740, y: 938 },
  coinsNeeded: 31,
  solution: ['C', 'B', 'W', '@358', 'G', 'V', '@740'],
  stops: [],
  torches: [{ x: 90, y: 640 }, { x: 700, y: 820 }],
  view: { x: 0, y: 470, w: 800, h: 540 },
};
