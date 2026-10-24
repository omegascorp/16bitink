/**
 * The campaign journal's inks and washes: iron-gall brown-black lines over
 * watercolour washes on cream paper, as an old war map. Each army has its
 * banner colour: the Crown's blue, neutral monsters' ochre, the rival's red.
 */
export const PAPER = '#f3ecd9';
export const PAPER_HEX = 0xf3ecd9;
/** Paper-white used to blank shapes before they are washed. */
export const PAPER_FILL = '#fdf8ea';
/** Line ink: a deep blue-black, like the other games' ballpoint. */
export const INK = '#232a4f';
export const INK_HEX = 0x232a4f;
export const BLUE = '#27408b';
export const BLUE_HEX = 0x27408b;
export const RED = '#a9302a';
export const RED_HEX = 0xa9302a;
export const GOLD = '#c99a2e';
export const OCHRE = '#b98a3e';
export const LEAF = '#5f8f4e';
export const STONE = '#c9c0ad';
export const STONE_DARK = '#8f8676';

/** Banner colours by owner. */
export const BANNER = { player: '#2f55a8', neutral: '#b98a3e', rival: '#a9302a' } as const;

/** Texture pixels per world px; matches the most a phone screen shows. */
export const ART_RES = 2;
/** Line-boil frames per drawing. */
export const BOIL = 3;
