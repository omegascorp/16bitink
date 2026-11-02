import type Stripe from 'stripe';
import { isPass } from '../data/pass';
import type { UserId } from './userId';

/** Shown under Stripe's pay button. */
export const ONE_TIME_NOTE = 'One-time purchase: pay once and the full game is yours to keep. No subscription, no ads.';

/** Shown under Stripe's pay button when buying the pass. */
export const PASS_NOTE = 'One-time purchase: every game on 16bit.ink is yours to keep, and every future game too, the day it comes out. No subscription, no ads.';

interface CheckoutInput {
  readonly priceId: string;
  /** What is bought: a game's slug, or the pass's. */
  readonly game: string;
  readonly title: string;
  /** The page to come back to if the buyer cancels, e.g. "/games/inkfish". */
  readonly returnTo: string;
  readonly origin: string;
  readonly automaticTax: boolean;
  /** The signed-in buyer: checkout requires one. */
  readonly user: { readonly email: string; readonly userId: UserId };
}

/** A Stripe Checkout Session for a one-time unlock: one game's full version, or the pass. */
export function checkoutParams(i: CheckoutInput): Stripe.Checkout.SessionCreateParams {
  const pass = isPass(i.game);
  return {
    mode: 'payment',
    submit_type: 'pay',
    line_items: [{ price: i.priceId, quantity: 1 }],
    customer_creation: 'always',
    // The receipt goes to the Google email, and the purchase to the account.
    customer_email: i.user.email,
    client_reference_id: i.user.userId,
    automatic_tax: { enabled: i.automaticTax },
    allow_promotion_codes: true,
    custom_text: { submit: { message: pass ? PASS_NOTE : ONE_TIME_NOTE } },
    payment_intent_data: {
      description: pass
        ? `${i.title}: every game on 16bit.ink, including future ones (one-time purchase)`
        : `${i.title} full game (one-time purchase)`,
      metadata: { game: i.game },
    },
    metadata: { game: i.game },
    success_url: `${i.origin}/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${i.origin}${i.returnTo}?checkout=cancelled`,
  };
}
