import type { APIRoute } from 'astro';
import { db } from '../../lib/db';
import { unsubscribe } from '../../lib/db/subscriberRepo';
import { fail, isSameOrigin } from '../../lib/http';

export const prerender = false;

const done = (ok: boolean): Response =>
  new Response(null, { status: 303, headers: { location: `/unsubscribe?${ok ? 'done=1' : 'error=1'}`, 'cache-control': 'no-store' } });

/**
 * Takes an address off the Sunday list by the token in its emails, from
 * the button on /unsubscribe. The token is the proof; no cookie is used.
 * Same-origin only (Astro's origin check refuses the rest anyway), so mail
 * apps' one-click unsubscribe (RFC 8058) can't post here: point an email's
 * List-Unsubscribe header at the /unsubscribe page instead.
 */
export const POST: APIRoute = async ({ request }) => {
  if (!isSameOrigin(request)) return fail(403, 'Cross-origin request rejected');
  const form = await request.formData().catch(() => new FormData());
  const token = String(form.get('t') ?? '').slice(0, 64);
  if (!token) return fail(400, 'Missing token');
  try {
    await db();
    const removed = await unsubscribe(token);
    if (removed) console.info('[unsubscribe] an address left the list');
    // Already gone counts as done: the address is off the list either way.
    return done(true);
  } catch (err) {
    console.error('[unsubscribe] failed', err);
    return done(false);
  }
};
