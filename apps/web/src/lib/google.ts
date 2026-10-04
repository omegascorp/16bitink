import { b64url, fromB64url } from './token';

/**
 * Google sign-in (OpenID Connect, authorization code flow with PKCE). Pure
 * helpers only; the routes live in pages/auth/.
 */

export const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
export const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const ISSUERS: ReadonlySet<string> = new Set(['https://accounts.google.com', 'accounts.google.com']);

export const CALLBACK_PATH = '/auth/google/callback';

export interface GoogleUser {
  /** Google's stable account id. */
  readonly sub: string;
  /** Verified, lower-cased: the key purchases are found by. */
  readonly email: string;
  /** First name, for the header. */
  readonly name: string;
}

const text = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

interface AuthUrlParams {
  readonly clientId: string;
  readonly redirectUri: string;
  readonly state: string;
  readonly nonce: string;
  readonly challenge: string;
}

export function googleAuthUrl(p: AuthUrlParams): string {
  const q = new URLSearchParams({
    client_id: p.clientId,
    redirect_uri: p.redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state: p.state,
    nonce: p.nonce,
    code_challenge: p.challenge,
    code_challenge_method: 'S256',
    prompt: 'select_account',
  });
  return `${GOOGLE_AUTH_URL}?${q}`;
}

/** 32 random bytes, base64url: states, nonces and PKCE verifiers. */
export function randomToken(): string {
  return b64url(crypto.getRandomValues(new Uint8Array(32)));
}

export async function pkceChallenge(verifier: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return b64url(new Uint8Array(hash));
}

/**
 * The ID token's claims, without checking its signature. That is safe only
 * because we take the token straight from Google's token endpoint over TLS
 * (OpenID Connect Core 3.1.3.7), never from the browser.
 */
export function decodeJwtPayload(jwt: string): unknown {
  const parts = jwt.split('.');
  if (parts.length !== 3 || !parts[1]) return null;
  try {
    return JSON.parse(new TextDecoder().decode(fromB64url(parts[1]))) as unknown;
  } catch {
    return null;
  }
}

interface CheckOptions {
  readonly clientId: string;
  /** The nonce we sent; a mismatch means a replayed or injected token. */
  readonly nonce: string;
  readonly nowSec: number;
}

/** The signed-in Google account, when the ID token's claims hold up. */
export function checkIdToken(claims: unknown, o: CheckOptions): GoogleUser | null {
  if (typeof claims !== 'object' || claims === null) return null;
  const c = claims as Record<string, unknown>;
  const valid =
    typeof c.iss === 'string' && ISSUERS.has(c.iss) &&
    c.aud === o.clientId &&
    c.nonce === o.nonce &&
    typeof c.exp === 'number' && c.exp > o.nowSec &&
    c.email_verified === true &&
    typeof c.sub === 'string' && c.sub.length > 0 &&
    typeof c.email === 'string' && c.email.includes('@');
  if (!valid) return null;
  const email = (c.email as string).toLowerCase();
  const name = text(c.given_name) || text(c.name).split(/\s+/)[0] || email.split('@')[0]!;
  return { sub: c.sub as string, email, name };
}

/** Where to go after signing in: a path on this site, never another origin or the sign-in routes. */
export function safeReturnPath(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return '/';
  if (raw === '/auth/google' || raw.startsWith('/auth/google/') || raw.startsWith('/auth/google?')) return '/';
  return raw;
}
