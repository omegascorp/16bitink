import { findGame } from '../data/games';
import { isPaidSession, type FulfilOptions, type SessionLike } from './fulfil';
import { isUserId, type UserId } from './userId';

/**
 * Purchases as we keep them: one record per paid Stripe Checkout Session.
 * Pure rules only; storage is in db/purchaseRepo.ts.
 */

export type PurchaseStatus = 'paid' | 'refunded' | 'disputed';

export interface PurchaseRecord {
  /** Stripe Checkout Session id: the purchase's identity. */
  readonly sessionId: string;
  readonly game: string;
  /** Lower-cased receipt email: a purchase made signed out goes to the user who signs in with it. */
  readonly email: string | null;
  /** The user who owns it: signed in at checkout, or who claimed it later (by email or ownership cookie). */
  readonly userId: UserId | null;
  /** The Stripe customer checkout created. */
  readonly customerId: string | null;
  /** Refund and dispute events name the payment intent, not the session. */
  readonly paymentIntent: string | null;
  /** Smallest currency unit, after discounts. */
  readonly amount: number;
  readonly currency: string;
  readonly livemode: boolean;
  readonly status: PurchaseStatus;
  readonly paidAt: Date;
}

/** The fields of a Stripe Checkout Session we read. */
export interface CheckoutSessionLike extends SessionLike {
  readonly id: string;
  readonly currency: string | null;
  readonly metadata: Record<string, string> | null;
  readonly customer_details: { readonly email: string | null } | null;
  readonly client_reference_id: string | null;
  readonly customer: string | { readonly id: string } | null;
  readonly payment_intent: string | { readonly id: string } | null;
}

const idOf = (v: string | { readonly id: string } | null): string | null => (v === null ? null : typeof v === 'string' ? v : v.id);

/** The purchase this checkout made, or null when it bought nothing (unpaid, free, or not a catalog game). */
export function purchaseFromSession(s: CheckoutSessionLike): PurchaseRecord | null {
  const game = s.metadata?.game;
  if (!isPaidSession(s) || !game || !findGame(game)) return null;
  return {
    sessionId: s.id,
    game,
    email: s.customer_details?.email?.toLowerCase() ?? null,
    userId: isUserId(s.client_reference_id) ? s.client_reference_id : null,
    customerId: idOf(s.customer),
    paymentIntent: idOf(s.payment_intent),
    amount: s.amount_total ?? 0,
    currency: s.currency ?? 'usd',
    livemode: s.livemode,
    status: 'paid',
    paidAt: new Date(s.created * 1000),
  };
}

/** The games these purchases still own (refunds and chargebacks drop out). */
export function ownedGames(records: readonly PurchaseRecord[], opts: FulfilOptions): string[] {
  const games = records.filter((r) => r.status === 'paid' && (r.livemode || opts.allowTestMode)).map((r) => r.game);
  return [...new Set(games)];
}

/**
 * Whether an ownership cookie's purchase was taken back. A cookie with no
 * record (bought before the database existed) stays valid.
 */
export function isRevoked(record: PurchaseRecord | null): boolean {
  return record !== null && record.status !== 'paid';
}
