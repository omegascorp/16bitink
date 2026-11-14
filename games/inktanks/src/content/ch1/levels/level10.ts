import type { LevelDef } from '../../../logic/level/types';
import { at, blob, each, LOOT_LATE, patch, row, TANK } from './kit';

/**
 * Level 10, The Old Fort (Fortress): the Boars' land fortress, the Iron
 * Sow, circles inside the old fort's walls, 3 × 3 screens. Break its four
 * turrets (its hull shrugs off hits while any stand), then the hull. Two
 * gate guards, a wall turret and a patrol outside; rockets in a crate by the start.
 */
const FX = 1440;
const FY = 760;

export const LEVEL_10: LevelDef = {
  id: 'ch1-10', number: 10, name: 'The Old Fort', type: 'fortress',
  briefing: 'The Boars hold the old fort with the Iron Sow, a land fortress. Break its turrets first: the hull is armoured while they stand. Then the hull.',
  teaches: 'The chapter boss, Staff Sergeant',
  map: {
    cols: 3, rows: 3, base: 'grass',
    terrain: [patch('dirt', FX - 620, FY - 380, 1240, 760), path_('dirt'), blob('mud', 500, 600, 150)],
    structures: [
      // World-art fort walls are 63 px long: lay them 60 apart. The south gateway stands open
      // (a closed fortGate would need breaking, and the sim's player doesn't know to).
      ...row('fortWall', FX - 590, FY - 400, 20, 60), ...row('fortWall', FX - 590, FY + 400, 9, 60), ...row('fortWall', FX + 110, FY + 400, 9, 60),
      ...row('fortWallV', FX - 620, FY - 370, 13, 0, 60), ...row('fortWallV', FX + 620, FY - 370, 13, 0, 60),
      { kind: 'fortTower', x: FX - 620, y: FY - 400 }, { kind: 'fortTower', x: FX + 620, y: FY - 400 }, { kind: 'fortTower', x: FX - 620, y: FY + 400 }, { kind: 'fortTower', x: FX + 620, y: FY + 400 },
      ...each('rockA', [[FX - 200, FY - 100], [FX + 220, FY + 120]]),
      ...each('bush', [[900, 1400], [2000, 1400], [700, 1100], [2200, 1100], [1440, 1500]]),
      ...each('oak', [[300, 300], [2600, 300], [300, 1400], [2600, 1450], [1000, 1550]]),
      ...row('wallBrick', 1000, 1300, 2, 300), ...row('wallBrick', 1750, 1300, 2, 300),
    ],
    points: { gateL: { x: FX - 160, y: FY + 500 }, gateR: { x: FX + 160, y: FY + 500 }, towerW: { x: FX - 620, y: FY + 520 }, towerE: { x: FX + 620, y: FY + 520 } },
    roads: { outside: [{ x: 400, y: 1200 }, { x: 400, y: 300 }, { x: 2480, y: 300 }, { x: 2480, y: 1200 }, { x: 400, y: 1200 }], ring: [{ x: FX - 330, y: FY - 220 }, { x: FX + 330, y: FY - 220 }, { x: FX + 330, y: FY + 200 }, { x: FX - 330, y: FY + 200 }] },
  },
  start: at(1.5, 2.85), startHeading: -Math.PI / 2,
  enemies: [
    { role: 'guard', clan: 'boars', tank: TANK.gunner, at: 'gateL', hpMult: 0.5 },
    { role: 'guard', clan: 'boars', tank: TANK.scout2, at: 'gateR' },
    { role: 'turret', clan: 'boars', tank: TANK.rocket, at: 'towerW', hpMult: 0.4 },
    { role: 'patrol', clan: 'boars', tank: TANK.scout, at: { x: 400, y: 1200 }, route: 'outside' },
  ],
  crates: [{ at: at(1.2, 2.6), content: { family: 'rockets', mk: 1 } }, { at: at(1.8, 2.6), content: 'kit' }, { at: at(0.4, 2.2) }, { at: at(2.6, 2.2) }, { at: at(0.3, 0.5), content: 'kit' }, { at: at(1.0, 1.9), content: 'kit' }, { at: at(2.0, 1.9), content: 'kit' }],
  objective: {
    kind: 'fortress',
    boss: { name: 'Iron Sow', hp: 1100, speed: 22, road: 'ring', turrets: [{ gun: 'cannon', dx: 30, dy: -34, hp: 160 }, { gun: 'cannon', dx: 30, dy: 34, hp: 160 }, { gun: 'rockets', dx: -34, dy: 0, hp: 200 }, { gun: 'machinegun', dx: 58, dy: 0, hp: 140 }] },
  },
  bonus: [{ kind: 'heavyWithRockets' }, { kind: 'noKit' }],
  loot: LOOT_LATE,
};

function path_(ground: 'dirt') {
  return { ground, shape: { kind: 'path' as const, pts: [at(1.5, 3), at(1.5, 1.4)], width: 90 } };
}
