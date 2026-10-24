import type { APIRoute } from 'astro';
import { db } from '../../../lib/db';
import { redeemCode } from '../../../lib/db/emailSignInRepo';
import { hashSecret, normalizeCode } from '../../../lib/emailSignIn';
import { requireSecret } from '../../../lib/env';
import { fail, isSameOrigin, json } from '../../../lib/http';
import { EMAIL_FLOW_COOKIE, verifyEmailFlow } from '../../../lib/session';
import { finishSignIn } from '../../../lib/signIn';

export const prerender = false;

const EXPIRED = 'That code has expired or was tried too many times. Ask for a new email.';

/** Signs this browser in with the code from the email it asked for: `{ code }`, answering `{ ret }`, where to go next. */
export const POST: APIRoute = async ({ request, cookies, url }) => {
  if (!isSameOrigin(request)) return fail(403, 'Cross-origin request rejected');
  const body = (await request.json().catch(() => null)) as { code?: unknown } | null;
  const code = normalizeCode(body?.code);
  if (!code) return fail(400, 'The code is the 6 digits in the email.');
  const now = new Date();
  try {
    const flow = await verifyEmailFlow(cookies.get(EMAIL_FLOW_COOKIE)?.value, requireSecret('ENTITLEMENT_SECRET'), Math.floor(now.getTime() / 1000));
    if (!flow) return fail(410, EXPIRED);
    await db();
    const result = await redeemCode(flow.id, await hashSecret(code), now);
    if (result.status === 'wrong') {
      return fail(400, `That's not the code we sent. ${result.attemptsLeft} ${result.attemptsLeft === 1 ? 'try' : 'tries'} left.`);
    }
    if (result.status === 'expired') {
      cookies.delete(EMAIL_FLOW_COOKIE, { path: '/' });
      return fail(410, EXPIRED);
    }
    await finishSignIn(cookies, url, { kind: 'email', email: result.email }, now);
    cookies.delete(EMAIL_FLOW_COOKIE, { path: '/' });
    return json({ success: true, data: { ret: result.ret } });
  } catch (err) {
    console.error('[auth/email/code] sign-in failed', err);
    return fail(503, 'Something went wrong signing you in. Please try again.');
  }
};
