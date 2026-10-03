import type Phaser from 'phaser';
import type { SpeciesId } from '../levels/types';
import { PLAYER_FISH } from '../levels/zones';
import { BONES_SIZE, drawBones, drawPan, PAN_SIZE } from './deathArt';
import { drawFish, FISH_TEX, type FishShape, type InkVariant } from './fishArt';
import { makeCanvas } from './pen';
import { ART_RES, drawBubble, drawWreck, drawHook, drawJelly, drawPaper, drawPowerUp, drawRock, drawWeed, type WeedKind } from './propArt';

export { ART_RES };

/** Number of redrawn frames cycled for the hand-drawn "line boil". */
export const BOIL_FRAMES = 3;
export const BOIL_FPS = 8;

export const SPECIES: readonly SpeciesId[] = ['minnow', 'perch', 'puffer', 'pike', 'angler', 'eel'];

export const fishKey = (shape: FishShape, variant: InkVariant, frame: number): string => `fish-${shape}-${variant}-${frame}`;
export const boilKey = (base: string, frame: number): string => `${base}-${frame}`;
export const WEED_KINDS: readonly WeedKind[] = [0, 1, 2];
export const weedKey = (kind: WeedKind, frame: number): string => `weed-${kind}-${frame}`;
/** Prop texture sizes at in-game scale (textures are ART_RES times larger). */
export const WEED_SIZE = { w: 128, h: 256 } as const;
export const ROCK_SIZE = { w: 256, h: 128 } as const;

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
    for (const shape of SPECIES) {
      for (const variant of ['light', 'heavy'] as const) {
        add(scene, fishKey(shape, variant, f), FISH_TEX, FISH_TEX, (ctx) => drawFish(ctx, shape, variant, seed));
      }
    }
    // The player is never a predator to itself: light variant only.
    for (const shape of PLAYER_FISH) add(scene, fishKey(shape, 'light', f), FISH_TEX, FISH_TEX, (ctx) => drawFish(ctx, shape, 'light', seed));
    const R = ART_RES;
    add(scene, boilKey('jelly', f), 128 * R, 128 * R, (ctx) => drawJelly(ctx, seed));
    add(scene, boilKey('hook', f), 48 * R, 76 * R, (ctx) => drawHook(ctx, seed));
    add(scene, boilKey('pu-speed', f), 80 * R, 80 * R, (ctx) => drawPowerUp(ctx, 'speed', seed));
    add(scene, boilKey('pu-shrink', f), 80 * R, 80 * R, (ctx) => drawPowerUp(ctx, 'shrink', seed));
    for (const kind of WEED_KINDS) {
      const { w, h } = WEED_SIZE;
      add(scene, weedKey(kind, f), w * R, h * R, (ctx) => drawWeed(ctx, 7 + kind * 13, kind, f, w * R, h * R));
    }
  }
  add(scene, 'bubble', 16 * ART_RES, 16 * ART_RES, (ctx) => drawBubble(ctx, 3));
  for (let i = 0; i < 3; i++) {
    const { w, h } = ROCK_SIZE;
    add(scene, `rock-${i}`, w * ART_RES, h * ART_RES, (ctx) => drawRock(ctx, 40 + i, w * ART_RES, h * ART_RES));
  }
  add(scene, 'bones', BONES_SIZE.w * ART_RES, BONES_SIZE.h * ART_RES, (ctx) => drawBones(ctx, 9));
  add(scene, 'pan', PAN_SIZE.w * ART_RES, PAN_SIZE.h * ART_RES, (ctx) => drawPan(ctx, 12));
  add(scene, 'paper', 512, 512, (ctx) => drawPaper(ctx, 512));
  add(scene, 'wreck', 360 * ART_RES, 200 * ART_RES, (ctx) => drawWreck(ctx, 360 * ART_RES, 200 * ART_RES));
}
