import type Phaser from 'phaser';
import type { TownPeople } from './townKit';
import { townKit, type PieceId } from './townKit';

/** The town's textures: each building's sprite and the streets' paving (a people's own are prefixed, the Greek city's are as they were). */
export const TOWN_TEX = {
  piece: (a: PieceId, faction: TownPeople = 'crown') => `${townKit(faction).tex}-${a}`,
  paving: 'pxt-paving',
  groundOf: (faction: TownPeople = 'crown') => `${townKit(faction).tex}-ground`,
  pavingOf: (faction: TownPeople = 'crown') => `${townKit(faction).tex}-paving`,
} as const;

/** Queues the town's sprites and paving not loaded yet; their keys (filter them NEAREST once loaded). */
export function queueTownArt(scene: Phaser.Scene, faction: TownPeople = 'crown'): string[] {
  const kit = townKit(faction);
  const keys = (Object.keys(kit.art) as PieceId[]).map((a) => {
    const key = TOWN_TEX.piece(a, faction);
    if (!scene.textures.exists(key)) scene.load.image(key, kit.art[a]!.url);
    return key;
  });
  const paving = TOWN_TEX.pavingOf(faction);
  if (!scene.textures.exists(paving)) scene.load.image(paving, kit.paving);
  const ground = TOWN_TEX.groundOf(faction);
  if (kit.groundUrl && !scene.textures.exists(ground)) scene.load.image(ground, kit.groundUrl);
  return kit.groundUrl ? [...keys, paving, ground] : [...keys, paving];
}
