/**
 * Stateless proof of purchase: an HMAC-signed token stored in an
 * httpOnly cookie. Issued only after the server has confirmed a paid
 * Stripe Checkout Session. The purchase is also saved in the database,
 * so signing in with Google restores it on another device.
 */

import { readToken, signToken } from './token';

const PURPOSE = 'own';

export interface EntitlementClaims {
  /** Token format/key version, allows graceful secret rotation later. */
  readonly v: 2;
  /** Game slug */
  readonly g: string;
  /** Stripe Checkout Session id that paid for it */
  readonly s: string;
  /** Issued at, unix seconds */
  readonly iat: number;
}

export async function signEntitlement(claims: EntitlementClaims, secret: string): Promise<string> {
  return signToken(claims, secret, PURPOSE);
}

function isClaims(v: unknown): v is EntitlementClaims {
  if (typeof v !== 'object' || v === null) return false;
  const c = v as Record<string, unknown>;
  return c.v === 2 && typeof c.g === 'string' && typeof c.s === 'string' && typeof c.iat === 'number';
}

/** Returns the claims when the token is authentic and for `game`, else null. */
export async function verifyEntitlement(token: string | undefined, game: string, secret: string): Promise<EntitlementClaims | null> {
  const claims = await readToken(token, secret, PURPOSE);
  return isClaims(claims) && claims.g === game ? claims : null;
}

export const entitlementCookie = (game: string): string => `ink_own_${game}`;

export const ENTITLEMENT_MAX_AGE = 60 * 60 * 24 * 365 * 5;
