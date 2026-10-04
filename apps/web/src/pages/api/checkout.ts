import type { APIRoute } from 'astro';
import { z } from 'zod';
import { findGame, isPurchasable } from '../../data/games';
import { checkoutParams } from '../../lib/checkoutParams';
import { optionalEnv } from '../../lib/env';
import { fail, isSameOrigin, json } from '../../lib/http';
import { currentUser } from '../../lib/owner';
import { stripeClient } from '../../lib/stripe';

export const prerender = false;

const Body = z.object({ game: z.string().regex(/^[a-z0-9-]{1,40}$/) });

/** Creates a Stripe Checkout Session for a one-time full-game unlock. */
export const POST: APIRoute = async ({ request, url, cookies }) => {
  if (!isSameOrigin(request)) return fail(403, 'Cross-origin request rejected');
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(400, 'Invalid request');
  const game = findGame(parsed.data.game);
  if (!isPurchasable(game)) return fail(404, 'This game is not for sale');

  try {
    const stripe = stripeClient();
    const prices = await stripe.prices.list({ lookup_keys: [game.stripeLookupKey], active: true, limit: 1 });
    const price = prices.data[0];
    if (!price) throw new Error(`No active Stripe price with lookup key "${game.stripeLookupKey}"`);
    // A recurring price would turn the unlock into a subscription: refuse it.
    if (price.type !== 'one_time') throw new Error(`Price "${game.stripeLookupKey}" must be one-time, not ${price.type}`);
    const user = await currentUser(cookies);
    const session = await stripe.checkout.sessions.create(checkoutParams({
      priceId: price.id, game: game.slug, title: game.title, origin: url.origin,
      automaticTax: optionalEnv('STRIPE_AUTOMATIC_TAX') === 'true',
      user: user ? { email: user.email, userId: user.userId } : null,
    }));
    if (!session.url) throw new Error('Stripe returned no checkout URL');
    return json({ success: true, data: { url: session.url } });
  } catch (err) {
    console.error('[checkout] failed to create session', { game: game.slug, err });
    return fail(502, 'Could not start checkout. Please try again in a moment.');
  }
};
