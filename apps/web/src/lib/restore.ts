import type Stripe from 'stripe';
import { findGame } from '../data/games';
import { isPaidSession, type FulfilOptions, type SessionLike } from './fulfil';

/** A completed checkout, with what restore needs to know about it. */
export interface PurchaseLike extends SessionLike {
  readonly game: string | undefined;
  /** Fully refunded or charged back: no longer owned. */
  readonly refunded: boolean;
}

/** The catalog games these checkouts paid for and still own. */
export function ownedGames(purchases: readonly PurchaseLike[], opts: FulfilOptions): string[] {
  const games = purchases
    .filter((p) => isPaidSession(p) && (p.livemode || opts.allowTestMode) && !p.refunded)
    .map((p) => p.game)
    .filter((g): g is string => g !== undefined && findGame(g) !== undefined);
  return [...new Set(games)];
}

function isRefunded(intent: Stripe.Checkout.Session['payment_intent']): boolean {
  if (intent === null || typeof intent === 'string') return false;
  const charge = intent.latest_charge;
  if (charge === null || typeof charge === 'string') return false;
  return charge.refunded || charge.disputed;
}

/**
 * Finds the games bought with this email. Stripe is the record of purchases,
 * so restoring needs no database of our own. The email at checkout has to be
 * the Google one: signed-in checkouts lock it to that.
 */
export async function findOwnedGames(stripe: Stripe, email: string, opts: FulfilOptions): Promise<string[]> {
  const purchases: PurchaseLike[] = [];
  const list = stripe.checkout.sessions.list({
    customer_details: { email },
    status: 'complete',
    limit: 100,
    expand: ['data.payment_intent.latest_charge'],
  });
  for await (const s of list) {
    purchases.push({ ...s, game: s.metadata?.game, refunded: isRefunded(s.payment_intent) });
  }
  return ownedGames(purchases, opts);
}
