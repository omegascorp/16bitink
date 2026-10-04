/**
 * A fixed-window rate limiter kept in this server's memory. Enough for one
 * App Platform instance; with several, each counts on its own (so the real
 * limit is the per-instance limit times the instance count).
 */
export interface RateLimiter {
  /** Records a request; false when this key has used up its window. */
  hit(key: string, nowMs: number): boolean;
  /** Keys being tracked (for tests and metrics). */
  size(): number;
}

interface Window {
  readonly start: number;
  count: number;
}

export function createRateLimiter(opts: { readonly limit: number; readonly windowMs: number }): RateLimiter {
  const windows = new Map<string, Window>();
  let lastSweep = 0;
  const sweep = (now: number): void => {
    if (now - lastSweep < opts.windowMs) return;
    lastSweep = now;
    for (const [key, w] of windows) if (now - w.start >= opts.windowMs) windows.delete(key);
  };
  return {
    hit(key, now) {
      sweep(now);
      const w = windows.get(key);
      if (!w || now - w.start >= opts.windowMs) {
        windows.set(key, { start: now, count: 1 });
        return true;
      }
      w.count += 1;
      return w.count <= opts.limit;
    },
    size: () => windows.size,
  };
}

export type LimitedRoute = 'checkout' | 'auth' | 'progress' | 'admin' | 'redeem';

/** Routes that cost money, credentials or database writes if hammered. The Stripe webhook is never limited: Stripe retries in bursts. */
export function limitFor(pathname: string): LimitedRoute | null {
  if (pathname === '/api/checkout' || pathname === '/purchase/success') return 'checkout';
  if (pathname.startsWith('/auth/')) return 'auth';
  if (pathname.startsWith('/api/progress/')) return 'progress';
  if (pathname === '/api/redeem') return 'redeem';
  if (pathname === '/admin' || pathname.startsWith('/admin/') || pathname.startsWith('/api/admin/')) return 'admin';
  return null;
}
