import type Phaser from 'phaser';
import { makeDraw } from '../kit';
import { BOIL } from '../palette';
import { makeCanvas } from '../pen';
import type { SpriteArt } from '../types';

/**
 * Baking the Jungle's own pictures (the rivals' meal pictures, the hood)
 * from its view, without importing textures.ts: that module pulls in the
 * art registries, which are still loading when this chapter's files are.
 * Keys follow textures.ts (TEX.critter is `critter-<kind>-<pose>-<f>`).
 */
export const critterKey = (kind: string, pose: string, f: number): string => `critter-${kind}-${pose}-${f}`;

function seedOf(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 100000;
  return h;
}

/** One pose of a sprite in boil frame f as a texture under `key`, unless it's there already. */
export function bakeSprite(scene: Phaser.Scene, key: string, art: SpriteArt, pose: string, f: number, seed: number): void {
  if (scene.textures.exists(key)) return;
  const { canvas, ctx } = makeCanvas(Math.ceil(art.frame * art.res), Math.ceil(art.frame * art.res));
  ctx.scale(art.res, art.res);
  ctx.translate(art.frame / 2, art.frame / 2);
  art.draw(makeDraw(ctx, seed + f, f, 0), pose);
  scene.textures.addImage(key, canvas as unknown as HTMLImageElement);
}

/** Every pose of a critter in every boil frame, as the game's critters are baked. */
export function bakeCritter(scene: Phaser.Scene, kind: string, art: SpriteArt | undefined): void {
  if (!art) return;
  art.poses.forEach((pose, i) => {
    for (let f = 0; f < BOIL; f++) bakeSprite(scene, critterKey(kind, pose, f), art, pose, f, seedOf(kind) + i * 10);
  });
}
