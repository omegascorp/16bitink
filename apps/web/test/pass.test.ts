import { describe, expect, it } from 'vitest';
import { playableGames } from '../src/data/games';
import { PASS, PASS_NEXT_STEP, passPitch, passRiseNote } from '../src/data/pass';
import { findProduct } from '../src/lib/products';
import { libraryOf, playableFrom } from '../src/lib/library';
import { purchaseFromSession, type CheckoutSessionLike, type PurchaseRecord } from '../src/lib/purchases';

const purchase = (patch: Partial<PurchaseRecord>): PurchaseRecord => ({
  sessionId: 'cs_1', game: PASS.slug, email: 'fish@example.com', userId: null, customerId: null, paymentIntent: 'pi_1',
  amount: 1499, currency: 'usd', livemode: true, status: 'paid', paidAt: new Date(0), ...patch,
});

const everyGame = (): string[] => playableGames().map((g) => g.slug).sort();

describe('the All Games Pass', () => {
  it('is for sale next to every game for sale, and nothing else is', () => {
    expect(findProduct(PASS.slug)).toBe(PASS);
    expect(findProduct('inkfish')?.stripeLookupKey).toBe('inkfish_full');
    expect(findProduct('nope')).toBeUndefined();
  });

  it('unlocks every game, bought or granted by an admin', () => {
    expect(playableFrom(libraryOf([purchase({})], [], { allowTestMode: false })).filter((g) => g !== PASS.slug).sort()).toEqual(everyGame());
    expect(playableFrom(libraryOf([], [PASS.slug], { allowTestMode: false })).filter((g) => g !== PASS.slug).sort()).toEqual(everyGame());
  });

  it('says the account holds the pass, so it is never sold twice', () => {
    expect(playableFrom(libraryOf([purchase({})], [], { allowTestMode: false }))).toContain(PASS.slug);
    expect(playableFrom(libraryOf([purchase({ game: 'inkfish' })], [], { allowTestMode: false }))).not.toContain(PASS.slug);
  });

  it('unlocks nothing once refunded', () => {
    expect(playableFrom(libraryOf([purchase({ status: 'refunded' })], [], { allowTestMode: false }))).toEqual([]);
  });

  it('is recorded from its checkout like a game', () => {
    const session: CheckoutSessionLike = {
      id: 'cs_live_9', status: 'complete', payment_status: 'paid', amount_total: 1499, currency: 'usd', livemode: true, created: 1_800_000_000,
      metadata: { game: PASS.slug }, customer_details: { email: 'a@example.com' }, client_reference_id: null, customer: null, payment_intent: 'pi_9',
    };
    expect(purchaseFromSession(session)).toMatchObject({ game: PASS.slug, amount: 1499 });
  });

  it('pitches every future game, and says when the price next goes up', () => {
    expect(passPitch(5)).toBe('All 5 games + every future game');
    expect(PASS_NEXT_STEP).not.toBeNull();
    expect(passRiseNote(5)).toBe(`Goes up to ${PASS_NEXT_STEP!.price} at ${PASS_NEXT_STEP!.atGames} games`);
    expect(passRiseNote(PASS_NEXT_STEP!.atGames)).toBeNull();
  });
});
