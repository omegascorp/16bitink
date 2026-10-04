import { describe, expect, it } from 'vitest';
import { checkIdToken, decodeJwtPayload, googleAuthUrl, pkceChallenge, safeReturnPath } from '../src/lib/google';

const CLIENT = 'client-123.apps.googleusercontent.com';
const NOW = 1_800_000_000;
const good = {
  iss: 'https://accounts.google.com', aud: CLIENT, sub: '1234567890', email: 'Fish@Example.com',
  email_verified: true, name: 'Ink Fish', nonce: 'n-1', exp: NOW + 600, iat: NOW,
};

describe('google auth url', () => {
  it('asks for an OpenID code with PKCE, state and nonce', () => {
    const url = new URL(googleAuthUrl({ clientId: CLIENT, redirectUri: 'https://16bit.ink/auth/google/callback', state: 's', nonce: 'n', challenge: 'c' }));
    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    const q = Object.fromEntries(url.searchParams);
    expect(q).toMatchObject({
      client_id: CLIENT, redirect_uri: 'https://16bit.ink/auth/google/callback', response_type: 'code',
      scope: 'openid email profile', state: 's', nonce: 'n', code_challenge: 'c', code_challenge_method: 'S256',
    });
  });
});

describe('pkce', () => {
  it('matches the RFC 7636 example', async () => {
    expect(await pkceChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
  });
});

describe('id token claims', () => {
  const opts = { clientId: CLIENT, nonce: 'n-1', nowSec: NOW };

  it('accepts a fresh, verified Google identity and lower-cases the email', () => {
    expect(checkIdToken(good, opts)).toEqual({ sub: '1234567890', email: 'fish@example.com', name: 'Ink' });
  });

  it('accepts the bare issuer too', () => {
    expect(checkIdToken({ ...good, iss: 'accounts.google.com' }, opts)).not.toBeNull();
  });

  it.each([
    ['another issuer', { iss: 'https://evil.example' }],
    ['another audience', { aud: 'other-client' }],
    ['a replayed nonce', { nonce: 'n-2' }],
    ['an expired token', { exp: NOW - 1 }],
    ['an unverified email', { email_verified: false }],
    ['no subject', { sub: '' }],
    ['no email', { email: undefined }],
  ])('rejects %s', (_, patch) => {
    expect(checkIdToken({ ...good, ...patch }, opts)).toBeNull();
  });

  it('rejects non-objects', () => {
    expect(checkIdToken(null, opts)).toBeNull();
    expect(checkIdToken('x', opts)).toBeNull();
  });

  it('uses the first name when Google gives one', () => {
    expect(checkIdToken({ ...good, given_name: ' Mary Ann ', name: 'Mary Ann Fish' }, opts)?.name).toBe('Mary Ann');
  });

  it('falls back to the first word of the full name', () => {
    expect(checkIdToken({ ...good, given_name: '' }, opts)?.name).toBe('Ink');
  });

  it('falls back to the email when there is no name', () => {
    expect(checkIdToken({ ...good, name: undefined }, opts)?.name).toBe('fish');
  });
});

describe('jwt payload', () => {
  it('decodes the middle part', () => {
    const body = btoa(JSON.stringify({ a: 1 })).replace(/=+$/, '');
    expect(decodeJwtPayload(`h.${body}.s`)).toEqual({ a: 1 });
  });

  it('returns null for garbage', () => {
    for (const t of ['', 'a.b', 'a.!!!.c', 'a.b.c.d']) expect(decodeJwtPayload(t)).toBeNull();
  });
});

describe('return path', () => {
  it('keeps local paths', () => {
    expect(safeReturnPath('/games/inkfish?x=1')).toBe('/games/inkfish?x=1');
  });

  it.each([null, '', 'https://evil.example', '//evil.example', '/\\evil.example', 'games', '/auth/google', '/auth/google/callback?code=1'])(
    'sends %s home',
    (raw) => expect(safeReturnPath(raw)).toBe('/'),
  );
});
