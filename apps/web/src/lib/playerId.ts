/**
 * Player ids: a short public handle a player can share (with support, say)
 * without giving away their email or name. Random, so it says nothing about
 * the account, and unlike the database id it carries no sign-up time.
 *
 * Eight Crockford base32 characters (40 random bits), shown as 7K3Q-9XMD.
 * It identifies a player; it unlocks nothing, so it need not be secret.
 */

import { canonicalCode, groupCode, isCode, randomCode } from './base32';

const LENGTH = 8;

/** A new random player id, stored form (no dash). */
export const generatePlayerId = (random?: (n: number) => Uint8Array): string => randomCode(LENGTH, random);

/** The stored form of a player id as someone typed or pasted it, or null when it can't be one. */
export function normalizePlayerId(input: unknown): string | null {
  if (typeof input !== 'string' || input.length > 32) return null;
  const code = canonicalCode(input);
  return isCode(code, LENGTH) ? code : null;
}

/** A stored player id as shown to people: 7K3Q-9XMD. */
export const formatPlayerId = groupCode;
