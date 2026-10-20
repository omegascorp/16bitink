import { describe, expect, it } from 'vitest';
import { pkceChallenge } from '../src/lib/google';
import {
  authorizationServerMetadata, hashToken, isAllowedRedirect, parseAuthorize, parseRegistration, pkceMatches,
  protectedResourceMetadata, redirectWith, wwwAuthenticate,
} from '../src/lib/oauth';

const CLAUDE = 'https://claude.ai/api/mcp/auth_callback';
const VERIFIER = 'v'.repeat(50);

describe('isAllowedRedirect', () => {
  it("accepts Claude's callbacks and loopback addresses", () => {
    expect(isAllowedRedirect(CLAUDE)).toBe(true);
    expect(isAllowedRedirect('https://claude.com/api/mcp/auth_callback')).toBe(true);
    expect(isAllowedRedirect('http://localhost:6274/oauth/callback')).toBe(true);
    expect(isAllowedRedirect('http://127.0.0.1:33418/callback')).toBe(true);
  });

  it('refuses everything else', () => {
    expect(isAllowedRedirect('https://claude.ai/api/mcp/auth_callback/evil')).toBe(false);
    expect(isAllowedRedirect('https://evil.example/api/mcp/auth_callback')).toBe(false);
    expect(isAllowedRedirect('https://localhost/callback')).toBe(false);
    expect(isAllowedRedirect('http://localhost.evil.example/callback')).toBe(false);
    expect(isAllowedRedirect('http://user:pw@localhost/callback')).toBe(false);
    expect(isAllowedRedirect('javascript:alert(1)')).toBe(false);
    expect(isAllowedRedirect('not a url')).toBe(false);
  });
});

describe('parseRegistration', () => {
  it('registers a client with allowed redirects', () => {
    expect(parseRegistration({ redirect_uris: [CLAUDE], client_name: 'Claude' })).toEqual({ redirectUris: [CLAUDE], clientName: 'Claude' });
    expect(parseRegistration({ redirect_uris: [CLAUDE] })).toEqual({ redirectUris: [CLAUDE], clientName: 'MCP client' });
  });

  it('keeps the client name to one clean line (it is shown and logged)', () => {
    expect(parseRegistration({ redirect_uris: [CLAUDE], client_name: 'Claude\n[oauth] admin@x connected Evil' })).toEqual({
      redirectUris: [CLAUDE], clientName: 'Claude [oauth] admin@x connected Evil',
    });
    expect(parseRegistration({ redirect_uris: [CLAUDE], client_name: 'x'.repeat(101) })).toEqual({ error: 'invalid_client_metadata' });
  });

  it('refuses a redirect anywhere else, or a malformed body', () => {
    expect(parseRegistration({ redirect_uris: [CLAUDE, 'https://evil.example/cb'] })).toEqual({ error: 'invalid_redirect_uri' });
    expect(parseRegistration({ redirect_uris: [] })).toEqual({ error: 'invalid_client_metadata' });
    expect(parseRegistration(null)).toEqual({ error: 'invalid_client_metadata' });
  });
});

describe('parseAuthorize', () => {
  const good = async (): Promise<URLSearchParams> => new URLSearchParams({
    client_id: 'client_abcdefgh', redirect_uri: CLAUDE, response_type: 'code', state: 's1',
    code_challenge: await pkceChallenge(VERIFIER), code_challenge_method: 'S256',
  });

  it('reads a valid request', async () => {
    const params = await good();
    expect(parseAuthorize(params)).toEqual({
      clientId: 'client_abcdefgh', redirectUri: CLAUDE, codeChallenge: params.get('code_challenge'), state: 's1',
    });
  });

  it('is null (show an error, do not redirect) for a bad client or redirect', async () => {
    const params = await good();
    params.set('redirect_uri', 'https://evil.example/cb');
    expect(parseAuthorize(params)).toBeNull();
    const noClient = await good();
    noClient.delete('client_id');
    expect(parseAuthorize(noClient)).toBeNull();
  });

  it('sends other problems back to the client', async () => {
    const plain = await good();
    plain.set('code_challenge_method', 'plain');
    expect(parseAuthorize(plain)).toEqual({ error: 'invalid_request', redirectUri: CLAUDE, state: 's1' });
    const token = await good();
    token.set('response_type', 'token');
    expect(parseAuthorize(token)).toEqual({ error: 'unsupported_response_type', redirectUri: CLAUDE, state: 's1' });
  });
});

describe('PKCE and token hashing', () => {
  it('matches only the verifier the challenge was made from', async () => {
    const challenge = await pkceChallenge(VERIFIER);
    expect(await pkceMatches(VERIFIER, challenge)).toBe(true);
    expect(await pkceMatches('w'.repeat(50), challenge)).toBe(false);
    expect(await pkceMatches('short', challenge)).toBe(false);
  });

  it('hashes tokens to a stable hex digest', async () => {
    expect(await hashToken('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
});

describe('redirects and metadata', () => {
  it('adds the code and state to the redirect, keeping its own query', () => {
    expect(redirectWith('http://localhost:1234/cb?x=1', { code: 'c', state: 's', error: '' })).toBe('http://localhost:1234/cb?x=1&code=c&state=s');
  });

  it('points the resource at this server and the MCP path', () => {
    expect(protectedResourceMetadata('https://16bit.ink')).toMatchObject({ resource: 'https://16bit.ink/mcp', authorization_servers: ['https://16bit.ink'] });
    expect(authorizationServerMetadata('https://16bit.ink')).toMatchObject({
      issuer: 'https://16bit.ink', token_endpoint: 'https://16bit.ink/oauth/token', code_challenge_methods_supported: ['S256'],
    });
    expect(wwwAuthenticate('https://16bit.ink')).toBe('Bearer resource_metadata="https://16bit.ink/.well-known/oauth-protected-resource"');
  });
});
