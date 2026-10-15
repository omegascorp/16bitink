/**
 * Buying the full game is: sign in with Google, then pay. A signed-out
 * player leaves for Google with a return path that carries `?buy=<game>`,
 * and the page they left picks the purchase back up when they come home.
 */
export const BUY_PARAM = 'buy';

/** Google sign-in that comes back to `returnPath` (a same-site path) afterwards. */
export function signInUrl(returnPath: string): string {
  return `/auth/google?return=${encodeURIComponent(returnPath)}`;
}

/** Where to send a signed-out player who asked to buy `game` from `pathname`. */
export function signInToBuyUrl(pathname: string, game: string): string {
  return signInUrl(`${pathname}?${BUY_PARAM}=${encodeURIComponent(game)}`);
}

/** True when the page was opened to resume buying `game` after sign-in. */
export function isPendingBuy(search: string, game: string): boolean {
  return new URLSearchParams(search).get(BUY_PARAM) === game;
}
