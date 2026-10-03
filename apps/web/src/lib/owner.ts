import type { AstroCookies } from 'astro';
import { devUnlockAllowed, isLocalHost } from './devUnlock';
import { entitlementCookie, verifyEntitlement, type EntitlementClaims } from './entitlement';
import { optionalEnv, requireSecret } from './env';
import { db } from './db';
import { findPurchase, findPurchasesFor } from './db/purchaseRepo';
import { isRevoked, ownedGames } from './purchases';
import { SESSION_COOKIE, verifySession, type UserSession } from './session';

const nowSec = (): number => Math.floor(Date.now() / 1000);

/** The signed-in Google user, if any. */
export function currentUser(cookies: AstroCookies): Promise<UserSession | null> {
  return verifySession(cookies.get(SESSION_COOKIE)?.value, requireSecret('ENTITLEMENT_SECRET'), nowSec());
}

/**
 * A cookie outlives its purchase if the payment is refunded or charged back;
 * the database knows. If the database is unreachable, a valid cookie still
 * plays: a paying player is never locked out by an outage.
 */
async function refunded(sessionId: string): Promise<boolean> {
  try {
    await db();
    return isRevoked(await findPurchase(sessionId));
  } catch (err) {
    console.error('[owner] refund check skipped: database unavailable', err);
    return false;
  }
}

/** The signed-in account's purchases, live (so refunds count at once); the list saved at sign-in if the database is down. */
async function googleOwns(user: UserSession, game: string, url: URL): Promise<boolean> {
  try {
    await db();
    return ownedGames(await findPurchasesFor(user.email, user.sub), { allowTestMode: isLocalHost(url.hostname) }).includes(game);
  } catch (err) {
    console.error('[owner] live purchase check skipped: database unavailable', err);
    return user.games.includes(game);
  }
}

/**
 * Whether `game` is owned on this browser: a purchase made here (its own
 * cookie, unless since refunded), or a signed-in Google account whose
 * purchases include it.
 * Locally, DEV_UNLOCK=true in .env makes every game owned without a
 * purchase (localhost only).
 */
export async function ownership(cookies: AstroCookies, game: string, url: URL): Promise<EntitlementClaims | null> {
  if (devUnlockAllowed(optionalEnv('DEV_UNLOCK'), url.hostname)) {
    return { v: 1, g: game, s: 'dev_unlock', iat: nowSec() };
  }
  const secret = requireSecret('ENTITLEMENT_SECRET');
  const bought = await verifyEntitlement(cookies.get(entitlementCookie(game))?.value, game, secret);
  if (bought) return (await refunded(bought.s)) ? null : bought;
  const user = await currentUser(cookies);
  if (!user) return null;
  return (await googleOwns(user, game, url)) ? { v: 1, g: game, s: `google:${user.sub}`, iat: user.iat } : null;
}
