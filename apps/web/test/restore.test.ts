import { describe, expect, it } from 'vitest';
import { ownedGames, type PurchaseLike } from '../src/lib/restore';

const paid: PurchaseLike = {
  status: 'complete', payment_status: 'paid', amount_total: 499, livemode: true, created: 1,
  game: 'inkfish', refunded: false,
};

describe('restoring purchases', () => {
  it('finds paid games once each', () => {
    expect(ownedGames([paid, paid, { ...paid, game: 'blot' }], { allowTestMode: false })).toEqual(['inkfish', 'blot']);
  });

  it('skips refunds, free promo checkouts and unpaid sessions', () => {
    expect(ownedGames([
      { ...paid, refunded: true },
      { ...paid, amount_total: 0 },
      { ...paid, payment_status: 'unpaid' },
      { ...paid, status: 'open' },
    ], { allowTestMode: false })).toEqual([]);
  });

  it('only counts test-mode payments when allowed', () => {
    const test = { ...paid, livemode: false };
    expect(ownedGames([test], { allowTestMode: false })).toEqual([]);
    expect(ownedGames([test], { allowTestMode: true })).toEqual(['inkfish']);
  });

  it('ignores sessions with no or unknown game', () => {
    expect(ownedGames([{ ...paid, game: undefined }, { ...paid, game: 'nope' }], { allowTestMode: false })).toEqual([]);
  });
});
