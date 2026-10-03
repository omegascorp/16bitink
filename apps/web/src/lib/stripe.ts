import Stripe from 'stripe';
import { requireEnv } from './env';

export function stripeClient(): Stripe {
  return new Stripe(requireEnv('STRIPE_SECRET_KEY'), {
    // Workers have fetch, not Node's http module.
    httpClient: Stripe.createFetchHttpClient(),
  });
}

export const webCrypto = Stripe.createSubtleCryptoProvider();
