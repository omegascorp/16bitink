import { findGame, isPurchasable } from '../data/games';
import { isPass, PASS } from '../data/pass';

/** Something for sale: a game's full version, or the pass. */
export interface Product {
  readonly slug: string;
  readonly title: string;
  readonly price?: string;
  readonly stripeLookupKey: string;
}

/** The product a checkout may sell under this slug: the pass or a game for sale. */
export function findProduct(slug: string): Product | undefined {
  if (isPass(slug)) return PASS;
  const game = findGame(slug);
  return isPurchasable(game) ? game : undefined;
}
