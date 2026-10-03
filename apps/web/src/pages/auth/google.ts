import type { APIRoute } from 'astro';
import { requireEnv, requireSecret } from '../../lib/env';
import { CALLBACK_PATH, googleAuthUrl, pkceChallenge, randomToken, safeReturnPath } from '../../lib/google';
import { FLOW_COOKIE, FLOW_MAX_AGE, signFlow } from '../../lib/session';

export const prerender = false;

/** Starts Google sign-in: remembers state, nonce and PKCE verifier in a short-lived cookie, then leaves for Google. */
export const GET: APIRoute = async ({ url, cookies, redirect }) => {
  try {
    const clientId = requireEnv('GOOGLE_CLIENT_ID');
    const flow = {
      v: 1, state: randomToken(), nonce: randomToken(), verifier: randomToken(),
      ret: safeReturnPath(url.searchParams.get('return')),
      exp: Math.floor(Date.now() / 1000) + FLOW_MAX_AGE,
    } as const;
    cookies.set(FLOW_COOKIE, await signFlow(flow, requireSecret('ENTITLEMENT_SECRET')), {
      // lax: the cookie must ride along on Google's top-level redirect back.
      path: '/auth/google', httpOnly: true, secure: import.meta.env.PROD, sameSite: 'lax', maxAge: FLOW_MAX_AGE,
    });
    return redirect(googleAuthUrl({
      clientId,
      redirectUri: `${url.origin}${CALLBACK_PATH}`,
      state: flow.state, nonce: flow.nonce, challenge: await pkceChallenge(flow.verifier),
    }), 302);
  } catch (err) {
    console.error('[auth/google] could not start sign-in', err);
    return new Response('Sign-in is unavailable right now.', { status: 503, headers: { 'cache-control': 'no-store' } });
  }
};
