import { describe, expect, it } from 'vitest';
import { isPendingBuy, signInToBuyUrl } from '../src/lib/buyFlow';
import { safeReturnPath } from '../src/lib/google';

describe('buy flow', () => {
  it('sends a signed-out buyer to Google and back to the game with the purchase pending', () => {
    const url = signInToBuyUrl('/play/inkfish', 'inkfish');
    expect(url).toBe('/auth/google?return=%2Fplay%2Finkfish%3Fbuy%3Dinkfish');
    const ret = new URL(url, 'https://16bit.ink').searchParams.get('return');
    expect(safeReturnPath(ret)).toBe('/play/inkfish?buy=inkfish');
  });

  it('resumes only the purchase for this game', () => {
    expect(isPendingBuy('?buy=inkfish', 'inkfish')).toBe(true);
    expect(isPendingBuy('?buy=inkcrab', 'inkfish')).toBe(false);
    expect(isPendingBuy('', 'inkfish')).toBe(false);
    expect(isPendingBuy('?other=1', 'inkfish')).toBe(false);
  });
});
