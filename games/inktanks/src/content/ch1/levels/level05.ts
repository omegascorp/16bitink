import type { LevelDef } from '../../../logic/level/types';
import { at, blob, each, LOOT_MIDDLE, path, row, TANK } from './kit';

/**
 * Level 5, Weasel Ace (Ace): Sly, a Weasel ace on Mk II Wheels, holds
 * the far glade of the woods, 3 × 3 screens. Machineguns beat wheels: a Mk II
 * machinegun crate waits at the first clearing. Weasel scouts guard the
 * clearings and call Sly's loop to them when they see you.
 */
const LOOP = [at(0.8, 0.6), at(1.6, 0.4), at(2.4, 0.7), at(2.5, 1.6), at(2.2, 2.4), at(1.4, 2.3), at(0.9, 1.6), at(0.8, 0.6)];

const woods = (cx: number, cy: number): [number, number][] => [[cx - 120, cy - 60], [cx + 90, cy - 110], [cx + 140, cy + 70], [cx - 60, cy + 120], [cx - 170, cy + 40]];

export const LEVEL_05: LevelDef = {
  id: 'ch1-05', number: 5, name: 'Weasel Ace', type: 'ace',
  briefing: 'Sly, a Weasel ace on Mk II Wheels, runs the woods. Machineguns shred wheels. Destroy Sly: an ace carries rare tech.',
  teaches: 'Counters (Machinegun beats Wheels), rare intel',
  map: {
    cols: 3, rows: 3, base: 'grass',
    terrain: [path('dirt', LOOP, 70), blob('dirt', 1440, 810, 200), blob('mud', 700, 2400 - 900, 130), blob('grassDry', 2300, 300, 260)],
    structures: [
      ...each('pine', [...woods(500, 300), ...woods(1200, 1200), ...woods(2000, 1150), ...woods(1700, 1600 - 200), ...woods(400, 1350)]),
      ...each('oak', [...woods(1000, 300), ...woods(2600, 1100), ...woods(600, 900), ...woods(2000, 500)]),
      ...each('bush', [[1300, 650], [1600, 950], [900, 1100], [2100, 1500 - 300], [700, 1500], [2500, 1450]]),
      ...each('rockA', [[1440, 600], [1250, 900], [1640, 900], [2300, 1500]]),
      { kind: 'shed', x: 1440, y: 780 }, ...row('fence', 1300, 1000, 3, 120),
    ],
    points: { clearing: { x: 1440, y: 900 }, glade: at(2.3, 0.4), hollow: at(1.3, 2.4), creek: at(0.5, 1.2) },
    roads: { loop: LOOP },
  },
  start: at(0.25, 2.75), startHeading: -0.8,
  enemies: [
    // Sly holds the far glade and only leaves it to fight; a weasel patrol drives the loop.
    { role: 'guard', clan: 'weasels', tank: 'machinegun2/light2/wheels2', at: at(2.6, 0.3), leash: 520, name: 'Sly', ace: true, hpMult: 2.2 },
    { role: 'patrol', clan: 'weasels', tank: TANK.scout, at: at(1.6, 0.4), route: 'loop' },
    { role: 'guard', clan: 'weasels', tank: TANK.scout, at: 'clearing' },
    { role: 'guard', clan: 'weasels', tank: TANK.scout, at: 'glade' },
    { role: 'guard', clan: 'weasels', tank: 'rockets1/light1/wheels1', at: 'hollow' },
    { role: 'guard', clan: 'weasels', tank: TANK.scout2, at: 'creek' },
  ],
  crates: [{ at: at(0.55, 2.35), content: { family: 'machinegun', mk: 2 } }, { at: at(1.0, 1.9), content: 'kit' }, { at: at(2.0, 2.1) }, { at: at(2.7, 0.3) }, { at: at(0.3, 0.3) }],
  objective: { kind: 'ace' },
  bonus: [{ kind: 'intel', n: 25 }, { kind: 'noKit' }],
  loot: LOOT_MIDDLE,
};
