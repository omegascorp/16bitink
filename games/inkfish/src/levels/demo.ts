import type { Chapter, LevelDef } from './types';

const WORLD = { width: 3200, height: 1800 } as const;

const tidePool: LevelDef[] = [
  {
    id: 'c1-l1', chapter: 1, name: 'First Doodle',
    tiers: [12, 30, 55], playerSizes: [18, 28, 40], world: WORLD,
    spawns: [
      { species: 'minnow', weight: 6, size: [8, 14] },
      { species: 'perch', weight: 3, size: [20, 34] },
      { species: 'pike', weight: 1, size: [44, 56] },
    ],
    maxFish: 26, hazards: { jellyfish: 0, hookEverySec: 0 }, powerUps: ['speed'], parTime: 70,
  },
  {
    id: 'c1-l2', chapter: 1, name: 'Margin Notes',
    tiers: [16, 38, 70], playerSizes: [18, 30, 44], world: WORLD,
    spawns: [
      { species: 'minnow', weight: 5, size: [8, 14] },
      { species: 'perch', weight: 3, size: [22, 36] },
      { species: 'puffer', weight: 2, size: [26, 40] },
      { species: 'pike', weight: 1.5, size: [46, 60] },
    ],
    maxFish: 28, hazards: { jellyfish: 2, hookEverySec: 0 }, powerUps: ['speed', 'shrink'], parTime: 85,
  },
  {
    id: 'c1-l3', chapter: 1, name: 'Crosshatch Current',
    tiers: [18, 42, 80], playerSizes: [18, 30, 46], world: WORLD,
    spawns: [
      { species: 'minnow', weight: 5, size: [8, 14] },
      { species: 'perch', weight: 3, size: [22, 36] },
      { species: 'angler', weight: 1.5, size: [34, 50] },
      { species: 'pike', weight: 2, size: [48, 64] },
    ],
    maxFish: 30, hazards: { jellyfish: 3, hookEverySec: 18 }, powerUps: ['speed', 'shrink'], parTime: 95,
  },
  {
    id: 'c1-l4', chapter: 1, name: 'Blotted Reef',
    tiers: [20, 48, 90], playerSizes: [18, 32, 48], world: WORLD,
    spawns: [
      { species: 'minnow', weight: 4, size: [8, 14] },
      { species: 'perch', weight: 3, size: [22, 38] },
      { species: 'puffer', weight: 2, size: [28, 42] },
      { species: 'angler', weight: 2, size: [36, 52] },
      { species: 'pike', weight: 2, size: [50, 66] },
    ],
    maxFish: 32, hazards: { jellyfish: 4, hookEverySec: 14 }, powerUps: ['speed', 'shrink'], parTime: 105,
  },
  {
    id: 'c1-l5', chapter: 1, name: 'The Inkwell',
    tiers: [22, 55, 105], playerSizes: [18, 34, 52], world: WORLD,
    spawns: [
      { species: 'minnow', weight: 4, size: [8, 14] },
      { species: 'perch', weight: 3, size: [24, 40] },
      { species: 'angler', weight: 2, size: [38, 54] },
      { species: 'pike', weight: 2, size: [52, 70] },
      { species: 'eel', weight: 1, size: [62, 80] },
    ],
    maxFish: 34, hazards: { jellyfish: 5, hookEverySec: 12 }, powerUps: ['speed', 'shrink'], parTime: 120,
  },
];

/** Bundled with the client. Everything else is served only to owners. */
export const DEMO_CHAPTER: Chapter = { id: 1, name: 'Tide Pool Sketchbook', levels: tidePool };

/** Teasers shown as pencil drafts on the level-select screen. */
export const LOCKED_CHAPTER_TEASERS = [
  { id: 2, name: 'Kelp Margins' },
  { id: 3, name: 'Shipwreck Sketches' },
  { id: 4, name: 'The Abyssal Blot' },
] as const;
