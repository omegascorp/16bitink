import type { AstroCookies } from 'astro';
import { parseAdminEmails, roleFor } from './admins';
import { db } from './db';
import { ensurePlayerId, findName, signInEmailUser, signInGoogleUser } from './db/userRepo';
import { optionalEnv, requireSecret } from './env';
import type { GoogleUser } from './google';
import { accountGames, claimBrowserPurchases } from './owner';
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession } from './session';

/** Who proved they're signing in: a Google account, or someone who opened the email we sent an address. */
export type Identity =
  | { readonly kind: 'google'; readonly user: GoogleUser }
  | { readonly kind: 'email'; readonly email: string };

/**
 * The last step of every sign-in: finds or makes the account, hands it the
 * purchases this browser holds, and sets the session cookie. Throws when the
 * database can't be reached; callers say so to the player.
 */
export async function finishSignIn(cookies: AstroCookies, url: URL, who: Identity, now: Date): Promise<void> {
  const secret = requireSecret('ENTITLEMENT_SECRET');
  await db();
  const email = who.kind === 'google' ? who.user.email : who.email;
  const role = roleFor(email, parseAdminEmails(optionalEnv('ADMIN_EMAILS')));
  const userId = who.kind === 'google' ? await signInGoogleUser(who.user, role, now) : await signInEmailUser(email, role, now);
  const [, , name] = await Promise.all([
    ensurePlayerId(userId),
    claimBrowserPurchases(cookies, userId),
    who.kind === 'google' ? who.user.name : findName(userId),
  ]);
  // After the claim, so games bought on this browser are in the list.
  const games = await accountGames(email, userId, url);
  const iat = Math.floor(now.getTime() / 1000);
  const token = await signSession({ v: 2, userId, email, name: name ?? '', games, iat, exp: iat + SESSION_MAX_AGE }, secret);
  cookies.set(SESSION_COOKIE, token, {
    path: '/', httpOnly: true, secure: import.meta.env.PROD, sameSite: 'lax', maxAge: SESSION_MAX_AGE,
  });
}
