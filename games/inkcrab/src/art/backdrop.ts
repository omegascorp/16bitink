import type { Lane } from '../logic/sailing';
import { clouds, lagoon, LAGOON_H, resort, shore, SHORE_H, sky, SKY_H } from './backdrop/atoll';
import { BASALT_SEA_H, BASALT_SKY_H, cliffs as lavaCliffs, clouds as basaltClouds, LAVA_CLIFFS_H, LAVA_SHORE_H, sea as basaltSea, shore as lavaShore, sky as basaltSky } from './backdrop/basalt';
import { dhoni, shrimper, troller, yacht } from './backdrop/boats';
import { longtail } from './backdrop/estuary';
import { clouds as harbourClouds, cliffs as harbourCliffs, HARBOUR_CLIFFS_H, HARBOUR_SEA_H, HARBOUR_SHORE_H, HARBOUR_SKY_H, sea as harbourSea, shore as harbourShore, sky as harbourSky } from './backdrop/harbour';
import { keralaTrawler, vallam } from './backdrop/keralaBoats';
import { clouds as duneClouds, desert, DESERT_H, DUNE_SKY_H, dunes, DUNES_H, sea, SEA_H, sky as duneSky } from './backdrop/dunes';
import { cliffs as kelpCliffs, clouds as kelpClouds, KELP_CLIFFS_H, KELP_CLOUDS_H, KELP_SEA_H, KELP_SHORE_H, KELP_SKY_H, sea as kelpSea, shore as kelpShore, sky as kelpSky } from './backdrop/kelp';
import { clouds as mangroveClouds, forest, FOREST_H, MANGROVE_SKY_H, mudflat, MUDFLAT_H, river, RIVER_H, sky as mangroveSky } from './backdrop/mangrove';
import { cliffs, CLIFFS_H, clouds as rockClouds, ROCK_SEA_H, ROCK_SKY_H, sea as rockSea, shelf, SHELF_H, sky as rockSky } from './backdrop/rockpool';
import { cliffs as wreckCliffs, clouds as wreckClouds, sea as wreckSea, shore as wreckShore, sky as wreckSky, WRECK_CLIFFS_H, WRECK_SEA_H, WRECK_SHORE_H, WRECK_SKY_H } from './backdrop/wreck';
import type { Draw } from './kit';

export { BACKDROP_W } from './backdrop/common';
export { THEME_MOVERS, type MoverSpec } from './backdrop/movers';

/**
 * The faraway beach behind a level, in parallax layers drawn faintly
 * so the sand and creatures in front always read first. Each beach has its
 * own theme; layers tile horizontally (see `tiled`).
 */
export type ThemeId = 'atoll' | 'dunes' | 'rockpool' | 'mangrove' | 'basalt' | 'kelp' | 'wreck' | 'harbour';
export type LayerId = 'sky' | 'clouds' | 'lagoon' | 'resort' | 'shore' | 'sea' | 'dunes' | 'cliffs' | 'river' | 'forest';

export interface LayerSpec {
  readonly id: LayerId;
  /** World px tall. */
  readonly height: number;
  /** How much of the camera's sideways motion it follows: far layers move least. */
  readonly scroll: number;
  /** Where its bottom sits, in world px above the beach's typical surface (negative: below), at BACKDROP_SCALE. */
  readonly lift: number;
  /** Design px a second its drawing drifts sideways on its own: clouds on the wind. */
  readonly drift?: number;
  readonly draw: (d: Draw) => void;
}

/** Layers are drawn at this share of their design size: far things stay small next to the crab. */
export const BACKDROP_SCALE = 0.5;

export const THEMES: Readonly<Record<ThemeId, readonly LayerSpec[]>> = {
  atoll: [
    { id: 'sky', height: SKY_H, scroll: 0.08, lift: 120, draw: sky },
    { id: 'clouds', height: SKY_H, scroll: 0.08, lift: 120, drift: 3, draw: clouds },
    { id: 'lagoon', height: LAGOON_H, scroll: 0.2, lift: 10, draw: lagoon },
    { id: 'resort', height: LAGOON_H, scroll: 0.2, lift: 10, draw: resort },
    { id: 'shore', height: SHORE_H, scroll: 0.4, lift: -14, draw: shore },
  ],
  dunes: [
    { id: 'sky', height: DUNE_SKY_H, scroll: 0.08, lift: 120, draw: duneSky },
    { id: 'clouds', height: DUNE_SKY_H, scroll: 0.08, lift: 120, drift: 2, draw: duneClouds },
    { id: 'sea', height: SEA_H, scroll: 0.16, lift: 20, draw: sea },
    { id: 'dunes', height: DUNES_H, scroll: 0.26, lift: 10, draw: dunes },
    { id: 'shore', height: DESERT_H, scroll: 0.4, lift: -14, draw: desert },
  ],
  rockpool: [
    { id: 'sky', height: ROCK_SKY_H, scroll: 0.08, lift: 120, draw: rockSky },
    { id: 'clouds', height: ROCK_SKY_H, scroll: 0.08, lift: 120, drift: 6, draw: rockClouds },
    { id: 'sea', height: ROCK_SEA_H, scroll: 0.16, lift: 20, draw: rockSea },
    { id: 'cliffs', height: CLIFFS_H, scroll: 0.26, lift: 10, draw: cliffs },
    { id: 'shore', height: SHELF_H, scroll: 0.4, lift: -14, draw: shelf },
  ],
  mangrove: [
    { id: 'sky', height: MANGROVE_SKY_H, scroll: 0.08, lift: 120, draw: mangroveSky },
    { id: 'clouds', height: MANGROVE_SKY_H, scroll: 0.08, lift: 120, drift: 1.5, draw: mangroveClouds },
    { id: 'river', height: RIVER_H, scroll: 0.16, lift: 20, draw: river },
    { id: 'forest', height: FOREST_H, scroll: 0.26, lift: 10, draw: forest },
    { id: 'shore', height: MUDFLAT_H, scroll: 0.4, lift: -14, draw: mudflat },
  ],
  basalt: [
    { id: 'sky', height: BASALT_SKY_H, scroll: 0.08, lift: 120, draw: basaltSky },
    { id: 'clouds', height: BASALT_SKY_H, scroll: 0.08, lift: 120, drift: 4, draw: basaltClouds },
    { id: 'sea', height: BASALT_SEA_H, scroll: 0.16, lift: 20, draw: basaltSea },
    { id: 'cliffs', height: LAVA_CLIFFS_H, scroll: 0.26, lift: 10, draw: lavaCliffs },
    { id: 'shore', height: LAVA_SHORE_H, scroll: 0.4, lift: -14, draw: lavaShore },
  ],
  kelp: [
    { id: 'sky', height: KELP_SKY_H, scroll: 0.08, lift: 120, draw: kelpSky },
    // Taller and set lower than the sky, so the fog banks reach right down to the sea's horizon.
    { id: 'clouds', height: KELP_CLOUDS_H, scroll: 0.08, lift: 80, drift: 2, draw: kelpClouds },
    { id: 'sea', height: KELP_SEA_H, scroll: 0.16, lift: 20, draw: kelpSea },
    { id: 'cliffs', height: KELP_CLIFFS_H, scroll: 0.26, lift: 10, draw: kelpCliffs },
    { id: 'shore', height: KELP_SHORE_H, scroll: 0.4, lift: -14, draw: kelpShore },
  ],
  wreck: [
    // The sky and clouds are tall and set low, as kelp's clouds are, so the cumulus tower up off the sea's horizon.
    { id: 'sky', height: WRECK_SKY_H, scroll: 0.08, lift: 80, draw: wreckSky },
    { id: 'clouds', height: WRECK_SKY_H, scroll: 0.08, lift: 80, drift: 2.5, draw: wreckClouds },
    { id: 'sea', height: WRECK_SEA_H, scroll: 0.16, lift: 20, draw: wreckSea },
    { id: 'cliffs', height: WRECK_CLIFFS_H, scroll: 0.26, lift: 10, draw: wreckCliffs },
    { id: 'shore', height: WRECK_SHORE_H, scroll: 0.4, lift: -14, draw: wreckShore },
  ],
  harbour: [
    // Tall and set low, as the wreck's are, so the thunderheads and their rain stand on the sea's horizon.
    { id: 'sky', height: HARBOUR_SKY_H, scroll: 0.08, lift: 80, draw: harbourSky },
    { id: 'clouds', height: HARBOUR_SKY_H, scroll: 0.08, lift: 80, drift: 3.5, draw: harbourClouds },
    { id: 'sea', height: HARBOUR_SEA_H, scroll: 0.16, lift: 20, draw: harbourSea },
    { id: 'cliffs', height: HARBOUR_CLIFFS_H, scroll: 0.26, lift: 10, draw: harbourCliffs },
    { id: 'shore', height: HARBOUR_SHORE_H, scroll: 0.4, lift: -14, draw: harbourShore },
  ],
};

export type BoatKind = 'dhoni' | 'yacht' | 'longtail' | 'troller' | 'shrimper' | 'vallam' | 'keralaTrawler';

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
  longtail: { left: -72, right: 30, top: -22, bottom: 9 },
  troller: { left: -32, right: 20, top: -40, bottom: 8 },
  shrimper: { left: -27, right: 25, top: -40, bottom: 8 },
  vallam: { left: -46, right: 38, top: -24, bottom: 12 },
  keralaTrawler: { left: -34, right: 28, top: -40, bottom: 9 },
};

export const BOAT_DRAW: Readonly<Record<BoatKind, (d: Draw, x: number, water: number, s: number) => void>> = { dhoni, yacht, longtail, troller, shrimper, vallam, keralaTrawler };

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
  // A lone sailboat far out beyond the surf, slipping behind the dunes.
  dunes: [
    { kind: 'yacht', s: 0.55, layer: 'sea', water: 58, x: 760, speed: -1.6, front: false },
  ],
  // The crabber lies at her mooring, drawn into the cliffs layer; nothing sails.
  rockpool: [],
  // Longtail boats running up and down the river mouth, slipping behind the mangroves.
  mangrove: [
    { kind: 'longtail', s: 0.8, layer: 'river', water: 104, x: 300, speed: 6, front: false },
    { kind: 'longtail', s: 0.5, layer: 'river', water: 66, x: 820, speed: -3, front: false },
  ],
  // An expedition yacht cruising slowly along under the volcano.
  basalt: [
    { kind: 'yacht', s: 0.6, layer: 'sea', water: 192, x: 300, speed: 1.8, front: false },
  ],
  // A salmon troller working slowly along the swell, poles up, lines out.
  kelp: [
    { kind: 'troller', s: 0.7, layer: 'sea', water: 124, x: 420, speed: 1.5, front: false },
  ],
  // A shrimp boat running home across the Gulf with her nets hoisted, and a sailboat far out.
  wreck: [
    { kind: 'yacht', s: 0.42, layer: 'sea', water: 88, x: 860, speed: -1.2, front: false },
    { kind: 'shrimper', s: 1, layer: 'sea', water: 128, x: 300, speed: 2, front: false },
  ],
  // A vallam running in through the chop with her crew and her net, a trawler working along far out, a second vallam heading out.
  harbour: [
    { kind: 'keralaTrawler', s: 0.55, layer: 'sea', water: 92, x: 820, speed: -1.4, front: false },
    { kind: 'vallam', s: 0.6, layer: 'sea', water: 108, x: 120, speed: -2.2, front: false },
    { kind: 'vallam', s: 1, layer: 'sea', water: 142, x: 420, speed: 3, front: false },
  ],
};
