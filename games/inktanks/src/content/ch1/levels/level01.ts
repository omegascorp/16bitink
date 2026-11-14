import type { LevelDef } from '../../../logic/level/types';
import { blob, each, farmyard, LOOT_EARLY, path, row } from './kit';

/**
 * Level 1, First Tracks (Assault): four Boar scouts on the farm, 3 × 2
 * screens. You start in the south-west lane; a crate with a Cannon
 * sits just off it (teaches the swap; a Machinegun barely scratches a
 * Medium hull). One scout patrols the
 * pond, one guards the crops, one the farmyard, one the orchard: posted
 * more than an alarm radius apart, so they come one at a time. Their
 * Cannon, Medium and Half-track parts are the intel that unlocks those
 * families (design doc: "unlocked by the intel from levels 1–2").
 */
const LANE = [{ x: 240, y: 880 }, { x: 760, y: 820 }, { x: 1300, y: 700 }, { x: 1900, y: 560 }, { x: 2500, y: 520 }, { x: 2700, y: 300 }];

export const LEVEL_01: LevelDef = {
  id: 'ch1-01', number: 1, name: 'First Tracks', type: 'assault',
  briefing: 'Four Boar scouts are poking round the old farm. Drive in and knock them out. Crates hold parts: drive over one and hold E to swap.',
  teaches: 'Drive, aim, shoot, swap a part, intel',
  map: {
    cols: 3, rows: 2, base: 'grass',
    terrain: [path('dirt', LANE, 70), blob('dirt', 1900, 330, 230), blob('water', 520, 360, 110), blob('mud', 1000, 960, 90), blob('grassDry', 2500, 850, 250)],
    structures: [
      ...farmyard(1900, 300),
      { kind: 'crops', x: 1100, y: 260 }, { kind: 'crops', x: 1100, y: 440 },
      ...each('oak', [[120, 120], [300, 90], [80, 560], [2650, 950], [2300, 1000], [1500, 120], [2400, 750], [2600, 700], [2750, 800]]),
      ...each('bush', [[640, 640], [980, 600], [1450, 860], [420, 980], [2100, 760], [1600, 500], [2800, 520]]),
      ...row('wallBrick', 1250, 800, 2, 130), ...row('fenceV', 2250, 140, 2, 0, 130),
      ...each('rockA', [[700, 980], [2750, 120], [1700, 950]]),
      // Low cover (Tactics): sandbags and a hay bale facing the yard, sandbags facing the orchard. Shots pass over them close up.
      { kind: 'sandbags', x: 1720, y: 620 }, { kind: 'sandbags', x: 1816, y: 620 }, { kind: 'hayBale', x: 1650, y: 600 }, { kind: 'sandbagsV', x: 2330, y: 880 },
    ],
    points: { yard: { x: 1950, y: 420 }, orchard: { x: 2550, y: 880 }, crops: { x: 1250, y: 350 } },
    roads: { pond: [{ x: 300, y: 600 }, { x: 680, y: 600 }, { x: 680, y: 160 }, { x: 300, y: 160 }, { x: 300, y: 600 }] },
  },
  start: { x: 200, y: 900 }, startHeading: -0.3,
  enemies: [
    // Scouts at 60% HP: light and green, the first fight anyone has.
    { role: 'patrol', clan: 'boars', tank: 'machinegun1/light1/wheels1', at: { x: 300, y: 160 }, route: 'pond', hpMult: 0.6 },
    { role: 'guard', clan: 'boars', tank: 'cannon1/light1/wheels1', at: 'crops', hpMult: 0.4 },
    { role: 'guard', clan: 'boars', tank: 'machinegun1/medium1/halftracks1', at: 'yard', hpMult: 0.4 },
    { role: 'guard', clan: 'boars', tank: 'machinegun1/light1/halftracks1', at: 'orchard', hpMult: 0.5 },
  ],
  crates: [
    { at: { x: 520, y: 700 }, content: { family: 'cannon', mk: 1 } },
    { at: { x: 1250, y: 980 }, content: 'kit' },
    { at: { x: 2750, y: 420 } },
    { at: { x: 1650, y: 120 } },
  ],
  objective: { kind: 'assault' },
  bonus: [{ kind: 'swaps', n: 1 }, { kind: 'noKit' }],
  loot: LOOT_EARLY,
};
