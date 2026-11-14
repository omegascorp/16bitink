import type { LevelDef } from '../../../logic/level/types';
import { at, blob, each, LOOT_EARLY, path, row, TANK } from './kit';

/**
 * Level 2, Barn Raid (Raid): blow up the Boars' 3 fuel stacks round the
 * orchard barn, 3 × 2 screens. Each stack has a guard; the orchard's
 * trees split the guards, so you can take them one by one or set off
 * the whole camp.
 */
const TRACK = [at(0.2, 1.6), at(0.9, 1.4), at(1.5, 1.05), at(2.2, 0.9), at(2.8, 0.5)];

export const LEVEL_02: LevelDef = {
  id: 'ch1-02', number: 2, name: 'Barn Raid', type: 'raid',
  briefing: 'The Boars keep their fuel in the orchard. Blow up the three barrel stacks. Shoot them from range; their guards come running.',
  teaches: 'Breakable targets, the alarm, the workshop after',
  map: {
    cols: 3, rows: 2, base: 'grass',
    terrain: [path('dirt', TRACK, 70), blob('grassDry', 1900, 500, 420), blob('mud', 900, 300, 120), blob('dirt', 2500, 300, 180)],
    structures: [
      { kind: 'barn', x: 1900, y: 470 },
      { kind: 'fuelBarrels', x: 1640, y: 300, tag: 'target' },
      { kind: 'fuelBarrels', x: 2200, y: 640, tag: 'target' },
      { kind: 'fuelBarrels', x: 2560, y: 240, tag: 'target' },
      ...row('oak', 1450, 140, 5, 0, 170), ...row('oak', 2050, 120, 3, 170), ...row('oak', 1700, 820, 4, 160),
      ...each('bush', [[700, 760], [1100, 650], [1300, 900], [2400, 900], [2700, 700], [500, 300]]),
      ...row('fence', 2000, 300, 3, 130), ...row('wallBrick', 1100, 400, 2, 130),
      { kind: 'shed', x: 2700, y: 450 }, { kind: 'shed', x: 600, y: 520 },
      ...each('pine', [[300, 120], [420, 160], [200, 420], [2850, 950], [2750, 980]]),
      { kind: 'crops', x: 950, y: 900 },
    ],
    points: { west: { x: 1700, y: 420 }, south: { x: 2250, y: 800 }, north: { x: 2600, y: 380 }, gate: { x: 1000, y: 560 } },
    roads: { orchard: [{ x: 1350, y: 980 }, { x: 2000, y: 980 }, { x: 2650, y: 820 }, { x: 2000, y: 980 }] },
  },
  start: { x: 200, y: 880 }, startHeading: -0.2,
  enemies: [
    // Starter-tank level: scouts at 45–60% HP, carrying the Cannon, Medium and Half-track intel.
    { role: 'guard', clan: 'boars', tank: 'cannon1/light1/wheels1', at: 'gate', hpMult: 0.4 },
    { role: 'guard', clan: 'boars', tank: 'machinegun1/medium1/halftracks1', at: 'west', hpMult: 0.4 },
    { role: 'guard', clan: 'boars', tank: 'cannon1/light1/halftracks1', at: 'south', hpMult: 0.35 },
    { role: 'guard', clan: 'boars', tank: 'machinegun1/medium1/wheels1', at: 'north', hpMult: 0.4 },
    { role: 'patrol', clan: 'boars', tank: TANK.scout, at: { x: 1350, y: 980 }, route: 'orchard', hpMult: 0.6 },
  ],
  crates: [{ at: { x: 560, y: 760 }, content: { family: 'cannon', mk: 1 } }, { at: { x: 760, y: 980 } }, { at: { x: 1200, y: 200 }, content: 'kit' }, { at: { x: 2800, y: 120 } }, { at: { x: 2300, y: 1000 } }],
  objective: { kind: 'raid', tag: 'target', label: 'Fuel stacks' },
  bonus: [{ kind: 'kills', n: 4 }, { kind: 'noKit' }],
  loot: LOOT_EARLY,
};
