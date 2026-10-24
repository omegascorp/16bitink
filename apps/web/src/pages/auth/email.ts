import type { APIRoute } from 'astro';
import { db } from '../../lib/db';
import { createEmailSignIn, forgetEmailSignIn } from '../../lib/db/emailSignInRepo';
import { EMAIL_SIGNIN_MAX_AGE_SEC, hashSecret, newCode, newLinkToken, signInEmail, verifyLinkUrl } from '../../lib/emailSignIn';
import { requireSecret } from '../../lib/env';
import { safeReturnPath } from '../../lib/google';
import { fail, isSameOrigin, json } from '../../lib/http';
import { sendMail } from '../../lib/mailer';
import { EMAIL_FLOW_COOKIE, signEmailFlow } from '../../lib/session';
import { normalizeEmail } from '../../lib/subscribe';

export const prerender = false;

/**
 * Emails a sign-in code and link to the address in `{ email, return }`.
 * This browser gets a cookie naming that email, so the code typed back
 * here is checked against it alone (see ./email/code.ts).
 */
export const POST: APIRoute = async ({ request, cookies, url }) => {
  if (!isSameOrigin(request)) return fail(403, 'Cross-origin request rejected');
  const body = (await request.json().catch(() => null)) as { email?: unknown; return?: unknown } | null;
  const email = normalizeEmail(body?.email);
  if (!email) return fail(400, "That doesn't look like an email address. Check it for typos.");
  const ret = safeReturnPath(typeof body?.return === 'string' ? body.return.slice(0, 500) : null);
  const now = new Date();
  const code = newCode();
  const token = newLinkToken();
  let id: string | null = null;
  try {
    const secret = requireSecret('ENTITLEMENT_SECRET');
    await db();
    id = await createEmailSignIn({ email, ret, tokenHash: await hashSecret(token), codeHash: await hashSecret(code) }, now);
    if (!id) return fail(429, 'We just sent a few emails to that address. Check your inbox and spam folder, or try again in 15 minutes.');
    // The site's own address in production, never the request's Host: a forged one would send the link elsewhere.
    const origin = import.meta.env.PROD ? import.meta.env.SITE : url.origin;
    await sendMail(email, signInEmail({ code, link: verifyLinkUrl(origin, token) }));
    const exp = Math.floor(now.getTime() / 1000) + EMAIL_SIGNIN_MAX_AGE_SEC;
    cookies.set(EMAIL_FLOW_COOKIE, await signEmailFlow({ v: 1, id, email, exp }, secret), {
      path: '/', httpOnly: true, secure: import.meta.env.PROD, sameSite: 'lax', maxAge: EMAIL_SIGNIN_MAX_AGE_SEC,
    });
    return json({ success: true, data: { email } });
  } catch (err) {
    console.error('[auth/email] could not send the sign-in email', err);
    if (id) await forgetEmailSignIn(id).catch(() => undefined);
    return fail(503, "We couldn't send the email just now. Please try again in a minute.");
  }
};
