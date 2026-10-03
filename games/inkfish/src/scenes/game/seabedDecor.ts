import type Phaser from 'phaser';
import { DECOR_SIZE, type DecorId } from '../../art/decorArt';
import { ART_RES } from '../../art/textures';
import type { ZoneId } from '../../levels/types';
import { createRng, rangeOf } from '../../logic/rng';
import { hashUnit } from '../../logic/water';

/**
 * What lies on each zone's seabed. `common` pieces are scattered; one
 * `landmark` (a whale fall, an anchor, a giant clam) anchors each level.
 * Every level picks its own handful of kinds, counts and spots, so two
 * levels in the same zone never share a seabed.
 */
export const ZONE_DECOR: Readonly<Record<ZoneId, { readonly common: readonly DecorId[]; readonly landmarks: readonly DecorId[] }>> = {
  tidepool: { common: ['starfish', 'mussels', 'pebbles', 'anemone', 'scallops'], landmarks: ['lobsterpot', 'anchor'] },
  seagrass: { common: ['scallops', 'sanddollar', 'pebbles', 'seapen', 'starfish'], landmarks: ['amphora', 'anchor'] },
  kelp: { common: ['starfish', 'anemone', 'pebbles', 'mussels', 'scallops'], landmarks: ['lobsterpot', 'anchor'] },
  reef: { common: ['braincoral', 'staghorn', 'seafan', 'tubesponge', 'anemone', 'starfish'], landmarks: ['giantclam', 'amphora'] },
  wreck: { common: ['mussels', 'anemone', 'pebbles', 'scallops', 'amphora'], landmarks: ['cannon', 'anchor'] },
  dropoff: { common: ['seafan', 'glasssponge', 'brittlestar', 'pebbles', 'tubesponge'], landmarks: ['anchor', 'whalebones'] },
  twilight: { common: ['brittlestar', 'sealily', 'glasssponge', 'bamboocoral', 'nodules'], landmarks: ['whalebones', 'anchor'] },
  midnight: { common: ['sealily', 'bamboocoral', 'umbellula', 'brittlestar', 'nodules'], landmarks: ['whalebones', 'volcano'] },
  abyss: { common: ['nodules', 'umbellula', 'glasssponge', 'bamboocoral', 'brittlestar'], landmarks: ['blacksmoker', 'whalebones', 'volcano'] },
  trench: { common: ['nodules', 'tubeworms', 'umbellula', 'brittlestar'], landmarks: ['blacksmoker', 'volcano'] },
};

export const decorKey = (kind: DecorId): string => `decor-${kind}`;

export interface DecorPlan {
  readonly kind: DecorId;
  readonly x: number;
  readonly scale: number;
  readonly flip: boolean;
  readonly landmark: boolean;
}

/** Deterministic per level: the same level always gets the same seabed. */
export function planDecor(levelId: string, zone: ZoneId, width: number): DecorPlan[] {
  const { common, landmarks } = ZONE_DECOR[zone];
  const rng = createRng(Math.floor(hashUnit(levelId, 11) * 1e6) + 1);
  // A handful of this zone's kinds, a different handful each level.
  const kinds = [...common].sort(() => rng() - 0.5).slice(0, Math.min(common.length, 3 + Math.floor(rng() * 2)));
  const scattered = kinds.flatMap((kind) =>
    Array.from({ length: 2 + Math.floor(rng() * 4) }, (): DecorPlan => ({
      kind, x: rangeOf(rng, 60, width - 60), scale: rangeOf(rng, 0.75, 1.15), flip: rng() < 0.5, landmark: false,
    })));
  const landmark: DecorPlan = {
    kind: landmarks[Math.floor(hashUnit(levelId, 12) * landmarks.length)]!,
    x: rangeOf(rng, width * 0.25, width * 0.75), scale: rangeOf(rng, 1, 1.2), flip: rng() < 0.5, landmark: true,
  };
  return [landmark, ...scattered];
}

/** Kinds a level needs textures for. */
export function decorKinds(plan: readonly DecorPlan[]): DecorId[] {
  return [...new Set(plan.map((d) => d.kind))];
}

/** Lays the planned pieces on the sand: landmarks behind the rocks, small things in front. */
export function placeDecor(scene: Phaser.Scene, plan: readonly DecorPlan[], floorAt: (x: number) => number, alpha: number): PlacedDecor[] {
  return plan.map((d) => {
    const sink = Math.min(10, DECOR_SIZE[d.kind].h * 0.08);
    const sprite = scene.add.image(d.x, floorAt(d.x) + sink, decorKey(d.kind)).setOrigin(0.5, 1).setDepth(d.landmark ? 2.5 : 3.5)
      .setScale(d.scale / ART_RES).setFlipX(d.flip).setAlpha(alpha);
    return { kind: d.kind, sprite };
  });
}

export interface PlacedDecor {
  readonly kind: DecorId;
  readonly sprite: Phaser.GameObjects.Image;
}
