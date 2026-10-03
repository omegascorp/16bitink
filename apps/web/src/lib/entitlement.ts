/**
 * Stateless proof of purchase: an HMAC-signed token stored in an
 * httpOnly cookie. Issued only after the server has confirmed a paid
 * Stripe Checkout Session. A database row (see docs/architecture.md)
 * will later back cross-device restore; the token format stays the same.
 */

export interface EntitlementClaims {
  /** Token format/key version, allows graceful secret rotation later. */
  readonly v: 1;
  /** Game slug */
  readonly g: string;
  /** Stripe Checkout Session id that paid for it */
  readonly s: string;
  /** Issued at, unix seconds */
  readonly iat: number;
}

const enc = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64url(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  if (secret.length < 32) throw new Error('ENTITLEMENT_SECRET must be at least 32 characters');
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function signEntitlement(claims: EntitlementClaims, secret: string): Promise<string> {
  const body = b64url(enc.encode(JSON.stringify(claims)));
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret), enc.encode(body));
  return `${body}.${b64url(new Uint8Array(sig))}`;
}

function isClaims(v: unknown): v is EntitlementClaims {
  if (typeof v !== 'object' || v === null) return false;
  const c = v as Record<string, unknown>;
  return c.v === 1 && typeof c.g === 'string' && typeof c.s === 'string' && typeof c.iat === 'number';
}

/** Returns the claims when the token is authentic and for `game`, else null. */
export async function verifyEntitlement(token: string | undefined, game: string, secret: string): Promise<EntitlementClaims | null> {
  if (!token) return null;
  const [body, sig, extra] = token.split('.');
  if (!body || !sig || extra !== undefined) return null;
  try {
    // crypto.subtle.verify is constant-time.
    const ok = await crypto.subtle.verify('HMAC', await hmacKey(secret), fromB64url(sig), enc.encode(body));
    if (!ok) return null;
    const claims: unknown = JSON.parse(new TextDecoder().decode(fromB64url(body)));
    return isClaims(claims) && claims.g === game ? claims : null;
  } catch {
    return null;
  }
}

export const entitlementCookie = (game: string): string => `ink_own_${game}`;

export const ENTITLEMENT_MAX_AGE = 60 * 60 * 24 * 365 * 5;
