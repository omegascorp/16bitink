import type { BossEntry, ChapterHint, ChapterRules, EnemyEntry } from '../enemyTypes';
import type { PreySpec } from '../preyTypes';
import { BARRENS_RULES } from './barrens';
import { DUNES_RULES } from './dunes';
import { FARM_RULES } from './farm';
import { FLOODED_RULES } from './flooded';
import { HEATH_RULES } from './heath';
import { JUNGLE_RULES } from './jungle';
import { MOUNTAINS_RULES } from './mountains';
import { RAINFOREST_RULES } from './rainforest';
import { REEF_RULES } from './reef';
import { SAVANNA_RULES } from './savanna';

/**
 * Every chapter's rules, merged: each chapter owns its module here and adds
 * its prey, enemies and boss without touching any other file.
 */
const ALL: readonly ChapterRules[] = [FARM_RULES, BARRENS_RULES, DUNES_RULES, SAVANNA_RULES, RAINFOREST_RULES, REEF_RULES, MOUNTAINS_RULES, HEATH_RULES, JUNGLE_RULES, FLOODED_RULES];

const merged = <T>(pick: (r: ChapterRules) => Readonly<Record<string, T>> | undefined): Readonly<Record<string, T>> =>
  Object.assign({}, ...ALL.map((r) => pick(r) ?? {})) as Record<string, T>;

/** Every chapter's own prey (the farm's is the base set, in prey.ts). */
export const CHAPTER_PREY: Readonly<Record<string, PreySpec>> = merged((r) => r.prey);
export const ENEMY_ENTRIES: Readonly<Record<string, EnemyEntry>> = merged((r) => r.enemies);
export const BOSS_ENTRIES: Readonly<Record<string, BossEntry>> = merged((r) => r.bosses);
export const CHAPTER_HINTS: Readonly<Record<string, ChapterHint>> = merged((r) => r.hints);
export const HURTS: Readonly<Record<string, { readonly title: string; readonly word: string }>> = merged((r) => r.hurts);
