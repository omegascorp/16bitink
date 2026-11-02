import { playableGames } from '../data/games';
import { isPass, PASS } from '../data/pass';
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

/**
 * Every game the user can play, bought or granted. The pass, bought or
 * granted, brings every playable game (and stays in the list, so the
 * account is never offered it again).
 */
export function playableFrom(lib: Library): string[] {
  const held = [...lib.bought, ...lib.granted];
  const pass = held.some(isPass) ? [PASS.slug, ...playableGames().map((g) => g.slug)] : [];
  return [...new Set([...held, ...pass])];
}

/** Of many users' purchases, the ones that belong to this user. */
export const purchasesOf = (userId: UserId, all: readonly PurchaseRecord[]): PurchaseRecord[] => all.filter((p) => p.userId === userId);
