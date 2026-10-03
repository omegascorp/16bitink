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
      return { error: body?.error ?? 'Checkout is unavailable right now. Please try again.' };
    }
    window.location.assign(url);
    return {};
  } catch {
    return { error: 'Network error. Check your connection and try again.' };
  }
}
