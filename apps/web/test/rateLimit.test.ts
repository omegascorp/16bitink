import { describe, expect, it } from 'vitest';
import { createRateLimiter, limitFor } from '../src/lib/rateLimit';

describe('rate limiter', () => {
  it('allows up to the limit per window, then refuses', () => {
    const rl = createRateLimiter({ limit: 3, windowMs: 1000 });
    expect([1, 2, 3, 4].map(() => rl.hit('ip', 0))).toEqual([true, true, true, false]);
  });

  it('counts each key separately', () => {
    const rl = createRateLimiter({ limit: 1, windowMs: 1000 });
    expect(rl.hit('a', 0)).toBe(true);
    expect(rl.hit('b', 0)).toBe(true);
    expect(rl.hit('a', 10)).toBe(false);
  });

  it('opens again once the window has passed', () => {
    const rl = createRateLimiter({ limit: 1, windowMs: 1000 });
    rl.hit('ip', 0);
    expect(rl.hit('ip', 999)).toBe(false);
    expect(rl.hit('ip', 1000)).toBe(true);
  });

  it('forgets old keys so memory stays bounded', () => {
    const rl = createRateLimiter({ limit: 1, windowMs: 1000 });
    for (let i = 0; i < 100; i++) rl.hit(`ip${i}`, 0);
    rl.hit('late', 5000);
    expect(rl.size()).toBe(1);
  });
});

describe('which routes are limited', () => {
  it('limits checkout, purchase confirmation and sign-in', () => {
    expect(limitFor('/api/checkout')).toBe('checkout');
    expect(limitFor('/purchase/success')).toBe('checkout');
    expect(limitFor('/auth/google')).toBe('auth');
    expect(limitFor('/auth/google/callback')).toBe('auth');
    expect(limitFor('/auth/signout')).toBe('auth');
    expect(limitFor('/api/progress/inkfish')).toBe('progress');
    expect(limitFor('/admin')).toBe('admin');
    expect(limitFor('/api/admin/grants')).toBe('admin');
  });

  it('never limits the Stripe webhook or pages', () => {
    expect(limitFor('/api/webhook')).toBeNull();
    expect(limitFor('/games/inkfish')).toBeNull();
    expect(limitFor('/api/content/inkfish')).toBeNull();
  });
});
