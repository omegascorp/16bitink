import type { LevelDef } from '../../logic/level';
import { COIN, GAS, LAVA, WATER } from '../../logic/particles';
import { CH3, PIN_T, T } from '../common';

/**
 * Chapter 3, level 8 (Level 28): the Sun Barge. The remix, the hardest
 * normal level of the chapter. Still a draft (Nov 1): the audit's lessons
 * (3, target 5) and top lesson (95% K:melted) miss the row; see
 * docs/inkpin-ch3-status.md.
 * 1. The frog canal: the sun barge (a pumice raft) floats in the canal under
 *    a gas dome whose roof rises east to two vents: V's chimney and, behind
 *    the dam, U's flue. V lies across U's slide, so the dam can't open until
 *    V has vented the dome and the frog has dropped into the full canal.
 * 2. The berth: U lets the canal into the berth (88 px across, so the barge
 *    docks within 8 px and its gold can't fall beside it). The surge spills
 *    out of the berth's east wall and down the east pipe to the vault's lava
 *    gutter, which it sets; the rest leaks out of 14-px slots at both feet,
 *    the west one down onto the crypt's bowl. Alone the barge is too light:
 *    C's gold on its deck makes the weight that opens the ankh trapdoor D in
 *    the canal's bed, Nib's way down. C before U: the gold falls into the
 *    empty berth and down its grate, and D stays shut over Nib ('sealed').
 * 3. The crypt: G opens the gas funnel under the crypt's roof. The gas
 *    creeps up to the bowl under the west pipe and the blast breaks the
 *    cracked bar between Nib's landing and the vault. After U the leak has
 *    put the bowl out: the bar stands ('sealed').
 * 4. The vault: K's gold must wait for the stone ('melted').
 * 5. S is the gangway gate, the canal's west plug: out before U it runs the
 *    canal into the gangway's grate, so no surge, no leak, and K's gold
 *    melts in the gutter.
 * Winning order: V, G, U, C (once the barge docks), K, S, walk.
 */
export const SUN_BARGE: LevelDef = {
  id: 'sun-barge',
  chapter: CH3,
  ruin: 'tomb',
  name: 'The Sun Barge',
  goal: 'Open the ankh trapdoor, blast the cracked wall and pick up 40 coins',
  rooms: [
    [[40, 330], [200, 330], [200, 270], [540, 222], [540, 170], [576, 170], [576, 220], [640, 220], [640, 280], [600, 280], [600, 440], [380, 438], [200, 444], [40, 444]], // the gangway, the canal and the frog's dome
    [[600, 300], [704, 300], [704, 600], [600, 600]], // the berth
    [[570, 560], [600, 560], [600, 652], [570, 643]], // the berth's leak pipes: the west one down onto the bowl,
    [[704, 506], [734, 506], [734, 678], [704, 672]], // the east one down onto the crypt's slope, past the gas funnel, to the gutter
    [[380, 440], [460, 440], [460, 640], [380, 640]], // the trapdoor's shaft
    [
      [300, 640], [560, 640], [850, 700], [1270, 700], [1270, 870], [1060, 870], [1060, 910], [860, 910],
      [860, 850], [700, 800], [300, 800],
    ], // Nib's landing, the crypt and the vault
    [[588, 800], [680, 800], [680, 910], [588, 910]], // the gas funnel under the crypt floor
  ],
  walls: [
    { ax: 40, ay: 330, bx: 200, by: 330, t: T }, // 0 the gangway's roof
    { ax: 40, ay: 330, bx: 40, by: 440, t: T }, // 1
    { ax: 40, ay: 444, bx: 200, by: 444, t: T }, // 2 the gangway's floor, a touch under the canal's bed (the canal's west bed slopes down to it)
    { ax: 460, ay: 440, bx: 600, by: 440, t: T }, // 3 ... past the trapdoor (it slides open along here)
    { ax: 200, ay: 270, bx: 200, by: 330, t: T }, // 4 the canal's end, over S
    { ax: 200, ay: 270, bx: 540, by: 222, t: T }, // 5 the dome's roof, rising east so its gas (and the frog) gather over the dam
    { ax: 576, ay: 220, bx: 640, by: 220, t: T }, // 6 ... on over the dome's second vent, the flue behind the dam pin
    { ax: 540, ay: 170, bx: 540, by: 222, t: T }, // 7 the frog's vent, beside S's pull and over the trapdoor's approach: a dry canal leaves the frog on Nib's road
    { ax: 576, ay: 170, bx: 576, by: 220, t: T }, // 8
    { ax: 540, ay: 170, bx: 576, by: 170, t: T }, // 9
    { ax: 200, ay: 270, bx: 200, by: 278, t: T }, // 10 the dome's corner over S
    { ax: 600, ay: 280, bx: 640, by: 280, t: T }, // 11 the flue's floor: U is the dam and this vent's plug at once, so the dam vents the dome too
    { ax: 600, ay: 280, bx: 600, by: 384, t: T }, // 12 the canal's far end, between the flue and the dam
    { ax: 600, ay: 440, bx: 600, by: 570, t: T }, // 13 the berth, under the dam; it stops 14 px above the floor: the leak's slot (too low for the barge) into the pipe
    { ax: 600, ay: 600, bx: 704, by: 600, t: T }, // 14 the berth's floor: the ankh plate
    { ax: 570, ay: 560, bx: 570, by: 643, t: T }, // 15 the grate's pipe, right over the bowl
    { ax: 704, ay: 300, bx: 704, by: 512, t: T }, // 16 the berth's far wall (88 px across, so the barge always docks within 8 px: no gap for its gold), its foot a 14-px slot too
    { ax: 600, ay: 300, bx: 704, by: 300, t: T }, // 17
    { ax: 612, ay: 340, bx: 612, by: 380, t: T }, // 18 the barge's gold hopper, as wide as the deck
    { ax: 692, ay: 340, bx: 692, by: 380, t: T }, // 19
    { ax: 600, ay: 600, bx: 600, by: 652, t: T }, // 20 the pipe's other side
    { ax: 570, ay: 560, bx: 600, by: 560, t: T }, // 21 the pipe's cap
    { ax: 380, ay: 440, bx: 380, by: 640, t: T }, // 22 the trapdoor's shaft
    { ax: 460, ay: 440, bx: 460, by: 640, t: T }, // 23
    { ax: 300, ay: 640, bx: 380, by: 640, t: T }, // 24 Nib's landing
    { ax: 460, ay: 640, bx: 560, by: 640, t: T }, // 25
    { ax: 300, ay: 640, bx: 300, by: 800, t: T }, // 26
    { ax: 300, ay: 800, bx: 560, by: 800, t: T }, // 27
    { ax: 560, ay: 640, bx: 560, by: 792, t: T }, // 28 the cracked bar
    { ax: 560, ay: 640, bx: 570, by: 643, t: T }, // 29 the crypt's roof, rising to the bowl
    { ax: 600, ay: 652, bx: 704, by: 672, t: T }, // 30
    { ax: 560, ay: 800, bx: 616, by: 800, t: T }, // 31 the crypt floor, either side of the funnel's mouth
    { ax: 652, ay: 800, bx: 700, by: 800, t: T }, // 32
    { ax: 700, ay: 800, bx: 860, by: 850, t: T }, // 33 ... running down to the gutter
    { ax: 588, ay: 840, bx: 616, by: 808, t: T }, // 34 the gas funnel
    { ax: 680, ay: 840, bx: 652, by: 808, t: T }, // 35
    { ax: 588, ay: 840, bx: 588, by: 910, t: T }, // 36
    { ax: 680, ay: 840, bx: 680, by: 910, t: T }, // 37
    { ax: 588, ay: 910, bx: 680, by: 910, t: T }, // 38
    { ax: 850, ay: 700, bx: 1270, by: 700, t: T }, // 39 the vault
    { ax: 1270, ay: 700, bx: 1270, by: 870, t: T }, // 40
    { ax: 860, ay: 850, bx: 860, by: 910, t: T }, // 41 the lava gutter
    { ax: 860, ay: 910, bx: 1060, by: 910, t: T }, // 42
    { ax: 1060, ay: 880, bx: 1060, by: 910, t: T }, // 43 the gutter's low far rim: set stone stands proud of it
    { ax: 1060, ay: 870, bx: 1270, by: 870, t: T }, // 44 the vault floor, past the drain
    { ax: 880, ay: 710, bx: 880, by: 770, t: T }, // 45 K's gold hopper over the gutter
    { ax: 950, ay: 710, bx: 950, by: 770, t: T }, // 46
    { ax: 574, ay: 702, bx: 590, by: 702, t: T }, // 47 the bowl's shelf, its tip under the flame
    { ax: 640, ay: 220, bx: 640, by: 280, t: T }, // 53 the flue's end
    { ax: 200, ay: 444, bx: 380, by: 438, t: T }, // 48 the canal's west bed, sloping down to S's opening, so the drained canal runs dry under the frog's vent
    { ax: 704, ay: 546, bx: 704, by: 570, t: T }, // 54 the berth's far wall between its two east openings: the surge's spill (520-538) and the foot slot
    { ax: 704, ay: 600, bx: 704, by: 672, t: T }, // 49 the east leak pipe
    { ax: 734, ay: 506, bx: 734, by: 678, t: T }, // 50
    { ax: 704, ay: 506, bx: 734, by: 506, t: T }, // 51
    { ax: 734, ay: 678, bx: 850, by: 700, t: T }, // 52 the crypt's roof, past the east pipe the canal's west bed, sloping down to S's opening, so the drained canal runs dry under the frog's vent
  ],
  bars: [18, 19, 28, 45, 46, 47],
  cracked: [28],
  pins: [
    { id: 'V', ax: 534, ay: 222, bx: 608, by: 222, t: PIN_T }, // the frog dome's vent, over the trapdoor's approach
    { id: 'G', ax: 658, ay: 800, bx: 610, by: 800, t: PIN_T }, // the gas funnel's mouth in the crypt floor
    { id: 'U', ax: 600, ay: 236, bx: 600, by: 436, t: PIN_T }, // the dam: the canal's low gap into the berth
    { id: 'C', ax: 696, ay: 388, bx: 618, by: 388, t: PIN_T }, // the barge's gold hopper's floor
    { id: 'K', ax: 874, ay: 778, bx: 956, by: 778, t: PIN_T }, // the vault gold hopper's floor
    { id: 'S', ax: 200, ay: 338, bx: 200, by: 436, t: PIN_T }, // the gangway gate: the canal's west plug, and Nib's stop
  ],
  drains: [
    { x0: 44, x1: 196, y0: 396, y1: 444 }, // the gangway's floor grate: S is the canal's west plug, and the canal (and any pool of it) runs out here
    { x0: 544, x1: 572, y0: 176, y1: 214 }, // the frog's vent
    { x0: 606, x1: 636, y0: 228, y1: 274 }, // the flue behind the dam: U lets the dome's gas out here, so the frog drops onto whatever the canal is by then
    { x0: 646, x1: 658, y0: 580, y1: 594 }, // the berth's floor grate: the leak (and the barge's gold, if dropped early) runs down to the bowl and the gutter
    { x0: 574, x1: 596, y0: 562, y1: 576 }, // the leak pipes' air vents: gas the doused bowl leaves rises out here, not into the berth
    { x0: 708, x1: 730, y0: 508, y1: 517 },
    { x0: 386, x1: 454, y0: 782, y1: 800 }, // the landing's grate, right under the trapdoor's shaft: what pours down after Nib drains away
    { x0: 1064, x1: 1100, y0: 840, y1: 864 }, // the vault's drain at the gutter's rim: the overflow vanishes at once, and a ruby resting on the new stone rolls down it ('drained')
  ],
  fills: [
    { kind: WATER, x0: 208, x1: 592, y1: 432, count: 110 }, // the canal
    { kind: GAS, x0: 330, x1: 540, y1: 262, count: 60 }, // the frog's dome
    { kind: GAS, x0: 596, x1: 672, y1: 848, count: 40 }, // the crypt's funnel: it rises to the mouth in the pre-settle
    { kind: LAVA, x0: 868, x1: 1052, y1: 902, count: 64 }, // the gutter
    { kind: COIN, x0: 620, x1: 684, y1: 380, count: 6 }, // the barge's gold
    { kind: COIN, x0: 888, x1: 942, y1: 770, count: 26 }, // the vault's gold
  ],
  rafts: [{ x: 490, y: 404 }],
  nib: { x: 160, y: 416 },
  blots: [{ x: 480, y: 262, animal: 'frog' }],
  chest: { x: 1215, y: 838 },
  coinsNeeded: 14,
  plates: [{ id: 'P', x0: 608, x1: 696, y: 592, need: 24 }],
  doors: [{ id: 'D', ax: 460, ay: 440, bx: 380, by: 440, t: T, plate: 'P' }],
  seals: [{ door: 'D', side: 'down' }, { wall: 28, side: 'right' }],
  braziers: [{ x: 586, y: 694 }],
  solution: ['V', 'G', 'U', 'C~6', 'K', 'S', '@440', '@1215'],
  stops: [],
  torches: [{ x: 120, y: 380 }, { x: 1150, y: 760 }],
  view: { x: 0, y: 140, w: 1310, h: 800 },
};
