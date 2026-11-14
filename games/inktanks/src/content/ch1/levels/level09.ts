import type { LevelDef } from '../../../logic/level/types';
import { at, each, LOOT_LATE, patch, row, TANK } from './kit';

/**
 * Level 9, Through the Pass (Breakout): reach the fort gate in 2:30, 4 × 3
 * screens. The pass doubles back on itself: three lanes split by long
 * stone walls, east, then west, then east to the gate. Boar guards and
 * turrets hold the bends, a hunter comes up behind, and their artillery
 * marks a spot just ahead of you every few seconds. Keep moving.
 */
const WALL1 = row('wallStone', 40, 540, 58, 60);
const WALL2 = row('wallStone', 400, 1080, 58, 60);

export const LEVEL_09: LevelDef = {
  id: 'ch1-09', number: 9, name: 'Through the Pass', type: 'breakout',
  briefing: 'The fort gate lies at the end of the pass, and the pass doubles back on itself. Get there in two and a half minutes. Their guns mark where you are heading: keep moving.',
  teaches: 'Artillery marks, pace',
  map: {
    cols: 4, rows: 3, base: 'grassDry',
    terrain: [patch('dirt', 0, 230, 3840, 80), patch('dirt', 0, 770, 3840, 80), patch('dirt', 0, 1310, 3840, 80), patch('mud', 1800, 600, 200, 400)],
    structures: [
      ...WALL1, ...WALL2,
      ...each('rockB', [[900, 150], [1300, 420], [2100, 120], [2700, 400], [3200, 200], [2900, 700], [2300, 950], [1500, 650], [800, 900], [1100, 1250], [1900, 1450], [2600, 1200], [3300, 1480]]),
      ...row('wallBrick', 1600, 300, 1, 0), ...row('wallBrickV', 3600, 700, 2, 0, 140), ...row('wallBrickV', 200, 800, 2, 0, 140), ...row('wallBrick', 2400, 1330, 2, 130),
      ...each('bush', [[600, 400], [1900, 250], [3000, 850], [1200, 800], [700, 1450], [2900, 1300]]),
      { kind: 'fortWallV', x: 3800, y: 1250 }, { kind: 'fortTower', x: 3790, y: 1110 },
    ],
    points: {
      g1: { x: 1500, y: 160 }, t1: { x: 2500, y: 450 }, g2: { x: 3500, y: 300 },
      g3: { x: 3200, y: 950 }, t2: { x: 2000, y: 700 }, g4: { x: 1000, y: 650 }, t3: { x: 300, y: 1000 },
      g5: { x: 1400, y: 1450 }, t4: { x: 2700, y: 1450 }, g6: { x: 3400, y: 1250 }, gate: { x: 3720, y: 1400 },
    },
    roads: { sweep: [{ x: 2400, y: 800 }, { x: 1300, y: 900 }, { x: 2400, y: 800 }] },
  },
  start: { x: 120, y: 270 }, startHeading: 0,
  timeLimit: 150,
  enemies: [
    { role: 'guard', clan: 'boars', tank: TANK.scout, at: 'g1' },
    { role: 'turret', clan: 'boars', tank: TANK.gunner, at: 't1', hpMult: 0.5 },
    { role: 'guard', clan: 'boars', tank: TANK.scout2, at: 'g2' },
    { role: 'guard', clan: 'boars', tank: TANK.gunner, at: 'g3', hpMult: 0.6 },
    { role: 'turret', clan: 'boars', tank: TANK.rocket, at: 't2', hpMult: 0.5 },
    { role: 'patrol', clan: 'boars', tank: TANK.scout, at: { x: 2400, y: 800 }, route: 'sweep' },
    { role: 'guard', clan: 'boars', tank: TANK.scout, at: 'g4' },
    { role: 'guard', clan: 'boars', tank: TANK.gunner, at: 'g5', hpMult: 0.6 },
    { role: 'guard', clan: 'boars', tank: TANK.scout2, at: 'g6' },
    { role: 'hunter', clan: 'boars', tank: TANK.scout, at: { x: 60, y: 120 }, speedMult: 0.9 },
  ],
  crates: [{ at: { x: 800, y: 420 } }, { at: { x: 3300, y: 450 }, content: 'kit' }, { at: { x: 1800, y: 950 } }, { at: { x: 500, y: 1200 }, content: 'kit' }, { at: { x: 2200, y: 1500 } }],
  objective: { kind: 'breakout', exit: 'gate', radius: 120, artillery: { every: 5, radius: 70, damage: 45, warn: 1.8 } },
  bonus: [{ kind: 'time', under: 120 }, { kind: 'kills', n: 4 }],
  loot: LOOT_LATE,
};
