import { GRAPHITE } from '../art/palette';
import type { PlanetDef } from './types';

/**
 * Planet 1, Graphite (free): a grey moon of soft dark rock. It teaches the
 * game, one idea a level (spec, "Planet 1: Graphite"). Levels 1–5 are
 * built; 6–10 wait for the creatures (the lead worms, the Grinder).
 *
 * The starter drill can't break Graphite's stone, so levels 1–4 keep to
 * soil, caves and fissures, with firedamp as the way through a vault's stone
 * wall. Level 4 hands out the drill's blueprint and its intro card names
 * the materials, so they're banked on the way to the core; level 5 is built
 * for the new drill.
 */
export const PLANET_1: PlanetDef = {
  number: 1,
  name: 'Graphite',
  blurb: 'A grey moon of soft dark rock, pencil lead in its seams.',
  style: GRAPHITE,
  signature: 'graphite',
  levels: [
    {
      id: 'first-strike', name: 'First Strike', drill: 0,
      hint: 'Push into the ground to drill. Ore flies into your bag; walk back to the lander to bank it.',
      site: {
        width: 48, height: 64, seed: 1101, surface: 10, landerCol: 8,
        stone: 22, deep: 44, caves: 3, caveFrom: 8,
        ores: [
          { ore: 'copper', from: 1, to: 12, veins: 9, size: [3, 5] },
          { ore: 'galena', from: 6, to: 18, veins: 5, size: [2, 4] },
          { ore: 'graphite', from: 8, to: 20, veins: 2, size: [2, 3] },
        ],
        firedamp: 0,
        rooms: [{ at: [34, 10], w: 8, h: 3 }],
      },
      items: [],
      mission: { goals: [{ kind: 'ore', ore: 'copper', count: 5 }], pays: { galena: 4, graphite: 2 } },
      contracts: [
        { kind: 'order', ore: 'galena', count: 4, pay: { quartz: 1 } },
        { kind: 'deep', depth: 16, pay: { copper: 6 } },
      ],
    },
    {
      id: 'lead-lines', name: 'Lead Lines', drill: 0,
      hint: 'Every block costs energy. Grey cross-hatched stone is too hard for this drill: follow the soil. Mind the hissing firedamp by the seams.',
      site: {
        width: 56, height: 72, seed: 1202, surface: 11, landerCol: 9,
        stone: 18, deep: 46, caves: 4, caveFrom: 6,
        ores: [
          { ore: 'copper', from: 1, to: 14, veins: 8, size: [3, 5] },
          { ore: 'graphite', from: 4, to: 16, veins: 7, size: [2, 4] },
          { ore: 'galena', from: 6, to: 16, veins: 4, size: [2, 3] },
          { ore: 'quartz', from: 20, to: 40, veins: 3, size: [1, 2] },
        ],
        firedamp: 4,
        rooms: [{ at: [40, 12], w: 9, h: 3 }],
      },
      items: [],
      mission: { goals: [{ kind: 'ore', ore: 'graphite', count: 3 }], pays: { quartz: 2 }, blueprint: 'cell-1' },
      contracts: [
        { kind: 'deep', depth: 15, pay: { galena: 4 } },
        { kind: 'clean', pay: { silver: 1 } },
      ],
    },
    {
      id: 'tick-marks', name: 'Tick Marks', drill: 0,
      hint: 'Somewhere off the path is a vault walled in stone. Firedamp in its wall would blow it open: drill the pocket, then get clear.',
      site: {
        width: 64, height: 84, seed: 1303, surface: 12, landerCol: 10,
        stone: 20, deep: 50, caves: 5, caveFrom: 6,
        ores: [
          { ore: 'copper', from: 1, to: 16, veins: 10, size: [3, 5] },
          { ore: 'galena', from: 4, to: 18, veins: 7, size: [2, 4] },
          { ore: 'graphite', from: 6, to: 18, veins: 6, size: [2, 4] },
          { ore: 'silver', from: 22, to: 46, veins: 3, size: [2, 3] },
        ],
        firedamp: 5,
        vaults: [{ at: [46, 9], w: 4, h: 3, wall: 'stone' }],
        // The way in: two pockets in the vault's left wall, one behind the other.
        pockets: [[44, 10], [45, 10]],
      },
      items: [
        { kind: 'blueprint', at: [47, 11], blueprint: 'pack-1' },
        { kind: 'fossil', at: [24, 13], grade: 'soil' },
      ],
      mission: { goals: [{ kind: 'pieces', count: 25 }], pays: { silver: 2, quartz: 1 } },
      contracts: [
        { kind: 'specimen', pay: { quartz: 2 } },
        { kind: 'order', ore: 'galena', count: 6, pay: { silver: 2 } },
      ],
    },
    {
      id: 'core-sample', name: 'Core Sample', drill: 0,
      hint: 'Follow the fissure down to the core at 60 m. Too far to fly back up? Recall (R): the lander winches you up, but the bag is dropped.',
      site: {
        width: 72, height: 100, seed: 1404, surface: 12, landerCol: 10,
        stone: 26, deep: 80, caves: 5, caveFrom: 6,
        ores: [
          { ore: 'copper', from: 1, to: 20, veins: 9, size: [3, 5] },
          { ore: 'galena', from: 3, to: 22, veins: 9, size: [3, 4] },
          { ore: 'graphite', from: 5, to: 22, veins: 8, size: [2, 4] },
          { ore: 'quartz', from: 28, to: 70, veins: 5, size: [1, 2] },
          { ore: 'silver', from: 40, to: 76, veins: 4, size: [2, 3] },
        ],
        firedamp: 6,
        // A fissure from the bottom of the soil down to a cave at the core.
        tunnels: [[[30, 20], [37, 29], [29, 38], [36, 47], [43, 53], [40, 58]]],
        rooms: [{ at: [40, 58], w: 9, h: 3 }],
      },
      items: [{ kind: 'core', at: [40, 60], grade: 'soil' }],
      mission: { goals: [{ kind: 'core', depth: 60 }], pays: { silver: 2, quartz: 2 }, blueprint: 'drill-1' },
      contracts: [
        { kind: 'order', ore: 'copper', count: 8, pay: { galena: 4 } },
        { kind: 'clean', pay: { quartz: 1, silver: 1 } },
      ],
    },
    {
      id: 'lost-probe', name: 'Lost Probe', drill: 1,
      hint: 'Your new drill breaks stone (2 energy a block). The probe came down in a cave to the east. A vault hides behind a soil plug in deep rock.',
      site: {
        width: 80, height: 110, seed: 1505, surface: 12, landerCol: 10,
        stone: 14, deep: 64, caves: 7, caveFrom: 8,
        ores: [
          { ore: 'copper', from: 1, to: 14, veins: 8, size: [3, 5] },
          { ore: 'galena', from: 6, to: 30, veins: 8, size: [3, 4] },
          { ore: 'graphite', from: 6, to: 40, veins: 9, size: [2, 4] },
          { ore: 'quartz', from: 18, to: 56, veins: 8, size: [1, 2] },
          { ore: 'silver', from: 30, to: 60, veins: 6, size: [2, 4] },
        ],
        firedamp: 8,
        rooms: [{ at: [62, 42], w: 10, h: 4 }],
        // An earlier crew's line of charges above the cave they never fired.
        charges: [
          { kind: 'charge', at: [58, 37] },
          { kind: 'charge', at: [62, 37] },
          { kind: 'charge', at: [66, 37] },
        ],
        vaults: [{ at: [20, 34], w: 4, h: 3, wall: 'deep', door: 'top' }],
      },
      items: [
        { kind: 'probe', at: [63, 43] },
        { kind: 'blueprint', at: [21, 36], blueprint: 'helmet-1' },
      ],
      mission: { goals: [{ kind: 'salvage', item: 'probe' }], pays: { silver: 4, quartz: 2 } },
      contracts: [
        { kind: 'order', ore: 'quartz', count: 3, pay: { silver: 3 } },
        { kind: 'careful', pay: { quartz: 2 } },
      ],
    },
  ],
  drafts: ['Wormholes', 'Field Notes', 'Pencil Pusher', 'Deep Draft', 'The Grinder'],
};
