import { defineMiddleware } from 'astro:middleware';
import { createRateLimiter, limitFor, type LimitedRoute, type RateLimiter } from './lib/rateLimit';

const MINUTE = 60_000;
const limiters: Record<LimitedRoute, RateLimiter> = {
  checkout: createRateLimiter({ limit: 10, windowMs: MINUTE }),
  auth: createRateLimiter({ limit: 20, windowMs: MINUTE }),
};

/** The visitor's IP: App Platform's edge sets do-connecting-ip; locally, the socket address. */
function clientIp(request: Request, fallback: () => string): string {
  const fromEdge = request.headers.get('do-connecting-ip');
  if (fromEdge) return fromEdge;
  try {
    return fallback();
  } catch {
    return 'unknown';
  }
}

export const onRequest = defineMiddleware((context, next) => {
  const route = limitFor(context.url.pathname);
  if (route && !context.isPrerendered) {
    const ip = clientIp(context.request, () => context.clientAddress);
    if (!limiters[route].hit(`${route}:${ip}`, Date.now())) {
      return new Response('Too many requests. Please wait a minute and try again.', {
        status: 429,
        headers: { 'retry-after': '60', 'cache-control': 'no-store', 'content-type': 'text/plain; charset=utf-8' },
      });
    }
  }
  return next();
});
