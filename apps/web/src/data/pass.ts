/**
 * The All Games Pass: one one-time purchase that unlocks every game on the
 * site, including every game released after it was bought.
 *
 * Its price rises in steps as the catalog grows. To raise it: in Stripe,
 * create the new one-time price on the pass product and move the lookup key
 * to it ("Transfer lookup key"), then change `price` and `PASS_NEXT_STEP` here.
 */
export const PASS = {
  /** Stored as the purchase's `game`, and the `?buy=` value that resumes buying it after sign-in. */
  slug: 'all',
  title: 'All Games Pass',
  /** Display price; the charged amount lives in Stripe. */
  price: '$14.99',
  stripeLookupKey: 'all_games_pass',
} as const;

/** The pass's next price, and the catalog size it moves there at; null once it's at its cap. */
export const PASS_NEXT_STEP: { readonly price: string; readonly atGames: number } | null = { price: '$19.99', atGames: 10 };

export const isPass = (slug: string): boolean => slug === PASS.slug;

/** "All 5 games + every future game": the pass in one line. */
export const passPitch = (games: number): string => `All ${games} games + every future game`;

/** When the pass will next cost more, while that step is still ahead: "Goes up to $19.99 at 10 games". */
export function passRiseNote(games: number): string | null {
  return PASS_NEXT_STEP && games < PASS_NEXT_STEP.atGames ? `Goes up to ${PASS_NEXT_STEP.price} at ${PASS_NEXT_STEP.atGames} games` : null;
}
