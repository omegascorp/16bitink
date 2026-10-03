/** Minimal shape of a Stripe Checkout Session we rely on. */
export interface SessionLike {
  readonly status: string | null;
  readonly payment_status: string;
  /** Amount charged in the smallest currency unit, after discounts. */
  readonly amount_total: number | null;
  /** false for Stripe test-mode sessions (test cards, no real money). */
  readonly livemode: boolean;
  /** Unix seconds */
  readonly created: number;
}

/** A purchase link stops working this long after checkout (limits leaked links). */
export const SUCCESS_LINK_TTL_SEC = 60 * 60 * 24;

/**
 * The checkout completed and real money changed hands. A 100%-off promotion
 * code ("no_payment_required", or a zero total) never unlocks a game: payment
 * is the only way in.
 */
export function isPaidSession(s: SessionLike): boolean {
  return s.status === 'complete' && s.payment_status === 'paid' && (s.amount_total ?? 0) > 0;
}

export interface FulfilOptions {
  /** Honour Stripe test-mode sessions. Only for local testing, never in production. */
  readonly allowTestMode: boolean;
}

/** Whether the success page may issue an ownership cookie for this session. */
export function isFulfillable(s: SessionLike, nowMs: number, opts: FulfilOptions): boolean {
  return isPaidSession(s) && (s.livemode || opts.allowTestMode) && nowMs / 1000 - s.created <= SUCCESS_LINK_TTL_SEC;
}
