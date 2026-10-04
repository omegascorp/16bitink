import { BOTTOM_LIFE } from './bottom';
import { itemsForLevel } from './items';
import type { Chapter, ChapterInfo, LevelDef, SpawnEntry, SpeciesId } from './types';
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

/**
 * One level as authored. Its id is permanent: saves (on the device and in
 * the player's account) are keyed by it, so never change or reuse an id,
 * even when the level is renamed, moved or removed.
 */
export interface RecipeLevel {
  readonly id: string;
  readonly name: string;
}

export interface ChapterRecipe {
  /** Exactly LEVELS_PER_CHAPTER, in play order. */
  readonly levels: readonly RecipeLevel[];
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
  readonly world?: { readonly width: number; readonly height: number };
  readonly overrides?: Readonly<Record<number, Partial<LevelDef>>>;
}

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const range = (r: readonly [number, number], t: number): number => lerp(r[0], r[1], t);

/** Player radius at the first growth stage, in every level. */
export const START_SIZE = 18;

/**
 * Growth stages per chapter. Later fish grow much bigger, so they get more
 * stages to keep each stage-up a similar ~1.3-1.5x step rather than one
 * huge jump that turns every predator into prey at once.
 */
export function stagesFor(chapter: number): number {
  if (chapter <= 1) return 3;
  if (chapter <= 5) return 4;
  return 5;
}

/**
 * Sizes grow by the same factor at every stage-up. Each stage's share of
 * the goal is proportional to its size, since bigger fish eat bigger
 * (more valuable) meals, so every stage takes roughly the same time.
 */
export function growthStages(goal: number, finalSize: number, stages: number): Pick<LevelDef, 'tiers' | 'playerSizes'> {
  const step = (finalSize / START_SIZE) ** (1 / (stages - 1));
  const exact = Array.from({ length: stages }, (_, i) => START_SIZE * step ** i);
  const total = exact.reduce((sum, v) => sum + v, 0);
  const tiers = exact.map((_, i) => Math.round((goal * exact.slice(0, i + 1).reduce((sum, v) => sum + v, 0)) / total));
  return { tiers, playerSizes: exact.map((v, i) => (i === stages - 1 ? finalSize : Math.round(v))) };
}

export function generateLevel(info: ChapterInfo, recipe: ChapterRecipe, index: number): LevelDef {
  const authored = recipe.levels[index];
  if (!authored) throw new Error(`Chapter ${info.id} has no level ${index + 1}`);
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
  const life = BOTTOM_LIFE[info.zone];
  const bottom = life.crawlers.filter((c) => (c.debut ?? 0) <= index).map(({ debut: _debut, ...entry }) => entry);
  const base: LevelDef = {
    id: authored.id,
    chapter: info.id,
    index,
    name: authored.name,
    ...growthStages(goal, size, stagesFor(info.id)),
    world: recipe.world ?? { width: 3200, height: 1800 },
    spawns,
    maxFish: Math.round(range(recipe.maxFish, t)),
    bottom,
    maxCrawlers: Math.round(range(life.count, t)),
    hazards: {
      jellyfish: Math.round(range(recipe.jellyfish, t)),
      hookEverySec: recipe.hookEverySec[0] === 0 ? 0 : Math.round(range(recipe.hookEverySec, t)),
    },
    items: [],
    // Par grows with the goal; ~1.25 s per growth point.
    parTime: Math.round(goal * 1.25 + 15),
    twists: ['grow'],
    objective: { kind: 'grow' },
    modifiers: {},
    debuts: [...recipe.spawns, ...life.crawlers].filter((s) => s.debut === index).map((s) => s.species),
  };
  const twisted = applyTwists(base, twistsFor(info.id, index), { index, boss: recipe.boss });
  const number = (info.id - 1) * LEVELS_PER_CHAPTER + index + 1;
  return { ...twisted, items: itemsForLevel(number, twisted.modifiers.dark ?? false), ...recipe.overrides?.[index] };
}

export function generateChapter(info: ChapterInfo, recipe: ChapterRecipe): Chapter {
  const levels = Array.from({ length: LEVELS_PER_CHAPTER }, (_, i) => generateLevel(info, recipe, i));
  return { ...info, levels };
}
