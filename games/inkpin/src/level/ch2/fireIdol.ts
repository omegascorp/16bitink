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
const BATH_X1 = SHAFT_X1;
const RIM_Y = 1270;
/** The low tunnel from the ledge past the far rim to the chest: Nib fits under its roof, the Old Salamander doesn't. */
const TUNNEL_X1 = 1320;
/** The tunnel's roof ends short of the vault's first step, so Nib has headroom to climb it. */
const ROOF_X1 = 1250;
const TUNNEL_TOP = RIM_Y - 90;
/** The throat: the flood shaft's pin (K) holds the flood here, and the overflow runs out of the pipe in its side. */
const THROAT_Y = 735;
const PIPE = { y0: 637, y1: 683, drop: 900, roofDrop: 888 };
/** The chute from the pipe down into the vault, right over the moat. */
const CHUTE = { x0: 1384, x1: 1428 };
/** The vault, two steps up from the tunnel (out of the pit's reach): its ceiling, its floor and the lava moat in it. */
const VAULT_TOP = 980;
const STEP_Y = RIM_Y - 44;
const VAULT_Y = RIM_Y - 88;
const MOAT = { x0: 1370, x1: 1468, y: VAULT_Y + 30 };
const VAULT_X1 = 1540;
/** The grate at the foot of the vault's steps: what runs down them, or up the tunnel from the pit, goes down its drain. */
const GRATE = { x0: 1256, x1: 1300, y: RIM_Y + 40 };

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
 * Fire Idol's lava bowl, under the crown, the idol's cistern and the only
 * water in the shrine. Nib starts in the idol's head and climbs down its face
 * jaw by jaw: each jaw (J1, J2, J3) is both his step and the floor of one of
 * the idol's three mouths, cups of lava beside him. One crown, three jobs: the
 * mouths, the vault's moat, and the boss.
 * 1. The gate (A) lets the crown down the brow into the first mouth; each mouth
 *    fills its throat, spills over its dam onto the lava (steam: stone), fills
 *    to its lip and spills into the next, and the last spills down the sump.
 *    Tap it again once the third mouth steams (5-12 s). Too soon and a mouth
 *    is still hot: the second pours its lava on the gold on the third jaw.
 *    Never, or far too late (16 s), and the crown runs low down the sump.
 * 2. The flood (F), the tank right over the boss, the tempting pull, drops the
 *    crown into the throat, where the throat pin (K) holds it. Filled past the
 *    pipe in its side, the throat spills down a chute into the vault and sets
 *    its lava moat to stone. A crown run low never reaches the pipe.
 * 3. K drops the throat's water on the boss at once (it shrugs off a trickle,
 *    and only a column washes it), and the bath sets to stone. K before F
 *    looks the same from the boss's end (it's washed), but the flood falls
 *    straight past the pipe and the moat stays hot: Nib walks into it at the
 *    very end. K after the last jaw: Nib drops into the pit with the boss.
 * 4. The jaws: each drops Nib a step and opens a mouth next to him. Cooled, the
 *    mouth's stone stays put; hot, its lava comes down: on him (J1), on the
 *    gold on the jaw below (J2), on the gold in the hall below (J3).
 * 5. The pit has no way out for the boss; Nib drops in, swims or walks the
 *    bath, and goes on through a tunnel too low for the boss, up two steps to
 *    the vault, over the moat to the chest. A grate at the steps' foot drains
 *    what runs down them. Every coin is needed: the hall's, the jaw's, the vault's.
 * Wrong orders: F first or J1 first (burnt), the gate back too soon (melted),
 * never or far too late (burnt in the moat), K before F (burnt in the moat),
 * J2 or J3 before the gate (melted), K after J3 (inked).
 * Winning order: A, A again once the third mouth steams, F, then K, and the
 * jaws, with K before the last jaw (the hint: A, A~7, F, K, J1, J2, J3).
 */
export const FIRE_IDOL: LevelDef = {
  id: 'fire-idol',
  chapter: CH2,
  ruin: 'volcano',
  name: 'The Fire Idol',
  goal: 'Wash away the Old Salamander and take the idol',
  tip: 'Shut the gate once the third mouth steams. Fill the throat before you open it: the vault needs its spill, the Old Salamander the rest at once.',
  rooms: [
    // The crown: the idol's cistern, the only water in the shrine.
    [[CROWN_X0, BROW_TOP], [SHAFT_X0, BROW_TOP], [SHAFT_X0, 330], [CROWN_X1, 330], [CROWN_X1, CROWN_Y], [CROWN_X0, CROWN_Y]],
    // The idol's face with its stair of jaws, the flood shaft, and the hall with the bath.
    [
      [300, 560], [CROWN_X0, 560], [CROWN_X0, CROWN_Y], [SHAFT_X1, CROWN_Y], [SHAFT_X1, TUNNEL_TOP], [ROOF_X1, TUNNEL_TOP], [ROOF_X1, RIM_Y], [BATH_X1, RIM_Y], [BATH_X1, BATH_Y], [SHAFT_X0, BATH_Y],
      [SHAFT_X0, YB], [300, YB],
    ],
    // The pipe from the throat, and its chute down into the vault.
    [[SHAFT_X1, PIPE.y0], [CHUTE.x1, PIPE.roofDrop], [CHUTE.x1, VAULT_TOP], [CHUTE.x0, VAULT_TOP], [CHUTE.x0, PIPE.drop], [SHAFT_X1, PIPE.y1]],
    // The vault: two steps up from the tunnel, the moat, and the chest.
    [
      [ROOF_X1, VAULT_TOP], [VAULT_X1, VAULT_TOP], [VAULT_X1, VAULT_Y], [MOAT.x1, VAULT_Y], [MOAT.x1, MOAT.y], [MOAT.x0, MOAT.y], [MOAT.x0, VAULT_Y],
      [TUNNEL_X1 + 40, VAULT_Y], [TUNNEL_X1 + 40, STEP_Y], [TUNNEL_X1, STEP_Y], [TUNNEL_X1, RIM_Y],
      [GRATE.x1, RIM_Y], [GRATE.x1, GRATE.y], [GRATE.x0, GRATE.y], [GRATE.x0, RIM_Y], [ROOF_X1, RIM_Y],
    ],
  ],
  walls: [
    { ax: SHAFT_X0, ay: 330, bx: CROWN_X1, by: 330, t: T }, // 0 the tank's ceiling
    { ax: SHAFT_X0, ay: 330, bx: SHAFT_X0, by: BROW_TOP, t: T }, // 1 its left wall, over the brow
    { ax: CROWN_X1, ay: 330, bx: CROWN_X1, by: PIPE.y0, t: T }, // 2 its right wall, down the shaft to the pipe
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
    { ax: SHAFT_X0, ay: YB, bx: SHAFT_X0, by: BATH_Y, t: T }, // 26 the pit's near wall: Nib drops in, the Old Salamander can't climb out
    { ax: SHAFT_X0, ay: BATH_Y, bx: BATH_X1, by: BATH_Y, t: T }, // 27
    { ax: BATH_X1, ay: BATH_Y, bx: BATH_X1, by: RIM_Y, t: T }, // 28
    { ax: BATH_X1, ay: RIM_Y, bx: GRATE.x0, by: RIM_Y, t: T }, // 29 the ledge and the tunnel's floor
    { ax: SHAFT_X1, ay: TUNNEL_TOP, bx: ROOF_X1, by: TUNNEL_TOP, t: T }, // 30 the tunnel's roof: Nib fits under it, the boss doesn't
    { ax: ROOF_X1, ay: VAULT_TOP, bx: ROOF_X1, by: TUNNEL_TOP, t: T }, // 31 the vault's left wall
    { ax: ROOF_X1, ay: VAULT_TOP, bx: CHUTE.x0, by: VAULT_TOP, t: T }, // 32 the vault's ceiling
    { ax: VAULT_X1, ay: VAULT_TOP, bx: VAULT_X1, by: VAULT_Y, t: T }, // 33
    // The pipe out of the throat's side (its mouth sits above the pin, so only an overflow goes in) and the chute to the vault.
    { ax: CROWN_X1, ay: PIPE.y1, bx: CROWN_X1, by: TUNNEL_TOP, t: T }, // 40 the shaft's right wall, below the pipe
    { ax: CROWN_X1, ay: PIPE.y1, bx: CHUTE.x0, by: PIPE.drop, t: T }, // 41 the pipe's floor
    { ax: CROWN_X1, ay: PIPE.y0, bx: CHUTE.x1, by: PIPE.roofDrop, t: T }, // 42 its roof
    { ax: CHUTE.x0, ay: PIPE.drop, bx: CHUTE.x0, by: VAULT_TOP, t: T }, // 43 the chute
    { ax: CHUTE.x1, ay: PIPE.roofDrop, bx: CHUTE.x1, by: VAULT_TOP, t: T }, // 44
    { ax: CHUTE.x1, ay: VAULT_TOP, bx: VAULT_X1, by: VAULT_TOP, t: T }, // 45 the vault's ceiling past the chute
    // The vault's two steps up from the tunnel, its floor and the moat.
    { ax: GRATE.x0, ay: RIM_Y, bx: GRATE.x0, by: GRATE.y, t: T }, // the grate
    { ax: GRATE.x0, ay: GRATE.y, bx: GRATE.x1, by: GRATE.y, t: T },
    { ax: GRATE.x1, ay: GRATE.y, bx: GRATE.x1, by: RIM_Y, t: T },
    { ax: GRATE.x1, ay: RIM_Y, bx: TUNNEL_X1, by: RIM_Y, t: T },
    { ax: TUNNEL_X1, ay: RIM_Y, bx: TUNNEL_X1, by: STEP_Y, t: T }, // 46
    { ax: TUNNEL_X1, ay: STEP_Y, bx: TUNNEL_X1 + 40, by: STEP_Y, t: T }, // 47
    { ax: TUNNEL_X1 + 40, ay: STEP_Y, bx: TUNNEL_X1 + 40, by: VAULT_Y, t: T }, // 48
    { ax: TUNNEL_X1 + 40, ay: VAULT_Y, bx: MOAT.x0, by: VAULT_Y, t: T }, // 49
    { ax: MOAT.x0, ay: VAULT_Y, bx: MOAT.x0, by: MOAT.y, t: T }, // 50
    { ax: MOAT.x0, ay: MOAT.y, bx: MOAT.x1, by: MOAT.y, t: T }, // 51
    { ax: MOAT.x1, ay: MOAT.y, bx: MOAT.x1, by: VAULT_Y, t: T }, // 52
    { ax: MOAT.x1, ay: VAULT_Y, bx: VAULT_X1, by: VAULT_Y, t: T }, // 53
  ],
  bars: [3, 41, 42, 43, 44, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24],
  pins: [
    { id: 'A', ax: CROWN_X0 - 8, ay: CROWN_Y + 8, bx: GATE_X1 + 8, by: CROWN_Y + 8, t: PIN_T, gate: true },
    { id: 'F', ax: CROWN_X1 + 8, ay: CROWN_Y + 8, bx: SHAFT_X0 - 8, by: CROWN_Y + 8, t: PIN_T },
    { id: 'K', ax: SHAFT_X0 - 8, ay: THROAT_Y, bx: CROWN_X1 + 8, by: THROAT_Y, t: PIN_T },
    { id: 'J1', ax: 292, ay: Y1 + 8, bx: M1.x1 + 8, by: Y1 + 8, t: PIN_T },
    { id: 'J2', ax: M1.x0 - 8, ay: Y2 + 8, bx: M2.x1 + 8, by: Y2 + 8, t: PIN_T },
    { id: 'J3', ax: M2.x0 - 8, ay: Y3 + 8, bx: M3.x1 + 8, by: Y3 + 8, t: PIN_T },
  ],
  fills: [
    { kind: WATER, x0: SHAFT_X0 + 10, x1: CROWN_X1 - 10, y1: CROWN_Y, count: 260 },
    { kind: WATER, x0: CROWN_X0 + 10, x1: SHAFT_X0 - 10, y1: CROWN_Y, count: 70 },
    { kind: LAVA, x0: M1.x0 + DAM + 8, x1: M1.x1 - 8, y1: Y1, count: 12 },
    { kind: LAVA, x0: M2.x0 + DAM + 8, x1: M2.x1 - 8, y1: Y2, count: 12 },
    { kind: LAVA, x0: M3.x0 + DAM + 8, x1: M3.x1 - 8, y1: Y3, count: 12 },
    { kind: LAVA, x0: SHAFT_X0 + 8, x1: BATH_X1 - 8, y1: BATH_Y - 8, count: 14 },
    { kind: LAVA, x0: MOAT.x0 + 8, x1: MOAT.x1 - 8, y1: MOAT.y - 8, count: 12 },
    { kind: COIN, x0: M2.x0 + 4, x1: M3.x0 - 8, y1: Y3, count: 7 },
    { kind: COIN, x0: M3.x0 + 6, x1: 878, y1: YB, count: 7 },
    { kind: COIN, x0: 430, x1: 640, y1: YB, count: 12 },
    { kind: COIN, x0: MOAT.x1 + 12, x1: VAULT_X1 - 8, y1: VAULT_Y, count: 8 },
  ],
  drains: [
    { x0: 858, x1: SHAFT_X0 - 8, y0: 1040, y1: 1160 },
    { x0: GRATE.x0 + 6, x1: GRATE.x1 - 6, y0: RIM_Y + 4, y1: GRATE.y - 6 },
  ],
  nib: { x: 380, y: Y1 - 24 },
  blots: [{ x: 1070, y: BATH_Y - 48, boss: true, animal: 'salamander' }],
  chest: { x: 1500, y: VAULT_Y },
  coinsNeeded: 30,
  solution: ['A', 'A~7', 'F', 'K', 'J1', 'J2', 'J3'],
  stops: [{ x: 340 }, { x: 520 }, { x: 640 }, { x: 760 }, { x: 1500 }],
  torches: [
    { x: 340, y: 620 },
    { x: 340, y: 1140 },
    { x: 1350, y: 1060 },
    { x: 1500, y: 1060 },
  ],
  view: { x: 240, y: 290, w: 1320, h: 1100 },
};
