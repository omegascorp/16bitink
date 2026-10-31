import type { LevelDef } from '../../logic/level';
import { COIN, LAVA, WATER } from '../../logic/particles';
import { CH2, PIN_T, T } from '../common';

/**
 * Chapter 2, level 2: the raft ferry. A lava river lies between Nib's shelf
 * and the vault, and a pumice raft is moored upstream, in a cave of lava
 * under Nib's feet. Lava must run twice: once to bring the raft to Nib,
 * once to carry him over. Then the river is cooled behind him.
 * 1. The mooring: the raft floats in the cave behind the dam D. Pull D and
 *    the cave's lava runs out into the dock under the edge of Nib's shelf,
 *    and takes the raft with it, up against the post M. Nib drops onto it;
 *    the post stops him walking off its far end.
 *    - Anything before D: there's no raft under the shelf, and Nib walks
 *      off it into the dock (and whatever lava gets there).
 * 2. The ferry: M holds the dock's lava high above the river. Pull it and
 *    the lava surges down the run into the basin under the landing, and
 *    the raft rides the surge over with Nib on it. He steps up onto the
 *    landing (the raft's deck is a step below it).
 *    - M before D: the dock is empty, the raft is still in its cave, and
 *      Nib walks out along the run into the hot basin.
 * 3. Cool it behind him: the water tank W over the dock. Once the river is
 *    one pool, its water sets the whole of it to stone, cave to basin.
 *    - W before D: it pours into the empty dock and Nib wades in after it,
 *      and then the cave's lava comes in on top of him.
 *    - W with the raft docked: the dock sets with the raft in it, and the
 *      basin, behind the post, stays hot: Nib walks out over the stone and
 *      into it. With Nib still on the raft as the lava sets round it, it
 *      settles into the cooling lava with him.
 * 4. The vault: the vault door X also closes the culvert under the landing,
 *    which runs from the basin to the vault's sump. Open it on a hot river
 *    and the lava pours into the vault; on stone, nothing moves, and Nib
 *    walks in for the gold and the chest at the far end. (Chapter 1's
 *    trick, the moat cooled before the gold, is the supporting stage.)
 *    - X first: the basin's lava runs off into the sump while Nib, with no
 *      raft, walks into the dock.
 * The stages hang together: the raft has to come before it can go, the one
 * river is the ferry's road and the vault's danger, and the one tank that
 * cools it must wait for the raft to have gone through.
 * Winning order: D, M, W, X (the only one).
 */
export const PUMICE_RAFT: LevelDef = {
  id: 'pumice-raft',
  chapter: CH2,
  ruin: 'volcano',
  name: 'The Pumice Raft',
  goal: 'Ride the raft over, take the chest and pick up 44 coins',
  tip: 'A pumice raft floats on lava and never burns, but it only moves while the lava flows. Let it run to bring the raft, then ride it.',
  rooms: [
    [[40, 400], [860, 400], [860, 916], [660, 916], [660, 1026], [860, 1026], [860, 1060], [560, 1060], [560, 1000], [200, 1000], [200, 760], [40, 760]],
    [[860, 700], [1800, 700], [1800, 1030], [960, 1030], [960, 1060], [860, 1060]],
  ],
  walls: [
    { ax: 40, ay: 400, bx: 860, by: 400, t: T }, // 0 ceiling
    { ax: 40, ay: 400, bx: 40, by: 760, t: T }, // 1 left wall
    { ax: 40, ay: 760, bx: 200, by: 760, t: T }, // 2 Nib's shelf
    { ax: 200, ay: 760, bx: 400, by: 760, t: T }, // 3 ... over the mooring cave
    { ax: 200, ay: 760, bx: 200, by: 1000, t: T }, // 4 the cave's back
    { ax: 200, ay: 1000, bx: 560, by: 1000, t: T }, // 5 the cave, the dock and the run
    { ax: 560, ay: 1000, bx: 560, by: 1060, t: T }, // 6 the basin
    { ax: 560, ay: 1060, bx: 960, by: 1060, t: T }, // 7 the basin, the culvert and the vault's sump
    { ax: 660, ay: 916, bx: 852, by: 916, t: T }, // 8 the landing
    { ax: 660, ay: 916, bx: 660, by: 1026, t: T }, // 9 the basin's far side
    { ax: 660, ay: 1026, bx: 852, by: 1026, t: T }, // 10 the culvert under the landing
    { ax: 860, ay: 400, bx: 860, by: 700, t: T }, // 11 over the vault door
    { ax: 860, ay: 700, bx: 1800, by: 700, t: T }, // 12 vault ceiling
    { ax: 1800, ay: 700, bx: 1800, by: 1030, t: T }, // 13
    { ax: 960, ay: 1060, bx: 960, by: 1030, t: T }, // 14 the vault's step
    { ax: 960, ay: 1030, bx: 1800, by: 1030, t: T }, // 15 the vault floor
    { ax: 408, ay: 420, bx: 408, by: 490, t: T }, // 16 the water tank over the dock
    { ax: 450, ay: 420, bx: 450, by: 490, t: T }, // 17
  ],
  bars: [3, 16, 17],
  pins: [
    { id: 'D', ax: 400, ay: 772, bx: 400, by: 994, t: PIN_T }, // the mooring's dam
    { id: 'M', ax: 470, ay: 640, bx: 470, by: 994, t: PIN_T }, // the post: holds the dock's lava, the raft and Nib
    { id: 'W', ax: 402, ay: 498, bx: 454, by: 498, t: PIN_T }, // the water tank over the dock
    { id: 'X', ax: 860, ay: 708, bx: 860, by: 1054, t: PIN_T }, // the vault door, and the culvert's end
  ],
  fills: [
    { kind: LAVA, x0: 208, x1: 392, y1: 992, count: 260 }, // the mooring: the raft floats on it
    { kind: LAVA, x0: 568, x1: 852, y1: 1052, count: 60 }, // the river: the basin and the culvert
    { kind: WATER, x0: 414, x1: 444, y1: 490, count: 25 },
    { kind: COIN, x0: 120, x1: 180, y1: 752, count: 10 }, // on Nib's shelf
    { kind: COIN, x0: 1060, x1: 1160, y1: 1022, count: 40 }, // the vault's gold, past its sump
  ],
  rafts: [{ x: 352, y: 880 }],
  nib: { x: 80, y: 728 },
  blots: [],
  chest: { x: 1760, y: 1000 },
  coinsNeeded: 44,
  solution: ['D', 'M', 'W', 'X'],
  stops: [{ x: 760 }, { x: 1760 }],
  torches: [{ x: 120, y: 660 }, { x: 620, y: 640 }, { x: 760, y: 820 }, { x: 1100, y: 800 }, { x: 1440, y: 800 }, { x: 1720, y: 800 }],
  view: { x: 0, y: 360, w: 1840, h: 740 },
};
