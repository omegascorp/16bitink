import type { APIRoute } from 'astro';
import { db } from '../../lib/db';
import { claimRefresh, consumeCode, findClient, issueTokens, keepClient, type IssuedTokens } from '../../lib/db/oauthRepo';
import { findAdminEmail } from '../../lib/db/userRepo';
import { pkceMatches, SCOPE } from '../../lib/oauth';

export const prerender = false;

const reply = (status: number, body: unknown): Response => new Response(JSON.stringify(body), {
  status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', pragma: 'no-cache' },
});
const oauthError = (status: number, error: string): Response => reply(status, { error });
const granted = (t: IssuedTokens): Response => reply(200, {
  access_token: t.accessToken, token_type: 'Bearer', expires_in: t.expiresIn, refresh_token: t.refreshToken, scope: SCOPE,
});

/** Form or JSON body as plain strings. */
async function readBody(request: Request): Promise<URLSearchParams> {
  const type = request.headers.get('content-type') ?? '';
  if (type.includes('application/json')) {
    const body: unknown = await request.json().catch(() => null);
    const params = new URLSearchParams();
    if (body && typeof body === 'object') for (const [k, v] of Object.entries(body)) if (typeof v === 'string') params.set(k, v);
    return params;
  }
  return new URLSearchParams(await request.text().catch(() => ''));
}

/**
 * Swaps a code (with its PKCE verifier) or a refresh token for tokens.
 * Tokens are only ever issued to someone who is an admin right now. Each
 * refresh token works once; see claimRefresh for what a second use does.
 */
export const POST: APIRoute = async ({ request }) => {
  const p = await readBody(request);
  const clientId = p.get('client_id') ?? '';
  try {
    await db();
    // invalid_client tells Claude to register again (e.g. after its client was removed).
    const now = new Date();
    if (!clientId || !(await findClient(clientId, now))) return oauthError(401, 'invalid_client');
    const grantType = p.get('grant_type');
    if (grantType === 'authorization_code') {
      const code = await consumeCode(p.get('code') ?? '', clientId, now);
      if (!code || code.redirectUri !== p.get('redirect_uri') || !(await pkceMatches(p.get('code_verifier') ?? '', code.codeChallenge))) {
        return oauthError(400, 'invalid_grant');
      }
      if (!(await findAdminEmail(code.userId))) return oauthError(400, 'invalid_grant');
      await keepClient(clientId, now);
      return granted(await issueTokens(clientId, code.userId, now));
    }
    if (grantType === 'refresh_token') {
      const claimed = await claimRefresh(p.get('refresh_token') ?? '', clientId, now);
      if (!claimed || !(await findAdminEmail(claimed.userId))) return oauthError(400, 'invalid_grant');
      await keepClient(clientId, now);
      return granted(await issueTokens(clientId, claimed.userId, now, claimed.family));
    }
    return oauthError(400, 'unsupported_grant_type');
  } catch (err) {
    console.error('[oauth/token] failed', err);
    return oauthError(500, 'server_error');
  }
};
