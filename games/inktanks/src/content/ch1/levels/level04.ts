import type { LevelDef } from '../../../logic/level/types';
import { at, blob, bridge, each, LOOT_MIDDLE, path, row, TANK } from './kit';

/**
 * Level 4, Hold the Bridge (Hold): hold the south end of the river bridge
 * for 90 s, 3 × 3 screens. Waves come from three marked spots on the
 * north bank; most must cross the main bridge, some swing round by the
 * east bridge and hit your flank.
 */
const RIVER = [at(0, 1.3), at(1.0, 1.35), at(2.0, 1.25), at(3, 1.3)];
const MAIN = bridge(at(1.5, 1.3), 'y', 240);
const EAST = bridge(at(2.65, 1.27), 'y', 240);

export const LEVEL_04: LevelDef = {
  id: 'ch1-04', number: 4, name: 'Hold the Bridge', type: 'hold',
  briefing: 'The river bridge is the only way south for their tanks. Hold its south end for 90 seconds. They come in waves from the north bank.',
  teaches: 'Waves, water, choke points',
  map: {
    cols: 3, rows: 3, base: 'grass',
    // Later patches paint over earlier ones: the road first, then the river, then the decks.
    terrain: [path('dirt', [at(1.5, 0), at(1.5, 3)], 70), blob('dirt', 1440, 860, 220), blob('mud', 700, 1100, 140), path('water', RIVER, 150), MAIN.deck, EAST.deck],
    structures: [
      ...MAIN.rails, ...EAST.rails,
      ...row('wallBrick', 1260, 980, 1, 0), ...row('wallBrick', 1620, 980, 1, 0), { kind: 'wallBrickV', x: 1180, y: 860 }, { kind: 'wallBrickV', x: 1700, y: 860 },
      ...each('bush', [[1100, 1000], [1800, 1000], [1300, 1250], [2000, 900], [900, 900], [2300, 1100]]),
      ...each('oak', [[300, 300], [500, 200], [800, 350], [2200, 300], [2500, 420], [2700, 200], [300, 1300], [2600, 1400]]),
      ...each('rockB', [[1000, 400], [1900, 380], [600, 1450], [2300, 1450]]),
      { kind: 'farmhouse', x: 500, y: 1150 }, { kind: 'shed', x: 2300, y: 1250 }, ...row('fence', 1100, 1400, 6, 130),
    ],
    points: { bridgeEnd: { x: 1440, y: 860 }, nw: at(0.3, 0.1), n: at(1.5, 0.08), ne: at(2.7, 0.1) },
    roads: {},
  },
  start: at(1.5, 2.7), startHeading: -Math.PI / 2,
  enemies: [
    // One at a time first and lighter than the player (hpMult), so the first hold mission is beatable on the starter tank (owner: "can't pass it").
    { role: 'wave', clan: 'boars', tank: TANK.scout, at: 'n', when: 8, hpMult: 0.6 },
    { role: 'wave', clan: 'boars', tank: TANK.scout, at: 'nw', when: 24, hpMult: 0.6 },
    { role: 'wave', clan: 'boars', tank: TANK.scout, at: 'ne', when: 40, hpMult: 0.6 },
    { role: 'wave', clan: 'boars', tank: TANK.scout2, at: 'n', when: 56, hpMult: 0.6 },
    { role: 'wave', clan: 'boars', tank: TANK.scout, at: 'nw', when: 62, hpMult: 0.6 },
    { role: 'wave', clan: 'boars', tank: TANK.gunner, at: 'n', when: 76, hpMult: 0.5 },
  ],
  // A Cannon on the way to the bridge, as in levels 1–2, for a player still on the starter Machinegun.
  crates: [{ at: at(1.2, 2.3), content: { family: 'cannon', mk: 1 } }, { at: at(1.85, 2.35), content: 'kit' }, { at: at(0.7, 1.75) }, { at: at(2.4, 1.8) }],
  objective: { kind: 'hold', zone: 'bridgeEnd', radius: 220, seconds: 90 },
  bonus: [{ kind: 'noKit' }, { kind: 'kills', n: 6 }],
  loot: LOOT_MIDDLE,
};
