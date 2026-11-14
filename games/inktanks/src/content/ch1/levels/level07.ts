import type { LevelDef } from '../../../logic/level/types';
import { at, blob, each, LOOT_LATE, path, row, TANK } from './kit';

/**
 * Level 7, Cut the Convoy (Ambush): three Boar trucks drive the valley road
 * west to east, 4 × 2 screens, with two tanks riding along (they only
 * shoot back). Pick your spot: the farm bend, the bridge or the woods.
 * A guard post watches the bridge.
 */
const ROAD = [at(0.05, 1.3), at(0.8, 1.15), at(1.4, 1.5), at(2.0, 1.2), at(2.6, 0.8), at(3.2, 1.1), at(3.97, 0.9)];

export const LEVEL_07: LevelDef = {
  id: 'ch1-07', number: 7, name: 'Cut the Convoy', type: 'ambush',
  briefing: 'Three Boar supply trucks are heading down the valley road. Stop all three before they leave the valley. They will not wait for you.',
  teaches: 'Interception, picking your spot',
  map: {
    cols: 4, rows: 2, base: 'grass',
    terrain: [path('dirt', ROAD, 80), path('water', [at(2.15, 0), at(2.3, 2)], 110), { ground: 'bridge', shape: { kind: 'rect', x: 1980, y: 470, w: 300, h: 240 } }, blob('mud', 1300, 400, 150), blob('grassDry', 3200, 400, 300)],
    structures: [
      ...each('oak', [[600, 300], [750, 250], [900, 380], [2900, 300], [3050, 250], [3150, 450], [3400, 280], [1600, 950], [1750, 1000]]),
      ...each('pine', [[2600, 1050], [2700, 1000], [2800, 1050], [3500, 1000], [3600, 950]]),
      ...each('bush', [[1200, 900], [1500, 650], [2500, 500], [2800, 700], [3300, 800], [700, 900], [1000, 700]]),
      { kind: 'farmhouse', x: 1150, y: 1000 - 30 }, { kind: 'barn', x: 900, y: 1000 - 30 }, ...row('fence', 1000, 760, 3, 130),
      ...row('wallBrick', 1850, 450, 1, 0), { kind: 'shed', x: 2450, y: 360 },
      ...each('rockB', [[1800, 200], [3700, 300]]),
    ],
    points: { post: at(2.5, 0.65), post2: at(1.85, 0.75), t1: ROAD[1]!, t2: at(0.45, 1.22), t3: ROAD[0]! },
    roads: { valley: ROAD },
  },
  start: at(1.1, 0.4), startHeading: Math.PI / 2,
  enemies: [
    { role: 'convoy', clan: 'boars', tank: TANK.truck, at: 't1', route: 'valley', truck: true, hpMult: 0.5, speedMult: 0.2 },
    { role: 'convoy', clan: 'boars', tank: TANK.gunner, at: 't2', route: 'valley', speedMult: 0.24, hpMult: 0.6 },
    { role: 'convoy', clan: 'boars', tank: TANK.truck, at: 't3', route: 'valley', truck: true, hpMult: 0.5, speedMult: 0.2 },
    { role: 'convoy', clan: 'boars', tank: TANK.truck, at: { x: 40, y: 760 }, route: 'valley', truck: true, hpMult: 0.5, speedMult: 0.18 },
    { role: 'guard', clan: 'boars', tank: TANK.scout, at: 'post' },
    { role: 'guard', clan: 'boars', tank: TANK.gunner, at: 'post2', hpMult: 0.7 },
  ],
  crates: [{ at: at(1.0, 0.3) }, { at: at(1.8, 0.25), content: 'kit' }, { at: at(3.3, 1.7) }, { at: at(0.6, 1.8) }],
  objective: { kind: 'ambush' },
  bonus: [{ kind: 'kills', n: 5 }, { kind: 'noKit' }],
  loot: LOOT_LATE,
};
