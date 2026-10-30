import { beforeEach, describe, expect, it, vi } from 'vitest';

const currentUser = vi.fn();
const unsubscribe = vi.fn();
const unsubscribeEmail = vi.fn();

vi.mock('../src/lib/db', () => ({ db: async () => undefined }));
vi.mock('../src/lib/owner', () => ({ currentUser: (...a: unknown[]) => currentUser(...a) }));
vi.mock('../src/lib/db/subscriberRepo', () => ({
  unsubscribe: (...a: unknown[]) => unsubscribe(...a),
  unsubscribeEmail: (...a: unknown[]) => unsubscribeEmail(...a),
}));

const { POST } = await import('../src/pages/api/unsubscribe');

const ORIGIN = 'https://16bit.ink';

function call(fields: Record<string, string>): Promise<Response> {
  const request = new Request(`${ORIGIN}/api/unsubscribe`, { method: 'POST', headers: { origin: ORIGIN }, body: new URLSearchParams(fields) });
  return POST({ request, url: new URL(request.url), cookies: {} } as never) as Promise<Response>;
}

describe('POST /api/unsubscribe', () => {
  beforeEach(() => {
    currentUser.mockReset();
    unsubscribe.mockReset().mockResolvedValue(true);
    unsubscribeEmail.mockReset().mockResolvedValue(true);
  });

  it('takes an address off by the token in its emails', async () => {
    const res = await call({ t: 'ABCDEFGHIJKLMNOPQRST' });
    expect(res.headers.get('location')).toBe('/unsubscribe?done=1');
    expect(unsubscribe).toHaveBeenCalledWith('ABCDEFGHIJKLMNOPQRST');
  });

  it('takes a signed-in player off by their own account, back to the account page', async () => {
    currentUser.mockResolvedValue({ email: 'Fish@Example.com', userId: '65f0c0ffee0000000000aa01' });
    const res = await call({ from: 'account' });
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe('/account?sunday=off#sunday');
    expect(unsubscribeEmail).toHaveBeenCalledWith('fish@example.com');
  });

  it('never takes anyone off without the token or a signed-in account', async () => {
    currentUser.mockResolvedValue(null);
    const res = await call({ from: 'account' });
    expect(res.status).toBe(401);
    expect(unsubscribeEmail).not.toHaveBeenCalled();
    expect(unsubscribe).not.toHaveBeenCalled();
  });
});
