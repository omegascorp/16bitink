import { findGame, isPurchasable } from '../data/games';

/**
 * Something for sale: a game's full version. The All Games Pass is no longer
 * sold (November 2, 2026); admins can still grant it (api/admin/grants.ts).
 */
export interface Product {
  readonly slug: string;
  readonly title: string;
  readonly price?: string;
  readonly stripeLookupKey: string;
}

/** The product a checkout may sell under this slug: a game for sale. */
export function findProduct(slug: string): Product | undefined {
  const game = findGame(slug);
  return isPurchasable(game) ? game : undefined;
}
