import type { APIRoute } from 'astro';
import { db } from '../../lib/db';
import { subscribe } from '../../lib/db/subscriberRepo';
import { fail, isSameOrigin } from '../../lib/http';
import { normalizeEmail, signupReturnPath, signupSource } from '../../lib/subscribe';

export const prerender = false;

/**
 * Puts an address on the Sunday email list. A plain form post: answers with
 * a redirect back to the page the form was on. It says the same whether the
 * address was new or already there, so the form can't be used to test who's
 * on the list.
 */
export const POST: APIRoute = async ({ request, redirect }) => {
  if (!isSameOrigin(request)) return fail(403, 'Cross-origin request rejected');
  const form = await request.formData().catch(() => new FormData());
  const from = String(form.get('from') ?? '').slice(0, 200) || null;
  // A field people never see: only bots fill it in. Treated as done so they don't retry.
  if (String(form.get('website') ?? '') !== '') return redirect(signupReturnPath(from, 'done'), 303);
  const email = normalizeEmail(form.get('email'));
  if (!email) return redirect(signupReturnPath(from, 'invalid'), 303);
  try {
    await db();
    const result = await subscribe(email, signupSource(from), new Date());
    if (result === 'added') console.info(`[subscribe] new address from ${signupSource(from)}`);
    return redirect(signupReturnPath(from, 'done'), 303);
  } catch (err) {
    console.error('[subscribe] failed', err);
    return redirect(signupReturnPath(from, 'error'), 303);
  }
};
