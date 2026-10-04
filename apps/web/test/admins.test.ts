import { describe, expect, it } from 'vitest';
import { adminReturnPath, parseAdminEmails, roleFor } from '../src/lib/admins';

describe('admin emails', () => {
  it('reads a comma-separated list, ignoring spaces, case and blanks', () => {
    expect([...parseAdminEmails(' Fish@Example.com, ,ink@example.com,')]).toEqual(['fish@example.com', 'ink@example.com']);
  });

  it('is empty when unset or holding no emails', () => {
    expect(parseAdminEmails(undefined).size).toBe(0);
    expect(parseAdminEmails('nobody, @, a@').size).toBe(0);
  });

  it('makes listed emails admins and everyone else users', () => {
    const admins = parseAdminEmails('fish@example.com');
    expect(roleFor('FISH@example.com', admins)).toBe('admin');
    expect(roleFor('other@example.com', admins)).toBe('user');
  });
});

describe('admin form return path', () => {
  it('returns to admin pages only', () => {
    expect(adminReturnPath('/admin?q=fish&page=2')).toBe('/admin?q=fish&page=2');
    for (const bad of ['https://evil.example', '//evil.example', '/admin.evil', '/games', '/admin\\@evil', undefined, 42]) {
      expect(adminReturnPath(bad)).toBe('/admin');
    }
  });
});
