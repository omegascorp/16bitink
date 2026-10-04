import { describe, expect, it } from 'vitest';
import { formatKey, generateKey, normalizeKey, redeemUrl } from '../src/lib/keys';

describe('activation keys', () => {
  it('generates 16 unambiguous characters', () => {
    const key = generateKey();
    expect(key).toMatch(/^[0-9A-HJKMNP-TV-Z]{16}$/);
    expect(normalizeKey(key)).toBe(key);
  });

  it('maps every byte value into the alphabet', () => {
    const key = generateKey((n) => Uint8Array.from({ length: n }, (_, i) => i * 16 + 31));
    expect(key).toHaveLength(16);
    expect(normalizeKey(key)).toBe(key);
  });

  it('generates different keys each time', () => {
    const keys = new Set(Array.from({ length: 200 }, () => generateKey()));
    expect(keys.size).toBe(200);
  });

  it('formats in groups of four', () => {
    expect(formatKey('ABCDEFGHJKMNPQRS')).toBe('ABCD-EFGH-JKMN-PQRS');
  });

  it('reads back what people type: any case, spaces, dashes, O for 0, I and L for 1', () => {
    expect(normalizeKey('abcd-efgh-jkmn-pqrs')).toBe('ABCDEFGHJKMNPQRS');
    expect(normalizeKey('  ABCD EFGH\tJKMN PQRS ')).toBe('ABCDEFGHJKMNPQRS');
    expect(normalizeKey('OOOO-IIII-LLLL-2222')).toBe('0000111111112222');
  });

  it('rejects anything that cannot be a key', () => {
    expect(normalizeKey('ABCD-EFGH-JKMN-PQR')).toBeNull();
    expect(normalizeKey('ABCD-EFGH-JKMN-PQRSX')).toBeNull();
    expect(normalizeKey('UUUU-EFGH-JKMN-PQRS')).toBeNull();
    expect(normalizeKey('ABCD/EFGH/JKMN/PQRS')).toBeNull();
    expect(normalizeKey('A'.repeat(100))).toBeNull();
    expect(normalizeKey(undefined)).toBeNull();
    expect(normalizeKey(42)).toBeNull();
  });

  it('builds a shareable redeem link', () => {
    expect(redeemUrl('https://16bit.ink', 'ABCDEFGHJKMNPQRS')).toBe('https://16bit.ink/redeem?key=ABCD-EFGH-JKMN-PQRS');
  });
});
