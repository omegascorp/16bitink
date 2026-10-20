import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import type { APIRoute } from 'astro';
import { db } from '../lib/db';
import { findAccessToken } from '../lib/db/oauthRepo';
import { findAdminEmail } from '../lib/db/userRepo';
import { buildMcpServer } from '../lib/mcpServer';
import { bearerToken, SCOPE, wwwAuthenticate } from '../lib/oauth';

export const prerender = false;

const unauthorized = (origin: string): Response => new Response(JSON.stringify({ error: 'invalid_token' }), {
  status: 401,
  headers: { 'content-type': 'application/json', 'cache-control': 'no-store', 'www-authenticate': wwwAuthenticate(origin) },
});

/**
 * The admin MCP server (Streamable HTTP, stateless: a fresh server per
 * request). Needs an OAuth access token from /oauth/token, and the person it
 * was issued to must still be an admin.
 */
export const ALL: APIRoute = async ({ request, url }) => {
  const token = bearerToken(request.headers.get('authorization'));
  if (!token) return unauthorized(url.origin);
  try {
    await db();
    const owner = await findAccessToken(token, new Date());
    const email = owner && (await findAdminEmail(owner.userId));
    if (!owner || !email) return unauthorized(url.origin);
    const server = buildMcpServer({ userId: owner.userId, email }, url.origin);
    const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    await server.connect(transport);
    return await transport.handleRequest(request, {
      authInfo: { token, clientId: owner.clientId, scopes: [SCOPE], expiresAt: Math.floor(owner.expiresAt.getTime() / 1000) },
    });
  } catch (err) {
    console.error('[mcp] request failed', err);
    return new Response(JSON.stringify({ jsonrpc: '2.0', error: { code: -32603, message: 'Internal error' }, id: null }), {
      status: 500, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    });
  }
};
