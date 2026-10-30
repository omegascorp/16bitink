import { PASS } from '../../data/pass';
import { signInToBuyUrl } from '../buyFlow';
import { trackBuy, trackCheckout, type BuyPlace } from './analytics';

interface CheckoutResult {
  readonly error?: string;
}

/**
 * Asks our server for a Stripe Checkout URL and navigates to it: for `game`,
 * or with `pass` for the All Games Pass, offered on `game` (where a cancelled
 * checkout comes back to).
 */
export async function startCheckout(game: string, pass = false): Promise<CheckoutResult> {
  try {
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ game: pass ? PASS.slug : game, from: game }),
    });
    const body = (await res.json().catch(() => null)) as { success?: boolean; data?: { url?: string }; error?: string } | null;
    const url = body?.data?.url;
    if (!res.ok || !url || !url.startsWith('https://checkout.stripe.com/')) {
      return failed(game, body?.error ?? 'Checkout is unavailable right now. Please try again.', pass);
    }
    trackCheckout(game, undefined, pass);
    window.location.assign(url);
    return {};
  } catch {
    return failed(game, 'Network error. Check your connection and try again.', pass);
  }
}

/** Checkout couldn't open: counted, and the reason passed on to show the player. */
function failed(game: string, error: string, pass = false): CheckoutResult {
  trackCheckout(game, error, pass);
  return { error };
}

/** Who is signed in: `id` is set only when someone is. */
export interface Me {
  readonly signedIn: boolean;
  readonly id?: string;
}

/** Who is signed in; null when the check itself failed. */
export async function fetchMe(): Promise<Me | null> {
  try {
    const res = await fetch('/api/me', { credentials: 'same-origin' });
    const body = (await res.json().catch(() => null)) as { success?: boolean; data?: { signedIn?: boolean; id?: unknown } } | null;
    if (!res.ok || !body?.success) return null;
    const id = body.data?.id;
    return body.data?.signedIn === true && typeof id === 'string' && id ? { signedIn: true, id } : { signedIn: false };
  } catch {
    return null;
  }
}

/** Whether someone is signed in; null when the check itself failed. */
export async function isSignedIn(): Promise<boolean | null> {
  return (await fetchMe())?.signedIn ?? null;
}

/**
 * Buying is the same for every game, and for the pass: sign in, then pay.
 * Signed out, this leaves for the sign-in page; the page then resumes the purchase on return.
 * `where`: which offer the player took, for the stats. `pass`: the All Games Pass, offered on `game`.
 */
export async function buyFullGame(game: string, where: BuyPlace, pass = false): Promise<CheckoutResult> {
  const signedIn = await isSignedIn();
  trackBuy(game, where, signedIn === true, pass);
  if (signedIn === null) return failed(game, 'Network error. Check your connection and try again.', pass);
  if (!signedIn) {
    window.location.assign(signInToBuyUrl(window.location.pathname, pass ? PASS.slug : game));
    return {};
  }
  return startCheckout(game, pass);
}
