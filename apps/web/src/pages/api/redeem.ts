import type { APIRoute } from 'astro';
import { db } from '../../lib/db';
import { redeemKey } from '../../lib/db/keyRepo';
import { fail, isSameOrigin } from '../../lib/http';
import { formatKey, normalizeKey } from '../../lib/keys';
import { currentUser } from '../../lib/owner';

export const prerender = false;

const back = (params: Record<string, string>): string => `/redeem?${new URLSearchParams(params)}`;

/**
 * A signed-in player redeems an activation key: its game is unlocked on
 * their account (so on every device they sign in on). A plain form post:
 * answers with a redirect back to /redeem saying how it went.
 */
export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  if (!isSameOrigin(request)) return fail(403, 'Cross-origin request rejected');
  try {
    const form = await request.formData().catch(() => new FormData());
    const typed = String(form.get('key') ?? '').slice(0, 64);
    const user = await currentUser(cookies);
    if (!user) return redirect(back({ key: typed, error: 'signin' }), 303);
    const code = normalizeKey(typed);
    if (!code) return redirect(back({ key: typed, error: 'invalid' }), 303);
    await db();
    const result = await redeemKey(code, user.userId, new Date());
    if (!result.ok) {
      console.warn(`[redeem] ${user.email} tried a ${result.reason} key ${code.slice(0, 4)}…`);
      return redirect(back({ key: formatKey(code), error: result.reason }), 303);
    }
    console.info(`[redeem] ${user.email} redeemed a key for ${result.game}`);
    return redirect(back({ unlocked: result.game }), 303);
  } catch (err) {
    console.error('[redeem] failed', err);
    return fail(500, 'Could not redeem the key. Please try again.');
  }
};
