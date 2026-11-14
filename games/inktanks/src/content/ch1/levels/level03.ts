import type { LevelDef } from '../../../logic/level/types';
import { at, blob, each, farmyard, LOOT_MIDDLE, path, row, TANK } from './kit';

/**
 * Level 3, Milk Run (Escort): bring the supply truck down the farm road to
 * the village, 4 × 2 screens. The truck only drives while you're near.
 * Boar scouts hide under the village roofs; two waves come off the north
 * hills for the truck.
 */
const ROAD = [at(0.2, 1.5), at(0.9, 1.45), at(1.4, 1.1), at(2.0, 1.0), at(2.6, 1.2), at(3.1, 0.9), at(3.75, 0.75)];

export const LEVEL_03: LevelDef = {
  id: 'ch1-03', number: 3, name: 'Milk Run', type: 'escort',
  briefing: 'The village needs supplies. Bring the truck down the road; it only drives while you stay close. Boars hide under the roofs.',
  teaches: 'Protecting, roofs, close fights',
  map: {
    cols: 4, rows: 2, base: 'grass',
    terrain: [path('dirt', ROAD, 80), blob('dirt', 3500, 650, 300), blob('grassDry', 1700, 300, 360), blob('mud', 2300, 1300 - 300, 110)],
    structures: [
      ...farmyard(500, 420),
      ...row('fence', 900, 1000, 4, 130), ...row('oak', 1200, 1300 - 280, 4, 150),
      ...each('bush', [[1300, 820], [1700, 760], [2200, 760], [2500, 1000], [1900, 1180 - 150], [1100, 650]]),
      ...each('oak', [[1500, 200], [1650, 160], [1850, 220], [2050, 180], [2800, 160], [2950, 220]]),
      { kind: 'crops', x: 2400, y: 420 }, { kind: 'crops', x: 2650, y: 640 },
      { kind: 'houseA', x: 3250, y: 560 }, { kind: 'houseB', x: 3450, y: 470 }, { kind: 'houseA', x: 3600, y: 880 }, { kind: 'houseB', x: 3320, y: 920 },
      { kind: 'shed', x: 3700, y: 560 }, ...row('wallBrick', 3050, 760, 2, 130), { kind: 'wallBrickV', x: 3780, y: 300 },
      ...each('rockA', [[2900, 1000], [700, 900], [2200, 1000 + 20]]),
    ],
    points: { house1: { x: 3250, y: 650 }, house2: { x: 3450, y: 560 }, house3: { x: 3560, y: 980 }, yard: { x: 3700, y: 700 }, hillW: { x: 1500, y: 60 }, hillE: { x: 2700, y: 60 }, mid: { x: 2200, y: 600 } },
    roads: { truck: ROAD, lane: [at(1.6, 0.6), at(2.5, 0.5), at(2.9, 0.8)] },
  },
  start: at(0.35, 1.7), startHeading: 0,
  enemies: [
    { role: 'guard', clan: 'boars', tank: TANK.rocket, at: 'mid', hpMult: 0.5 },
    { role: 'patrol', clan: 'boars', tank: TANK.scout, at: at(1.6, 0.6), route: 'lane' },
    { role: 'guard', clan: 'boars', tank: TANK.scout, at: 'house1' },
    { role: 'guard', clan: 'boars', tank: TANK.gunner, at: 'house2', hpMult: 0.7 },
    { role: 'guard', clan: 'boars', tank: 'machinegun1/light1/tracks1', at: 'house3' },
    { role: 'wave', clan: 'boars', tank: TANK.scout, at: 'hillW', when: 35 },
    { role: 'wave', clan: 'boars', tank: TANK.scout, at: 'hillE', when: 75 },
    { role: 'wave', clan: 'boars', tank: TANK.scout, at: 'hillE', when: 80 },
  ],
  crates: [{ at: { x: 1000, y: 1250 - 300 } }, { at: { x: 1650, y: 1000 } }, { at: { x: 2550, y: 200 }, content: 'kit' }, { at: { x: 3100, y: 1000 } }, { at: { x: 600, y: 650 } }],
  objective: { kind: 'escort', road: 'truck', truckHp: 1400, speed: 32 },
  bonus: [{ kind: 'truckHp', min: 0.5 }, { kind: 'kills', n: 6 }],
  loot: LOOT_MIDDLE,
};
