import { generateChapter, type ChapterRecipe, type RecipeSpawn } from '../src/levels/generate';
import type { Chapter } from '../src/levels/types';
import { zoneInfo } from '../src/levels/zones';

/** Shared helpers for the chapter recipes (shallows.ts, paid.ts). */

type S = RecipeSpawn['species'];
export const s = (species: S, weight: number, min: number, max: number, debut?: number): RecipeSpawn =>
  debut === undefined ? { species, weight, size: [min, max] } : { species, weight, size: [min, max], debut };

/** Shared difficulty ramp: each chapter starts a bit harder than the last ended easy. */
function ramp(chapter: number): Pick<ChapterRecipe, 'goal' | 'finalSize' | 'maxFish'> {
  const c = chapter - 1;
  return {
    goal: [60 + c * 10, 115 + c * 12],
    finalSize: [42 + c * 2, 54 + c * 2.5],
    maxFish: [28 + c, 36 + c * 1.5],
  };
}

export type Recipe = Omit<ChapterRecipe, 'goal' | 'finalSize' | 'maxFish'>;

/** Builds the chapters for `recipes`, keyed by chapter id, in chapter order. */
export function buildChapters(recipes: Readonly<Record<number, Recipe>>): Chapter[] {
  return Object.keys(recipes)
    .map(Number)
    .sort((a, b) => a - b)
    .map((id) => generateChapter(zoneInfo(id), { ...recipes[id]!, ...ramp(id) }));
}
