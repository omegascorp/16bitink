/**
 * The field notebook's inks and washes. Lines are a dark ballpoint blue;
 * colour comes from watercolour washes under the ink, as in InkFish. Red
 * ink is danger only (and a crab caught naked); highlighter marks anything
 * the crab can pick up.
 */
export const PAPER = '#f5f0e1';
export const PAPER_HEX = 0xf5f0e1;
/** Paper-white used to blank shapes before they are washed. */
export const PAPER_FILL = '#fffaf0';
/** Line ink: ballpoint blue, dark enough to carry colour washes. */
export const INK = '#26316a';
export const BLUE = '#27408b';
export const BLUE_HEX = 0x27408b;
export const RED = '#b3322b';
export const RED_HEX = 0xb3322b;
export const HIGHLIGHT = '#f3e04a';
export const HIGHLIGHT_HEX = 0xf3e04a;

/** Sand: dry on top, darker and wetter with depth. */
export const SAND_DRY = '#ecdcb0';
export const SAND_WET = '#cdb382';
export const SAND_DEEP = '#a98f68';
export const SAND_GRAIN = '#6b5a3c';
export const ROCK = '#9a9488';
/** Loose dune sand: drier and warmer than the beach's. */
export const DUNE = '#f0c98a';
/** Mangrove mud: grey-brown and wet, with a sheen. */
export const MUD = '#6f6556';
export const MUD_SHEEN = '#c9d3d2';
/** Shadow inside burrows. */
export const TUNNEL = '#e4d6b4';

/** How a beach's ground is coloured: its sand from dry to deep, the grains in it, rock, burrow shade, pebbles. */
export interface GroundStyle {
  readonly dry: string;
  readonly wet: string;
  readonly deep: string;
  readonly grain: string;
  /** Shadow just inside a dug wall. */
  readonly shade: string;
  readonly rock: string;
  readonly tunnel: string;
  readonly pebbles: readonly string[];
  /** Rock jointed into columns, as basalt cools. */
  readonly joints: boolean;
}

export const PALE_SAND: GroundStyle = {
  dry: SAND_DRY, wet: SAND_WET, deep: SAND_DEEP, grain: SAND_GRAIN, shade: SAND_GRAIN, rock: ROCK, tunnel: TUNNEL,
  pebbles: ['#8a8478', '#a39276', '#6f7268', '#b5a58a', '#e7c7ae', '#d9a7a0'], joints: false,
};

/** Volcanic black sand with pale grains of olivine and shell in it, over dark basalt. */
export const BLACK_SAND: GroundStyle = {
  dry: '#77726c', wet: '#5b5753', deep: '#45423f', grain: '#d9d2c4', shade: '#2e2c2a', rock: '#4a4c52', tunnel: '#a39d95',
  pebbles: ['#9aa35a', '#c7c0b2', '#7e7a74', '#b07a5a', '#e5dfd2'], joints: true,
};

/** Texture pixels per world px for terrain; matches the most a phone screen shows. */
export const ART_RES = 2;
/** Line-boil frames per drawing. */
export const BOIL = 3;
