import type { AstroCookies } from 'astro';
import { entitlementCookie, verifyEntitlement, type EntitlementClaims } from './entitlement';
import { requireEnv } from './env';

/** Reads and verifies the ownership cookie for `game`. */
export async function ownership(cookies: AstroCookies, game: string): Promise<EntitlementClaims | null> {
  const token = cookies.get(entitlementCookie(game))?.value;
  return verifyEntitlement(token, game, requireEnv('ENTITLEMENT_SECRET'));
}
