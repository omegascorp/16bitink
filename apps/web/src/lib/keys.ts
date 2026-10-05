/**
 * Activation keys: codes an admin hands out (to reviewers and creators) that
 * unlock a game for free, for one account or for up to N accounts each. Pure rules only; storage is in
 * db/keyRepo.ts.
 *
 * A key is 16 Crockford base32 characters (80 random bits), shown in groups
 * of four. Reading it back forgives case, spaces, dashes and the letters
 * people mistake for digits (O for 0, I and L for 1).
 */

import { canonicalCode, groupCode, isCode, randomCode } from './base32';

const LENGTH = 16;

/** At most this many accounts can redeem one key. */
export const MAX_KEY_USES = 1000;

/** A new random key, stored form (no dashes). `random` returns n random bytes. */
export const generateKey = (random?: (n: number) => Uint8Array): string => randomCode(LENGTH, random);

/** The stored form of a key as someone typed or pasted it, or null when it can't be one. */
export function normalizeKey(input: unknown): string | null {
  if (typeof input !== 'string' || input.length > 64) return null;
  const code = canonicalCode(input);
  return isCode(code, LENGTH) ? code : null;
}

/** A stored key as shown to people: ABCD-EFGH-JKMN-PQRS. */
export const formatKey = groupCode;

/** The page that redeems this key, for sharing as a link. */
export const redeemUrl = (origin: string, code: string): string => `${origin}/redeem?key=${formatKey(code)}`;
