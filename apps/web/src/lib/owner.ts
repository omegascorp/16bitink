import type { AstroCookies } from 'astro';
import { devUnlockAllowed } from './devUnlock';
import { entitlementCookie, verifyEntitlement, type EntitlementClaims } from './entitlement';
import { optionalEnv, requireSecret } from './env';

/**
 * Reads and verifies the ownership cookie for `game`. Locally, DEV_UNLOCK=true
 * in .dev.vars makes every game owned without a purchase (localhost only).
 */
export async function ownership(cookies: AstroCookies, game: string, url: URL): Promise<EntitlementClaims | null> {
  if (devUnlockAllowed(optionalEnv('DEV_UNLOCK'), url.hostname)) {
    return { v: 1, g: game, s: 'dev_unlock', iat: Math.floor(Date.now() / 1000) };
  }
  const token = cookies.get(entitlementCookie(game))?.value;
  return verifyEntitlement(token, game, requireSecret('ENTITLEMENT_SECRET'));
}
