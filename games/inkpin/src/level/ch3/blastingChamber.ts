import type { LevelDef } from '../../logic/level';
import { COIN, GAS, LAVA, WATER } from '../../logic/particles';
import { CH3, PIN_T, T } from '../common';

/**
 * Chapter 3, level 23: the Blasting Chamber. Only a blast breaks the cracked
 * bar to the vault, and the gas that makes it rises past two fire bowls:
 * put out the near one, keep the far one lit. Lava is the wrong spark.
 * 1. The armadillo's gallery: Nib starts on the left, past his gold, with
 *    an armadillo in a 70-px pen on his way (too spiky to stomp). T's tank
 *    washes it out and fills the pen for Nib to swim across to S.
 * 2. The tank and the vat: W's small tank hangs under the vat's spout, right
 *    over the near bowl in the well's mouth. Its water puts the bowl out and
 *    waits on the well's lid. Pulled with that bowl lit, the well (G)
 *    lights at once, low in the mouth, far from the bar ('sealed').
 * 3. The blast: G. The gas rises past the dead bowl, fills the narrow dome
 *    (lip to bar) and lights at the far bowl, 30 px under the roof: the
 *    bar breaks. The cistern over that bowl (X) is the trap. Its water puts
 *    the bowl out (pulled before G, the gas pools unlit and the bar stands)
 *    and fills the bowl's basin, whose floor is plate P: the vault door D,
 *    open only while the basin is dry, drops in front of the chest. So X
 *    loses wherever it falls ('sealed').
 * 4. The lava step: the vat (L) hangs left of the dome's lip, over the
 *    shaft, so its lava never meets the dome's gas. It trickles down the
 *    shaft into the mouth, down the emptied well onto the waiting water, and
 *    sets into stone Nib walks over. With no water under it, it stays hot
 *    and brims over: onto the gold by the bar or K's gold in the mouth
 *    ('melted'), or under S onto Nib's shelf, 6 px lower than the far floor
 *    ('burnt').
 * 5. The gold: K's hopper hangs over the mouth. Only once the stone has set
 *    may its gold drop onto it; before that it lands in hot lava ('melted').
 * 6. S lets Nib go. Out early (the nearest pull), he drops into the mouth
 *    and the gold, lava or gas come down round him.
 * Winning order: W, G, T, walk, L, K, S, walk.
 */
export const BLASTING_CHAMBER: LevelDef = {
  id: 'blasting-chamber',
  chapter: CH3,
  ruin: 'tomb',
  name: 'The Blasting Chamber',
  goal: 'Blast the cracked wall, take the chest and pick up 24 coins',
  tip: 'A fire bowl lights the gas that reaches it, and the blast breaks cracked stone. Water puts a bowl out for good.',
  rooms: [
    [[110, 360], [890, 360], [890, 628], [550, 628], [550, 696], [470, 696], [470, 628], [110, 628]], // the armadillo's gallery
    [[890, 120], [1012, 120], [1012, 400], [890, 400]], // the lava vat
    [
      [890, 400], [978, 398], [1012, 120], [1132, 120], [1132, 60], [1180, 60], [1180, 120], [1280, 120],
      [1280, 620], [1120, 620], [1120, 784], [1018, 784], [1018, 700], [940, 684], [900, 684], [900, 628], [890, 628],
    ],
  ],
  walls: [
    { ax: 110, ay: 628, bx: 470, by: 628, t: T }, // 0 the gallery floor, where Nib starts
    { ax: 470, ay: 628, bx: 470, by: 696, t: T }, // 1 the armadillo's pen: 70 px, too deep to climb out of dry
    { ax: 470, ay: 696, bx: 550, by: 696, t: T }, // 2
    { ax: 550, ay: 628, bx: 550, by: 696, t: T }, // 3
    { ax: 890, ay: 120, bx: 890, by: 382, t: T }, // 4 the lava vat
    { ax: 890, ay: 120, bx: 1012, by: 120, t: T }, // 5
    { ax: 890, ay: 382, bx: 970, by: 398, t: T }, // 6 the vat's floor, sloping to its spout (a 22-px trickle)
    { ax: 1012, ay: 120, bx: 1012, by: 525, t: T }, // 7 the vat's side, the dome's lip and the shaft: the gas stays right of it
    { ax: 904, ay: 452, bx: 904, by: 510, t: T }, // 8 the gold hopper over the mouth
    { ax: 958, ay: 452, bx: 958, by: 525, t: T }, // 9 its side, and the tank's
    { ax: 110, ay: 360, bx: 110, by: 628, t: T }, // 10 the gallery's back wall
    { ax: 550, ay: 628, bx: 900, by: 628, t: T }, // 11 Nib's shelf, a little under the far floor: hot lava brims over onto him
    { ax: 900, ay: 628, bx: 900, by: 684, t: T }, // 12 the well's mouth, too deep to climb out of
    { ax: 900, ay: 684, bx: 940, by: 684, t: T }, // 13 the mouth's floor, under the hopper
    { ax: 940, ay: 684, bx: 1012, by: 700, t: T }, // 14 running down onto the lid
    { ax: 1018, ay: 700, bx: 1018, by: 784, t: T }, // 15 the gas well
    { ax: 1018, ay: 784, bx: 1120, by: 784, t: T }, // 16
    { ax: 1120, ay: 620, bx: 1120, by: 784, t: T }, // 17
    { ax: 1120, ay: 620, bx: 1280, by: 620, t: T }, // 18 the floor to the vault
    { ax: 1280, ay: 120, bx: 1280, by: 620, t: T }, // 19
    { ax: 1200, ay: 120, bx: 1200, by: 612, t: T }, // 20 the cracked bar to the vault
    { ax: 1124, ay: 200, bx: 1184, by: 200, t: T }, // 21 the far bowl's basin: its floor is plate P, the flame 30 px under the roof
    { ax: 1124, ay: 180, bx: 1124, by: 200, t: T }, // 22 the basin's sides: they keep the cistern's water on the plate
    { ax: 1012, ay: 120, bx: 1132, by: 120, t: T }, // 23 the dome's roof up to the cistern
    { ax: 1180, ay: 120, bx: 1280, by: 120, t: T }, // 24 ceiling, right of the cistern
    { ax: 1132, ay: 60, bx: 1132, by: 120, t: T }, // 25 the cistern over the far bowl
    { ax: 1180, ay: 60, bx: 1180, by: 120, t: T }, // 26
    { ax: 1132, ay: 60, bx: 1180, by: 60, t: T }, // 27
    { ax: 1184, ay: 180, bx: 1184, by: 200, t: T }, // 28
    { ax: 110, ay: 360, bx: 890, by: 360, t: T }, // 29 the gallery's roof
    { ax: 476, ay: 360, bx: 476, by: 444, t: T }, // 30 the tank T over the armadillo's pen
    { ax: 544, ay: 360, bx: 544, by: 444, t: T }, // 31
  ],
  bars: [7, 8, 9, 20, 21, 22, 28, 30, 31],
  cracked: [20],
  pins: [
    { id: 'W', ax: 1020, ay: 532, bx: 950, by: 532, t: PIN_T }, // the small tank's floor, over the near bowl and under the vat's spout
    { id: 'T', ax: 466, ay: 450, bx: 554, by: 450, t: PIN_T }, // the armadillo tank's floor, over the pen
    { id: 'G', ax: 1128, ay: 692, bx: 1012, by: 700, t: PIN_T }, // the gas well's lid, 72 px under the far floor
    { id: 'L', ax: 956, ay: 400, bx: 1018, by: 400, t: PIN_T }, // plugs the vat's spout, right over the shaft
    { id: 'K', ax: 896, ay: 516, bx: 964, by: 516, t: PIN_T }, // the gold hopper's floor, over the mouth
    { id: 'S', ax: 910, ay: 592, bx: 910, by: 540, t: PIN_T }, // holds Nib on his shelf; lava runs under it
    { id: 'X', ax: 1188, ay: 120, bx: 1124, by: 120, t: PIN_T }, // the cistern's plug, over the far bowl: the trap
  ],
  fills: [
    { kind: WATER, x0: 962, x1: 1008, y1: 524, count: 8 }, // one douses the near bowl, the rest waits on the lid to set the lava
    { kind: WATER, x0: 476, x1: 544, y1: 442, count: 40 }, // washes the armadillo out, then fills the pen for Nib to swim
    { kind: GAS, x0: 1018, x1: 1120, y1: 707, count: 60 }, // held from above: rows pack down from under the lid
    { kind: LAVA, x0: 898, x1: 1004, y1: 380, count: 220 }, // more than the mouth holds over a shut lid: unset, it brims over onto the gold or Nib
    { kind: WATER, x0: 1132, x1: 1180, y1: 112, count: 8 }, // the trap's water
    { kind: COIN, x0: 904, x1: 958, y1: 508, count: 16 }, // K's gold, over the mouth
    { kind: COIN, x0: 300, x1: 420, y1: 620, count: 14 }, // on the gallery floor, on Nib's way to the pen
  ],
  nib: { x: 150, y: 596 },
  blots: [{ x: 510, y: 666, animal: 'armadillo' }],
  // The basin's plate holds nothing at the start, so the vault door D stands open; the trap's water drops it.
  plates: [{ id: 'P', x0: 1132, x1: 1176, y: 192, need: 5 }],
  doors: [{ id: 'D', ax: 1216, ay: 380, bx: 1216, by: 612, t: T, plate: 'P', invert: true }],
  seals: [{ wall: 20, side: 'right' }, { door: 'D', side: 'right' }],
  braziers: [{ x: 1010, y: 691 }, { x: 1166, y: 192 }],
  chest: { x: 1240, y: 588 },
  coinsNeeded: 24,
  solution: ['W', 'G', 'T', '@862', 'L', 'K', 'S', '@1240'],
  stops: [],
  torches: [{ x: 300, y: 470 }, { x: 720, y: 470 }],
  view: { x: 60, y: 40, w: 1300, h: 770 },
};
