import { beforeEach, describe, expect, it, vi } from 'vitest';

const currentUser = vi.fn();
const createSession = vi.fn();
const listPrices = vi.fn();
const ownership = vi.fn();

vi.mock('../src/lib/env', () => ({ optionalEnv: () => undefined }));
vi.mock('../src/lib/owner', () => ({ currentUser: (...a: unknown[]) => currentUser(...a), ownership: (...a: unknown[]) => ownership(...a) }));
vi.mock('../src/lib/stripe', () => ({
  stripeClient: () => ({
    prices: { list: (...a: unknown[]) => listPrices(...a) },
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
    ownership.mockReset().mockResolvedValue(null);
    createSession.mockReset().mockResolvedValue({ url: 'https://checkout.stripe.com/c/pay/cs_test_1' });
    listPrices.mockReset().mockResolvedValue({ data: [{ id: 'price_1', type: 'one_time' }] });
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

  it('no longer sells the All Games Pass', async () => {
    currentUser.mockResolvedValue({ email: 'fish@example.com', userId: '65f0c0ffee0000000000aa01' });
    expect((await call({ game: 'all', from: 'inkcrab' })).status).toBe(404);
    expect(createSession).not.toHaveBeenCalled();
  });

  it('returns to the game it was bought from, and ignores a return game not in the catalog', async () => {
    currentUser.mockResolvedValue({ email: 'fish@example.com', userId: '65f0c0ffee0000000000aa01' });
    await call({ game: 'inkfish', from: 'inkcrab' });
    expect(createSession).toHaveBeenLastCalledWith(expect.objectContaining({ cancel_url: 'https://16bit.ink/games/inkcrab?checkout=cancelled' }));
    await call({ game: 'inkfish', from: 'nope' });
    expect(createSession).toHaveBeenLastCalledWith(expect.objectContaining({ cancel_url: 'https://16bit.ink/games/inkfish?checkout=cancelled' }));
  });

  it('refuses something that is not for sale', async () => {
    currentUser.mockResolvedValue({ email: 'fish@example.com', userId: '65f0c0ffee0000000000aa01' });
    expect((await call({ game: 'nope' })).status).toBe(404);
  });

  it('never sells what the buyer already owns', async () => {
    currentUser.mockResolvedValue({ email: 'fish@example.com', userId: '65f0c0ffee0000000000aa01' });
    ownership.mockResolvedValue({ v: 2, g: 'inkfish', s: 'cs_1', iat: 1 });
    const res = await call({ game: 'inkfish' });
    expect(res.status).toBe(409);
    expect(ownership).toHaveBeenCalledWith(expect.anything(), 'inkfish', expect.any(URL));
    expect(createSession).not.toHaveBeenCalled();
  });
});
