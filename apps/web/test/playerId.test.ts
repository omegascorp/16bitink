import { describe, expect, it } from 'vitest';
import { formatPlayerId, generatePlayerId, normalizePlayerId } from '../src/lib/playerId';

describe('player ids', () => {
  it('generates 8 unambiguous characters', () => {
    const id = generatePlayerId();
    expect(id).toMatch(/^[0-9A-HJKMNP-TV-Z]{8}$/);
    expect(normalizePlayerId(id)).toBe(id);
  });

  it('generates different ids each time', () => {
    expect(new Set(Array.from({ length: 200 }, () => generatePlayerId())).size).toBe(200);
  });

  it('formats as two groups of four', () => {
    expect(formatPlayerId('7K3Q9XMD')).toBe('7K3Q-9XMD');
  });

  it('reads back what people type: any case, spaces, dashes, O for 0, I and L for 1', () => {
    expect(normalizePlayerId('7k3q-9xmd')).toBe('7K3Q9XMD');
    expect(normalizePlayerId(' 7K3Q 9XMD ')).toBe('7K3Q9XMD');
    expect(normalizePlayerId('OOII-LL22')).toBe('00111122');
  });

  it('rejects anything that cannot be a player id, including activation keys', () => {
    expect(normalizePlayerId('7K3Q-9XM')).toBeNull();
    expect(normalizePlayerId('ABCD-EFGH-JKMN-PQRS')).toBeNull();
    expect(normalizePlayerId('UUUU-9XMD')).toBeNull();
    expect(normalizePlayerId('someone@example.com')).toBeNull();
    expect(normalizePlayerId('A'.repeat(100))).toBeNull();
    expect(normalizePlayerId(undefined)).toBeNull();
  });
});
