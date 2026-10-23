import { signInToBuyUrl } from '../buyFlow';
import { trackBuy, trackCheckout, type BuyPlace } from './analytics';

interface CheckoutResult {
  readonly error?: string;
}

/** Asks our server for a Stripe Checkout URL and navigates to it. */
export async function startCheckout(game: string): Promise<CheckoutResult> {
  try {
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ game }),
    });
    const body = (await res.json().catch(() => null)) as { success?: boolean; data?: { url?: string }; error?: string } | null;
    const url = body?.data?.url;
    if (!res.ok || !url || !url.startsWith('https://checkout.stripe.com/')) {
      return failed(game, body?.error ?? 'Checkout is unavailable right now. Please try again.');
    }
    trackCheckout(game);
    window.location.assign(url);
    return {};
  } catch {
    return failed(game, 'Network error. Check your connection and try again.');
  }
}

/** Checkout couldn't open: counted, and the reason passed on to show the player. */
function failed(game: string, error: string): CheckoutResult {
  trackCheckout(game, error);
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
 * Buying is the same for every game: sign in with Google, then pay.
 * Signed out, this leaves for Google; the page then resumes the purchase on return.
 * `where`: which offer the player took, for the stats.
 */
export async function buyFullGame(game: string, where: BuyPlace): Promise<CheckoutResult> {
  const signedIn = await isSignedIn();
  trackBuy(game, where, signedIn === true);
  if (signedIn === null) return failed(game, 'Network error. Check your connection and try again.');
  if (!signedIn) {
    window.location.assign(signInToBuyUrl(window.location.pathname, game));
    return {};
  }
  return startCheckout(game);
}
