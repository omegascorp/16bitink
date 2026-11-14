import type { LevelDef } from '../../../logic/level/types';
import { at, blob, each, LOOT_LATE, patch, row, TANK } from './kit';

/**
 * Level 8, Wreck in the Rails (Salvage): a prototype crashed in the rail
 * yard's north-east corner, 3 × 3 screens. Bring it to the pick-up by the
 * farm. Carrying it slows you, every guard is told where you are, and
 * hunters come in from the east when you pick it up. Wagons are cover.
 */
export const LEVEL_08: LevelDef = {
  id: 'ch1-08', number: 8, name: 'Wreck in the Rails', type: 'salvage',
  briefing: 'A prototype crashed in the rail yard. Take it to the pick-up by the farm. Carrying it slows you, and every Boar in the yard will come for it.',
  teaches: 'Being hunted, cover',
  map: {
    cols: 3, rows: 3, base: 'grass',
    terrain: [patch('dirt', 0, 420, 2880, 70), patch('dirt', 0, 900, 2880, 70), patch('dirt', 1300, 0, 70, 1620), blob('dirt', 2450, 300, 260), blob('grassDry', 600, 1300, 300), blob('mud', 1900, 1250, 140)],
    structures: [
      ...row('wagon', 300, 380, 4, 260), ...row('wagon', 1700, 380, 3, 300), ...row('wagon', 500, 860, 3, 320), ...row('wagon', 1700, 860, 3, 280),
      { kind: 'hangar', x: 2500, y: 650 }, { kind: 'shed', x: 2100, y: 200 }, { kind: 'shed', x: 1000, y: 650 },
      ...row('wallBrick', 2200, 1100, 3, 130), { kind: 'wallBrickV', x: 2000, y: 640 },
      ...each('bush', [[400, 1100], [900, 1200], [1500, 1150], [2300, 1400], [800, 200], [1600, 650]]),
      ...each('oak', [[200, 1500], [700, 1550], [2700, 1500], [2600, 1200]]),
      { kind: 'farmhouse', x: 350, y: 1300 }, ...row('fence', 500, 1450, 3, 130),
      ...each('rockC', [[2750, 100], [2300, 120]]),
    ],
    points: { wreck: at(2.6, 0.45), pickup: at(0.6, 2.5), yard: at(2.2, 0.6), shed: at(1.6, 0.35), crossing: at(1.4, 1.2), eastN: at(2.95, 0.9), eastS: at(2.95, 2.3) },
    roads: { rails: [at(0.3, 1.25), at(2.7, 1.25)], spur: [at(1.4, 0.2), at(1.4, 2.6)] },
  },
  start: at(0.4, 2.7), startHeading: -0.5,
  enemies: [
    { role: 'guard', clan: 'boars', tank: TANK.gunner, at: 'yard', hpMult: 0.8 },
    { role: 'guard', clan: 'boars', tank: TANK.scout2, at: 'shed' },
    { role: 'guard', clan: 'boars', tank: TANK.scout, at: 'crossing' },
    { role: 'patrol', clan: 'boars', tank: TANK.scout, at: at(0.3, 1.25), route: 'rails' },
    { role: 'patrol', clan: 'boars', tank: TANK.rocket, at: at(1.4, 0.2), route: 'spur', hpMult: 0.6 },
    { role: 'wave', clan: 'boars', tank: TANK.scout, at: 'eastN', when: 'stage' },
    { role: 'wave', clan: 'boars', tank: TANK.scout, at: 'eastS', when: 'stage' },
  ],
  crates: [{ at: at(1.0, 2.2) }, { at: at(1.9, 1.6), content: 'kit' }, { at: at(0.4, 0.2) }, { at: at(2.8, 1.7) }, { at: at(2.0, 0.15) }],
  objective: { kind: 'salvage', at: 'wreck', pickup: 'pickup' },
  bonus: [{ kind: 'kills', n: 5 }, { kind: 'noKit' }],
  loot: LOOT_LATE,
};
