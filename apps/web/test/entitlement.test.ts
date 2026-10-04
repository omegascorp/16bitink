import { describe, expect, it } from 'vitest';
import { entitlementCookie, signEntitlement, verifyEntitlement } from '../src/lib/entitlement';
import { signToken } from '../src/lib/token';

const SECRET = 'x'.repeat(40);
const claims = { v: 2, g: 'inkfish', s: 'cs_test_123', iat: 1_700_000_000 } as const;

describe('entitlement tokens', () => {
  it('round-trips a valid token', async () => {
    const token = await signEntitlement(claims, SECRET);
    expect(await verifyEntitlement(token, 'inkfish', SECRET)).toEqual(claims);
  });

  it('rejects tokens for another game', async () => {
    const token = await signEntitlement(claims, SECRET);
    expect(await verifyEntitlement(token, 'blot', SECRET)).toBeNull();
  });

  it('rejects a wrong secret', async () => {
    const token = await signEntitlement(claims, SECRET);
    expect(await verifyEntitlement(token, 'inkfish', 'y'.repeat(40))).toBeNull();
  });

  it('rejects tampered payloads', async () => {
    const token = await signEntitlement(claims, SECRET);
    const [, sig] = token.split('.');
    const forged = btoa(JSON.stringify({ ...claims, g: 'inkfish', s: 'cs_fake' })).replace(/=+$/, '');
    expect(await verifyEntitlement(`${forged}.${sig}`, 'inkfish', SECRET)).toBeNull();
  });

  it('rejects garbage and missing tokens', async () => {
    for (const t of [undefined, '', 'abc', 'a.b.c', '!!!.###']) {
      expect(await verifyEntitlement(t, 'inkfish', SECRET)).toBeNull();
    }
  });

  it('refuses weak secrets when signing', async () => {
    await expect(signEntitlement(claims, 'short')).rejects.toThrow(/at least 32/);
  });

  it('names cookies per game', () => {
    expect(entitlementCookie('inkfish')).toBe('ink_own_inkfish');
  });
});

describe('token versioning', () => {
  it('rejects tokens without the current version claim', async () => {
    const legacy = await signEntitlement({ ...claims, v: 1 as unknown as 2 }, SECRET);
    expect(await verifyEntitlement(legacy, 'inkfish', SECRET)).toBeNull();
  });

  it('rejects the same claims signed for another purpose', async () => {
    for (const purpose of ['', 'session']) {
      expect(await verifyEntitlement(await signToken(claims, SECRET, purpose), 'inkfish', SECRET)).toBeNull();
    }
  });
});
