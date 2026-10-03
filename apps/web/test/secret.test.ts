import { describe, expect, it } from 'vitest';
import { assertStrongSecret, MIN_SECRET_LENGTH } from '../src/lib/secret';

describe('signing secret', () => {
  it('refuses short or placeholder secrets that could be guessed', () => {
    expect(() => assertStrongSecret('ENTITLEMENT_SECRET', 'change-me')).toThrow(/at least/);
    expect(() => assertStrongSecret('ENTITLEMENT_SECRET', 'x'.repeat(MIN_SECRET_LENGTH - 1))).toThrow();
  });

  it('accepts a long random secret', () => {
    expect(assertStrongSecret('ENTITLEMENT_SECRET', 'k'.repeat(MIN_SECRET_LENGTH))).toBe('k'.repeat(MIN_SECRET_LENGTH));
  });
});
