import type { Lane } from '../logic/sailing';
import { lagoon, LAGOON_H, resort, shore, SHORE_H, sky, SKY_H } from './backdrop/atoll';
import { dhoni, yacht } from './backdrop/boats';
import type { Draw } from './kit';

export { BACKDROP_W } from './backdrop/common';

/**
 * The faraway beach behind a level, in parallax layers drawn faintly
 * so the sand and creatures in front always read first. Each beach has its
 * own theme; layers tile horizontally (see `tiled`).
 */
export type ThemeId = 'atoll';
export type LayerId = 'sky' | 'lagoon' | 'resort' | 'shore';

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
    { id: 'resort', height: LAGOON_H, scroll: 0.2, lift: 10, draw: resort },
    { id: 'shore', height: SHORE_H, scroll: 0.4, lift: -14, draw: shore },
  ],
};

export type BoatKind = 'dhoni' | 'yacht';

/** A boat sailing on a layer, drawn as its own sprite so it can move. */
export interface BoatSpec extends Lane {
  readonly kind: BoatKind;
  readonly s: number;
  /** The layer it sails on; `water` is its waterline in that layer's design px. */
  readonly layer: LayerId;
  readonly water: number;
  /** In front of the layer after its own (the resort), or slipping behind it. */
  readonly front: boolean;
}

/** Each kind's drawing extent around its bow-right waterline point, at s = 1. */
export const BOAT_BOX: Readonly<Record<BoatKind, { readonly left: number; readonly right: number; readonly top: number; readonly bottom: number }>> = {
  dhoni: { left: -36, right: 34, top: -54, bottom: 14 },
  yacht: { left: -18, right: 18, top: -34, bottom: 8 },
};

export const BOAT_DRAW: Readonly<Record<BoatKind, (d: Draw, x: number, water: number, s: number) => void>> = { dhoni, yacht };

/**
 * The boats out on the water. Yachts drift along the horizon and a small
 * dhoni crosses the lagoon behind the villas, all wrapping round; the big
 * dhoni works back and forth in front of them, turning short of the jetty.
 */
export const THEME_BOATS: Readonly<Record<ThemeId, readonly BoatSpec[]>> = {
  atoll: [
    { kind: 'yacht', s: 0.9, layer: 'lagoon', water: 57, x: 560, speed: 2.2, front: false },
    { kind: 'yacht', s: 0.5, layer: 'lagoon', water: 54, x: 905, speed: -1.4, front: false },
    { kind: 'dhoni', s: 0.5, layer: 'lagoon', water: 84, x: 255, speed: 3.5, front: false },
    { kind: 'dhoni', s: 1.05, layer: 'lagoon', water: 136, x: 870, speed: 5, range: [440, 1240], front: true },
  ],
};
