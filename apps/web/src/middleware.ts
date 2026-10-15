import { defineMiddleware } from 'astro:middleware';
import { clientIp } from './lib/clientIp';
import { createRateLimiter, limitFor, type LimitedRoute, type RateLimiter } from './lib/rateLimit';

const MINUTE = 60_000;
const limiters: Record<LimitedRoute, RateLimiter> = {
  checkout: createRateLimiter({ limit: 10, windowMs: MINUTE }),
  auth: createRateLimiter({ limit: 20, windowMs: MINUTE }),
  // Games save after each level; this leaves room for merge retries, not for spam.
  progress: createRateLimiter({ limit: 60, windowMs: MINUTE }),
  admin: createRateLimiter({ limit: 120, windowMs: MINUTE }),
  // Keys can't be guessed (80 random bits); this just keeps anyone from trying.
  redeem: createRateLimiter({ limit: 10, windowMs: MINUTE }),
  // A page sends a batch every few seconds at most; this covers several open tabs.
  events: createRateLimiter({ limit: 60, windowMs: MINUTE }),
};

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
