import { describe, expect, it } from 'vitest';
import { isRevoked, ownedGames, purchaseFromSession, type CheckoutSessionLike, type PurchaseRecord } from '../src/lib/purchases';

const session: CheckoutSessionLike = {
  id: 'cs_live_1', status: 'complete', payment_status: 'paid', amount_total: 499, currency: 'usd', livemode: true, created: 1_800_000_000,
  metadata: { game: 'inkfish' }, customer_details: { email: 'Fish@Example.com' }, client_reference_id: '65f0c0ffee0000000000aa01', payment_intent: 'pi_1',
};

const record: PurchaseRecord = {
  sessionId: 'cs_live_1', game: 'inkfish', email: 'fish@example.com', userId: '65f0c0ffee0000000000aa01', paymentIntent: 'pi_1',
  amount: 499, currency: 'usd', livemode: true, status: 'paid', paidAt: new Date(1_800_000_000_000),
};

describe('recording a checkout', () => {
  it('keeps who paid, for what, and how much', () => {
    expect(purchaseFromSession(session)).toEqual(record);
  });

  it('reads an expanded payment intent', () => {
    expect(purchaseFromSession({ ...session, payment_intent: { id: 'pi_2' } })?.paymentIntent).toBe('pi_2');
  });

  it('records a checkout without email or signed-in user', () => {
    const r = purchaseFromSession({ ...session, customer_details: null, client_reference_id: null, payment_intent: null });
    expect(r).toMatchObject({ email: null, userId: null, paymentIntent: null });
  });

  it('ignores a reference that is not a user id (checkouts from before users existed)', () => {
    expect(purchaseFromSession({ ...session, client_reference_id: '109876543210987654321' })?.userId).toBeNull();
  });

  it.each([
    ['unpaid', { payment_status: 'unpaid' }],
    ['a free promotion code', { amount_total: 0 }],
    ['an open session', { status: 'open' }],
    ['no game', { metadata: {} }],
    ['an unknown game', { metadata: { game: 'nope' } }],
  ])('ignores %s', (_, patch) => {
    expect(purchaseFromSession({ ...session, ...patch } as CheckoutSessionLike)).toBeNull();
  });
});

describe('games a buyer owns', () => {
  it('lists paid games once each', () => {
    expect(ownedGames([record, { ...record, sessionId: 'cs_2' }], { allowTestMode: false })).toEqual(['inkfish']);
  });

  it('drops refunds and chargebacks', () => {
    expect(ownedGames([{ ...record, status: 'refunded' }, { ...record, status: 'disputed' }], { allowTestMode: false })).toEqual([]);
  });

  it('only counts test-mode payments when allowed', () => {
    const test = { ...record, livemode: false };
    expect(ownedGames([test], { allowTestMode: false })).toEqual([]);
    expect(ownedGames([test], { allowTestMode: true })).toEqual(['inkfish']);
  });
});

describe('revocation', () => {
  it('revokes refunded and disputed purchases', () => {
    expect(isRevoked({ ...record, status: 'refunded' })).toBe(true);
    expect(isRevoked({ ...record, status: 'disputed' })).toBe(true);
  });

  it('keeps paid purchases, and cookies with no record (bought before the database)', () => {
    expect(isRevoked(record)).toBe(false);
    expect(isRevoked(null)).toBe(false);
  });
});
