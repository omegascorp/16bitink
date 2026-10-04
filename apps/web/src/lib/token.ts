/**
 * HMAC-signed JSON tokens for httpOnly cookies: `<body>.<signature>`, both
 * base64url. A `purpose` is mixed into what gets signed, so a token minted
 * for one job (a sign-in session) never verifies as another (game ownership).
 */

const enc = new TextEncoder();

export function b64url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromB64url(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  if (secret.length < 32) throw new Error('Signing secrets must be at least 32 characters');
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

const signed = (purpose: string, body: string): Uint8Array<ArrayBuffer> => enc.encode(`${purpose}.${body}`);

export async function signToken(payload: unknown, secret: string, purpose: string): Promise<string> {
  const body = b64url(enc.encode(JSON.stringify(payload)));
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret), signed(purpose, body));
  return `${body}.${b64url(new Uint8Array(sig))}`;
}

/** The token's payload when its signature is authentic, else null. Callers still check the shape. */
export async function readToken(token: string | undefined, secret: string, purpose: string): Promise<unknown> {
  if (!token) return null;
  const [body, sig, extra] = token.split('.');
  if (!body || !sig || extra !== undefined) return null;
  try {
    // crypto.subtle.verify is constant-time.
    const ok = await crypto.subtle.verify('HMAC', await hmacKey(secret), fromB64url(sig), signed(purpose, body));
    if (!ok) return null;
    return JSON.parse(new TextDecoder().decode(fromB64url(body))) as unknown;
  } catch {
    return null;
  }
}
