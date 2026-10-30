import type { APIRoute } from 'astro';
import { db } from '../../lib/db';
import { unsubscribe, unsubscribeEmail } from '../../lib/db/subscriberRepo';
import { fail, isSameOrigin } from '../../lib/http';
import { currentUser } from '../../lib/owner';
import { normalizeEmail } from '../../lib/subscribe';

export const prerender = false;

const goTo = (location: string): Response => new Response(null, { status: 303, headers: { location, 'cache-control': 'no-store' } });

const done = (ok: boolean): Response => goTo(`/unsubscribe?${ok ? 'done=1' : 'error=1'}`);

/**
 * Takes an address off the Sunday list, one of two ways:
 * - by the token in its emails, from the button on /unsubscribe (the token is the proof; no cookie is used);
 * - with no token, the signed-in player's own address, from their account page (the session is the proof).
 * Nobody else's address can be taken off, and the answer never says whether one was on the list.
 * Same-origin only (Astro's origin check refuses the rest anyway), so mail
 * apps' one-click unsubscribe (RFC 8058) can't post here: point an email's
 * List-Unsubscribe header at the /unsubscribe page instead.
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  if (!isSameOrigin(request)) return fail(403, 'Cross-origin request rejected');
  const form = await request.formData().catch(() => new FormData());
  const token = String(form.get('t') ?? '').slice(0, 64);
  if (!token) return fromAccount(cookies);
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

/** The signed-in player leaves the list from their account page, and goes back there. */
async function fromAccount(cookies: Parameters<APIRoute>[0]['cookies']): Promise<Response> {
  try {
    const user = await currentUser(cookies);
    const email = user ? normalizeEmail(user.email) : null;
    if (!email) return fail(401, 'Sign in to change your email settings.');
    await db();
    if (await unsubscribeEmail(email)) console.info('[unsubscribe] an address left the list from its account');
    return goTo('/account?sunday=off#sunday');
  } catch (err) {
    console.error('[unsubscribe] from account failed', err);
    return goTo('/account?sunday=error#sunday');
  }
}
