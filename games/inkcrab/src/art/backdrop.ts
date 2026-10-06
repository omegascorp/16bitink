import { lagoon, LAGOON_H, shore, SHORE_H, sky, SKY_H } from './backdrop/atoll';
import type { Draw } from './kit';

export { BACKDROP_W } from './backdrop/common';

/**
 * The faraway beach behind a level, in three parallax layers drawn faintly
 * so the sand and creatures in front always read first. Each beach has its
 * own theme; layers tile horizontally (see `tiled`).
 */
export type ThemeId = 'atoll';
export type LayerId = 'sky' | 'lagoon' | 'shore';

export interface LayerSpec {
  readonly id: LayerId;
  /** World px tall. */
  readonly height: number;
  /** How much of the camera's sideways motion it follows: far layers move least. */
  readonly scroll: number;
  /** Where its bottom sits, in world px above the beach's typical surface (negative: below), at BACKDROP_SCALE. */
  readonly lift: number;
  readonly draw: (d: Draw) => void;
}

/** Layers are drawn at this share of their design size: far things stay small next to the crab. */
export const BACKDROP_SCALE = 0.5;

export const THEMES: Readonly<Record<ThemeId, readonly LayerSpec[]>> = {
  atoll: [
    { id: 'sky', height: SKY_H, scroll: 0.08, lift: 120, draw: sky },
    { id: 'lagoon', height: LAGOON_H, scroll: 0.2, lift: 10, draw: lagoon },
    { id: 'shore', height: SHORE_H, scroll: 0.4, lift: -14, draw: shore },
  ],
};
