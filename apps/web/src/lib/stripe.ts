import Stripe from 'stripe';
import { requireEnv } from './env';

let client: Stripe | undefined;

/** One client for the server's lifetime; it keeps its connections alive between requests. */
export function stripeClient(): Stripe {
  client ??= new Stripe(requireEnv('STRIPE_SECRET_KEY'));
  return client;
}
