import type { AstroCookies } from 'astro';
import { devUnlockAllowed } from './devUnlock';
import { entitlementCookie, verifyEntitlement, type EntitlementClaims } from './entitlement';
import { optionalEnv, requireSecret } from './env';
import { SESSION_COOKIE, verifySession, type UserSession } from './session';

const nowSec = (): number => Math.floor(Date.now() / 1000);

/** The signed-in Google user, if any. */
export function currentUser(cookies: AstroCookies): Promise<UserSession | null> {
  return verifySession(cookies.get(SESSION_COOKIE)?.value, requireSecret('ENTITLEMENT_SECRET'), nowSec());
}

/**
 * Whether `game` is owned on this browser: a purchase made here (its own
 * cookie), or a signed-in Google account whose purchases include it.
 * Locally, DEV_UNLOCK=true in .dev.vars makes every game owned without a
 * purchase (localhost only).
 */
export async function ownership(cookies: AstroCookies, game: string, url: URL): Promise<EntitlementClaims | null> {
  if (devUnlockAllowed(optionalEnv('DEV_UNLOCK'), url.hostname)) {
    return { v: 1, g: game, s: 'dev_unlock', iat: nowSec() };
  }
  const secret = requireSecret('ENTITLEMENT_SECRET');
  const bought = await verifyEntitlement(cookies.get(entitlementCookie(game))?.value, game, secret);
  if (bought) return bought;
  const user = await currentUser(cookies);
  return user?.games.includes(game) ? { v: 1, g: game, s: `google:${user.sub}`, iat: user.iat } : null;
}
