import type { LevelDef } from '../../logic/level';
import { COIN, GAS, LAVA, WATER } from '../../logic/particles';
import { CH3, PIN_T, T } from '../common';

type Wall = { ax: number; ay: number; bx: number; by: number; t: number };

/** Floor wall centre lines: the gallery, the middle hall and the treasury (its raised floor is higher). */
const GALLERY = 440;
const HALL = 760;
const TREASURY = 1100;
const RAISED = 1050;
/** The trapdoor shaft under B and the flue over it (inner faces). */
const SX0 = 380;
const SX1 = 440;
/** Pocket A's box under the hall floor (inner faces): its gas rises past the lower bowl. */
const AX0 = 556;
const AX1 = 596;

const walls: Wall[] = [];
/** Adds a wall and returns its index (for `bars`, `cracked` and `seals`). */
const add = (ax: number, ay: number, bx: number, by: number): number => walls.push({ ax, ay, bx, by, t: T }) - 1;

// The gallery: Nib's floor left of the trapdoor, the upper bowl's plinth right of it (too high to climb).
add(212, 292, SX0 - 8, 292); // the gallery's ceiling
add(212, 292, 212, GALLERY);
add(212, GALLERY, SX0 - 8, GALLERY);
add(SX1 + 8, 374, 520, 374); // the plinth: the upper bowl stands at its edge, beside the column
add(520, 292, 520, 374);
  add(488, 292, 520, 292);
// The flue over the trapdoor, turning into a duct that climbs over the hall to the roof vent; W's tank beside it.
add(SX0 - 8, 160, SX0 - 8, 292);
add(SX1 + 8, 216, SX1 + 8, 292);
add(SX0 - 8, 160, 840, 20); // the duct's roof: the gas glows its way up it, out of the gallery
add(SX1 + 8, 216, 840, 98);
add(840, 20, 840, 98);
add(SX1 + 8, 240, 488, 240); // W's tank, right over the flame
  add(488, 240, 488, 292);
// The shaft from the trapdoor down into the middle hall.
add(SX0 - 8, GALLERY, SX0 - 8, 560);
add(SX1 + 8, 358, SX1 + 8, 560); // and a lip at the plinth's edge that keeps W's water up there
// The middle hall: the landing, the crumbling ledge over the lava pit, pocket A, the cracked floor, Nib's waiting floor.
add(332, 560, SX0 - 8, 560);
add(SX1 + 8, 560, 570, 560);
add(684, 560, 820, 560);
add(570, 500, 570, 560); // C's cistern over the lower bowl
add(570, 500, 628, 500);
const K0 = add(628, 440, 628, 560); // K's hopper beside it, over the cracked floor
const K1 = add(684, 440, 684, 560);
add(628, 440, 684, 440);
add(332, 560, 332, HALL);
add(820, 560, 820, HALL);
add(332, HALL, 436, HALL); // the landing
add(436, HALL, 436, 900); // the lava pit under the ledge
add(436, 900, 532, 900);
add(532, 744, 532, 900); // the pit's side, and a small lip that keeps C's water off the ledge
add(AX0 - 8, HALL + 8, AX0 - 8, 910); // pocket A has its own side: lava the falling ledge presses can't get in
add(AX0 - 8, 910, AX1 + 8, 910); // pocket A's floor
add(AX1 + 8, 776, AX1 + 8, TREASURY); // pocket A's far side, and the treasury's left wall
const BAR = add(AX1 + 8, HALL, 677, HALL); // the cracked floor: the lower bowl stands on it
add(681, HALL, 681, 744); // its lip
add(681, HALL, 980, HALL); // Nib's waiting floor, and the treasury's ceiling
// The treasury: the lava pool under the cracked floor, the raised floor to the chest, K's hopper and the vat T.
add(AX1 + 8, TREASURY, 800, TREASURY);
add(800, TREASURY, 800, RAISED);
add(800, RAISED, 980, RAISED);
add(816, RAISED, 816, RAISED - 30); // a lip: the vat's lava stays on the raised floor
add(980, HALL, 980, RAISED);
const T0 = add(824, HALL, 824, 890); // the vat over the raised floor
const T1 = add(904, HALL, 904, 890);

/**
 * Chapter 3, level 9 (Level 29): Lamp in the Tomb. Lights out: the only
 * light is the two fire bowls, the lava and Nib's lamp, and tomb gas glows a
 * faint green. Three floors.
 * 1. The gallery (top): Nib waits by the trapdoor B, lit by the upper bowl
 *    on its plinth beside the trapdoor's flue. B is the lid of the gas in
 *    the shaft below and Nib's way down. W's tank douses that bowl first and
 *    the gallery goes dark; then B's gas rises past the dead bowl, up the
 *    flue and out of its vent, glowing as it goes. B with the bowl lit: the
 *    column lights beside Nib ('blasted'). Nib standing on the trapdoor when
 *    B goes drops in with the gas ('gassed').
 * 2. The middle hall: Nib lands and crosses a crumbling ledge over a lava
 *    pit; it falls behind him. Pocket A sits under the hall floor right after
 *    it, and the lower bowl stands on the cracked floor beside A's mouth. A
 *    sends the gas up past that bowl: the blast breaks the cracked floor into
 *    the treasury. A while Nib is still on the ledge: the blast catches him
 *    ('blasted'); A before he crosses: the blast knocks the ledge into the
 *    lava, and he walks into the pit ('burnt').
 * 3. The treasury: its lava is its light. C's cistern hangs over the lower
 *    bowl. After the blast its water falls through the hole and sets the
 *    pool; before it, the water puts the bowl out and lies on the cracked
 *    floor, and A's gas never lights ('sealed'). No water, and Nib drops into
 *    the lava ('burnt'). K's hopper drops the gold onto the stone; before C,
 *    into hot lava ('melted').
 * The trap: T, the lava vat (60 grains) that "lights the treasury", pours its
 *    lava over the raised floor between the gold and the chest: Nib walks into
 *    it ('burnt') wherever it is pulled before K, and the gold melts ('melted')
 *    when it is pulled after K. B's pit holds 150 gas grains: the dense gas
 *    takes ~6 s to clear the flue, so Nib waits in the gallery before he drops.
 * Winning order: W, B, walk down and across the ledge, A, C, K, walk.
 */
export const LAMP_IN_THE_TOMB: LevelDef = {
  id: 'lamp-in-the-tomb',
  chapter: CH3,
  ruin: 'tomb',
  name: 'Lamp in the Tomb',
  goal: 'Find your way down to the treasury, take the chest and pick up 24 coins',
  tip: 'Lights out! Only fire and lava give light, and tomb gas glows faintly: watch where it goes.',
  dark: true,
  rooms: [
    [[220, 300], [512, 300], [512, 366], [SX1, 366], [SX1, 432], [220, 432]], // the gallery and the plinth
    [[SX0, 300], [SX0, 166], [832, 30], [832, 92], [SX1, 210], [SX1, 300]], // the flue and the duct
    [[456, 248], [480, 248], [480, 300], [456, 300]], // W's tank
    [[SX0, 432], [SX1, 432], [SX1, 568], [SX0, 568]], // the trapdoor shaft
    [[340, 568], [812, 568], [812, 752], [340, 752]], // the middle hall
    [[578, 508], [620, 508], [620, 568], [578, 568]], // C's cistern
    [[636, 448], [676, 448], [676, 568], [636, 568]], // K's hopper
    [[444, 752], [524, 752], [524, 892], [444, 892]], // the lava pit under the ledge
    [[AX0, 752], [AX1, 752], [AX1, 902], [AX0, 902]], // pocket A
    [[612, 768], [972, 768], [972, 1042], [808, 1042], [808, 1092], [612, 1092]], // the treasury
  ],
  walls,
  bars: [BAR, K0, K1, T0, T1],
  cracked: [BAR],
  pins: [
    { id: 'B', ax: SX0 - 14, ay: GALLERY, bx: SX1 + 12, by: GALLERY, t: PIN_T }, // the trapdoor: the lid of the shaft's gas
    { id: 'W', ax: 496, ay: 296, bx: 444, by: 296, t: PIN_T }, // W's tank floor, over the upper bowl
    { id: 'A', ax: 544, ay: HALL, bx: AX1 + 12, by: HALL, t: PIN_T }, // pocket A's lid, in the hall floor
    { id: 'C', ax: 562, ay: 564, bx: 632, by: 564, t: PIN_T }, // C's cistern floor, over the lower bowl
    { id: 'K', ax: 692, ay: 564, bx: 624, by: 564, t: PIN_T }, // K's hopper floor, over the cracked floor
    { id: 'T', ax: 912, ay: 896, bx: 820, by: 896, t: PIN_T }, // the trap: the vat's floor, over the raised floor
  ],
  drains: [{ x0: 808, x1: 832, y0: 28, y1: 92 }], // the roof vent at the duct's top end
  fills: [
    { kind: GAS, x0: SX0, x1: SX1, y1: GALLERY + 7, count: 150 }, // under the trapdoor
    { kind: GAS, x0: AX0, x1: AX1, y1: HALL + 7, count: 45 }, // pocket A
    { kind: WATER, x0: 456, x1: 480, y1: 288, count: 6 }, // W: douses the upper bowl
    { kind: WATER, x0: 578, x1: 620, y1: 556, count: 20 }, // C: sets the pool
    { kind: LAVA, x0: 444, x1: 524, y1: 892, count: 36 }, // the pit under the ledge
    { kind: LAVA, x0: 612, x1: 792, y1: TREASURY - 8, count: 80 }, // the treasury's pool
    { kind: LAVA, x0: 832, x1: 896, y1: 889, count: 60 }, // the trap's vat
    { kind: COIN, x0: 636, x1: 676, y1: 556, count: 30 }, // K's gold
  ],
  nib: { x: 340, y: GALLERY - 32 },
  blots: [],
  ledges: [{ x0: 445, x1: 523, y: HALL - 8 }],
  seals: [{ wall: BAR, side: 'down' }],
  braziers: [{ x: 450, y: 366 }, { x: 610, y: HALL - 8 }],
  chest: { x: 940, y: RAISED - 32 },
  coinsNeeded: 24,
  solution: ['W', 'B', '@410', '@750', 'A', 'C', 'K', '@620~0.5', '@960'],
  stops: [],
  torches: [],
  view: { x: 170, y: 0, w: 860, h: 1180 },
};
