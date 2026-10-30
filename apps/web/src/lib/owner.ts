import type { AstroCookies } from 'astro';
import { playableGames } from '../data/games';
import { PASS } from '../data/pass';
import { devUnlockAllowed, isLocalHost } from './devUnlock';
import { entitlementCookie, verifyEntitlement, type EntitlementClaims } from './entitlement';
import { optionalEnv, requireSecret } from './env';
import { db } from './db';
import { grantedGames } from './db/grantRepo';
import { claimPurchase, claimPurchasesByEmail, findPurchase, findPurchasesFor } from './db/purchaseRepo';
import { libraryOf, playableFrom } from './library';
import { isRevoked } from './purchases';
import type { UserId } from './userId';
import { SESSION_COOKIE, verifySession, type UserSession } from './session';

const nowSec = (): number => Math.floor(Date.now() / 1000);

/** The signed-in user, if any. */
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

/**
 * Every game a user can play, bought or granted by an admin. Purchases made
 * signed out with the user's email are claimed first, so they show up even
 * when bought on another device. Test-mode purchases count only on localhost.
 */
export async function accountGames(email: string, userId: UserId, url: URL): Promise<string[]> {
  await claimPurchasesByEmail(email, userId);
  const [purchases, granted] = await Promise.all([findPurchasesFor(userId), grantedGames(userId)]);
  return playableFrom(libraryOf(purchases, granted, { allowTestMode: isLocalHost(url.hostname) }));
}

/**
 * Gives a user who just signed in the purchases this browser holds cookies
 * for, so a game bought signed out (with any receipt email) follows the
 * account to other devices. Returns how many were claimed.
 */
export async function claimBrowserPurchases(cookies: AstroCookies, userId: UserId): Promise<number> {
  const secret = requireSecret('ENTITLEMENT_SECRET');
  const products = [...playableGames().map((g) => g.slug), PASS.slug];
  const owned = await Promise.all(products.map((slug) => boughtHere(cookies, slug, secret)));
  const claimed = await Promise.all(owned.flatMap((c) => (c ? [claimPurchase(c.s, userId)] : [])));
  return claimed.filter(Boolean).length;
}

/** The signed-in account's games, live (so refunds and revoked grants count at once); the list saved at sign-in if the database is down. */
async function accountOwns(user: UserSession, game: string, url: URL): Promise<boolean> {
  try {
    await db();
    return (await accountGames(user.email, user.userId, url)).includes(game);
  } catch (err) {
    console.error('[owner] live purchase check skipped: database unavailable', err);
    return user.games.includes(game);
  }
}

/** The ownership cookie this browser holds for `slug` (a game or the pass), if authentic. */
const boughtHere = (cookies: AstroCookies, slug: string, secret: string): Promise<EntitlementClaims | null> =>
  verifyEntitlement(cookies.get(entitlementCookie(slug))?.value, slug, secret);

/** A purchase made on this browser that covers `game`: its own, or the pass (unless since refunded). */
async function boughtOnBrowser(cookies: AstroCookies, game: string, secret: string): Promise<EntitlementClaims | null> {
  for (const slug of game === PASS.slug ? [game] : [game, PASS.slug]) {
    const bought = await boughtHere(cookies, slug, secret);
    // Claims always name the game asked about, even when the pass is what owns it.
    if (bought && !(await refunded(bought.s))) return { ...bought, g: game };
  }
  return null;
}

/**
 * Whether `game` (or the pass, by its slug) is owned on this browser: a
 * purchase made here (its own cookie or the pass's, unless since refunded),
 * or a signed-in user who bought it or the pass, or was granted either by an admin.
 * Locally, DEV_UNLOCK=true in .env makes every game owned without a
 * purchase (localhost only).
 */
export async function ownership(cookies: AstroCookies, game: string, url: URL): Promise<EntitlementClaims | null> {
  if (devUnlockAllowed(optionalEnv('DEV_UNLOCK'), url.hostname)) {
    return { v: 2, g: game, s: 'dev_unlock', iat: nowSec() };
  }
  const bought = await boughtOnBrowser(cookies, game, requireSecret('ENTITLEMENT_SECRET'));
  if (bought) return bought;
  const user = await currentUser(cookies);
  if (!user) return null;
  return (await accountOwns(user, game, url)) ? { v: 2, g: game, s: `user:${user.userId}`, iat: user.iat } : null;
}

/** The slugs of every playable game owned on this browser (see `ownership`). */
export async function ownedGameSlugs(cookies: AstroCookies, url: URL): Promise<Set<string>> {
  const games = playableGames();
  // The pass owns them all: one check instead of one per game.
  if (await ownership(cookies, PASS.slug, url)) return new Set(games.map((game) => game.slug));
  const claims = await Promise.all(games.map((game) => ownership(cookies, game.slug, url)));
  return new Set(games.filter((_, i) => claims[i] !== null).map((game) => game.slug));
}
