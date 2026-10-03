import { describe, expect, it } from 'vitest';
import { isFulfillable, isPaidSession, SUCCESS_LINK_TTL_SEC } from '../src/lib/fulfil';

const now = 1_800_000_000_000;
const base = { status: 'complete', payment_status: 'paid', amount_total: 499, livemode: true, created: now / 1000 - 60 };

describe('fulfilment rules', () => {
  it('accepts completed sessions where money changed hands', () => {
    expect(isPaidSession(base)).toBe(true);
  });

  it('never unlocks for free, even with a 100%-off code', () => {
    expect(isPaidSession({ ...base, payment_status: 'no_payment_required' })).toBe(false);
    expect(isPaidSession({ ...base, amount_total: 0 })).toBe(false);
    expect(isPaidSession({ ...base, amount_total: null })).toBe(false);
  });

  it('rejects unpaid or incomplete sessions', () => {
    expect(isPaidSession({ ...base, payment_status: 'unpaid' })).toBe(false);
    expect(isPaidSession({ ...base, status: 'open' })).toBe(false);
    expect(isPaidSession({ ...base, status: null })).toBe(false);
  });

  it('only honours Stripe test-mode payments when testing locally', () => {
    const test = { ...base, livemode: false };
    expect(isFulfillable(test, now, { allowTestMode: false })).toBe(false);
    expect(isFulfillable(test, now, { allowTestMode: true })).toBe(true);
    expect(isFulfillable(base, now, { allowTestMode: false })).toBe(true);
  });

  it('expires old success links', () => {
    expect(isFulfillable(base, now, { allowTestMode: false })).toBe(true);
    expect(isFulfillable({ ...base, created: now / 1000 - SUCCESS_LINK_TTL_SEC - 1 }, now, { allowTestMode: false })).toBe(false);
  });
});
