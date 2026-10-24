/**
 * The campaign's inks and paints: a dark, rich old-master palette (deep
 * greens and umbers, stormy skies, warm stone, gilt) drawn over with fine
 * iron-gall umber lines. Colour carries the form; the line only firms it.
 * Each army has its banner colour: the Crown's blue, neutral monsters'
 * ochre, the rival's red.
 */
/** What lies behind every painting: the unexplored map, the margins round a battle. */
export const BACKDROP = '#15110d';
export const BACKDROP_HEX = 0x15110d;
/** Paper-white used to blank shapes before they are washed. */
export const PAPER_FILL = '#fdf8ea';
/** Line ink: a deep iron-gall umber. */
export const INK = '#2a1d14';
export const INK_HEX = 0x2a1d14;
export const BLUE = '#1f3570';
export const BLUE_HEX = 0x1f3570;
export const RED = '#8e2420';
export const RED_HEX = 0x8e2420;
export const GOLD = '#b8892a';
export const OCHRE = '#9a7232';
export const LEAF = '#3f6a32';
export const STONE = '#9a907e';
export const STONE_DARK = '#5e564a';

/** Banner colours by owner. */
export const BANNER = { player: '#28468f', neutral: '#9a7232', rival: '#8e2420' } as const;

/** Texture px per unit; matches the most a phone screen shows. */
export const ART_RES = 2;
/** Line-boil frames per drawing. */
export const BOIL = 3;

/**
 * The interface: panels of dark oxblood leather in gilt frames, lettered
 * in parchment and gold.
 */
export const UI = {
  leaf: '#3a1f17',
  leafDeep: '#24130e',
  leafLight: '#5a3022',
  gilt: '#d4a849',
  giltDeep: '#7a5418',
  giltLight: '#f6dc8e',
  /** Body text on leather. */
  text: '#efe2c2',
  /** Titles and figures on leather. */
  title: '#f0cf78',
  muted: '#b9a682',
  /** A sunken slot or well in a panel. */
  well: '#1a0f0b',
} as const;
export const UI_HEX = {
  leaf: 0x3a1f17,
  leafDeep: 0x24130e,
  gilt: 0xd4a849,
  giltDeep: 0x7a5418,
  well: 0x1a0f0b,
  text: 0xefe2c2,
} as const;

/** Titles and button labels: carved Roman capitals. */
export const DISPLAY = '"Cinzel", "Trajan Pro", Georgia, serif';
/** Body text: an old-style book face. */
export const BOOK = '"EB Garamond", Garamond, Georgia, serif';
