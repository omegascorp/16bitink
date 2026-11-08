/**
 * The All Games Pass: unlocks every game on the site, including every game
 * released later. It was sold as a one-time purchase until November 2, 2026
 * and is no longer for sale; buyers keep it, and admins can still grant it to
 * anyone (api/admin/grants.ts) to unlock everything for them.
 */
export const PASS = {
  /** Stored as the purchase's or grant's `game`. */
  slug: 'all',
  title: 'All Games Pass',
} as const;

export const isPass = (slug: string): boolean => slug === PASS.slug;
