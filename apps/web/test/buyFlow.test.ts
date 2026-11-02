import { describe, expect, it } from 'vitest';
import { googleSignInUrl, isPendingBuy, pendingBuy, signInPageUrl, signInToBuyUrl, signInUrl } from '../src/lib/buyFlow';
import { safeReturnPath } from '../src/lib/google';

describe('buy flow', () => {
  it('sends a signed-out buyer to the sign-in page and back to the game with the purchase pending', () => {
    const url = signInToBuyUrl('/play/inkfish', 'inkfish');
    expect(url).toBe('/signin?return=%2Fplay%2Finkfish%3Fbuy%3Dinkfish');
    const ret = new URL(url, 'https://16bit.ink').searchParams.get('return');
    expect(safeReturnPath(ret)).toBe('/play/inkfish?buy=inkfish');
  });

  it('sends a player who signs in to save progress back to the game, with nothing pending', () => {
    const url = signInUrl('/play/inkfish');
    expect(url).toBe('/signin?return=%2Fplay%2Finkfish');
    const ret = new URL(url, 'https://16bit.ink').searchParams.get('return');
    expect(safeReturnPath(ret)).toBe('/play/inkfish');
    expect(isPendingBuy(new URL(ret!, 'https://16bit.ink').search, 'inkfish')).toBe(false);
  });

  it('the sign-in page offers Google with the same way back', () => {
    expect(signInPageUrl('/redeem?key=AB')).toBe('/signin?return=%2Fredeem%3Fkey%3DAB');
    expect(googleSignInUrl('/redeem?key=AB')).toBe('/auth/google?return=%2Fredeem%3Fkey%3DAB');
  });

  it('resumes only the purchase for this game', () => {
    expect(isPendingBuy('?buy=inkfish', 'inkfish')).toBe(true);
    expect(isPendingBuy('?buy=inkcrab', 'inkfish')).toBe(false);
    expect(isPendingBuy('', 'inkfish')).toBe(false);
    expect(isPendingBuy('?other=1', 'inkfish')).toBe(false);
  });

  it('resumes the pass from any game, and tells it apart from the game', () => {
    expect(pendingBuy('?buy=all', 'inkfish', 'all')).toBe('pass');
    expect(pendingBuy('?buy=inkfish', 'inkfish', 'all')).toBe('game');
    expect(pendingBuy('?buy=inkcrab', 'inkfish', 'all')).toBeNull();
    expect(pendingBuy('', 'inkfish', 'all')).toBeNull();
  });
});
