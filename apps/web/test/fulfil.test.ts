import { describe, expect, it } from 'vitest';
import { isFulfillable, isPaidSession, SUCCESS_LINK_TTL_SEC } from '../src/lib/fulfil';

const now = 1_800_000_000_000;
const base = { status: 'complete', payment_status: 'paid', created: now / 1000 - 60 };

describe('fulfilment rules', () => {
  it('accepts paid and 100%-off completed sessions', () => {
    expect(isPaidSession(base)).toBe(true);
    expect(isPaidSession({ ...base, payment_status: 'no_payment_required' })).toBe(true);
  });

  it('rejects unpaid or incomplete sessions', () => {
    expect(isPaidSession({ ...base, payment_status: 'unpaid' })).toBe(false);
    expect(isPaidSession({ ...base, status: 'open' })).toBe(false);
    expect(isPaidSession({ ...base, status: null })).toBe(false);
  });

  it('expires old success links', () => {
    expect(isFulfillable(base, now)).toBe(true);
    expect(isFulfillable({ ...base, created: now / 1000 - SUCCESS_LINK_TTL_SEC - 1 }, now)).toBe(false);
  });
});
