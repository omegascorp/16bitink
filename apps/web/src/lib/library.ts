import type { FulfilOptions } from './fulfil';
import { ownedGames, type PurchaseRecord } from './purchases';
import type { UserId } from './userId';

/**
 * A user's games, by how they got them. Pure: the caller loads purchases
 * and grants.
 */
export interface Library {
  readonly bought: readonly string[];
  readonly granted: readonly string[];
}

export function libraryOf(purchases: readonly PurchaseRecord[], granted: readonly string[], opts: FulfilOptions): Library {
  return { bought: ownedGames(purchases, opts), granted: [...new Set(granted)] };
}

/** Every game the user can play, bought or granted. */
export const playableFrom = (lib: Library): string[] => [...new Set([...lib.bought, ...lib.granted])];

/** Of many users' purchases, the ones that belong to this user. */
export const purchasesOf = (userId: UserId, all: readonly PurchaseRecord[]): PurchaseRecord[] => all.filter((p) => p.userId === userId);
