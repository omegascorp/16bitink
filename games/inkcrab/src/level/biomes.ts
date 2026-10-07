/**
 * The ten beaches of the game, ten levels each, every one a different
 * biome with its own creatures, shells, backdrop and map island. Only
 * built beaches have levels; the rest show on the map as pencil drafts.
 */
export const LEVELS_PER_BEACH = 10;

export type BiomeId = 'atoll' | 'dunes' | 'rockpool' | 'mangrove' | 'basalt' | 'kelp' | 'wreck' | 'harbour' | 'frost' | 'moonlit';

export interface Biome {
  readonly id: BiomeId;
  /** 1-based, as shown on the map tabs. */
  readonly beach: number;
  readonly name: string;
  /** One line under the name on the map. */
  readonly tagline: string;
  /** Map washes: the island's interior, its beach, and the water around it. */
  readonly land: string;
  readonly sand: string;
  readonly sea: string;
}

export const BIOMES: readonly Biome[] = [
  { id: 'atoll', beach: 1, name: 'Atoll Sketchbook', tagline: 'coral sand, palms and a turquoise lagoon', land: '#8fbf7a', sand: '#f4ead0', sea: '#5cc4c4' },
  { id: 'dunes', beach: 2, name: 'Dune Sea', tagline: 'where the desert runs into the ocean', land: '#e0b979', sand: '#f0d9a6', sea: '#3f93b0' },
  { id: 'rockpool', beach: 3, name: 'Tide Pool Notes', tagline: 'granite shelves and rock pools', land: '#a4a89a', sand: '#e2d6bc', sea: '#5f9fb8' },
  { id: 'mangrove', beach: 4, name: 'Mangrove Margins', tagline: 'mudflats and tangled stilt roots', land: '#6f9a63', sand: '#cdb994', sea: '#7fae9c' },
  { id: 'basalt', beach: 5, name: 'Ash & Basalt', tagline: 'black sand under a smoking volcano', land: '#7c7468', sand: '#8d8780', sea: '#4f8aa8' },
  { id: 'kelp', beach: 6, name: 'Fog & Kelp', tagline: 'a cold coast, kelp beds and a lighthouse', land: '#7f9a84', sand: '#d8cfb6', sea: '#4f7f94' },
  { id: 'wreck', beach: 7, name: 'Wreck Cove', tagline: 'driftwood and an old ship on the rocks', land: '#97a07a', sand: '#dccaa2', sea: '#467f9c' },
  { id: 'harbour', beach: 8, name: 'Monsoon Harbour', tagline: 'stilt houses, nets and fishing boats', land: '#79a86a', sand: '#d9c59a', sea: '#4d93a0' },
  { id: 'frost', beach: 9, name: 'Frost Shingle', tagline: 'pebbles, ice floes and a cold wind', land: '#c9d4d6', sand: '#d7d3c8', sea: '#6c9cb8' },
  { id: 'moonlit', beach: 10, name: 'Moonlit Bay', tagline: 'a glowing tide under the moon: the final molt', land: '#5d6a86', sand: '#b8b4c4', sea: '#2f4d7a' },
];
