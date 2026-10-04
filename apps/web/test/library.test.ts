import { describe, expect, it } from 'vitest';
import { libraryOf, playableFrom, purchasesOf } from '../src/lib/library';
import type { PurchaseRecord } from '../src/lib/purchases';

const USER = '65f0c0ffee0000000000aa01';
const purchase = (patch: Partial<PurchaseRecord>): PurchaseRecord => ({
  sessionId: 'cs_1', game: 'inkfish', email: 'fish@example.com', userId: null, customerId: null, paymentIntent: 'pi_1',
  amount: 499, currency: 'usd', livemode: true, status: 'paid', paidAt: new Date(0), ...patch,
});

describe('a player library', () => {
  it('keeps bought and admin-granted games apart, and plays both', () => {
    const lib = libraryOf([purchase({})], ['blot', 'blot'], { allowTestMode: false });
    expect(lib).toEqual({ bought: ['inkfish'], granted: ['blot'] });
    expect(playableFrom(lib).sort()).toEqual(['blot', 'inkfish']);
  });

  it('drops refunded purchases but keeps a grant for the same game', () => {
    const lib = libraryOf([purchase({ status: 'refunded' })], ['inkfish'], { allowTestMode: false });
    expect(playableFrom(lib)).toEqual(['inkfish']);
    expect(lib.bought).toEqual([]);
  });

  it('picks a user\'s purchases out of many, by user id only', () => {
    const all = [purchase({ sessionId: 'a' }), purchase({ sessionId: 'b', email: 'x@example.com', userId: USER }), purchase({ sessionId: 'c', userId: '65f0c0ffee0000000000aa02' })];
    expect(purchasesOf(USER, all).map((p) => p.sessionId)).toEqual(['b']);
  });
});
