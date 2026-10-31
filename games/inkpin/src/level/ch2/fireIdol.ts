import type { LevelDef } from '../../logic/level';
import { COIN, LAVA, WATER } from '../../logic/particles';
import { CH2, PIN_T, T } from '../common';

/** The stage floors, top to bottom: Nib's start, the two steps down the idol's face, the hall. */
const Y1 = 660;
const Y2 = 840;
const Y3 = 1020;
const YB = 1200;
/** The crown, the idol's cistern: a tall tank over the bath, and the brow, a low pipe from it to the gate over the first mouth. */
const CROWN_X0 = 470;
const CROWN_X1 = 1120;
const CROWN_Y = 520;
const BROW_TOP = 490;
/** The gate's opening at the brow's end, over the throat of the first mouth. */
const GATE_X1 = 520;
/** The tank and the flood shaft under it, straight down into the Old Salamander's bath. */
const SHAFT_X0 = 920;
const SHAFT_X1 = CROWN_X1;
/** The bath: its floor, its far wall, and the ledge past it (under the shaft too), a little higher. */
const BATH_Y = 1300;
const BATH_X1 = 1040;
const RIM_Y = 1270;
/** The low tunnel from the ledge past the far rim to the chest: Nib fits under its roof, the Old Salamander doesn't. */
const TUNNEL_X1 = 1320;
const TUNNEL_TOP = RIM_Y - 90;

/** The three mouths: each cup's walls, the top of its back wall, and its lip (the front wall's top, where the overflow spills). */
const M1 = { x0: 470, x1: 578, top: Y1 - 100, lip: Y1 - 55 };
const M2 = { x0: 590, x1: 698, top: Y2 - 100, lip: Y2 - 55 };
const M3 = { x0: 710, x1: 818, top: Y3 - 100, lip: Y3 - 55 };
type Mouth = typeof M1;
/** A mouth's dam: the water fills the mouth's throat behind it before it spills onto the lava, so a stray drop never cools a mouth. */
const DAM = 48;
/** A mouth's back and front walls, its dam, and the spout from its lip to the next one down. */
const mouth = (m: Mouth, y: number) => [
  { ax: m.x0, ay: m.top, bx: m.x0, by: y, t: T },
  { ax: m.x0 + DAM, ay: y - 36, bx: m.x0 + DAM, by: y, t: T },
  { ax: m.x1, ay: m.lip, bx: m.x1, by: y, t: T },
  { ax: m.x1, ay: m.lip, bx: m.x1 + 44, by: m.lip + 8, t: T },
];

/**
 * Level 10, the boss: meter it, save it. The Old Salamander bathes in the
 * Fire Idol's lava bowl, right under the crown, the idol's cistern and the
 * only water in the shrine. Nib starts in the idol's head and climbs down its
 * face jaw by jaw: each jaw (J1, J2, J3) is both his step and the floor of one
 * of the idol's three mouths, cups of lava beside him. The crown's gate (A)
 * lets its water down the brow into the first mouth; each mouth fills its
 * throat, spills over its dam onto the lava (steam: it sets to stone), fills
 * to its lip and spills into the next one down, and the last one spills away
 * down the sump. The crown's floor (F) drops the rest on the boss all at once.
 * 1. The gate: let it run until the third mouth steams (about 5 s), then tap
 *    it again. Too soon, and a mouth further down is still hot: the second
 *    pours its lava on the idol's gold when its jaw opens, the third on Nib's
 *    way to the bath. Never, or far too late (11 s), and the crown runs dry
 *    down the sump: there's no flood left, and the boss is waiting.
 * 2. The flood (F), the big tank right over the boss, the tempting pull. Only
 *    a flood all at once washes the Old Salamander (it shrugs off a trickle
 *    and dries as it goes), and the bath's lava sets to stone under the water.
 *    Pull it first and the boss is gone, but so is the crown: the gate has
 *    nothing left for the mouths, and the first jaw drops Nib beside a
 *    mouthful of lava.
 * 3. The jaws, Nib's way down: each one drops Nib a step and opens a mouth
 *    next to him. Cooled, the mouth's stone (and the water on it) stays put;
 *    hot, its lava comes down with him: on him (J1), on the gold he lands by
 *    (J2), on the hall floor he walks to the bath (J3). The gold lies on the
 *    last jaw, so pulling that one early drops it with the third mouth's
 *    lava, and it melts.
 * 4. The bath and the chest: once the last jaw is out, Nib walks into the
 *    bath, swims it if it's flooded, and goes on through a tunnel too low for
 *    the boss to the chest. Before the flood the bath is still hot lava.
 * Winning order: A, A again once the third mouth steams, then F and the jaws
 * in any order, with F before the last jaw (the hint: A, A~7, F, J1, J2, J3).
 */
export const FIRE_IDOL: LevelDef = {
  id: 'fire-idol',
  chapter: CH2,
  ruin: 'volcano',
  name: 'The Fire Idol',
  goal: 'Wash away the Old Salamander and take the idol',
  tip: 'Shut the gate once the third mouth steams. Save the rest: the Old Salamander needs the flood all at once.',
  rooms: [
    // The crown: the idol's cistern, the only water in the shrine.
    [[CROWN_X0, BROW_TOP], [SHAFT_X0, BROW_TOP], [SHAFT_X0, 330], [CROWN_X1, 330], [CROWN_X1, CROWN_Y], [CROWN_X0, CROWN_Y]],
    // The idol's face with its stair of jaws, the flood shaft, and the hall with the bath.
    [
      [300, 560], [CROWN_X0, 560], [CROWN_X0, CROWN_Y], [SHAFT_X1, CROWN_Y], [SHAFT_X1, TUNNEL_TOP], [TUNNEL_X1, TUNNEL_TOP], [TUNNEL_X1, 960], [1500, 960], [1500, RIM_Y], [BATH_X1, RIM_Y], [BATH_X1, BATH_Y], [SHAFT_X0, BATH_Y],
      [SHAFT_X0, YB], [300, YB],
    ],
  ],
  walls: [
    { ax: SHAFT_X0, ay: 330, bx: CROWN_X1, by: 330, t: T }, // 0 the tank's ceiling
    { ax: SHAFT_X0, ay: 330, bx: SHAFT_X0, by: BROW_TOP, t: T }, // 1 its left wall, over the brow
    { ax: CROWN_X1, ay: 330, bx: CROWN_X1, by: TUNNEL_TOP, t: T }, // 2 its right wall, down the shaft to the tunnel
    { ax: GATE_X1, ay: CROWN_Y + 8, bx: SHAFT_X0, by: CROWN_Y + 8, t: T }, // 3 the brow's floor, from the gate to the flood pin
    { ax: CROWN_X0, ay: BROW_TOP, bx: SHAFT_X0, by: BROW_TOP, t: T }, // 4 the brow's roof
    { ax: 300, ay: 560, bx: CROWN_X0, by: 560, t: T }, // 5 the ceiling over Nib's start
    { ax: CROWN_X0, ay: BROW_TOP, bx: CROWN_X0, by: 560, t: T }, // 6 the brow's end
    { ax: 300, ay: 560, bx: 300, by: YB, t: T }, // 7 the face's left wall
    // The mouths, each a cup of lava on its jaw, with a dam and a spout from its lip to the next.
    ...mouth(M1, Y1), // 8-11
    ...mouth(M2, Y2), // 12-15
    ...mouth(M3, Y3), // 16-19
    // The sump under the last spout: the overflow runs away down its drain.
    { ax: 850, ay: M3.lip + 40, bx: 850, by: 1080, t: T }, // 20
    { ax: 850, ay: 1080, bx: SHAFT_X0, by: 1080, t: T }, // 21
    // The steps' solid floors (each jaw is the rest of its floor).
    { ax: 300, ay: Y2, bx: M1.x0, by: Y2, t: T }, // 22
    { ax: 300, ay: Y3, bx: M2.x0, by: Y3, t: T }, // 23
    // The flood shaft.
    { ax: SHAFT_X0, ay: CROWN_Y + 8, bx: SHAFT_X0, by: 1100, t: T }, // 24
    // The hall floor, the bath, the ledge past it and the tunnel to the chest.
    { ax: 300, ay: YB, bx: SHAFT_X0, by: YB, t: T }, // 25
    { ax: SHAFT_X0, ay: YB, bx: SHAFT_X0, by: BATH_Y, t: T }, // 26
    { ax: SHAFT_X0, ay: BATH_Y, bx: BATH_X1, by: BATH_Y, t: T }, // 27
    { ax: BATH_X1, ay: BATH_Y, bx: BATH_X1, by: RIM_Y, t: T }, // 28
    { ax: BATH_X1, ay: RIM_Y, bx: 1500, by: RIM_Y, t: T }, // 29 the ledge, the tunnel's floor and the chest's
    { ax: SHAFT_X1, ay: TUNNEL_TOP, bx: TUNNEL_X1, by: TUNNEL_TOP, t: T }, // 30 the tunnel's roof: Nib fits under it, the boss doesn't
    { ax: TUNNEL_X1, ay: 960, bx: TUNNEL_X1, by: TUNNEL_TOP, t: T }, // 31
    { ax: TUNNEL_X1, ay: 960, bx: 1500, by: 960, t: T }, // 32 the shrine's ceiling
    { ax: 1500, ay: 960, bx: 1500, by: RIM_Y, t: T }, // 33
  ],
  bars: [3, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24],
  pins: [
    { id: 'A', ax: CROWN_X0 - 8, ay: CROWN_Y + 8, bx: GATE_X1 + 8, by: CROWN_Y + 8, t: PIN_T, gate: true },
    { id: 'F', ax: CROWN_X1 + 8, ay: CROWN_Y + 8, bx: SHAFT_X0 - 8, by: CROWN_Y + 8, t: PIN_T },
    { id: 'J1', ax: 292, ay: Y1 + 8, bx: M1.x1 + 8, by: Y1 + 8, t: PIN_T },
    { id: 'J2', ax: M1.x0 - 8, ay: Y2 + 8, bx: M2.x1 + 8, by: Y2 + 8, t: PIN_T },
    { id: 'J3', ax: M2.x0 - 8, ay: Y3 + 8, bx: M3.x1 + 8, by: Y3 + 8, t: PIN_T },
  ],
  fills: [
    { kind: WATER, x0: SHAFT_X0 + 10, x1: CROWN_X1 - 10, y1: CROWN_Y, count: 240 },
    { kind: WATER, x0: CROWN_X0 + 10, x1: SHAFT_X0 - 10, y1: CROWN_Y, count: 70 },
    { kind: LAVA, x0: M1.x0 + DAM + 8, x1: M1.x1 - 8, y1: Y1, count: 12 },
    { kind: LAVA, x0: M2.x0 + DAM + 8, x1: M2.x1 - 8, y1: Y2, count: 12 },
    { kind: LAVA, x0: M3.x0 + DAM + 8, x1: M3.x1 - 8, y1: Y3, count: 12 },
    { kind: LAVA, x0: SHAFT_X0 + 8, x1: BATH_X1 - 8, y1: BATH_Y - 8, count: 20 },
    { kind: COIN, x0: M2.x0 + 4, x1: M3.x0 - 8, y1: Y3, count: 40 },
  ],
  drains: [{ x0: 858, x1: SHAFT_X0 - 8, y0: 1040, y1: 1160 }],
  nib: { x: 380, y: Y1 - 24 },
  blots: [{ x: 980, y: BATH_Y - 48, boss: true, animal: 'salamander' }],
  chest: { x: 1440, y: RIM_Y },
  coinsNeeded: 36,
  solution: ['A', 'A~7', 'F', 'J1', 'J2', 'J3'],
  stops: [{ x: 420 }, { x: 520 }, { x: 640 }, { x: 760 }, { x: 1440 }],
  torches: [
    { x: 340, y: 620 },
    { x: 340, y: 1140 },
    { x: 1300, y: 1080 },
    { x: 1460, y: 1040 },
  ],
  view: { x: 240, y: 290, w: 1320, h: 1100 },
};
