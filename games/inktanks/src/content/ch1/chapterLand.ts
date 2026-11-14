import { buildLand, type Land, type LandDef, type StructureDef } from '../../logic/land';
import type { StructPlace } from '../../logic/level/types';
import type { Pt } from '../../logic/vec';
import { KINDS } from './kinds';
import { blob, bridge, each, farmyard, path, row } from './levels/kit';

/**
 * Chapter 1's map: the Meadowlands as one land, the level select. A
 * PLACEHOLDER composed from the levels' own ground set and structures (the
 * farm, the river bridge, the woods, the mill, the rail yard, the pass and
 * the old fort, roughly where each level happens), until the chapter map is
 * painted. 2 × 2 screens; the ten spots sit in the middle, inside SPOT_BOX,
 * so a phone's view fits them all.
 */
export const SPOTS: readonly Pt[] = [
  { x: 520, y: 700 }, { x: 690, y: 610 }, { x: 610, y: 470 }, { x: 790, y: 380 }, { x: 1010, y: 430 },
  { x: 1090, y: 600 }, { x: 1270, y: 690 }, { x: 1420, y: 580 }, { x: 1320, y: 440 }, { x: 1450, y: 340 },
];

/** The world rect the camera must show (spots plus room for their labels). */
export const SPOT_BOX = { x: 440, y: 290, w: 1080, h: 480 } as const;

const RIVER_X = 900;
const CROSS = bridge({ x: RIVER_X, y: 404 }, 'x', 240);

const STRUCTURES: readonly StructPlace[] = [
  // The farm (levels 1–3).
  ...farmyard(400, 560),
  { kind: 'crops', x: 330, y: 820 }, { kind: 'crops', x: 520, y: 860 }, { kind: 'crops', x: 760, y: 780 },
  ...row('fence', 250, 730, 4, 130),
  { kind: 'fuelBarrels', x: 760, y: 680 }, { kind: 'fuelBarrels', x: 820, y: 700 },
  { kind: 'houseA', x: 560, y: 380 }, { kind: 'houseB', x: 700, y: 330 },
  // The bridge (level 4).
  ...CROSS.rails,
  // The woods (level 5).
  ...each('pine', [[960, 330], [1060, 320], [1120, 380], [940, 520], [1150, 470], [1040, 540], [1180, 300], [990, 260]]),
  ...each('oak', [[1110, 520], [930, 600]]),
  // The old mill (level 6).
  { kind: 'barn', x: 1180, y: 640 }, { kind: 'shed', x: 1000, y: 680 },
  // The valley road and the convoy (level 7).
  { kind: 'wagon', x: 1300, y: 780 },
  // The rail yard (level 8).
  { kind: 'hangar', x: 1560, y: 680 }, { kind: 'wagon', x: 1460, y: 680 },
  // The pass (level 9) and the old fort (level 10).
  ...each('rockB', [[1240, 380], [1400, 470], [1220, 500], [1500, 470]]),
  ...each('rockA', [[1270, 330], [1370, 360], [1530, 420]]),
  ...row('fortWall', 1530, 250, 2, 240), { kind: 'fortTower', x: 1520, y: 250 }, { kind: 'fortTower', x: 1990, y: 250 },
  { kind: 'radarMast', x: 1640, y: 330 },
  // The edges: trees and bushes all round, so the land runs on past the spots.
  ...each('oak', [[120, 140], [300, 100], [80, 420], [180, 980], [420, 1020], [700, 980], [1000, 990], [1300, 1000], [1650, 960], [1850, 820], [1800, 120], [1400, 120], [1100, 120], [700, 140], [220, 640], [1750, 520]]),
  ...each('bush', [[460, 760], [640, 540], [860, 860], [1180, 860], [1520, 860], [1700, 580], [300, 300], [1600, 160], [820, 200]]),
  ...each('rockC', [[640, 900], [1450, 960], [1880, 400], [260, 900]]),
];

const ROAD: readonly Pt[] = [{ x: 260, y: 760 }, ...SPOTS, { x: 1600, y: 300 }];

function toStructures(list: readonly StructPlace[]): StructureDef[] {
  return list.flatMap((s, i) => {
    const k = KINDS[s.kind];
    return k ? [{ id: `${s.kind}${i}`, kind: s.kind, x: s.x, y: s.y, shape: k.shape, material: k.material, hp: k.hp, flattenable: k.flattenable, cover: k.cover, roof: k.roof }] : [];
  });
}

export const CHAPTER1_LAND_DEF: LandDef = {
  id: 'ch1-map', name: 'Meadowlands', cols: 2, rows: 2, base: 'grass',
  terrain: [
    blob('grassDry', 1500, 520, 330), blob('grassDry', 300, 300, 260), blob('dirt', 420, 560, 200), blob('mud', 1130, 720, 90),
    blob('sand', 1350, 420, 160), blob('dirt', 1640, 260, 180),
    path('water', [{ x: RIVER_X - 40, y: 0 }, { x: RIVER_X + 10, y: 300 }, { x: RIVER_X, y: 520 }, { x: RIVER_X - 50, y: 800 }, { x: RIVER_X - 20, y: 1080 }], 130),
    path('dirt', ROAD, 54),
    CROSS.deck,
    blob('water', 230, 420, 70),
  ],
  structures: toStructures(STRUCTURES),
  roads: {},
  points: {},
};

let built: Land | null = null;
export function chapter1Land(): Land {
  built ??= buildLand(CHAPTER1_LAND_DEF);
  return built;
}
