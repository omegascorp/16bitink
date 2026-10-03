import type Phaser from 'phaser';
import type { SpeciesId } from '../levels/types';
import { drawFish, FISH_TEX, type FishShape, type InkVariant } from './fishArt';
import { makeCanvas } from './pen';
import { drawBubble, drawHook, drawJelly, drawPaper, drawPowerUp, drawRock, drawWeed } from './propArt';

/** Number of redrawn frames cycled for the hand-drawn "line boil". */
export const BOIL_FRAMES = 3;
export const BOIL_FPS = 8;

export const SPECIES: readonly SpeciesId[] = ['minnow', 'perch', 'puffer', 'pike', 'angler', 'eel'];

export const fishKey = (shape: FishShape, variant: InkVariant, frame: number): string => `fish-${shape}-${variant}-${frame}`;
export const boilKey = (base: string, frame: number): string => `${base}-${frame}`;

function add(scene: Phaser.Scene, key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void): void {
  if (scene.textures.exists(key)) return;
  const { canvas, ctx } = makeCanvas(w, h);
  draw(ctx);
  scene.textures.addCanvas(key, canvas);
}

/**
 * Generates every placeholder ink texture. When scanned pen drawings
 * arrive, load an atlas with the same keys instead and drop this call.
 */
export function generateInkTextures(scene: Phaser.Scene): void {
  for (let f = 0; f < BOIL_FRAMES; f++) {
    const seed = 101 + f * 977;
    for (const shape of [...SPECIES, 'inkling'] as const) {
      for (const variant of ['light', 'heavy'] as const) {
        add(scene, fishKey(shape, variant, f), FISH_TEX, FISH_TEX, (ctx) => drawFish(ctx, shape, variant, seed));
      }
    }
    add(scene, boilKey('jelly', f), 128, 128, (ctx) => drawJelly(ctx, seed));
    add(scene, boilKey('hook', f), 48, 76, (ctx) => drawHook(ctx, seed));
    add(scene, boilKey('pu-speed', f), 80, 80, (ctx) => drawPowerUp(ctx, 'speed', seed));
    add(scene, boilKey('pu-shrink', f), 80, 80, (ctx) => drawPowerUp(ctx, 'shrink', seed));
    add(scene, boilKey('weed', f), 120, 220, (ctx) => drawWeed(ctx, 7 + f, 220));
  }
  add(scene, 'bubble', 16, 16, (ctx) => drawBubble(ctx, 3));
  for (let i = 0; i < 3; i++) add(scene, `rock-${i}`, 220, 110, (ctx) => drawRock(ctx, 40 + i, 220, 110));
  add(scene, 'paper', 512, 512, (ctx) => drawPaper(ctx, 512));
}
