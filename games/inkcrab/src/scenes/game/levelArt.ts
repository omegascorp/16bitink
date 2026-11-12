import { runInSlices, type SliceJob } from '@16bitink/game-sdk';
import type Phaser from 'phaser';
import { levelKeys } from '../../art/texturePlan';
import { bakeJobs } from '../../art/textures';
import { buildLevel } from '../../level/build';
import { levelById, themeOf } from '../../level/levels';
import type { LevelDef } from '../../level/types';
import type { BeachSetup } from '../../logic/sim';

/** Per-frame budget for drawing a level's art in the background, low enough that the screen showing keeps its frame rate. */
const BACKGROUND_BUDGET_MS = 6;

/** The jobs that draw what a level shows and isn't drawn yet: its beach's backdrop, creatures, birds and shells. */
export function levelArtJobs(textures: Phaser.Textures.TextureManager, def: LevelDef, setup: BeachSetup = buildLevel(def)): SliceJob[] {
  return bakeJobs(textures, levelKeys(setup, themeOf(def.id)));
}

/**
 * Draws a level's art a little each frame while another screen shows (the
 * map, a result card), so starting it is quick. What isn't done by then the
 * level draws itself (see GameScene). Never rejects.
 */
export function prefetchLevel(scene: Phaser.Scene, levelId: string | undefined): void {
  const def = levelId ? levelById(levelId) : undefined;
  if (!def) return;
  const jobs = levelArtJobs(scene.textures, def);
  if (jobs.length === 0) return;
  // One slice a frame, so the screen on show keeps drawing.
  const nextFrame = (): Promise<void> => new Promise((resolve) => requestAnimationFrame(() => resolve()));
  void runInSlices(jobs, { budgetMs: BACKGROUND_BUDGET_MS, yieldTo: nextFrame }).catch((err: unknown) => console.warn('[inkcrab] could not draw ahead', err));
}
