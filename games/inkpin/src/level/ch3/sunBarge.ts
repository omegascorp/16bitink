import type { LevelDef } from '../../logic/level';
import { COIN, GAS, LAVA, WATER } from '../../logic/particles';
import { CH3, PIN_T, T } from '../common';

/**
 * Chapter 3, level 8 (Level 28): the Sun Barge. The remix, the hardest
 * normal level of the chapter (redesigned Nov 2, round 4).
 * 1. The frog's bell: a rain frog floats puffed in a low gas bell over the
 *    canal's shallow west shelf, right on Nib's way: left there, it inks him
 *    as he walks under it. V vents the bell. While the canal is full, the
 *    frog drops into the shelf's water and washes away; once the dam has run
 *    the canal dry, it lands on the bare shelf and waits for Nib ('inked').
 *    The bell's west lip is the ankh door E, Nib's gangway door.
 * 2. The berth: U, the dam, lets the canal into the berth (88 px across, so
 *    the barge docks within 8 px and its gold can't fall beside it). The
 *    surge spills out of the berth's east wall and down the east pipe to the
 *    vault's lava gutter, which it sets; the rest leaks out of 14-px slots at
 *    both feet, the west one down onto the crypt's bowl. Alone the barge is
 *    too light: C's gold on its deck makes the weight on the ankh plate that
 *    opens both ankh doors, E out of the gangway and the trapdoor D in the
 *    canal's bed. C before U: the gold falls into the empty berth and out of
 *    the grate under the hopper, and the doors stay shut ('sealed').
 * 3. The crypt: G opens the gas funnel under the crypt's roof. The gas
 *    creeps up to the bowl under the west pipe and the blast breaks the
 *    cracked bar between Nib's landing and the vault. After U the leak has
 *    put the bowl out: the bar stands ('sealed').
 * 4. The vault: K's gold drops into the gutter, so it must wait for stone
 *    ('melted'). S is the post standing in the gutter across Nib's way to the
 *    chest; its head plugs the little cistern in the vault's roof, so pulling
 *    it also drops water on the gutter. Either U's surge or S sets the stone:
 *    K is safe after either, and K before both is the one quick loss.
 * The ankh door E keeps Nib in his gangway until the barge is docked, so he
 * can't wade into the canal and knock the barge off its berth.
 * Winning order: V, G, U, C (once the barge docks), K, S, walk.
 */
export const SUN_BARGE: LevelDef = {
  id: 'sun-barge',
  chapter: CH3,
  ruin: 'tomb',
  name: 'The Sun Barge',
  goal: 'Open the ankh trapdoor, blast the cracked wall, take the chest and pick up 14 coins',
  rooms: [
    [
      [40, 292], [250, 292], [250, 320], [264, 320], [264, 264], [304, 264], [304, 320], [360, 320], [360, 296], [600, 296],
      [600, 440], [380, 440], [370, 420], [250, 420], [140, 380], [40, 380],
    ], // the gangway, the frog's bell and the canal
    [[600, 300], [704, 300], [704, 600], [600, 600]], // the berth
    [[570, 530], [600, 530], [600, 652], [570, 643]], // the berth's leak pipes: the west one down onto the bowl,
    [[704, 506], [734, 506], [734, 678], [704, 672]], // the east one down onto the crypt's slope, past the gas funnel, to the gutter
    [[380, 440], [460, 440], [460, 640], [380, 640]], // the trapdoor's shaft
    [
      [300, 640], [560, 640], [850, 700], [1270, 700], [1270, 870], [1060, 870], [1060, 910], [860, 910],
      [860, 850], [700, 800], [300, 800],
    ], // Nib's landing, the crypt and the vault
    [[588, 800], [680, 800], [680, 910], [588, 910]], // the gas funnel under the crypt floor
  ],
  walls: [
    { ax: 40, ay: 292, bx: 250, by: 292, t: T }, // 0 the gangway's roof
    { ax: 40, ay: 292, bx: 40, by: 380, t: T }, // 1
    { ax: 40, ay: 380, bx: 140, by: 380, t: T }, // 2 the gangway's floor, above the canal's water
    { ax: 140, ay: 380, bx: 250, by: 420, t: T }, // 3 the ramp down to the shelf, gentle (20°): Nib walking down it never stomps a frog at its foot
    { ax: 250, ay: 420, bx: 370, by: 420, t: T }, // 4 the canal's shallow west shelf, under the frog's bell
    { ax: 370, ay: 420, bx: 384, by: 438, t: T }, // 5 ... sloping down to the trapdoor
    { ax: 460, ay: 440, bx: 600, by: 440, t: T }, // 6 the canal's bed past the trapdoor (it slides open along here)
    { ax: 250, ay: 320, bx: 264, by: 320, t: T }, // 7 the bell's roof, either side of the chimney (its west lip is the door E)
    { ax: 304, ay: 320, bx: 360, by: 320, t: T }, // 8 ... low over Nib's way
    { ax: 264, ay: 264, bx: 264, by: 320, t: T }, // 9 the frog's chimney, at the bell's west end (the frog floats clear of it)
    { ax: 304, ay: 264, bx: 304, by: 320, t: T }, // 10
    { ax: 264, ay: 264, bx: 304, by: 264, t: T }, // 11
    { ax: 360, ay: 296, bx: 360, by: 320, t: T }, // 12 the bell's east lip
    { ax: 360, ay: 320, bx: 360, by: 346, t: T }, // 13
    { ax: 360, ay: 296, bx: 600, by: 296, t: T }, // 14 the canal's roof
    { ax: 600, ay: 296, bx: 600, by: 384, t: T }, // 15 the canal's far end, over the dam
    { ax: 600, ay: 440, bx: 600, by: 570, t: T }, // 16 the berth, under the dam; it stops 14 px above the floor: the leak's slot (too low for the barge) into the pipe
    { ax: 600, ay: 600, bx: 704, by: 600, t: T }, // 17 the berth's floor: the ankh plate
    { ax: 570, ay: 530, bx: 570, by: 643, t: T }, // 18 the leak's pipe, right over the bowl; it rises 40 px past the slot, so gas from the crypt vents above it and never wedges beside the docked barge
    { ax: 704, ay: 300, bx: 704, by: 512, t: T }, // 19 the berth's far wall (88 px across, so the barge always docks within 8 px: no gap for its gold), its foot a 14-px slot too
    { ax: 600, ay: 300, bx: 704, by: 300, t: T }, // 20
    { ax: 612, ay: 340, bx: 612, by: 380, t: T }, // 21 the barge's gold hopper, as wide as the deck
    { ax: 692, ay: 340, bx: 692, by: 380, t: T }, // 22
    { ax: 600, ay: 600, bx: 600, by: 652, t: T }, // 23 the pipe's other side
    { ax: 570, ay: 530, bx: 600, by: 530, t: T }, // 24 the pipe's cap
    { ax: 380, ay: 440, bx: 380, by: 640, t: T }, // 25 the trapdoor's shaft
    { ax: 460, ay: 440, bx: 460, by: 640, t: T }, // 26
    { ax: 300, ay: 640, bx: 380, by: 640, t: T }, // 27 Nib's landing
    { ax: 460, ay: 640, bx: 560, by: 640, t: T }, // 28
    { ax: 300, ay: 640, bx: 300, by: 800, t: T }, // 29
    { ax: 300, ay: 800, bx: 560, by: 800, t: T }, // 30
    { ax: 560, ay: 640, bx: 560, by: 792, t: T }, // 31 the cracked bar
    { ax: 560, ay: 640, bx: 570, by: 643, t: T }, // 32 the crypt's roof, rising to the bowl
    { ax: 600, ay: 652, bx: 704, by: 672, t: T }, // 33
    { ax: 560, ay: 800, bx: 616, by: 800, t: T }, // 34 the crypt floor, either side of the funnel's mouth
    { ax: 652, ay: 800, bx: 700, by: 800, t: T }, // 35
    { ax: 700, ay: 800, bx: 860, by: 850, t: T }, // 36 ... running down to the gutter
    { ax: 588, ay: 840, bx: 616, by: 808, t: T }, // 37 the gas funnel
    { ax: 680, ay: 840, bx: 652, by: 808, t: T }, // 38
    { ax: 588, ay: 840, bx: 588, by: 910, t: T }, // 39
    { ax: 680, ay: 840, bx: 680, by: 910, t: T }, // 40
    { ax: 588, ay: 910, bx: 680, by: 910, t: T }, // 41
    { ax: 850, ay: 700, bx: 1270, by: 700, t: T }, // 42 the vault
    { ax: 1270, ay: 700, bx: 1270, by: 870, t: T }, // 43
    { ax: 860, ay: 850, bx: 860, by: 910, t: T }, // 44 the lava gutter
    { ax: 860, ay: 910, bx: 1060, by: 910, t: T }, // 45
    { ax: 1060, ay: 880, bx: 1060, by: 910, t: T }, // 46 the gutter's low far rim: set stone stands proud of it
    { ax: 1060, ay: 870, bx: 1270, by: 870, t: T }, // 47 the vault floor, past the drain
    { ax: 880, ay: 710, bx: 880, by: 770, t: T }, // 48 K's gold hopper over the gutter
    { ax: 950, ay: 710, bx: 950, by: 770, t: T }, // 49
    { ax: 574, ay: 702, bx: 590, by: 702, t: T }, // 50 the bowl's shelf, its tip under the flame
    { ax: 704, ay: 546, bx: 704, by: 570, t: T }, // 51 the berth's far wall between its two east openings: the surge's spill (520-538) and the foot slot
    { ax: 704, ay: 600, bx: 704, by: 672, t: T }, // 52 the east leak pipe
    { ax: 734, ay: 506, bx: 734, by: 678, t: T }, // 53
    { ax: 704, ay: 506, bx: 734, by: 506, t: T }, // 54
    { ax: 734, ay: 678, bx: 850, by: 700, t: T }, // 55 the crypt's roof, past the east pipe
    { ax: 966, ay: 710, bx: 966, by: 760, t: T }, // 56 the cistern over the gutter, S's head in its floor's slot
    { ax: 1034, ay: 710, bx: 1034, by: 760, t: T }, // 57
    { ax: 966, ay: 760, bx: 984, by: 760, t: T }, // 58
    { ax: 1016, ay: 760, bx: 1034, by: 760, t: T }, // 59
  ],
  bars: [21, 22, 31, 48, 49, 50, 56, 57, 58, 59],
  cracked: [31],
  pins: [
    { id: 'V', ax: 310, ay: 314, bx: 268, by: 314, t: PIN_T }, // the frog bell's chimney
    { id: 'G', ax: 658, ay: 800, bx: 610, by: 800, t: PIN_T }, // the gas funnel's mouth in the crypt floor
    { id: 'U', ax: 600, ay: 312, bx: 600, by: 436, t: PIN_T }, // the dam: the canal's low gap into the berth
    { id: 'C', ax: 696, ay: 388, bx: 618, by: 388, t: PIN_T }, // the barge's gold hopper's floor
    { id: 'K', ax: 874, ay: 778, bx: 956, by: 778, t: PIN_T }, // the vault gold hopper's floor
    { id: 'S', ax: 1000, ay: 740, bx: 1000, by: 898, t: PIN_T }, // the post in the gutter: Nib's stop, its head the cistern's plug
  ],
  drains: [
    { x0: 268, x1: 300, y0: 270, y1: 300 }, // the frog's chimney
    { x0: 628, x1: 676, y0: 580, y1: 594 }, // the berth's floor grate, right under the gold hopper: the barge's gold, dropped early, runs out here (and the leak)
    { x0: 574, x1: 596, y0: 532, y1: 556 }, // the leak pipes' air vents: gas the doused bowl leaves rises out here, not into the berth
    { x0: 708, x1: 730, y0: 508, y1: 517 },
    { x0: 386, x1: 454, y0: 782, y1: 800 }, // the landing's grate, right under the trapdoor's shaft: what pours down after Nib drains away
    { x0: 1064, x1: 1100, y0: 840, y1: 864 }, // the vault's drain at the gutter's rim: the overflow vanishes at once
  ],
  fills: [
    { kind: WATER, x0: 388, x1: 592, y1: 432, count: 100 }, // the canal (it spreads over the shelf in the pre-settle)
    { kind: GAS, x0: 258, x1: 352, y1: 328, count: 18 }, // the frog's bell
    { kind: GAS, x0: 596, x1: 672, y1: 848, count: 40 }, // the crypt's funnel: it rises to the mouth in the pre-settle
    { kind: LAVA, x0: 868, x1: 1052, y1: 902, count: 64 }, // the gutter
    { kind: COIN, x0: 620, x1: 684, y1: 380, count: 6 }, // the barge's gold
    { kind: COIN, x0: 888, x1: 942, y1: 770, count: 26 }, // the vault's gold
    { kind: WATER, x0: 974, x1: 1026, y1: 752, count: 10 }, // the cistern
  ],
  rafts: [{ x: 500, y: 404 }],
  nib: { x: 100, y: 348 },
  blots: [{ x: 336, y: 352, animal: 'frog' }],
  chest: { x: 1215, y: 838 },
  coinsNeeded: 14,
  plates: [{ id: 'P', x0: 608, x1: 696, y: 592, need: 24 }],
  doors: [
    { id: 'D', ax: 460, ay: 440, bx: 380, by: 440, t: T, plate: 'P' }, // the ankh trapdoor in the canal's bed
    { id: 'E', ax: 250, ay: 292, bx: 250, by: 404, t: T, plate: 'P' }, // the gangway's ankh door, and the frog bell's west lip
  ],
  seals: [{ door: 'E', side: 'right' }, { door: 'D', side: 'down' }, { wall: 31, side: 'right' }],
  braziers: [{ x: 586, y: 694 }],
  solution: ['V', 'G', 'U', 'C~6', 'K', 'S', '@440', '@1215'],
  stops: [],
  torches: [{ x: 70, y: 330 }, { x: 1150, y: 760 }],
  view: { x: 0, y: 220, w: 1310, h: 720 },
};
