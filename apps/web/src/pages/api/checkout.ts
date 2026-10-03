import type { APIRoute } from 'astro';
import { z } from 'zod';
import { findGame, isPurchasable } from '../../data/games';
import { optionalEnv, requireEnv } from '../../lib/env';
import { fail, isSameOrigin, json } from '../../lib/http';
import { stripeClient } from '../../lib/stripe';

export const prerender = false;

const Body = z.object({ game: z.string().regex(/^[a-z0-9-]{1,40}$/) });

/** Creates a Stripe Checkout Session for a one-time full-game unlock. */
export const POST: APIRoute = async ({ request, url }) => {
  if (!isSameOrigin(request)) return fail(403, 'Cross-origin request rejected');
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(400, 'Invalid request');
  const game = findGame(parsed.data.game);
  if (!isPurchasable(game)) return fail(404, 'This game is not for sale');

  try {
    const session = await stripeClient().checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: requireEnv(game.stripePriceEnv), quantity: 1 }],
      // Email is collected by Stripe and used later for purchase restore.
      customer_creation: 'always',
      automatic_tax: { enabled: optionalEnv('STRIPE_AUTOMATIC_TAX') === 'true' },
      allow_promotion_codes: true,
      metadata: { game: game.slug },
      success_url: `${url.origin}/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${url.origin}/games/${game.slug}?checkout=cancelled`,
    });
    if (!session.url) throw new Error('Stripe returned no checkout URL');
    return json({ success: true, data: { url: session.url } });
  } catch (err) {
    console.error('[checkout] failed to create session', { game: game.slug, err });
    return fail(502, 'Could not start checkout. Please try again in a moment.');
  }
};
