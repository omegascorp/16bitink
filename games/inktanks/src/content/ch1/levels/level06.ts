import type { LevelDef } from '../../../logic/level/types';
import { at, blob, each, LOOT_MIDDLE, path, row, TANK } from './kit';

/**
 * Level 6, The Old Mill (Rescue): break the three cages round the old mill
 * and bring the otter crews back to the truck, 3 × 3 screens. Freed crews
 * follow you in a line and can be hit; when the first cage breaks, a
 * Boar wave comes down from the hills.
 */
const MILL = { x: 2200, y: 520 };

export const LEVEL_06: LevelDef = {
  id: 'ch1-06', number: 6, name: 'The Old Mill', type: 'rescue',
  briefing: 'The Boars caged three otter crews at the old mill. Break the cages and bring the crews to our truck. They follow you, and they can be hit.',
  teaches: 'Being followed, Sergeant rank',
  map: {
    cols: 3, rows: 3, base: 'grass',
    terrain: [path('dirt', [at(0.4, 2.6), at(1.2, 2.0), at(1.8, 1.4), at(2.3, 0.95)], 80), blob('dirt', MILL.x, MILL.y + 60, 330), path('water', [at(2.75, 0), at(2.7, 1.5), at(3, 2.2)], 120), blob('mud', 1200, 1300, 150)],
    structures: [
      { kind: 'barn', x: MILL.x, y: MILL.y },
      { kind: 'cage', x: MILL.x - 260, y: MILL.y + 160, tag: 'cage' },
      { kind: 'cage', x: MILL.x + 180, y: MILL.y + 230, tag: 'cage' },
      { kind: 'cage', x: MILL.x - 60, y: MILL.y - 190, tag: 'cage' },
      ...row('fence', MILL.x - 380, MILL.y + 330, 6, 130), ...row('wallBrick', MILL.x - 420, MILL.y - 120, 1, 0),
      ...each('oak', [[1500, 300], [1650, 250], [1300, 500], [2500, 1100], [800, 700], [600, 500], [400, 1000]]),
      ...each('bush', [[1000, 1600], [1500, 1200], [1800, 900], [900, 1100], [2000, 1300], [1600, 700]]),
      { kind: 'farmhouse', x: 1300, y: 1480 }, { kind: 'shed', x: 1650, y: 1450 }, ...each('rockB', [[700, 1300], [1900, 1560]]),
      { kind: 'crops', x: 600, y: 1500 }, { kind: 'crops', x: 2150, y: 1480 },
    ],
    points: { home: at(0.35, 2.55), yard: { x: MILL.x, y: MILL.y + 220 }, back: { x: MILL.x + 150, y: MILL.y - 260 }, farm: at(1.45, 2.95 - 0.1), road: at(1.8, 1.4), hills: at(2.4, 0.08) },
    roads: { beat: [at(1.0, 1.6), at(1.6, 1.0), at(2.0, 1.5), at(1.4, 2.1)] },
  },
  start: at(0.5, 2.7), startHeading: -0.6,
  enemies: [
    { role: 'patrol', clan: 'boars', tank: TANK.scout, at: at(1.0, 1.6), route: 'beat' },
    { role: 'guard', clan: 'boars', tank: TANK.gunner, at: 'yard', hpMult: 0.5 },
    { role: 'guard', clan: 'boars', tank: TANK.rocket, at: 'back', hpMult: 0.5 },
    { role: 'guard', clan: 'boars', tank: TANK.scout, at: 'road' },
    { role: 'wave', clan: 'boars', tank: TANK.scout, at: 'hills', when: 'stage' },
  ],
  crates: [{ at: at(0.9, 2.3) }, { at: at(1.5, 1.9), content: 'kit' }, { at: at(1.9, 1.1), content: 'kit' }, { at: at(1.1, 0.6) }, { at: at(2.6, 2.7) }],
  objective: { kind: 'rescue', tag: 'cage', home: 'home' },
  bonus: [{ kind: 'kills', n: 5 }, { kind: 'time', under: 240 }],
  loot: LOOT_MIDDLE,
};
