import type { Box } from './body';
import { groundRow, setTile, type Terrain, TILE } from './terrain';

/**
 * Boats and stilt houses (Monsoon Harbour, beach 8): wooden floors standing
 * on posts over the sand. A floor is a row of wood a tile thick: solid to
 * stand on, never dug. Its posts are only drawn, so anything small enough
 * walks under it, out of sight of the sky. On top lie shells and food; a
 * crab gets up there with a jump or a ramp of sand.
 *
 * - `boat`: a fishing boat drawn up on the sand, upturned on trestles.
 * - `house`: the floor of a stilt house, its hut standing on it.
 * - `rack`: a fish-drying rack with a net thrown over it.
 */
export type DeckKind = 'boat' | 'house' | 'rack';

/** A level's deck: first column, width, open rows under it (its clearance) and what it is. */
export type DeckSpec = readonly [col: number, width: number, clearance: number, kind: DeckKind];

export interface Deck {
  readonly col: number;
  readonly width: number;
  /** The row of the wood: its top is what's stood on. */
  readonly row: number;
  readonly kind: DeckKind;
}

/**
 * Lays a deck's floor `clearance` open rows over the highest sand under it,
 * so it's level and nothing under it is ever less than that. Returns where it went.
 */
export function layDeck(t: Terrain, [col, width, clearance, kind]: DeckSpec): Deck {
  let ground = t.height;
  for (let x = col; x < col + width; x++) ground = Math.min(ground, groundRow(t, x));
  const row = ground - clearance - 1;
  for (let x = col; x < col + width; x++) setTile(t, x, row, TILE.wood);
  return { col, width, row, kind };
}

/** The deck over (or under) a column, or null. */
export function deckAt(decks: readonly Deck[], col: number): Deck | null {
  return decks.find((d) => col >= d.col && col < d.col + d.width) ?? null;
}

/** Whether a body is under a deck: its middle below the floor, within its span. */
export function underDeck(decks: readonly Deck[], b: Box, tile: number): boolean {
  const deck = deckAt(decks, Math.floor((b.x + b.w / 2) / tile));
  return deck !== null && b.y >= (deck.row + 1) * tile - 1;
}

/** Whether a body stands up on a deck. */
export function onDeck(decks: readonly Deck[], b: Box, tile: number): boolean {
  const deck = deckAt(decks, Math.floor((b.x + b.w / 2) / tile));
  return deck !== null && Math.abs(b.y + b.h - deck.row * tile) < tile / 2;
}
