/**
 * The field notebook's inks and washes, shared with InkFish and InkCrab:
 * lines are a dark ballpoint blue, colour comes from watercolour washes
 * under the ink, red ink is danger only, and highlighter marks anything the
 * prospector can take (ore, gems, mission items).
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

/** How a planet's ground is washed: its three grades from soil down to deep rock, bedrock, and the hollows dug into it. */
export interface GroundStyle {
  readonly soil: string;
  readonly stone: string;
  readonly deep: string;
  readonly bedrock: string;
  /** Specks in the soil. */
  readonly grain: string;
  /** Shadow just inside a dug wall. */
  readonly shade: string;
  /** The back wall seen through a tunnel. */
  readonly tunnel: string;
  /** Sky wash over the surface. */
  readonly sky: string;
}

/** Graphite: a grey moon of soft dark rock, pencil lead in its seams. */
export const GRAPHITE: GroundStyle = {
  soil: '#ada79c', stone: '#878582', deep: '#64636c', bedrock: '#3a3940', grain: '#4d4b52', shade: '#3e3d45', tunnel: '#ddd7ca', sky: '#e9e4d6',
};

/** Texture pixels per world px; matches the most a phone screen shows. */
export const ART_RES = 2;
/** Line-boil frames per drawing. */
export const BOIL = 3;
