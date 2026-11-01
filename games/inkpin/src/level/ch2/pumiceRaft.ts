import type { LevelDef } from '../../logic/level';
import { COIN, LAVA, WATER } from '../../logic/particles';
import { CH2, PIN_T, T } from '../common';

/**
 * Chapter 2, level 2: the raft ferry, with cargo. A lava river lies between
 * Nib's shelf and the vault, and a pumice raft is moored upstream, in a cave
 * of lava under Nib's feet. Lava must run twice: once to bring the raft to
 * Nib, once to carry him over. The gold hopper over the dock loads the raft
 * between the two, and the water tank on Nib's shelf cools the river after.
 * 1. The mooring: the raft floats in the cave behind the dam D, a step above
 *    the dock. Pull D and the cave's lava pours down into the dock under the
 *    edge of Nib's shelf, and takes the raft with it, into the berth between
 *    the step and the post M (a raft's width and a little more), so it docks
 *    flush against M however the pour sloshes. Nib drops onto it.
 *    D also stands up past the shelf's edge, so Nib waits at the dam until it
 *    is pulled. A pull before D of M, X or W loses: there is nothing to ride.
 * 2. The cargo: the hopper G over the dock holds 30 coins. Pull it with the
 *    raft docked and they land on its deck, and Nib gathers them.
 *    - G before D: the gold falls on the empty dock and the cave's lava
 *      melts it (melted). D, M then G: the raft has gone, and the gold falls
 *      into the lava behind it (melted).
 * 3. The ferry: M holds the dock's lava high above the river. Pull it and
 *    the lava surges down the run into the basin under the landing, and
 *    the raft rides the surge over with Nib on it.
 * 4. Cool it behind him: the water tank W sits on Nib's shelf, far from the
 *    dock; its water runs along the shelf and over the edge. It is the
 *    obvious first pull (leftmost and nearest Nib), and the obvious order
 *    loses on it. Once the river is one pool, its water sets the whole of it
 *    to stone, cave to basin.
 *    - W before D: the water pours into the empty dock and the cave's lava
 *      comes in on top of Nib (burnt).
 *    - W with the raft docked (before or after the gold): the dock sets with
 *      the raft in it, and the basin, behind the post, stays hot: Nib walks
 *      out over the stone and into it (burnt).
 * 5. The vault: X also closes the culvert under the landing, which runs from
 *    the basin to the vault's sump. Open it on a hot river and the lava pours
 *    into the vault (burnt); on stone, nothing moves, and Nib walks in for
 *    the vault's gold and the chest. The goal needs 48 of the 60 coins, so
 *    the hopper's gold has to come over on the raft.
 * 6. The vault hopper: Y drops the vault's 20 coins from a hopper by the
 *    door. It is harmless whenever it is pulled (the coins wait on the
 *    floor); pulled last, the gold drops behind Nib on his way to the chest,
 *    and he turns back for it.
 * The stages hang together: the raft has to come before its cargo, the cargo
 * before the ferry, the one river is the ferry's road and the vault's danger,
 * and the one tank that cools it must wait for the raft to have gone through.
 * Winning order: D, G, M, W, X, Y (Y any time). The win holds with any idle
 * before any pull (the idle tests in test/ch2-pumice-raft.test.ts).
 */
export const PUMICE_RAFT: LevelDef = {
  id: 'pumice-raft',
  chapter: CH2,
  ruin: 'volcano',
  name: 'The Pumice Raft',
  goal: 'Load the raft, ride it over, take the chest and pick up 48 coins',
  tip: 'A pumice raft floats on lava and never burns, but it only moves while the lava flows. Let it run to bring the raft, then ride it.',
  rooms: [
    [[40, 360], [860, 360], [860, 916], [660, 916], [660, 1026], [860, 1026], [860, 1060], [560, 1060], [560, 1000], [400, 1000], [400, 900], [200, 900], [200, 760], [40, 760]],
    [[860, 700], [1300, 700], [1300, 1030], [960, 1030], [960, 1060], [860, 1060]],
  ],
  walls: [
    { ax: 40, ay: 360, bx: 860, by: 360, t: T }, // 0 ceiling
    { ax: 40, ay: 360, bx: 40, by: 760, t: T }, // 1 left wall
    { ax: 40, ay: 760, bx: 200, by: 760, t: T }, // 2 Nib's shelf
    { ax: 200, ay: 760, bx: 400, by: 760, t: T }, // 3 ... over the mooring cave
    { ax: 200, ay: 760, bx: 200, by: 900, t: T }, // 4 the cave's back
    { ax: 400, ay: 1000, bx: 560, by: 1000, t: T }, // 5 the dock and the run
    { ax: 560, ay: 1000, bx: 560, by: 1060, t: T }, // 6 the basin
    { ax: 560, ay: 1060, bx: 960, by: 1060, t: T }, // 7 the basin, the culvert and the vault's sump
    { ax: 660, ay: 916, bx: 852, by: 916, t: T }, // 8 the landing
    { ax: 660, ay: 916, bx: 660, by: 1026, t: T }, // 9 the basin's far side
    { ax: 660, ay: 1026, bx: 852, by: 1026, t: T }, // 10 the culvert under the landing
    { ax: 860, ay: 360, bx: 860, by: 700, t: T }, // 11 over the vault door
    { ax: 860, ay: 700, bx: 1300, by: 700, t: T }, // 12 vault ceiling
    { ax: 1300, ay: 700, bx: 1300, by: 1030, t: T }, // 13
    { ax: 960, ay: 1060, bx: 960, by: 1030, t: T }, // 14 the vault's step
    { ax: 960, ay: 1030, bx: 1300, by: 1030, t: T }, // 15 the vault floor
    { ax: 304, ay: 560, bx: 304, by: 650, t: T }, // 16 the water tank over Nib's shelf
    { ax: 346, ay: 560, bx: 346, by: 650, t: T }, // 17
    { ax: 434, ay: 420, bx: 434, by: 512, t: T }, // 18 the gold hopper over the dock
    { ax: 482, ay: 420, bx: 482, by: 512, t: T }, // 19
    { ax: 1010, ay: 720, bx: 1010, by: 800, t: T }, // 20 the vault hopper
    { ax: 1060, ay: 720, bx: 1060, by: 800, t: T }, // 21
    { ax: 200, ay: 900, bx: 400, by: 900, t: T }, // 22 the mooring cave's floor, a step above the dock
    { ax: 400, ay: 900, bx: 400, by: 1000, t: T }, // 23 the dock's back: the raft rides down over it on D's pour, and berths against M
  ],
  bars: [3, 16, 17, 18, 19, 20, 21],
  pins: [
    { id: 'D', ax: 400, ay: 694, bx: 400, by: 886, t: PIN_T }, // the mooring's dam
    { id: 'M', ax: 515, ay: 640, bx: 515, by: 994, t: PIN_T }, // the post: holds the dock's lava, the raft and Nib
    { id: 'G', ax: 430, ay: 520, bx: 486, by: 520, t: PIN_T }, // the hopper's floor: its gold falls on the dock
    { id: 'W', ax: 298, ay: 658, bx: 350, by: 658, t: PIN_T }, // the water tank over the dock
    { id: 'Y', ax: 1006, ay: 808, bx: 1064, by: 808, t: PIN_T }, // the vault hopper's floor: its gold falls to the vault floor
    { id: 'X', ax: 860, ay: 708, bx: 860, by: 1054, t: PIN_T }, // the vault door, and the culvert's end
  ],
  fills: [
    { kind: LAVA, x0: 208, x1: 392, y1: 892, count: 110 }, // the mooring: the raft floats on it
    { kind: LAVA, x0: 568, x1: 852, y1: 1052, count: 60 }, // the river: the basin and the culvert
    { kind: WATER, x0: 308, x1: 342, y1: 650, count: 25 },
    { kind: COIN, x0: 442, x1: 474, y1: 512, count: 30 }, // the hopper's gold, to ride the raft
    { kind: COIN, x0: 120, x1: 180, y1: 752, count: 10 }, // on Nib's shelf
    { kind: COIN, x0: 1014, x1: 1056, y1: 800, count: 20 }, // the vault's gold, past its sump
  ],
  rafts: [{ x: 352, y: 850 }],
  nib: { x: 80, y: 728 },
  blots: [],
  chest: { x: 1250, y: 1000 },
  coinsNeeded: 48,
  solution: ['D', 'G', 'M', 'W', 'X', 'Y'],
  stops: [{ x: 760 }, { x: 1040 }, { x: 1250 }],
  torches: [{ x: 120, y: 660 }, { x: 620, y: 640 }, { x: 760, y: 820 }, { x: 1180, y: 800 }],
  view: { x: 0, y: 340, w: 1340, h: 760 },
};
