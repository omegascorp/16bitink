import { describe, expect, it } from 'vitest';
import { normalizeEmail, signupReturnPath, subscribersCsv } from '../src/lib/subscribe';

describe('sign-up email', () => {
  it('accepts an address, trimmed and lower-cased', () => {
    expect(normalizeEmail('  Player@Example.COM ')).toBe('player@example.com');
  });

  it('refuses what cannot be an address', () => {
    for (const bad of ['', 'player', 'player@', '@example.com', 'a b@example.com', `${'a'.repeat(250)}@example.com`, 42, null, undefined]) {
      expect(normalizeEmail(bad), String(bad)).toBeNull();
    }
  });
});

describe('sign-up return path', () => {
  it('goes back to the page the form was on, marked done', () => {
    expect(signupReturnPath('/games/inkfish', 'done')).toBe('/games/inkfish?sunday=done#sunday');
    expect(signupReturnPath('/', 'invalid')).toBe('/?sunday=invalid#sunday');
  });

  it('never leaves the site', () => {
    expect(signupReturnPath('https://evil.example', 'done')).toBe('/?sunday=done#sunday');
    expect(signupReturnPath('//evil.example', 'done')).toBe('/?sunday=done#sunday');
    expect(signupReturnPath(null, 'done')).toBe('/?sunday=done#sunday');
  });

  it('drops any query the page had', () => {
    expect(signupReturnPath('/games/inkfish?via=fish', 'done')).toBe('/games/inkfish?sunday=done#sunday');
  });

  it('keeps which purchase a thank-you page is about', () => {
    expect(signupReturnPath('/purchase/thanks?game=all&via=x', 'done')).toBe('/purchase/thanks?game=all&sunday=done#sunday');
  });
});

describe('subscriber export', () => {
  const at = new Date('2026-10-20T10:00:00Z');

  it('writes one row per subscriber with a link to unsubscribe', () => {
    const csv = subscribersCsv([{ email: 'a@example.com', source: '/games/inkfish', token: 'TOKEN1', createdAt: at }], 'https://16bit.ink');
    expect(csv.split('\r\n')).toEqual([
      'email,joined,source,unsubscribe_url',
      'a@example.com,2026-10-20,/games/inkfish,https://16bit.ink/unsubscribe?t=TOKEN1',
      '',
    ]);
  });

  it('keeps a cell from running as a spreadsheet formula', () => {
    const csv = subscribersCsv([{ email: '=cmd@example.com', source: '/a,b', token: 'T', createdAt: at }], 'https://16bit.ink');
    expect(csv).toContain(`'=cmd@example.com`);
    expect(csv).toContain('"/a,b"');
  });
});
