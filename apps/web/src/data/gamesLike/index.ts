/**
 * "Games like …" pages: one per well-known older game that one of ours plays like, for the people
 * searching for it. One game of ours can have several (InkFish: Fishy, Feeding Frenzy), but an old
 * game gets its own page only when people search for it by name and it has its own story to tell;
 * otherwise mention it on a bigger page (Luxor on Zuma's). Each is written by hand and fact-checked: real history with sources, an honest
 * comparison, and other good games besides ours. Name the classic only to compare, never as if our
 * game were it.
 */

import { findGame, isOut } from '../games';
import type { GamesLikePage } from './types';
import { motherload } from './pages/motherload';
import { feedingFrenzy } from './pages/feeding-frenzy';
import { zuma } from './pages/zuma';
import { fishy } from './pages/fishy';
import { snake } from './pages/snake';
import { heroesOfMightAndMagic3 } from './pages/heroes-of-might-and-magic-3';
import { slitherIo } from './pages/slither-io';
import { agarIo } from './pages/agar-io';
import { pullThePin } from './pages/pull-the-pin';

export type * from './types';

/** One file per page in ./pages, in the order they were published. */
export const GAMES_LIKE: readonly GamesLikePage[] = [motherload, feedingFrenzy, zuma, fishy, snake, heroesOfMightAndMagic3, slitherIo, agarIo, pullThePin];

/** Our game's name on the page: from the catalog, or from `coming` while it is still being made. */
export const ourTitle = (page: GamesLikePage): string => findGame(page.game)?.title ?? page.coming ?? page.game;

export const findGamesLike = (slug: string): GamesLikePage | undefined => GAMES_LIKE.find((p) => p.slug === slug);

/** The pages for people searching for the old games ours plays like: one per old game, so a game can have several. */
export const gamesLikeFor = (gameSlug: string, pages: readonly GamesLikePage[] = GAMES_LIKE): GamesLikePage[] =>
  pages.filter((p) => p.game === gameSlug);

/** Pages whose game is out: a page never sends people to a game they can't play yet. */
export function listedGamesLike(now: Date, pages: readonly GamesLikePage[] = GAMES_LIKE): GamesLikePage[] {
  return pages.filter((p) => {
    const game = findGame(p.game);
    return game?.status === 'playable' && isOut(game, now);
  });
}
