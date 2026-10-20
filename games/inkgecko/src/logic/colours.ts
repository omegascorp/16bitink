import type { Rng } from './rng';

/**
 * Marble colours, in the order levels add them. Each also has its own pen
 * pattern (art/marbleArt.ts), so the game reads without colour too.
 */
export const COLOURS = ['red', 'yellow', 'blue', 'green', 'purple', 'teal'] as const;
export type ColourId = (typeof COLOURS)[number];

/** Watercolour wash per marble colour, and the same as a number for Phaser tints. */
export const COLOUR_WASH: Readonly<Record<ColourId, string>> = {
  red: '#d9493c',
  yellow: '#f2c230',
  blue: '#3d6fd0',
  green: '#4f9c45',
  purple: '#8b52b8',
  teal: '#22a3a0',
};

export const colourHex = (c: ColourId): number => parseInt(COLOUR_WASH[c].slice(1), 16);

/** The first `n` colours of the game's order: a level with 4 colours uses red, yellow, blue and green. */
export function paletteOf(n: number): readonly ColourId[] {
  return COLOURS.slice(0, Math.max(1, Math.min(COLOURS.length, n)));
}

/**
 * The gecko's next marble: a colour still in the line, so no shot is dead
 * weight (Zuma's rule). With the line empty, any of the level's colours.
 */
export function dealColour(rng: Rng, inLine: ReadonlySet<ColourId>, palette: readonly ColourId[]): ColourId {
  const pool = palette.filter((c) => inLine.has(c));
  const from = pool.length ? pool : palette;
  return from[Math.floor(rng() * from.length)] ?? palette[0]!;
}
