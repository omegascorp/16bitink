import { describe, expect, it } from 'vitest';
import { checkoutParams, ONE_TIME_NOTE } from '../src/lib/checkoutParams';

const base = { priceId: 'price_1', game: 'inkfish', title: 'InkFish', origin: 'https://16bit.ink', automaticTax: false, user: null };

describe('checkout session parameters', () => {
  it('is a single one-time payment, never a subscription', () => {
    const p = checkoutParams(base);
    expect(p.mode).toBe('payment');
    expect(p.line_items).toEqual([{ price: 'price_1', quantity: 1 }]);
    expect(p.submit_type).toBe('pay');
  });

  it('says it is a one-time purchase next to the pay button and on the receipt', () => {
    const p = checkoutParams(base);
    expect(p.custom_text?.submit).toEqual({ message: ONE_TIME_NOTE });
    expect(ONE_TIME_NOTE).toMatch(/one-time/i);
    expect(p.payment_intent_data?.description).toBe('InkFish full game (one-time purchase)');
  });

  it('tags the game and returns to our own pages', () => {
    const p = checkoutParams(base);
    expect(p.metadata).toEqual({ game: 'inkfish' });
    expect(p.payment_intent_data?.metadata).toEqual({ game: 'inkfish' });
    expect(p.success_url).toBe('https://16bit.ink/purchase/success?session_id={CHECKOUT_SESSION_ID}');
    expect(p.cancel_url).toBe('https://16bit.ink/games/inkfish?checkout=cancelled');
  });

  it('locks the receipt email to the signed-in user and names them on the checkout', () => {
    const p = checkoutParams({ ...base, user: { email: 'fish@example.com', userId: '65f0c0ffee0000000000aa01' } });
    expect(p.customer_email).toBe('fish@example.com');
    expect(p.client_reference_id).toBe('65f0c0ffee0000000000aa01');
  });

  it('lets Stripe collect the email when nobody is signed in', () => {
    const p = checkoutParams(base);
    expect(p.customer_email).toBeUndefined();
    expect(p.client_reference_id).toBeUndefined();
    expect(p.customer_creation).toBe('always');
  });

  it('switches tax on only when configured', () => {
    expect(checkoutParams(base).automatic_tax).toEqual({ enabled: false });
    expect(checkoutParams({ ...base, automaticTax: true }).automatic_tax).toEqual({ enabled: true });
  });
});
