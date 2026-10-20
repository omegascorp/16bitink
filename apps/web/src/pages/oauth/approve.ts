import type { APIRoute } from 'astro';
import { db } from '../../lib/db';
import { findClient, issueCode } from '../../lib/db/oauthRepo';
import { findAdminEmail } from '../../lib/db/userRepo';
import { isSameOrigin } from '../../lib/http';
import { parseAuthorize, redirectWith } from '../../lib/oauth';
import { currentUser } from '../../lib/owner';

export const prerender = false;

const plain = (status: number, text: string): Response =>
  new Response(text, { status, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } });

/** The admin's answer on /oauth/authorize: a one-time code back to the client, or access_denied. Every check runs again here. */
export const POST: APIRoute = async ({ request, url, cookies, redirect }) => {
  if (!isSameOrigin(request)) return plain(403, 'Cross-origin request rejected');
  const form = await request.formData().catch(() => new FormData());
  const params = new URLSearchParams();
  for (const [k, v] of form) if (typeof v === 'string') params.set(k, v);
  const req = parseAuthorize(params);
  if (!req || 'error' in req) return plain(400, 'This connection request isn’t valid. Start again from the app.');
  try {
    await db();
    const now = new Date();
    const client = await findClient(req.clientId, now);
    if (!client || !client.redirectUris.includes(req.redirectUri)) return plain(400, 'Unknown app. Remove the connector and add it again.');
    if (params.get('decision') !== 'allow') return redirect(redirectWith(req.redirectUri, { error: 'access_denied', state: req.state }), 303);
    const session = await currentUser(cookies);
    const email = session && (await findAdminEmail(session.userId));
    if (!session || !email) return plain(403, 'Only 16bit.ink admins can connect apps.');
    const code = await issueCode({ clientId: req.clientId, userId: session.userId, redirectUri: req.redirectUri, codeChallenge: req.codeChallenge }, now);
    console.info(`[oauth] ${email} connected ${client.name} (${client.clientId})`);
    return redirect(redirectWith(req.redirectUri, { code, state: req.state, iss: url.origin }), 303);
  } catch (err) {
    console.error('[oauth/approve] failed', err);
    return plain(500, 'Something went wrong on our side. Please try again.');
  }
};
