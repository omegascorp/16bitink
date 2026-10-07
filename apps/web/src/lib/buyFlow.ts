/**
 * Buying the full game is: sign in with Google, then pay. A signed-out
 * player leaves for Google with a return path that carries `?buy=<game>`,
 * and the play page picks the purchase back up when they come home.
 */
export const BUY_PARAM = 'buy';

/** Where to send a signed-out player who asked to buy `game` from `pathname`. */
export function signInToBuyUrl(pathname: string, game: string): string {
  const ret = `${pathname}?${BUY_PARAM}=${encodeURIComponent(game)}`;
  return `/auth/google?return=${encodeURIComponent(ret)}`;
}

/** True when the page was opened to resume buying `game` after sign-in. */
export function isPendingBuy(search: string, game: string): boolean {
  return new URLSearchParams(search).get(BUY_PARAM) === game;
}
