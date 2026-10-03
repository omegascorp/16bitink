import type { Chapter, ChapterInfo, LevelDef, PowerUpId, SpawnEntry, SpeciesId } from './types';
import { applyTwists, twistsFor } from './twists';
import { LEVELS_PER_CHAPTER } from './zones';

/**
 * A chapter recipe: what lives there and how hard it gets. The generator
 * turns it into LEVELS_PER_CHAPTER levels with a smooth difficulty ramp,
 * then gives each level its own twist (see twists.ts), so 100 levels stay
 * cheap to author. Override individual levels via `overrides` when hand-tuning.
 */
/** A spawn-table entry in a recipe; `debut` makes it new to the game, arriving at that level index. */
export interface RecipeSpawn extends SpawnEntry {
  readonly debut?: number;
}

export interface ChapterRecipe {
  readonly names: readonly string[];
  /**
   * Spawn table. The FIRST entry is the chapter's staple prey: it keeps
   * its size and gets boosted in the school-rush level. The second entry
   * is the one marked for hunting in bounty levels. Every other
   * entry grows a little as the chapter goes on. Entries with a `debut`
   * only appear from that level on, so new species arrive as you play.
   */
  readonly spawns: readonly RecipeSpawn[];
  /** The chapter's giant: a species that appears nowhere else, once, in the last level. */
  readonly boss: SpeciesId;
  /** [first level, last level] values, interpolated. */
  readonly maxFish: readonly [number, number];
  readonly jellyfish: readonly [number, number];
  /** Seconds between hooks; 0 disables hooks (e.g. too deep for fishing lines). */
  readonly hookEverySec: readonly [number, number];
  /** Growth points needed to finish, first .. last level. */
  readonly goal: readonly [number, number];
  /** Player radius at the final tier, first .. last level. */
  readonly finalSize: readonly [number, number];
  readonly powerUps?: readonly PowerUpId[];
  readonly world?: { readonly width: number; readonly height: number };
  readonly overrides?: Readonly<Record<number, Partial<LevelDef>>>;
}

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const range = (r: readonly [number, number], t: number): number => lerp(r[0], r[1], t);

export function generateLevel(info: ChapterInfo, recipe: ChapterRecipe, index: number): LevelDef {
  const t = LEVELS_PER_CHAPTER > 1 ? index / (LEVELS_PER_CHAPTER - 1) : 0;
  const finale = index === LEVELS_PER_CHAPTER - 1;
  const goal = Math.round(range(recipe.goal, t) * (finale ? 1.15 : 1));
  const size = Math.round(range(recipe.finalSize, t));
  // Predators get a little bigger as the chapter goes on; prey stay put.
  const growth = 1 + t * 0.15 + (finale ? 0.1 : 0);
  const spawns = recipe.spawns
    .map((s, i) => ({
      species: s.species,
      weight: s.weight,
      size: i === 0 ? s.size : ([Math.round(s.size[0] * growth), Math.round(s.size[1] * growth)] as const),
      debut: s.debut,
    }))
    .filter((s) => (s.debut ?? 0) <= index)
    .map(({ debut: _debut, ...entry }) => entry);
  const base: LevelDef = {
    id: `c${info.id}-l${index + 1}`,
    chapter: info.id,
    name: recipe.names[index] ?? `${info.name} ${index + 1}`,
    tiers: [Math.round(goal * 0.22), Math.round(goal * 0.52), goal],
    playerSizes: [18, Math.round(lerp(18, size, 0.55)), size],
    world: recipe.world ?? { width: 3200, height: 1800 },
    spawns,
    maxFish: Math.round(range(recipe.maxFish, t)),
    hazards: {
      jellyfish: Math.round(range(recipe.jellyfish, t)),
      hookEverySec: recipe.hookEverySec[0] === 0 ? 0 : Math.round(range(recipe.hookEverySec, t)),
    },
    powerUps: recipe.powerUps ?? ['speed', 'shrink'],
    // Par grows with the goal; ~1.25 s per growth point.
    parTime: Math.round(goal * 1.25 + 15),
    twists: ['grow'],
    objective: { kind: 'grow' },
    modifiers: {},
    debuts: recipe.spawns.filter((s) => s.debut === index).map((s) => s.species),
  };
  return { ...applyTwists(base, twistsFor(info.id, index), { index, boss: recipe.boss }), ...recipe.overrides?.[index] };
}

export function generateChapter(info: ChapterInfo, recipe: ChapterRecipe): Chapter {
  const levels = Array.from({ length: LEVELS_PER_CHAPTER }, (_, i) => generateLevel(info, recipe, i));
  return { ...info, levels };
}
