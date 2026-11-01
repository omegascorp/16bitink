import type { LevelDef } from '../../logic/level';
import { COIN, GAS, LAVA, WATER } from '../../logic/particles';
import { CH3, PIN_T, T } from '../common';

/** Floors: the coffin's (its walls stand at y 868), the nook's, the vault's chest floor and the frog's dip. */
const FLOOR = 860;
const NOOK = 730;
const VAULT = 812;
/** The stone lid over the toad (centred on it, so it stomps it), and the toad. */
const LID = { x0: 912, x1: 1048, y: 660 };
const TOAD_X = 980;

/**
 * Chapter 3, level 10 (Level 30), the boss: the Tomb Guardian. An old toad
 * sits in its painted coffin and breathes tomb gas at Nib on a beat, but only
 * while he's in sight; its throat swells for the second before each breath.
 * The breath leans toward Nib and pools under the stone lid and the bowl's
 * cover F, on his side. Four stages on 1300 x 460: Nib's antechamber over the
 * lava moat, the nook, the coffin hall, and the vault with its frog.
 * 1. The moat: M's tank sets the lava into a bridge, C drops the gold onto
 *    it, and S, Nib's floor, lets him down onto it.
 * 2. The breath: Nib walks over into the nook, in the toad's sight. With the
 *    cover F out, the next breath rises past the fire bowl and lights; the
 *    blast cracks the lid and breaks the cracked lip between the nook and the
 *    coffin. The lid falls on the toad ('stomped') and lands on the sun plate.
 * 3. The flood: W's tank falls into the open coffin; the lid and the water
 *    together weigh the sun plate and the sun door to the vault rises. The
 *    overflow runs over the sill into the frog's dip.
 * 4. The frog: U vents the frog's dome and it drops into the full dip and
 *    washes. Nib drops into the coffin, swims out through the door and takes
 *    the chest.
 * Losses: S before M, 'burnt'; C before M, 'melted'. F left in: one breath
 * fits under the lid, the second overfills it and spills under the lip into
 * the nook's low roof, onto Nib ('gassed'). W before the blast (wash the
 * toad): it douses the bowl and lies on the lid; the lid never falls
 * ('gassed' or 'sealed'). U before W: the frog drops into the dry dip, hops
 * out onto the chest floor and inks Nib when he comes ('inked').
 * Winning order: M, C, S, F, walk into the nook, W, U, walk.
 */
export const TOMB_GUARDIAN: LevelDef = {
  id: 'tomb-guardian',
  chapter: CH3,
  ruin: 'tomb',
  name: 'The Tomb Guardian',
  goal: 'Beat the Tomb Guardian and the rain frog, take the chest and pick up 26 coins',
  tip: 'The toad breathes only while Nib is in sight: watch its throat swell. Light the breath under the lid, and the lid falls.',
  rooms: [
    [[100, 460], [720, 460], [720, 780], [100, 780]], // the antechamber over the moat
    [[720, 656], [860, 656], [860, 738], [720, 738]], // the nook
    [[860, 440], [1058, 440], [1058, 868], [900, 868], [900, 738], [860, 738]], // the coffin hall
    [[1058, 640], [1360, 640], [1360, 820], [1176, 820], [1176, 840], [1058, 840]], // the vault and the frog's dip
    [[1100, 596], [1140, 596], [1140, 640], [1100, 640]], // the frog dome's vent
  ],
  walls: [
    { ax: 100, ay: 460, bx: 720, by: 460, t: T }, // 0 the antechamber's roof
    { ax: 100, ay: 460, bx: 100, by: 780, t: T }, // 1
    { ax: 100, ay: 780, bx: 720, by: 780, t: T }, // 2 the moat's floor
    { ax: 720, ay: 738, bx: 720, by: 780, t: T }, // 3
    { ax: 720, ay: 460, bx: 720, by: 656, t: T }, // 4
    { ax: 720, ay: 656, bx: 816, by: 656, t: T }, // 5 the nook's low roof
    { ax: 720, ay: 738, bx: 900, by: 738, t: T }, // 6 the nook's floor
    { ax: 900, ay: 738, bx: 900, by: 868, t: T }, // 7 the coffin
    { ax: 900, ay: 868, bx: 1058, by: 868, t: T }, // 8 the coffin's floor: the eye plate
    { ax: 846, ay: 448, bx: 846, by: 668, t: 22 }, // 9 the thick cracked lip between the nook and the coffin (Nib stays 76 px from the gas behind it)
    { ax: 860, ay: 440, bx: 1058, by: 440, t: T }, // 10 the hall's roof
    { ax: 1058, ay: 440, bx: 1058, by: 712, t: T }, // 11 the coffin's far side, over the eye door
    { ax: 1058, ay: 790, bx: 1058, by: 868, t: T }, // 12 the sill under it
    { ax: 868, ay: 646, bx: 878, by: 646, t: T }, // 13 the fire bowl's shelf, its tip under the flame
    { ax: 876, ay: 440, bx: 876, by: 548, t: T }, // 14 W's tank
    { ax: 1042, ay: 440, bx: 1042, by: 548, t: T }, // 15
    { ax: 380, ay: 520, bx: 380, by: 600, t: T }, // 16 M's tank
    { ax: 470, ay: 520, bx: 470, by: 600, t: T }, // 17
    { ax: 580, ay: 540, bx: 580, by: 610, t: T }, // 18 C's hopper
    { ax: 640, ay: 540, bx: 640, by: 610, t: T }, // 19
    { ax: 1058, ay: 840, bx: 1176, by: 840, t: T }, // 20 the frog's dip
    { ax: 1176, ay: 820, bx: 1176, by: 840, t: T }, // 21 its 20-px rim: a frog climbs out
    { ax: 1176, ay: 820, bx: 1360, by: 820, t: T }, // 22 the chest floor
    { ax: 1360, ay: 640, bx: 1360, by: 820, t: T }, // 23
    { ax: 1058, ay: 640, bx: 1100, by: 640, t: T }, // 24 the vault's roof and the frog dome
    { ax: 1140, ay: 640, bx: 1360, by: 640, t: T }, // 25
    { ax: 1100, ay: 596, bx: 1100, by: 640, t: T }, // 26 the vent
    { ax: 1140, ay: 596, bx: 1140, by: 640, t: T }, // 27
    { ax: 1100, ay: 596, bx: 1140, by: 596, t: T }, // 28
    { ax: 1184, ay: 640, bx: 1184, by: 700, t: T }, // 29 the frog dome's lip
    { ax: 312, ay: 560, bx: 312, by: 634, t: T }, // 30 the post at the end of Nib's floor
  ],
  bars: [9, 13, 14, 15, 16, 17, 18, 19, 29, 30],
  cracked: [9],
  pins: [
    { id: 'S', ax: 300, ay: 640, bx: 106, by: 640, t: PIN_T }, // Nib's floor over the moat
    { id: 'M', ax: 372, ay: 608, bx: 478, by: 608, t: PIN_T }, // M's tank floor
    { id: 'C', ax: 648, ay: 618, bx: 572, by: 618, t: PIN_T }, // C's hopper floor
    { id: 'F', ax: 862, ay: 668, bx: 914, by: 668, t: PIN_T }, // the bowl's cover, flush with the lid
    { id: 'W', ax: 1050, ay: 556, bx: 868, by: 556, t: PIN_T }, // W's tank floor
    { id: 'U', ax: 1156, ay: 632, bx: 1092, by: 632, t: PIN_T }, // the frog dome's vent
  ],
  fills: [
    { kind: LAVA, x0: 108, x1: 712, y1: 772, count: 180 },
    { kind: WATER, x0: 388, x1: 462, y1: 600, count: 30 },
    { kind: COIN, x0: 588, x1: 632, y1: 610, count: 18 },
    { kind: WATER, x0: 884, x1: 1034, y1: 548, count: 105 },
    { kind: GAS, x0: 1066, x1: 1176, y1: 648, count: 40 },
    { kind: COIN, x0: 1196, x1: 1280, y1: VAULT, count: 12 },
  ],
  nib: { x: 200, y: 640 - PIN_T - 24 },
  blots: [
    { x: TOAD_X, y: FLOOR - 40, animal: 'toad', boss: true },
    { x: 1150, y: 676, animal: 'frog' },
  ],
  ledges: [LID],
  breath: { every: 5, count: 24, max: 48 },
  braziers: [{ x: 884, y: 638 }],
  plates: [{ id: 'E', x0: 990, x1: 1048, y: FLOOR, need: 44 }],
  doors: [{ id: 'D', ax: 1058, ay: 720, bx: 1058, by: 786, t: T, plate: 'E' }],
  seals: [{ wall: 9, side: 'right' }, { door: 'D', side: 'right' }],
  drains: [{ x0: 1110, x1: 1130, y0: 604, y1: 624 }],
  clear: true,
  chest: { x: 1320, y: VAULT - 24 },
  coinsNeeded: 26,
  solution: ['M', 'C', 'F', 'S', '@800', 'W~5', 'U', '@1320'],
  walkHeights: [706, 788],
  stops: [],
  torches: [{ x: 160, y: 520 }, { x: 1320, y: 700 }],
  view: { x: 80, y: 440, w: 1300, h: 460 },
};
