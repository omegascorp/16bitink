import type { APIRoute } from 'astro';
import { db } from '../../lib/db';
import { registerClient } from '../../lib/db/oauthRepo';
import { MAX_REGISTRATION_BYTES, parseRegistration } from '../../lib/oauth';

export const prerender = false;

const reply = (status: number, body: unknown): Response => new Response(JSON.stringify(body), {
  status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
});

/**
 * Dynamic client registration (RFC 7591). Open to anyone, which is safe:
 * codes only ever go to Claude's callback or a loopback address, and only
 * after an admin signs in and approves. Clients nobody approves are
 * forgotten after a day.
 */
export const POST: APIRoute = async ({ request }) => {
  const text = await request.text().catch(() => '');
  if (text.length > MAX_REGISTRATION_BYTES) return reply(413, { error: 'invalid_client_metadata' });
  let body: unknown = null;
  try {
    body = JSON.parse(text);
  } catch {
    // Not JSON: parseRegistration refuses it below.
  }
  const reg = parseRegistration(body);
  if ('error' in reg) return reply(400, { error: reg.error });
  try {
    await db();
    const client = await registerClient(reg, new Date());
    return reply(201, {
      client_id: client.clientId, client_name: client.name, redirect_uris: client.redirectUris,
      grant_types: ['authorization_code', 'refresh_token'], response_types: ['code'], token_endpoint_auth_method: 'none',
    });
  } catch (err) {
    console.error('[oauth/register] failed', err);
    return reply(500, { error: 'server_error' });
  }
};
