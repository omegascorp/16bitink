import type Phaser from 'phaser';
import type { TownFaction } from '../../logic/creatures';
import { townKit, type PieceId } from './townKit';

/** The town's textures: each building's sprite and the streets' paving (a people's own are prefixed, the Greek city's are as they were). */
export const TOWN_TEX = {
  piece: (a: PieceId, faction: TownFaction = 'crown') => `${townKit(faction).tex}-${a}`,
  paving: 'pxt-paving',
  pavingOf: (faction: TownFaction = 'crown') => `${townKit(faction).tex}-paving`,
} as const;

/** Queues the town's sprites and paving not loaded yet; their keys (filter them NEAREST once loaded). */
export function queueTownArt(scene: Phaser.Scene, faction: TownFaction = 'crown'): string[] {
  const kit = townKit(faction);
  const keys = (Object.keys(kit.art) as PieceId[]).map((a) => {
    const key = TOWN_TEX.piece(a, faction);
    if (!scene.textures.exists(key)) scene.load.image(key, kit.art[a]!.url);
    return key;
  });
  const paving = TOWN_TEX.pavingOf(faction);
  if (!scene.textures.exists(paving)) scene.load.image(paving, kit.paving);
  return [...keys, paving];
}
