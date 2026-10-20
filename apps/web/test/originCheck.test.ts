import { describe, expect, it } from 'vitest';
import { isForbiddenCrossOrigin } from '../src/lib/originCheck';

const ORIGIN = 'https://16bit.ink';

function check(path: string, init: { method?: string; origin?: string; type?: string } = {}): boolean {
  const headers: Record<string, string> = {};
  if (init.origin) headers.origin = init.origin;
  if (init.type) headers['content-type'] = init.type;
  const request = new Request(`${ORIGIN}${path}`, { method: init.method ?? 'POST', headers, body: init.method === 'GET' ? undefined : 'x' });
  if (!init.type) request.headers.delete('content-type');
  return isForbiddenCrossOrigin(request, new URL(request.url));
}

describe('isForbiddenCrossOrigin (as Astro checkOrigin)', () => {
  it('refuses cross-site form posts and posts with no content type', () => {
    expect(check('/api/redeem', { type: 'application/x-www-form-urlencoded', origin: 'https://evil.example' })).toBe(true);
    expect(check('/api/redeem', { type: 'multipart/form-data; boundary=x' })).toBe(true);
    expect(check('/api/redeem', { type: 'text/plain' })).toBe(true);
    expect(check('/oauth/approve', { type: 'application/x-www-form-urlencoded' })).toBe(true);
    expect(check('/api/redeem')).toBe(true);
  });

  it('allows same-origin posts, JSON posts and safe methods', () => {
    expect(check('/api/redeem', { type: 'application/x-www-form-urlencoded', origin: ORIGIN })).toBe(false);
    expect(check('/api/events', { type: 'application/json' })).toBe(false);
    expect(check('/redeem', { method: 'GET' })).toBe(false);
  });

  it('lets programs reach the OAuth token, registration and MCP endpoints', () => {
    expect(check('/oauth/token', { type: 'application/x-www-form-urlencoded' })).toBe(false);
    expect(check('/oauth/register', { type: 'text/plain' })).toBe(false);
    expect(check('/mcp')).toBe(false);
  });
});
