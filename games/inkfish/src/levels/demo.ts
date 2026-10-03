import { generateChapter, type ChapterRecipe } from './generate';
import type { Chapter, ChapterInfo } from './types';
import { LEVELS_PER_CHAPTER, ZONE_INFO } from './zones';

/** Chapter 1, the free one. Bundled with the client; every other recipe lives on the server. */
const TIDE_POOL: ChapterRecipe = {
  names: [
    'First Doodle', 'Margin Notes', 'Crosshatch Current', 'Blotted Reef', 'School Rush',
    'Smudge Shallows', 'Nib Narrows', 'Rockpool Rumble', 'Low Tide', 'The Inkwell',
  ],
  spawns: [
    { species: 'minnow', weight: 5, size: [8, 14] },
    { species: 'perch', weight: 3, size: [20, 34] },
    { species: 'puffer', weight: 1.5, size: [26, 40] },
    { species: 'pike', weight: 1.5, size: [44, 58] },
  ],
  maxFish: [26, 34],
  jellyfish: [0, 5],
  hookEverySec: [20, 12],
  goal: [55, 110],
  finalSize: [40, 52],
  overrides: {
    0: { powerUps: ['speed'], hazards: { jellyfish: 0, hookEverySec: 0 } },
    1: { hazards: { jellyfish: 2, hookEverySec: 0 } },
  },
};

const tidePoolInfo = ZONE_INFO[0]!;
export const DEMO_CHAPTER: Chapter = generateChapter(tidePoolInfo, TIDE_POOL);

/** Paid chapters, drawn as pencil drafts on the map until owned. */
export const LOCKED_CHAPTER_TEASERS: readonly (ChapterInfo & { readonly levelCount: number })[] = ZONE_INFO
  .filter((z) => z.id !== tidePoolInfo.id)
  .map((z) => ({ ...z, levelCount: LEVELS_PER_CHAPTER }));
