import type { APIRoute } from 'astro';
import type Stripe from 'stripe';
import { requireEnv } from '../../lib/env';
import { isPaidSession } from '../../lib/fulfil';
import { stripeClient, webCrypto } from '../../lib/stripe';

export const prerender = false;

/**
 * Stripe webhook. Signature-verified, idempotent by event id.
 * Today it records fulfilment in logs; when the entitlement database
 * lands (docs/architecture.md) this is where rows get upserted, and
 * refunds revoke them.
 */
export const POST: APIRoute = async ({ request }) => {
  const signature = request.headers.get('stripe-signature');
  if (!signature) return new Response('Missing signature', { status: 400 });
  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = await stripeClient().webhooks.constructEventAsync(
      payload, signature, requireEnv('STRIPE_WEBHOOK_SECRET'), undefined, webCrypto,
    );
  } catch (err) {
    console.warn('[webhook] signature verification failed', err instanceof Error ? err.message : 'unknown error');
    return new Response('Invalid signature', { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded': {
      const s = event.data.object;
      if (isPaidSession(s)) {
        console.info('[webhook] purchase fulfilled', { event: event.id, session: s.id, game: s.metadata?.game });
      }
      break;
    }
    case 'charge.refunded':
      console.info('[webhook] refund received — revoke entitlement when DB exists', { event: event.id });
      break;
    default:
      break;
  }
  return new Response('ok');
};
