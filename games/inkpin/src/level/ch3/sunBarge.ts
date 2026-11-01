import type { LevelDef } from '../../logic/level';
import { COIN, GAS, LAVA, WATER } from '../../logic/particles';
import { CH3, PIN_T, T } from '../common';

/**
 * Chapter 3, level 8 (Level 28): the Sun Barge. The remix, the hardest
 * normal level of the chapter. One canal of water does three jobs, and each
 * job wants it at a different time: it is the frog's pool, the barge's road,
 * and (once it has leaked out of the berth) the water that douses the crypt's
 * bowl and sets the vault's lava gutter.
 * 1. The frog canal: the sun barge (a pumice raft) floats in the canal under
 *    a gas dome with a rain frog in it. V vents the dome and the frog drops
 *    into the canal and washes. After U the canal is dry: the frog lands on
 *    its bed (or falls down the trapdoor) and inks Nib on his way ('inked').
 * 2. The berth: U, the dam, lets the canal out through a low gap (too low for
 *    Nib or the frog) into the berth, and the barge rides the water down onto
 *    sun plate P. The berth leaks through a small grate, so the barge settles
 *    on the plate. Alone it is too light: C's gold on its deck makes the
 *    weight that opens the sun trapdoor D in the canal's bed, Nib's way down.
 *    C before U: the gold falls into the empty berth and down the grate.
 * 3. The crypt: G opens the gas tank under the crypt's sloping roof. The gas
 *    creeps up to the bowl under the berth's grate and the blast breaks the
 *    cracked bar between Nib's landing and the vault. After U, the leak has
 *    put the bowl out: the bar stands ('sealed').
 * 4. The vault: the leak runs on down the crypt floor into the lava gutter
 *    and sets it. R's rubies, dropped into the hot gutter, sink and are held
 *    by the stone; dropped on the new stone they roll on to the drain
 *    ('drained'). K's gold must wait for the stone ('melted').
 * 5. S lets Nib go to the trapdoor, under the frog's vent.
 * Winning order: V, G, R, U, C, K, S, walk (V, G and R in any order).
 */
export const SUN_BARGE: LevelDef = {
  id: 'sun-barge',
  chapter: CH3,
  ruin: 'tomb',
  name: 'The Sun Barge',
  goal: 'Open the sun trapdoor, blast the cracked wall and pick up 40 coins',
  rooms: [
    [[40, 330], [200, 330], [200, 230], [210, 230], [210, 170], [250, 170], [250, 230], [600, 230], [600, 440], [40, 440]], // the gangway, the canal and the frog's dome
    [[600, 300], [712, 300], [712, 600], [600, 600]], // the berth
    [[570, 560], [600, 560], [600, 652], [570, 643]], // the berth's grate pipes
    [[712, 560], [742, 560], [742, 679], [712, 673]],
    [[380, 440], [460, 440], [460, 640], [380, 640]], // the trapdoor's shaft
    [
      [300, 640], [560, 640], [850, 700], [1350, 700], [1350, 870], [1060, 870], [1060, 910], [860, 910],
      [860, 850], [700, 800], [300, 800],
    ], // Nib's landing, the crypt and the vault
    [[588, 800], [680, 800], [680, 910], [588, 910]], // the gas funnel under the crypt floor
  ],
  walls: [
    { ax: 40, ay: 330, bx: 200, by: 330, t: T }, // 0 the gangway's roof
    { ax: 40, ay: 330, bx: 40, by: 440, t: T }, // 1
    { ax: 40, ay: 440, bx: 380, by: 440, t: T }, // 2 the gangway and the canal's bed
    { ax: 460, ay: 440, bx: 600, by: 440, t: T }, // 3 ... past the trapdoor (it slides open along here)
    { ax: 200, ay: 230, bx: 200, by: 330, t: T }, // 4 the canal's end, over S
    { ax: 200, ay: 230, bx: 210, by: 230, t: T }, // 5 the dome's roof
    { ax: 250, ay: 230, bx: 600, by: 230, t: T }, // 6
    { ax: 210, ay: 170, bx: 210, by: 230, t: T }, // 7 the frog's vent, right over S: S can't lift until it's open
    { ax: 250, ay: 170, bx: 250, by: 230, t: T }, // 8
    { ax: 210, ay: 170, bx: 250, by: 170, t: T }, // 9
    { ax: 200, ay: 230, bx: 200, by: 238, t: T }, // 10 the dome's corner over S
    { ax: 560, ay: 230, bx: 560, by: 290, t: T }, // 11 the dome's lip
    { ax: 600, ay: 230, bx: 600, by: 384, t: T }, // 12 the canal's far end, over the dam
    { ax: 600, ay: 440, bx: 600, by: 570, t: T }, // 13 the berth, under the dam; its grate at the foot, away from the barge
    { ax: 600, ay: 600, bx: 712, by: 600, t: T }, // 14 the berth's floor: the sun plate
    { ax: 570, ay: 560, bx: 570, by: 643, t: T }, // 15 the grate's pipe, right over the bowl
    { ax: 712, ay: 300, bx: 712, by: 570, t: T }, // 16 a second grate at the far foot: the barge can only stop one
    { ax: 600, ay: 300, bx: 712, by: 300, t: T }, // 17
    { ax: 616, ay: 340, bx: 616, by: 380, t: T }, // 18 the barge's gold hopper, as wide as the deck
    { ax: 696, ay: 340, bx: 696, by: 380, t: T }, // 19
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
    { ax: 600, ay: 652, bx: 712, by: 673, t: T }, // 30
    { ax: 560, ay: 800, bx: 616, by: 800, t: T }, // 31 the crypt floor, either side of the funnel's mouth
    { ax: 652, ay: 800, bx: 700, by: 800, t: T }, // 32
    { ax: 700, ay: 800, bx: 860, by: 850, t: T }, // 33 ... running down to the gutter
    { ax: 588, ay: 840, bx: 616, by: 808, t: T }, // 34 the gas funnel
    { ax: 680, ay: 840, bx: 652, by: 808, t: T }, // 35
    { ax: 588, ay: 840, bx: 588, by: 910, t: T }, // 36
    { ax: 680, ay: 840, bx: 680, by: 910, t: T }, // 37
    { ax: 588, ay: 910, bx: 680, by: 910, t: T }, // 38
    { ax: 850, ay: 700, bx: 1350, by: 700, t: T }, // 39 the vault
    { ax: 1350, ay: 700, bx: 1350, by: 870, t: T }, // 40
    { ax: 860, ay: 850, bx: 860, by: 910, t: T }, // 41 the lava gutter
    { ax: 860, ay: 910, bx: 1060, by: 910, t: T }, // 42
    { ax: 1060, ay: 870, bx: 1060, by: 910, t: T }, // 43 the gutter's low far rim: set stone stands proud of it
    { ax: 1060, ay: 870, bx: 1350, by: 870, t: T }, // 44 the vault floor, past the drain
    { ax: 890, ay: 710, bx: 890, by: 770, t: T }, // 45 K's gold hopper over the gutter
    { ax: 940, ay: 710, bx: 940, by: 770, t: T }, // 46
    { ax: 1030, ay: 710, bx: 1030, by: 770, t: T }, // 47 R's ruby hopper, over the gutter's far end by the drain
    { ax: 1070, ay: 710, bx: 1070, by: 770, t: T }, // 48
    { ax: 574, ay: 702, bx: 590, by: 702, t: T }, // 49 the bowl's shelf, its tip under the flame
    { ax: 742, ay: 679, bx: 850, by: 700, t: T }, // 50 the crypt's roof, past the far pipe
    { ax: 712, ay: 600, bx: 712, by: 673, t: T }, // 51 the far grate's pipe
    { ax: 742, ay: 560, bx: 742, by: 679, t: T }, // 52
    { ax: 712, ay: 560, bx: 742, by: 560, t: T }, // 53
  ],
  bars: [11, 18, 19, 28, 45, 46, 47, 48, 49],
  cracked: [28],
  pins: [
    { id: 'V', ax: 258, ay: 230, bx: 202, by: 230, t: PIN_T }, // the frog dome's vent, across S's way out
    { id: 'G', ax: 658, ay: 800, bx: 610, by: 800, t: PIN_T }, // the gas funnel's mouth in the crypt floor
    { id: 'R', ax: 1076, ay: 778, bx: 1024, by: 778, t: PIN_T }, // the ruby hopper's floor
    { id: 'U', ax: 600, ay: 392, bx: 600, by: 436, t: PIN_T }, // the dam: the canal's low gap into the berth
    { id: 'C', ax: 704, ay: 388, bx: 618, by: 388, t: PIN_T }, // the barge's gold hopper's floor
    { id: 'K', ax: 884, ay: 778, bx: 946, by: 778, t: PIN_T }, // the vault gold hopper's floor
    { id: 'S', ax: 200, ay: 338, bx: 200, by: 436, t: PIN_T }, // Nib's stop, the canal's end
  ],
  drains: [
    { x0: 214, x1: 246, y0: 176, y1: 222 }, // the frog's vent
    { x0: 650, x1: 662, y0: 582, y1: 592 }, // the berth's floor grate: the barge settles dry
    { x0: 1066, x1: 1100, y0: 844, y1: 862 }, // the vault's drain, past the gutter
  ],
  fills: [
    { kind: WATER, x0: 208, x1: 592, y1: 432, count: 150 }, // the canal
    { kind: GAS, x0: 208, x1: 552, y1: 238, count: 60 }, // the frog's dome
    { kind: GAS, x0: 596, x1: 672, y1: 848, count: 40 }, // the crypt's funnel: it rises to the mouth in the pre-settle
    { kind: LAVA, x0: 868, x1: 1052, y1: 902, count: 70 }, // the gutter
    { kind: COIN, x0: 624, x1: 688, y1: 380, count: 20 }, // the barge's gold
    { kind: COIN, x0: 896, x1: 934, y1: 770, count: 16 }, // the vault's gold
  ],
  rafts: [{ x: 540, y: 404 }],
  rubies: [{ x: 1050, y: 760 }, { x: 1050, y: 740 }, { x: 1050, y: 720 }],
  nib: { x: 90, y: 416 },
  blots: [{ x: 300, y: 262, animal: 'frog' }],
  chest: { x: 1310, y: 838 },
  coinsNeeded: 40,
  plates: [{ id: 'P', x0: 608, x1: 704, y: 592, need: 28 }],
  doors: [{ id: 'D', ax: 460, ay: 440, bx: 380, by: 440, t: T, plate: 'P' }],
  seals: [{ door: 'D', side: 'down' }, { wall: 28, side: 'right' }],
  braziers: [{ x: 586, y: 694 }],
  solution: ['V', 'G', 'R', 'U', 'C', 'K', 'S', '@1310'],
  stops: [{ x: 420 }],
  torches: [{ x: 120, y: 380 }, { x: 1200, y: 760 }],
  view: { x: 0, y: 140, w: 1390, h: 800 },
};
