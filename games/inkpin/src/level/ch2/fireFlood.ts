import type { LevelDef } from '../../logic/level';
import { COIN, LAVA, WATER } from '../../logic/particles';
import { CH2, PIN_T, T } from '../common';

/** Nib's terrace and the walkway over the lava tank and the dam's shaft. */
const FLOOR = 560;
/** The shaft's floor, with the hole down to the vault in it. */
const FLAT = 760;
/** The raft's pool, and the gap past the dam (D) to the landing. */
const POOL = 860;
/** The landing beyond the lava river; past the ruby pool it runs on to the shaft down to the vault. */
const LAND = 778;
const EAST_LAND = LAND + 12;
/** The landing's face, where the raft comes in: the river past the dam is wider than the raft, so the pool runs out beside it. */
const FACE = 940;
/** The salamander's basin, on a step it won't walk off, and the ruby pool. */
const BATH = 788;
const RUBY_POOL = 870;
/** The shaft down to the vault, and the vault's roof and floor. */
const SHAFT = 1500;
const VAULT_TOP = 1030;
const VAULT = 1150;
const EAST = 1640;

/**
 * Level 8, Loot, the chapter's Remix: a slab dropped to dam the lava, a raft
 * ferry over the lava river, and a gate that switches the flood between a
 * salamander and the ruby pool. The hoard (a heap of gold, three rubies and
 * two hoppers of gold) waits in the vault under it all.
 * 1. The dam (the slab as a tool). Nib's walkway crosses a crumbling ledge
 *    over the shaft where the lava tank under his terrace empties (L). The
 *    shaft's floor has a hole: the spillway down to the vault, onto the heap
 *    of gold. Walk over the ledge first and its slab drops onto the hole and
 *    dams it, so L's lava runs on down into the raft's pool. Pull L first and
 *    the lava pours down the spillway and melts the hoard.
 * 2. The ferry. The raft sits dry on two pegs in the pool, against the dam
 *    pin (D) that holds the pool. L's lava floats it up under the walkway's
 *    end, where Nib waits behind his door (N, the level's only pin that just
 *    holds him). Open N after the lava and he drops onto the raft; open it
 *    before and he waits on the dry raft while the lava piles round it and
 *    over its deck: burnt. Then D: the pool surges out into the river past
 *    the dam and carries the raft over to the landing, wider than the raft,
 *    so the pool runs out beside it, and Nib steps off.
 * 3. The flood (the switch). The water tank (W) pours through a funnel onto
 *    the gate pin (G). In, G tips the flood down the chute into the
 *    salamander's basin on the landing; out, the flood falls straight into
 *    the ruby pool past it, a lava pool any drop of water cools. One flood,
 *    two jobs: pull G out, pull W, and push G back in once the pool has gone
 *    to stone (anywhere from 0.5 to 2.5 s after W wins), and the rest
 *    washes the salamander away. W with G in, the obvious pull, spends it
 *    all on the salamander and Nib walks into the hot pool: burnt. G never
 *    pushed back, or pushed back too late (4.5 s), and the salamander is
 *    waiting in its basin: inked (at 3 s he is burnt boarding the raft
 *    instead). The basin sits on a step the salamander
 *    won't walk off, its rims low enough for Nib to climb; grates and a
 *    baffle keep each channel's water out of the other and out of the river.
 *    The flood must come before the ferry (D), or Nib lands next to a dry
 *    salamander: inked.
 * 4. The hoard. Past the ruby pool Nib drops down a shaft into the vault: the
 *    heap, the rubies, and two hoppers (H in the shaft, V in the vault's
 *    roof), any time. A second lava tank hangs over Nib's terrace (T), the
 *    tempting "more lava for the raft": pulled first, it pours onto him
 *    before he has set off. Once he has gone it is harmless, its lava runs
 *    down the shaft over the slab into the pool.
 * Winning order: G, W, G~1.5 (back in), L, N, D, H, V; the flood (G, W, G back
 * in) and L in either order before N and D, as long as some pull comes
 * before L so Nib has walked over the ledge; H and V any time; T any time but first.
 */
export const FIRE_AND_FLOOD: LevelDef = {
  id: 'fire-and-flood',
  chapter: CH2,
  ruin: 'volcano',
  name: 'Fire and Flood',
  goal: 'Pick up 110 coins',
  tip: 'Out, the gate lets the flood fall straight down; tapped back in, it tips the rest down the chute',
  rooms: [
    // The hall over it all: Nib's terrace, the walkway, the landing.
    [[40, 400], [EAST, 400], [EAST, EAST_LAND], [1420, EAST_LAND], [1300, LAND - 20], [1190, LAND - 10], [1060, LAND], [FACE, LAND - 6], [FACE, 770], [700, 770], [700, FLOOR], [40, FLOOR]],
    // The lava tank under Nib's terrace, and the dam's shaft down to the hole, the spillway and the raft's pool.
    [[40, 568], [320, 568], [320, 690], [40, 650]],
    [[320, FLOOR], [700, FLOOR], [700, POOL], [560, POOL], [560, 830], [452, FLAT], [428, FLAT], [428, 880], [740, VAULT_TOP], [690, 1060], [372, 900], [372, FLAT], [320, FLAT]],
    // The raft's pool and the river past the dam.
    [[690, 770], [FACE, 770], [FACE, 880], [760, 880], [760, POOL], [690, POOL]],
    // The salamander's basin and the ruby pool.
    [[1060, 754], [1190, 748], [1190, BATH], [1060, BATH]],
    [[1300, LAND - 8], [1420, LAND - 8], [1420, RUBY_POOL], [1300, RUBY_POOL]],
    // The shaft and the vault.
    [[SHAFT, EAST_LAND], [EAST, EAST_LAND], [EAST, VAULT], [680, VAULT], [680, 1060], [690, 1060], [740, VAULT_TOP], [SHAFT, VAULT_TOP]],
  ],
  walls: [
    { ax: 40, ay: 400, bx: EAST, by: 400, t: T }, // 0 ceiling
    { ax: 40, ay: 400, bx: 40, by: 650, t: T }, // 1 left wall
    { ax: 40, ay: FLOOR, bx: 320, by: FLOOR, t: T }, // 2 Nib's terrace, the lava tank's lid
    { ax: 320, ay: FLOOR, bx: 320, by: 600, t: T }, // 3 the tank's side, over its door
    { ax: 40, ay: 650, bx: 320, by: 690, t: T }, // 4 the tank's floor
    { ax: 320, ay: 696, bx: 320, by: FLAT, t: T }, // 5 the shaft's side, under the door
    { ax: 320, ay: FLAT, bx: 372, by: FLAT, t: T }, // 6 the shaft's floor, left of the hole
    { ax: 428, ay: FLAT, bx: 452, by: FLAT, t: T }, // 7 and right of it
    { ax: 452, ay: FLAT, bx: 560, by: 830, t: T }, // 8 down into the pool
    { ax: 560, ay: 830, bx: 560, by: POOL, t: T }, // 9
    { ax: 560, ay: POOL, bx: 760, by: POOL, t: T }, // 10 the pool's floor, up to the dam
    { ax: 760, ay: POOL, bx: 760, by: 880, t: T }, // 11 past it, down into the river
    { ax: 760, ay: 880, bx: FACE, by: 880, t: T }, // 12 the river's floor
    { ax: FACE, ay: LAND - 6, bx: FACE, by: 880, t: T }, // 13 the landing's face
    { ax: 462, ay: FLOOR, bx: 690, by: FLOOR, t: T }, // 14 the walkway
    { ax: 372, ay: FLAT, bx: 372, by: 900, t: T }, // 15 the spillway down to the vault
    { ax: 428, ay: FLAT, bx: 428, by: 880, t: T }, // 16
    { ax: 372, ay: 900, bx: 690, by: 1060, t: T }, // 17
    { ax: 428, ay: 880, bx: 740, by: VAULT_TOP, t: T }, // 18
    { ax: 682, ay: 830, bx: 690, by: 830, t: T }, // 19 the raft's pegs
    { ax: 734, ay: 830, bx: 742, by: 830, t: T }, // 20
    // The landing: the salamander's basin, the ruby pool, then the shaft.
    { ax: FACE, ay: LAND - 6, bx: 995, by: LAND, t: T }, // 21 to a grate that keeps spilt water out of the river
    { ax: 1043, ay: LAND, bx: 1060, by: LAND, t: T }, // 22
    { ax: FACE + 6, ay: LAND - 20, bx: FACE + 6, by: LAND - 6, t: T }, // 22b a lip at the river's edge: no spilt water runs into it
    { ax: 1060, ay: 754, bx: 1060, by: BATH, t: T }, // 23 the salamander's basin, on a step it won't walk off; it overflows on its lower side, to the grate
    { ax: 1060, ay: BATH, bx: 1190, by: BATH, t: T }, // 24
    { ax: 1190, ay: BATH, bx: 1190, by: 748, t: T }, // 25
    { ax: 1190, ay: LAND - 10, bx: 1210, by: LAND - 12, t: T }, // 26 a grate between the basin and the ruby pool: no water crosses it
    { ax: 1256, ay: LAND - 16, bx: 1300, by: LAND - 20, t: T }, // 27
    { ax: 1210, ay: LAND - 12, bx: 1210, by: LAND + 20, t: T }, // 28 its box
    { ax: 1256, ay: LAND - 16, bx: 1256, by: LAND + 20, t: T }, // 29
    { ax: 1210, ay: LAND + 20, bx: 1256, by: LAND + 20, t: T }, // 30
    { ax: 1300, ay: LAND - 36, bx: 1300, by: RUBY_POOL, t: T }, // 31 the ruby pool, with a raised lip on the basin's side
    { ax: 1300, ay: RUBY_POOL, bx: 1420, by: RUBY_POOL, t: T }, // 32
    { ax: 1420, ay: RUBY_POOL, bx: 1420, by: EAST_LAND, t: T }, // 33
    { ax: 1420, ay: EAST_LAND, bx: 1440, by: EAST_LAND, t: T }, // 34 a grate for the ruby pool's overflow
    { ax: 1480, ay: EAST_LAND, bx: SHAFT, by: EAST_LAND, t: T }, // 35
    { ax: 1440, ay: EAST_LAND, bx: 1440, by: EAST_LAND + 34, t: T }, // 36
    { ax: 1480, ay: EAST_LAND, bx: 1480, by: EAST_LAND + 34, t: T }, // 37
    { ax: 1440, ay: EAST_LAND + 34, bx: 1480, by: EAST_LAND + 34, t: T }, // 38
    { ax: SHAFT, ay: EAST_LAND, bx: SHAFT, by: VAULT_TOP, t: T }, // 39 the shaft's side
    // The flood: the tank, its funnel, and the chute from the gate to the basin.
    { ax: 1190, ay: 400, bx: 1190, by: 516, t: T }, // 40
    { ax: 1470, ay: 400, bx: 1470, by: 516, t: T }, // 41
    { ax: 1190, ay: 516, bx: 1312, by: 562, t: T }, // 42 the funnel
    { ax: 1470, ay: 516, bx: 1348, by: 562, t: T }, // 43
    { ax: 1300, ay: 614, bx: 1172, by: 644, t: T }, // 44 the chute to the basin, high over the rim where Nib climbs out
    // The river-side grate's box.
    { ax: 995, ay: LAND, bx: 995, by: 810, t: T }, // 45
    { ax: 1043, ay: LAND, bx: 1043, by: 810, t: T },
    { ax: 995, ay: 810, bx: 1043, by: 810, t: T },
    // A second lava tank, over Nib's terrace.
    { ax: 150, ay: 400, bx: 150, by: 482, t: T }, // 48
    { ax: 282, ay: 400, bx: 282, by: 482, t: T }, // 49
    { ax: 1240, ay: 636, bx: 1240, by: 696, t: T }, // 50 a baffle under the chute: the basin's splash never reaches the ruby pool
    // The vault's gold hoppers: one high in the shaft beside Nib's way down, one in the vault's roof.
    { ax: 1170, ay: VAULT_TOP, bx: 1170, by: 1074, t: T }, // 51
    { ax: 1250, ay: VAULT_TOP, bx: 1250, by: 1074, t: T }, // 52
    { ax: 1590, ay: 560, bx: 1590, by: 650, t: T }, // 53
    // The east wall, the vault.
    { ax: EAST, ay: 400, bx: EAST, by: VAULT, t: T }, // 54
    { ax: 680, ay: VAULT, bx: EAST, by: VAULT, t: T }, // 55 the vault's floor
    { ax: 680, ay: 1060, bx: 680, by: VAULT, t: T }, // 56
    { ax: 680, ay: 1060, bx: 690, by: 1060, t: T }, // 57 its roof
    { ax: 740, ay: VAULT_TOP, bx: SHAFT, by: VAULT_TOP, t: T }, // 58
  ],
  bars: [3, 14, 19, 20, 23, 25, 31, 40, 41, 42, 43, 44, 48, 49, 50, 51, 52, 53],
  pins: [
    { id: 'N', ax: 680, ay: 408, bx: 680, by: 552, t: PIN_T },
    { id: 'L', ax: 320, ay: 690, bx: 320, by: 608, t: PIN_T },
    { id: 'D', ax: 760, ay: 600, bx: 760, by: 856, t: PIN_T },
    { id: 'W', ax: 1478, ay: 508, bx: 1182, by: 508, t: PIN_T },
    { id: 'G', ax: 1294, ay: 604, bx: 1370, by: 568, t: PIN_T, gate: true },
    { id: 'H', ax: 1648, ay: 658, bx: 1582, by: 658, t: PIN_T },
    { id: 'T', ax: 142, ay: 490, bx: 290, by: 490, t: PIN_T },
    { id: 'V', ax: 1162, ay: 1082, bx: 1258, by: 1082, t: PIN_T },
  ],
  fills: [
    { kind: LAVA, x0: 240, x1: 312, y1: 676, count: 28 },
    { kind: LAVA, x0: 48, x1: 312, y1: 641, count: 172 },
    { kind: COIN, x0: 688, x1: 820, y1: VAULT - 8, count: 50 },
    { kind: LAVA, x0: 1308, x1: 1412, y1: RUBY_POOL - 8, count: 70 },
    { kind: WATER, x0: 1198, x1: 1462, y1: 500, count: 200 },
    { kind: COIN, x0: 1598, x1: 1632, y1: 650, count: 30 },
    { kind: LAVA, x0: 158, x1: 274, y1: 482, count: 90 },
    { kind: COIN, x0: 1178, x1: 1242, y1: 1074, count: 20 },
  ],
  drains: [{ x0: 1000, x1: 1038, y0: 772, y1: 806 }, { x0: 1215, x1: 1251, y0: LAND - 10, y1: LAND + 14 }, { x0: 1445, x1: 1475, y0: EAST_LAND + 4, y1: EAST_LAND + 28 }],
  ledges: [{ x0: 336, x1: 452, y: FLOOR }],
  rafts: [{ x: 712, y: 806 }],
  rubies: [{ x: 900, y: VAULT - 20 }, { x: 960, y: VAULT - 20 }, { x: 1020, y: VAULT - 20 }],
  nib: { x: 100, y: 536 },
  blots: [{ x: 1125, y: BATH - 31, animal: 'salamander' }],
  coinsNeeded: 110,
  solution: ['G', 'W', 'G~1.5', 'L', 'N', 'D', 'H', 'V'],
  stops: [{ x: 870 }, { x: 1115 }, { x: 1360 }, { x: 1540 }, { x: 1250 }, { x: 750 }],
  torches: [{ x: 120, y: 480 }, { x: 420, y: 470 }, { x: 860, y: 520 }, { x: 1010, y: 690 }, { x: 1470, y: 690 }, { x: 960, y: 1090 }, { x: 1420, y: 1090 }],
  view: { x: 0, y: 360, w: EAST + 40, h: VAULT - 320 },
};
