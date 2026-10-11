import { beforeEach, describe, expect, it, vi } from 'vitest';

const currentUser = vi.fn();
const createSession = vi.fn();

vi.mock('../src/lib/env', () => ({ optionalEnv: () => undefined }));
vi.mock('../src/lib/owner', () => ({ currentUser: (...a: unknown[]) => currentUser(...a) }));
vi.mock('../src/lib/stripe', () => ({
  stripeClient: () => ({
    prices: { list: async () => ({ data: [{ id: 'price_1', type: 'one_time' }] }) },
    checkout: { sessions: { create: (...a: unknown[]) => createSession(...a) } },
  }),
}));

const { POST } = await import('../src/pages/api/checkout');

const ORIGIN = 'https://16bit.ink';

function call(body: unknown): Promise<Response> {
  const request = new Request(`${ORIGIN}/api/checkout`, {
    method: 'POST', headers: { origin: ORIGIN, 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
  return POST({ request, url: new URL(request.url), cookies: {} } as never) as Promise<Response>;
}

describe('POST /api/checkout', () => {
  beforeEach(() => {
    currentUser.mockReset();
    createSession.mockReset().mockResolvedValue({ url: 'https://checkout.stripe.com/c/pay/cs_test_1' });
  });

  it('refuses to start checkout for someone who is not signed in', async () => {
    currentUser.mockResolvedValue(null);
    const res = await call({ game: 'inkfish' });
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ success: false });
    expect(createSession).not.toHaveBeenCalled();
  });

  it('ties the checkout to the signed-in user', async () => {
    currentUser.mockResolvedValue({ email: 'fish@example.com', userId: '65f0c0ffee0000000000aa01' });
    const res = await call({ game: 'inkfish' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, data: { url: 'https://checkout.stripe.com/c/pay/cs_test_1' } });
    expect(createSession).toHaveBeenCalledWith(expect.objectContaining({
      customer_email: 'fish@example.com', client_reference_id: '65f0c0ffee0000000000aa01',
    }));
  });
});
