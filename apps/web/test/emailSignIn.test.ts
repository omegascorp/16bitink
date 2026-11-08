import { describe, expect, it } from 'vitest';
import { hashSecret, nameFromEmail, newCode, newLinkToken, normalizeCode, signInEmail, verifyLinkUrl } from '../src/lib/emailSignIn';

describe('email sign-in secrets', () => {
  it('codes are six digits, leading zeros kept', () => {
    for (let i = 0; i < 200; i++) expect(newCode()).toMatch(/^\d{6}$/);
  });

  it('link tokens are long, url-safe and different every time', () => {
    const a = newLinkToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(newLinkToken()).not.toBe(a);
  });

  it('hashes are stable hex and differ per input', async () => {
    expect(await hashSecret('123456')).toMatch(/^[0-9a-f]{64}$/);
    expect(await hashSecret('123456')).toBe(await hashSecret('123456'));
    expect(await hashSecret('123456')).not.toBe(await hashSecret('123457'));
  });
});

describe('normalizeCode', () => {
  it.each([['123456', '123456'], [' 123 456 ', '123456'], ['123-456', '123456'], ['012345', '012345']])('reads %j', (raw, code) => {
    expect(normalizeCode(raw)).toBe(code);
  });

  it.each([null, 123456, '', '12345', '1234567', 'abcdef', '12345a'])('rejects %j', (raw) => {
    expect(normalizeCode(raw)).toBeNull();
  });
});

describe('nameFromEmail', () => {
  it('uses the part before @, capitalised, up to a separator', () => {
    expect(nameFromEmail('ink.fish@example.com')).toBe('Ink');
    expect(nameFromEmail('crab_99@example.com')).toBe('Crab');
    expect(nameFromEmail('gecko@example.com')).toBe('Gecko');
  });

  it('falls back to the whole local part, then to Player', () => {
    expect(nameFromEmail('.x@example.com')).toBe('X');
    expect(nameFromEmail('@example.com')).toBe('Player');
  });
});

describe('the sign-in email', () => {
  const link = verifyLinkUrl('https://16bit.ink', 'tok_abc');

  it('links to the confirm page with the token', () => {
    expect(link).toBe('https://16bit.ink/auth/email/verify?t=tok_abc');
  });

  it('puts the code in the subject and both the code and link in the body', () => {
    const mail = signInEmail({ code: '042133', link });
    expect(mail.subject).toBe('042133 is your 16bit.ink sign-in code');
    expect(mail.text).toContain('042133');
    expect(mail.text).toContain(link);
    expect(mail.html).toContain('042133');
    expect(mail.html).toContain(`href="${link}"`);
  });

  it('escapes the link in html', () => {
    const mail = signInEmail({ code: '000000', link: 'https://16bit.ink/auth/email/verify?t=a"b<c' });
    expect(mail.html).not.toContain('a"b<c');
    expect(mail.html).toContain('a&quot;b&lt;c');
  });
});
