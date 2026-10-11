import type Stripe from 'stripe';
import type { UserId } from './userId';

/** Shown under Stripe's pay button. */
export const ONE_TIME_NOTE = 'One-time purchase: pay once and the full game is yours to keep. No subscription, no ads.';

interface CheckoutInput {
  readonly priceId: string;
  readonly game: string;
  readonly title: string;
  readonly origin: string;
  readonly automaticTax: boolean;
  /** The signed-in buyer: checkout requires one. */
  readonly user: { readonly email: string; readonly userId: UserId };
}

/** A Stripe Checkout Session for a one-time full-game unlock. */
export function checkoutParams(i: CheckoutInput): Stripe.Checkout.SessionCreateParams {
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
    custom_text: { submit: { message: ONE_TIME_NOTE } },
    payment_intent_data: {
      description: `${i.title} full game (one-time purchase)`,
      metadata: { game: i.game },
    },
    metadata: { game: i.game },
    success_url: `${i.origin}/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${i.origin}/games/${i.game}?checkout=cancelled`,
  };
}
