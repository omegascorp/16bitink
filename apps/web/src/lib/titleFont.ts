import type { CatalogGame } from '../data/games';

export type TitleFont = 'hand' | 'pixel';

/** How a game's title is lettered on the site, in the game's own art style: hand-drawn ink, or pixels. */
export function titleFont(game: Pick<CatalogGame, 'style'>): TitleFont {
  return game.style === 'pixel' ? 'pixel' : 'hand';
}
