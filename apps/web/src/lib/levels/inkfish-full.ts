import type { Chapter, LevelDef, SpawnEntry } from '@16bitink/inkfish/levels';

/**
 * Paid chapters. Server-only: never imported by client code, served by
 * /api/levels/inkfish to verified owners.
 */

const WORLD = { width: 3600, height: 2000 } as const;

interface Draft {
  readonly name: string;
  readonly tiers: readonly [number, number, number];
  readonly sizes: readonly [number, number, number];
  readonly spawns: readonly SpawnEntry[];
  readonly maxFish: number;
  readonly jellyfish: number;
  readonly hookEverySec: number;
  readonly parTime: number;
}

function chapter(id: number, name: string, drafts: readonly Draft[]): Chapter {
  const levels: LevelDef[] = drafts.map((d, i) => ({
    id: `c${id}-l${i + 1}`, chapter: id, name: d.name,
    tiers: d.tiers, playerSizes: d.sizes, world: WORLD, spawns: d.spawns, maxFish: d.maxFish,
    hazards: { jellyfish: d.jellyfish, hookEverySec: d.hookEverySec }, powerUps: ['speed', 'shrink'], parTime: d.parTime,
  }));
  return { id, name, levels };
}

const kelp = chapter(2, 'Kelp Margins', [
  { name: 'Tangled Lines', tiers: [24, 56, 100], sizes: [18, 32, 50], maxFish: 34, jellyfish: 3, hookEverySec: 14, parTime: 110,
    spawns: [{ species: 'minnow', weight: 4, size: [8, 14] }, { species: 'perch', weight: 3, size: [22, 38] }, { species: 'pike', weight: 2.5, size: [46, 66] }] },
  { name: 'Puffer Parade', tiers: [26, 60, 110], sizes: [18, 34, 52], maxFish: 36, jellyfish: 4, hookEverySec: 13, parTime: 115,
    spawns: [{ species: 'minnow', weight: 4, size: [8, 14] }, { species: 'puffer', weight: 4, size: [24, 40] }, { species: 'pike', weight: 2, size: [50, 68] }] },
  { name: 'Ambush Alley', tiers: [28, 64, 120], sizes: [18, 34, 54], maxFish: 36, jellyfish: 4, hookEverySec: 12, parTime: 125,
    spawns: [{ species: 'minnow', weight: 4, size: [8, 14] }, { species: 'perch', weight: 2, size: [22, 38] }, { species: 'angler', weight: 3, size: [36, 56] }, { species: 'pike', weight: 1.5, size: [52, 70] }] },
  { name: 'The Long Eel', tiers: [30, 70, 130], sizes: [18, 36, 58], maxFish: 38, jellyfish: 5, hookEverySec: 11, parTime: 135,
    spawns: [{ species: 'minnow', weight: 4, size: [8, 14] }, { species: 'perch', weight: 3, size: [24, 40] }, { species: 'eel', weight: 2.5, size: [60, 84] }] },
]);

const wreck = chapter(3, 'Shipwreck Sketches', [
  { name: 'Barnacle Bay', tiers: [30, 70, 130], sizes: [18, 36, 56], maxFish: 38, jellyfish: 5, hookEverySec: 10, parTime: 130,
    spawns: [{ species: 'minnow', weight: 4, size: [8, 14] }, { species: 'puffer', weight: 3, size: [26, 42] }, { species: 'pike', weight: 2.5, size: [50, 70] }] },
  { name: 'Porthole Panic', tiers: [32, 74, 140], sizes: [18, 36, 58], maxFish: 40, jellyfish: 6, hookEverySec: 9, parTime: 140,
    spawns: [{ species: 'minnow', weight: 4, size: [8, 14] }, { species: 'perch', weight: 3, size: [24, 40] }, { species: 'angler', weight: 3, size: [38, 58] }] },
  { name: 'Anchor’s Shadow', tiers: [34, 80, 150], sizes: [18, 38, 60], maxFish: 40, jellyfish: 6, hookEverySec: 8, parTime: 150,
    spawns: [{ species: 'minnow', weight: 4, size: [8, 14] }, { species: 'pike', weight: 3, size: [50, 72] }, { species: 'eel', weight: 2, size: [64, 86] }] },
]);

const abyss = chapter(4, 'The Abyssal Blot', [
  { name: 'Lantern Light', tiers: [36, 84, 160], sizes: [18, 38, 62], maxFish: 42, jellyfish: 7, hookEverySec: 0, parTime: 160,
    spawns: [{ species: 'minnow', weight: 4, size: [8, 14] }, { species: 'angler', weight: 4, size: [38, 62] }, { species: 'eel', weight: 2, size: [66, 90] }] },
  { name: 'Deep Crosshatch', tiers: [38, 90, 170], sizes: [18, 40, 64], maxFish: 44, jellyfish: 8, hookEverySec: 0, parTime: 170,
    spawns: [{ species: 'minnow', weight: 4, size: [8, 14] }, { species: 'puffer', weight: 2, size: [28, 46] }, { species: 'angler', weight: 3, size: [40, 64] }, { species: 'pike', weight: 2, size: [56, 76] }] },
  { name: 'The Last Page', tiers: [40, 96, 185], sizes: [18, 40, 68], maxFish: 46, jellyfish: 8, hookEverySec: 7, parTime: 185,
    spawns: [{ species: 'minnow', weight: 4, size: [8, 14] }, { species: 'perch', weight: 2, size: [24, 42] }, { species: 'angler', weight: 3, size: [40, 64] }, { species: 'eel', weight: 3, size: [70, 96] }] },
]);

export const INKFISH_FULL_CHAPTERS: readonly Chapter[] = [kelp, wreck, abyss];
