/**
 * OAuth 2.1 for the admin MCP server (/mcp), so Claude can create keys and
 * read traffic as a signed-in admin. Claude registers itself (RFC 7591),
 * sends the admin here to sign in with Google and approve, then swaps the
 * code (with PKCE) for a short-lived access token and a rotating refresh
 * token. Only Claude's callback and loopback addresses may receive codes.
 * Pure rules only; storage is in db/oauthRepo.ts.
 */

import { z } from 'zod';
import { pkceChallenge } from './google';

export const MCP_PATH = '/mcp';
export const SCOPE = 'admin';
export const CODE_TTL_MS = 10 * 60_000;
export const ACCESS_TTL_MS = 60 * 60_000;
export const REFRESH_TTL_MS = 30 * 24 * 60 * 60_000;
/** A registered client is forgotten after a day unless an admin approves it; then it lives as long as its refresh tokens, renewed with each use. */
export const CLIENT_UNUSED_TTL_MS = 24 * 60 * 60_000;
/** Registration bodies are a few hundred bytes; anything much bigger is refused before parsing. */
export const MAX_REGISTRATION_BYTES = 8 * 1024;

/** Claude's OAuth callbacks (claude.com is announced as its future home). */
const CLAUDE_CALLBACKS: ReadonlySet<string> = new Set([
  'https://claude.ai/api/mcp/auth_callback',
  'https://claude.com/api/mcp/auth_callback',
]);

/** Claude's callback, or a loopback address (Claude Code and other local clients, RFC 8252). */
export function isAllowedRedirect(raw: string): boolean {
  if (CLAUDE_CALLBACKS.has(raw)) return true;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  return url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1') && !url.username && !url.password;
}

const Registration = z.object({
  redirect_uris: z.array(z.string().max(500)).min(1).max(5),
  // Shown on the consent page and logged: no control characters (log injection), at most one line.
  client_name: z.string().transform((v) => v.replace(/[\u0000-\u001f\u007f]/g, ' ').trim()).pipe(z.string().max(100)).optional(),
});

export interface ClientRegistration {
  readonly redirectUris: readonly string[];
  readonly clientName: string;
}

/** A dynamic client registration we accept, or an OAuth error code. */
export function parseRegistration(body: unknown): ClientRegistration | { readonly error: string } {
  const parsed = Registration.safeParse(body);
  if (!parsed.success) return { error: 'invalid_client_metadata' };
  if (!parsed.data.redirect_uris.every(isAllowedRedirect)) return { error: 'invalid_redirect_uri' };
  return { redirectUris: parsed.data.redirect_uris, clientName: parsed.data.client_name || 'MCP client' };
}

/** base64url, 43–128 characters: an S256 code challenge or a PKCE verifier (RFC 7636). */
const PKCE = /^[A-Za-z0-9\-._~]{43,128}$/;

export interface AuthorizeRequest {
  readonly clientId: string;
  readonly redirectUri: string;
  readonly codeChallenge: string;
  readonly state: string;
}

/**
 * The authorization request's parameters. `null` when the client or redirect
 * can't be trusted (show an error, never redirect); `error` when the redirect
 * is fine but the rest isn't (send the error back to the client).
 */
export function parseAuthorize(params: URLSearchParams): AuthorizeRequest | { readonly error: string; readonly redirectUri: string; readonly state: string } | null {
  const clientId = params.get('client_id') ?? '';
  const redirectUri = params.get('redirect_uri') ?? '';
  const state = (params.get('state') ?? '').slice(0, 500);
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(clientId) || !isAllowedRedirect(redirectUri)) return null;
  if (params.get('response_type') !== 'code') return { error: 'unsupported_response_type', redirectUri, state };
  const codeChallenge = params.get('code_challenge') ?? '';
  if (params.get('code_challenge_method') !== 'S256' || !PKCE.test(codeChallenge)) return { error: 'invalid_request', redirectUri, state };
  return { clientId, redirectUri, codeChallenge, state };
}

/** Where the client gets its code (or error) back. */
export function redirectWith(redirectUri: string, params: Readonly<Record<string, string>>): string {
  const url = new URL(redirectUri);
  for (const [k, v] of Object.entries(params)) if (v) url.searchParams.set(k, v);
  return url.toString();
}

/** Whether the verifier hashes to the challenge sent with the authorization request. */
export async function pkceMatches(verifier: string, challenge: string): Promise<boolean> {
  return PKCE.test(verifier) && (await pkceChallenge(verifier)) === challenge;
}

/** Stored form of a code or token: never the token itself. */
export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return Buffer.from(digest).toString('hex');
}

export function protectedResourceMetadata(origin: string): Record<string, unknown> {
  return {
    resource: `${origin}${MCP_PATH}`,
    authorization_servers: [origin],
    scopes_supported: [SCOPE],
    bearer_methods_supported: ['header'],
    resource_name: '16bit.ink admin',
  };
}

export function authorizationServerMetadata(origin: string): Record<string, unknown> {
  return {
    issuer: origin,
    authorization_endpoint: `${origin}/oauth/authorize`,
    token_endpoint: `${origin}/oauth/token`,
    registration_endpoint: `${origin}/oauth/register`,
    scopes_supported: [SCOPE],
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none'],
  };
}

/** Tells a client without a valid token where to find out how to get one (RFC 9728). */
export const wwwAuthenticate = (origin: string): string =>
  `Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource"`;

/** The token in an `Authorization: Bearer …` header, or null. */
export function bearerToken(header: string | null): string | null {
  const match = /^Bearer\s+(\S+)\s*$/i.exec(header ?? '');
  return match?.[1] ?? null;
}
