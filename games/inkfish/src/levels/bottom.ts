import type { SpawnEntry, ZoneId } from './types';

/**
 * Who walks the seabed in each zone. A crawler's `debut` (level index in the
 * chapter) marks the first time it appears anywhere in the game, so the intro
 * card can announce it; later zones list it without one.
 */
export interface BottomEntry extends SpawnEntry {
  readonly debut?: number;
}

const b = (species: SpawnEntry['species'], weight: number, min: number, max: number, debut?: number): BottomEntry =>
  debut === undefined ? { species, weight, size: [min, max] } : { species, weight, size: [min, max], debut };

export const BOTTOM_LIFE: Readonly<Record<ZoneId, { readonly crawlers: readonly BottomEntry[]; readonly count: readonly [number, number] }>> = {
  tidepool: { crawlers: [b('periwinkle', 4, 8, 13, 0), b('shorecrab', 3, 12, 30, 1), b('hermitcrab', 2, 12, 22, 3)], count: [5, 7] },
  seagrass: { crawlers: [b('shrimp', 4, 9, 15, 0), b('hermitcrab', 2, 12, 24), b('shorecrab', 2, 16, 34)], count: [5, 8] },
  kelp: { crawlers: [b('periwinkle', 3, 8, 13), b('urchin', 2, 14, 26, 0), b('shorecrab', 3, 14, 36)], count: [5, 8] },
  reef: { crawlers: [b('shrimp', 4, 9, 15), b('hermitcrab', 3, 14, 26), b('urchin', 2, 16, 30)], count: [6, 8] },
  wreck: { crawlers: [b('shrimp', 3, 9, 15), b('shorecrab', 3, 14, 34), b('lobster', 2, 26, 54, 0)], count: [5, 7] },
  dropoff: { crawlers: [b('shrimp', 4, 9, 15), b('spidercrab', 2, 28, 58, 0)], count: [4, 6] },
  twilight: { crawlers: [b('shrimp', 4, 9, 15), b('spidercrab', 2, 30, 60)], count: [3, 5] },
  midnight: { crawlers: [b('shrimp', 3, 9, 15), b('isopod', 3, 18, 38, 0)], count: [3, 5] },
  abyss: { crawlers: [b('seapig', 4, 14, 26, 0), b('isopod', 3, 18, 40)], count: [3, 5] },
  trench: { crawlers: [b('seapig', 3, 14, 26), b('isopod', 4, 20, 42)], count: [2, 4] },
};
