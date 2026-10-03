/** Minimal shape of a Stripe Checkout Session we rely on. */
export interface SessionLike {
  readonly status: string | null;
  readonly payment_status: string;
  /** Unix seconds */
  readonly created: number;
}

/** A purchase link stops working this long after checkout (limits leaked links). */
export const SUCCESS_LINK_TTL_SEC = 60 * 60 * 24;

/** Paid, or free via a 100%-off promo code, and the checkout actually completed. */
export function isPaidSession(s: SessionLike): boolean {
  return s.status === 'complete' && (s.payment_status === 'paid' || s.payment_status === 'no_payment_required');
}

/** Whether the success page may issue an ownership cookie for this session. */
export function isFulfillable(s: SessionLike, nowMs: number): boolean {
  return isPaidSession(s) && nowMs / 1000 - s.created <= SUCCESS_LINK_TTL_SEC;
}
