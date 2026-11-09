import { beforeEach, describe, expect, it, vi } from 'vitest';

const currentUser = vi.fn();
const recordEvents = vi.fn();
const linkVisitor = vi.fn();

vi.mock('../src/lib/owner', () => ({ currentUser: (...a: unknown[]) => currentUser(...a) }));
vi.mock('../src/lib/db', () => ({ db: async () => undefined }));
vi.mock('../src/lib/db/eventRepo', () => ({ recordEvents: (...a: unknown[]) => recordEvents(...a) }));
vi.mock('../src/lib/db/visitorLinkRepo', () => ({ linkVisitor: (...a: unknown[]) => linkVisitor(...a) }));
vi.mock('../src/lib/geo', () => ({ countryOf: async () => 'DE' }));

const { POST } = await import('../src/pages/api/events');

const ORIGIN = 'https://16bit.ink';
const CHROME = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const USER = { userId: '65f0c0ffee0000000000aa01', email: 'fish@example.com' };

function call(agent = CHROME): Promise<Response> {
  const body = JSON.stringify({ visitor: 'visitor-0001', session: 'session-0001', sentAt: 1000, events: [{ type: 'pageview', at: 1000, path: '/' }] });
  const request = new Request(`${ORIGIN}/api/events`, { method: 'POST', headers: { origin: ORIGIN, 'user-agent': agent }, body });
  return POST({ request, url: new URL(request.url), cookies: {}, clientAddress: '203.0.113.9' } as never) as Promise<Response>;
}

describe('POST /api/events', () => {
  beforeEach(() => {
    currentUser.mockReset().mockResolvedValue(null);
    recordEvents.mockReset().mockResolvedValue(undefined);
    linkVisitor.mockReset().mockResolvedValue(undefined);
  });

  it('stores the events, with no account in them, and links the browser to the signed-in account', async () => {
    currentUser.mockResolvedValue(USER);
    expect((await call()).status).toBe(204);
    expect(linkVisitor).toHaveBeenCalledWith('visitor-0001', USER.userId, expect.any(Date));
    const [events] = recordEvents.mock.calls[0] as [Record<string, unknown>[]];
    expect(events).toHaveLength(1);
    expect(JSON.stringify(events)).not.toContain(USER.userId);
    expect(JSON.stringify(events)).not.toContain(USER.email);
  });

  it('links nothing when nobody is signed in', async () => {
    expect((await call()).status).toBe(204);
    expect(recordEvents).toHaveBeenCalledOnce();
    expect(linkVisitor).not.toHaveBeenCalled();
  });

  it('still answers 204, and keeps the events, when the link fails', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    currentUser.mockResolvedValue(USER);
    linkVisitor.mockRejectedValue(new Error('database down'));
    expect((await call()).status).toBe(204);
    expect(recordEvents).toHaveBeenCalledOnce();
    expect(logged).toHaveBeenCalledWith('[analytics] could not link visitor to account', expect.anything());
    logged.mockRestore();
  });

  it('still links the browser when the events fail to store', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    currentUser.mockResolvedValue(USER);
    recordEvents.mockRejectedValue(new Error('database down'));
    expect((await call()).status).toBe(204);
    expect(linkVisitor).toHaveBeenCalledOnce();
    logged.mockRestore();
  });

  it('neither stores nor links for a bot', async () => {
    currentUser.mockResolvedValue(USER);
    expect((await call('Googlebot/2.1 (+http://www.google.com/bot.html)')).status).toBe(204);
    expect(recordEvents).not.toHaveBeenCalled();
    expect(linkVisitor).not.toHaveBeenCalled();
  });
});
