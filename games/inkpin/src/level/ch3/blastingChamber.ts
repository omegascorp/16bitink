import type { LevelDef } from '../../logic/level';
import { COIN, GAS, LAVA, WATER } from '../../logic/particles';
import { CH3, PIN_T, T } from '../common';

/**
 * Chapter 3, level 23: the Blasting Chamber. Only a blast breaks the cracked
 * bar to the vault, and the gas that makes it rises past two fire bowls:
 * put out the near one, keep the far one lit. Lava is the wrong spark.
 * 1. The near bowl: the gas well's mouth is a pit by Nib's shelf, and its
 *    bowl stands right beside the gas's way up. The tank over it (W) douses
 *    it; the rest of its water runs down onto the well's lid and waits there.
 *    Pulled with that bowl lit, the well (G) lights at once, low in the
 *    mouth, and burns away far from the bar ('sealed').
 * 2. The blast: G. The gas rises past the dead bowl, fills the narrow dome
 *    (lip to bar) and lights at the far bowl, 30 px under the roof: the
 *    bar breaks. The cistern over that bowl (X) is the trap: pulled first, it
 *    puts the bowl out, the gas pools unlit, and the bar stands ('sealed').
 * 3. The lava step: the vat (L) sits left of the dome's lip, over the tank,
 *    so its lava never meets the dome's gas. It trickles through the empty
 *    tank into the mouth, down the emptied well onto the waiting water, and
 *    sets into stone Nib walks over. With no water under it, it stays hot
 *    ('burnt') and brims over the far lip onto the gold ('melted').
 * 4. S lets Nib go. Out early, he drops into the mouth and the gas comes up
 *    round him ('gassed', the obvious first pull).
 * Winning order: W, G, L, S.
 */
export const BLASTING_CHAMBER: LevelDef = {
  id: 'blasting-chamber',
  chapter: CH3,
  ruin: 'tomb',
  name: 'The Blasting Chamber',
  goal: 'Blast the cracked wall, take the chest and pick up 10 coins',
  tip: 'A flame lights the gas that comes near it, and the blast breaks cracked stone. One drop of water puts a fire bowl out for good.',
  rooms: [
    [[440, 400], [1000, 400], [1000, 900], [790, 900], [790, 1064], [688, 1064], [688, 980], [610, 964], [610, 900], [440, 900]],
    [[560, 110], [680, 110], [680, 400], [560, 400]], // the lava vat, over the tank and left of the dome
    [[846, 340], [894, 340], [894, 400], [846, 400]], // the cistern over the far bowl
  ],
  walls: [
    { ax: 440, ay: 400, bx: 642, by: 400, t: T }, // 0 ceiling, left of the vat's spout (a 22-px trickle)
    { ax: 680, ay: 400, bx: 846, by: 400, t: T }, // 1 ceiling, the dome's roof up to the cistern
    { ax: 440, ay: 400, bx: 440, by: 900, t: T }, // 2
    { ax: 1000, ay: 400, bx: 1000, by: 900, t: T }, // 3
    { ax: 440, ay: 900, bx: 610, by: 900, t: T }, // 4 Nib's shelf
    { ax: 610, ay: 900, bx: 610, by: 964, t: T }, // 5 the well's mouth, too deep to climb out of
    { ax: 610, ay: 964, bx: 682, by: 980, t: T }, // 6 the mouth's floor, running down onto the lid
    { ax: 688, ay: 980, bx: 688, by: 1064, t: T }, // 7 the gas well
    { ax: 688, ay: 1064, bx: 790, by: 1064, t: T }, // 8
    { ax: 790, ay: 900, bx: 790, by: 1064, t: T }, // 9
    { ax: 790, ay: 900, bx: 1000, by: 900, t: T }, // 10 the floor to the vault
    { ax: 900, ay: 400, bx: 900, by: 892, t: T }, // 11 the cracked bar to the vault
    { ax: 870, ay: 480, bx: 892, by: 480, t: T }, // 12 the far bowl's shelf, its tip under the flame
    { ax: 686, ay: 400, bx: 686, by: 520, t: T }, // 13 the dome's left lip: the gas stays right of it, the lava falls left of it
    { ax: 806, ay: 652, bx: 866, by: 644, t: T }, // 14 a gutter under the far bowl: the cistern's water runs to the well, not onto Nib at the bar
    { ax: 634, ay: 700, bx: 634, by: 770, t: T }, // 15 the water tank over the near bowl
    { ax: 680, ay: 700, bx: 680, by: 770, t: T }, // 16
    { ax: 560, ay: 110, bx: 560, by: 400, t: T }, // 17 the lava vat
    { ax: 680, ay: 110, bx: 680, by: 400, t: T }, // 18
    { ax: 560, ay: 110, bx: 680, by: 110, t: T }, // 19
    { ax: 894, ay: 400, bx: 1000, by: 400, t: T }, // 20 ceiling, right of the cistern
    { ax: 846, ay: 340, bx: 846, by: 400, t: T }, // 21 the cistern over the far bowl
    { ax: 894, ay: 340, bx: 894, by: 400, t: T }, // 22
    { ax: 846, ay: 340, bx: 894, by: 340, t: T }, // 23
    { ax: 560, ay: 382, bx: 638, by: 398, t: T }, // 24 the vat's floor, sloping to its spout
  ],
  bars: [11, 12, 13, 14, 15, 16],
  cracked: [11],
  pins: [
    { id: 'W', ax: 626, ay: 778, bx: 688, by: 778, t: PIN_T }, // the tank's floor, over the near bowl
    { id: 'G', ax: 798, ay: 972, bx: 682, by: 980, t: PIN_T }, // the gas well's lid, 73 px under the far floor
    { id: 'L', ax: 626, ay: 400, bx: 688, by: 400, t: PIN_T }, // plugs the vat's spout, right over the tank
    { id: 'S', ax: 596, ay: 892, bx: 596, by: 820, t: PIN_T }, // holds Nib on his shelf
    { id: 'X', ax: 902, ay: 400, bx: 838, by: 400, t: PIN_T }, // the cistern's plug, over the far bowl: the trap
  ],
  fills: [
    { kind: WATER, x0: 634, x1: 680, y1: 770, count: 8 }, // one douses the near bowl, the rest waits on the lid to set the lava
    { kind: GAS, x0: 688, x1: 790, y1: 987, count: 60 }, // held from above: rows pack down from under the lid
    { kind: LAVA, x0: 568, x1: 672, y1: 380, count: 220 }, // more than the well and mouth hold: unset, it brims over onto the gold
    { kind: WATER, x0: 846, x1: 894, y1: 392, count: 12 }, // the trap's water
    { kind: COIN, x0: 800, x1: 890, y1: 892, count: 14 }, // by the bar, where the lava's overflow would reach
  ],
  nib: { x: 562, y: 868 },
  blots: [],
  seals: [{ wall: 11, side: 'right' }],
  braziers: [{ x: 680, y: 971 }, { x: 870, y: 472 }],
  chest: { x: 960, y: 868 },
  coinsNeeded: 10,
  solution: ['W', 'G', 'L', 'S'],
  torches: [],
  view: { x: 400, y: 80, w: 640, h: 1010 },
};
