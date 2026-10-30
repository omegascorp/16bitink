/**
 * Buying the full game is: sign in (Google or email), then pay. A signed-out
 * player goes to the sign-in page with a return path that carries
 * `?buy=<game>`, and the page they left picks the purchase back up when
 * they come home.
 */
export const BUY_PARAM = 'buy';

/** The sign-in page (Google or email), coming back to `returnPath` (a same-site path) afterwards. */
export function signInPageUrl(returnPath: string): string {
  return `/signin?return=${encodeURIComponent(returnPath)}`;
}

/** Straight to Google's sign-in, coming back to `returnPath` afterwards. */
export function googleSignInUrl(returnPath: string): string {
  return `/auth/google?return=${encodeURIComponent(returnPath)}`;
}

/** Where every "sign in" sends a player. */
export const signInUrl = signInPageUrl;

/** Where to send a signed-out player who asked to buy `game` from `pathname`. */
export function signInToBuyUrl(pathname: string, game: string): string {
  return signInUrl(`${pathname}?${BUY_PARAM}=${encodeURIComponent(game)}`);
}

/** What the page was opened to resume buying for `game` after sign-in: the game, the pass, or nothing. */
export function pendingBuy(search: string, game: string, passSlug: string): 'game' | 'pass' | null {
  const buy = new URLSearchParams(search).get(BUY_PARAM);
  return buy === game ? 'game' : buy === passSlug ? 'pass' : null;
}

/** True when the page was opened to resume buying `game` (or the pass, by its slug) after sign-in. */
export function isPendingBuy(search: string, game: string): boolean {
  return new URLSearchParams(search).get(BUY_PARAM) === game;
}
