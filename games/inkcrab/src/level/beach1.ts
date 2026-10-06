import type { LevelDef } from './types';

/**
 * Beach 1, the free one: a temperate sandy beach. Every level starts a
 * size-1 crab in a periwinkle shell and asks for a little more growth than the
 * last, each teaching one thing (see docs/inkcrab-levels.md). Gulls, the
 * tide and the final molt aren't built yet; until they are, big ghost crabs
 * stand in for the danger and shells lie where the tide would bring them.
 */
export const BEACH_1_NAME = 'Driftline Sketchbook';

export const BEACH_1: readonly LevelDef[] = [
  {
    id: 'pen-test', name: 'Pen Test', seed: 101, width: 56, height: 30, parTime: 100,
    hint: 'Eat to grow; jump with Space. When the periwinkle is full, move into the snail shell (E).',
    profile: [[0, 15], [16, 15], [17, 13], [30, 13], [42, 14], [55, 12]],
    startCol: 6,
    shells: [['snail', 44, 0]],
    food: { surface: 8, buried: 0 },
  },
  {
    id: 'room-to-grow', name: 'Room to Grow', seed: 102, width: 72, height: 30, parTime: 180,
    hint: 'Every full shell means a bigger one somewhere on the beach.',
    profile: [[0, 14], [20, 14], [21, 12], [40, 12], [48, 13], [60, 13], [61, 11], [71, 11]],
    startCol: 6,
    shells: [['snail', 26, 0], ['bulb', 64, 0]],
    food: { surface: 10, buried: 0 },
  },
  {
    id: 'underlined', name: 'Underlined', seed: 103, width: 64, height: 34, parTime: 220,
    hint: 'The light bulb is buried. Dig with X; when you\'re full of sand, drop some with C.',
    profile: [[0, 12], [30, 13], [63, 12]],
    startCol: 6,
    shells: [['snail', 16, 0], ['bulb', 40, 6]],
    food: { surface: 8, buried: 6, clams: [[30, 3], [36, 5], [46, 4]] },
  },
  {
    id: 'margin-wall', name: 'Margin Wall', seed: 104, width: 70, height: 34, parTime: 320,
    hint: 'The tin can is up on the shelf. Jump and drop sand under you (↓ + C) to build up.',
    profile: [[0, 16], [36, 16], [37, 11], [50, 11], [51, 16], [69, 16]],
    startCol: 6,
    shells: [['snail', 18, 0], ['can', 44, 0]],
    food: { surface: 12, buried: 6 },
  },
  {
    id: 'ghost-writers', name: 'Ghost Writers', seed: 105, width: 84, height: 34, parTime: 360,
    hint: 'Red ghost crabs can catch you; highlighted ones are food. Hold Z to hide in your shell.',
    profile: [[0, 13], [12, 14], [20, 16], [28, 14], [44, 14], [52, 17], [60, 15], [83, 15]],
    startCol: 8,
    shells: [['snail', 22, 0], ['can', 56, 0]],
    food: { surface: 6, buried: 4 },
    critters: [{ count: 6, sizes: [1, 2] }, { count: 1, sizes: [5, 5] }],
  },
  {
    id: 'shadow-sketch', name: 'Shadow Sketch', seed: 106, width: 92, height: 34, parTime: 400,
    hint: 'Open sand and big hunters. Hide in your shell (Z) when one comes close.',
    profile: [[0, 11], [30, 12], [60, 13], [91, 14]],
    startCol: 8,
    shells: [['snail', 24, 0], ['can', 64, 0]],
    food: { surface: 8, buried: 4 },
    critters: [{ count: 4, sizes: [1, 3] }, { count: 2, sizes: [6, 6] }],
  },
  {
    id: 'high-water-mark', name: 'High-Water Mark', seed: 107, width: 96, height: 36, parTime: 480,
    hint: 'Down by the water lies a moon snail: room to grow to size 6.',
    profile: [[0, 10], [40, 14], [70, 19], [95, 21]],
    startCol: 8,
    shells: [['snail', 20, 0], ['bulb', 38, 0], ['whelk', 58, 0], ['moonsnail', 88, 0]],
    food: { surface: 10, buried: 6 },
    critters: [{ count: 3, sizes: [1, 4] }, { count: 1, sizes: [7, 7] }],
  },
  {
    id: 'safe-burrow', name: 'Safe Burrow', seed: 108, width: 100, height: 36, parTime: 560,
    hint: 'Moving house leaves you exposed. Dig a burrow around the buried jar before you move in.',
    profile: [[0, 12], [50, 13], [99, 15]],
    startCol: 8,
    shells: [['snail', 18, 0], ['can', 36, 0], ['moonsnail', 58, 0], ['jar', 80, 3]],
    food: { surface: 10, buried: 8 },
    critters: [{ count: 4, sizes: [1, 5] }, { count: 2, sizes: [7, 8] }],
  },
  {
    id: 'storm-tide', name: 'Storm Tide', seed: 109, width: 104, height: 40, parTime: 640,
    hint: 'Climb the beach shell by shell: the conch waits on top of the high dune.',
    profile: [[0, 8], [10, 8], [24, 16], [60, 18], [103, 20]],
    startCol: 96,
    shells: [['snail', 84, 0], ['can', 66, 0], ['moonsnail', 46, 0], ['jar', 30, 0], ['conch', 5, 0]],
    food: { surface: 12, buried: 8 },
    critters: [{ count: 4, sizes: [1, 6] }, { count: 2, sizes: [8, 8] }],
  },
  {
    id: 'the-final-molt', name: 'The Final Molt', seed: 110, width: 120, height: 42, parTime: 800,
    hint: 'Every shell on the beach, from the periwinkle to the conch on the high dune.',
    profile: [[0, 9], [12, 9], [26, 17], [60, 19], [90, 22], [119, 23]],
    rocks: [[48, 30, 3], [100, 34, 3.5]],
    startCol: 110,
    shells: [['snail', 100, 0], ['bulb', 88, 0], ['whelk', 74, 0], ['moonsnail', 60, 0], ['coconut', 44, 4], ['conch', 6, 0]],
    food: { surface: 14, buried: 12 },
    critters: [{ count: 5, sizes: [1, 6] }, { count: 2, sizes: [7, 8] }],
  },
];
