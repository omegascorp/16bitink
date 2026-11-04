import type Phaser from 'phaser';
import { TOWN_ART, TOWN_PAVING, type TownArt } from '../../art/pixel/town';

/** The town's textures: each building's sprite and the streets' paving. */
export const TOWN_TEX = {
  piece: (a: TownArt) => `pxt-${a}`,
  paving: 'pxt-paving',
} as const;

/** Queues the town's sprites and paving not loaded yet; their keys (filter them NEAREST once loaded). */
export function queueTownArt(scene: Phaser.Scene): string[] {
  const keys = (Object.keys(TOWN_ART) as TownArt[]).map((a) => {
    const key = TOWN_TEX.piece(a);
    if (!scene.textures.exists(key)) scene.load.image(key, TOWN_ART[a].url);
    return key;
  });
  if (!scene.textures.exists(TOWN_TEX.paving)) scene.load.image(TOWN_TEX.paving, TOWN_PAVING);
  return [...keys, TOWN_TEX.paving];
}
