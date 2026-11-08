import { b64url } from './token';

/**
 * Signing in by email: we send a link and a six-digit code. The link signs
 * in whichever browser opens it; the code is typed back into the page that
 * asked, so a player in an in-app browser (where Google refuses to sign
 * anyone in) can sign in without leaving it. Pure rules only; storage is in
 * db/emailSignInRepo.ts and the routes in pages/auth/email*.
 */

/** How long a link and code stay good. */
export const EMAIL_SIGNIN_MAX_AGE_SEC = 15 * 60;
/** Wrong codes allowed per email before it stops working; with the per-address limit, guessing stays hopeless. */
export const MAX_CODE_ATTEMPTS = 5;
/** Emails sent to one address per window, so the form can't flood anyone's inbox. */
export const MAX_EMAILS_PER_ADDRESS = 3;
export const EMAIL_WINDOW_SEC = 15 * 60;

export const VERIFY_PATH = '/auth/email/verify';
const CODE_DIGITS = 6;
const CODE_RANGE = 10 ** CODE_DIGITS;

/** A uniformly random six-digit code (rejection sampling keeps every code equally likely). */
export function newCode(): string {
  const limit = Math.floor(0x1_0000_0000 / CODE_RANGE) * CODE_RANGE;
  const buf = new Uint32Array(1);
  do crypto.getRandomValues(buf); while (buf[0]! >= limit);
  return String(buf[0]! % CODE_RANGE).padStart(CODE_DIGITS, '0');
}

/** 32 random bytes, base64url: the secret in the emailed link. */
export function newLinkToken(): string {
  return b64url(crypto.getRandomValues(new Uint8Array(32)));
}

/** What the database keeps instead of the code or link, so a leaked copy signs no one in. */
export async function hashSecret(secret: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** The code as typed (spaces and dashes allowed), or null when it can't be one. */
export function normalizeCode(input: unknown): string | null {
  if (typeof input !== 'string' || input.length > 20) return null;
  const digits = input.replace(/[\s-]/g, '');
  return new RegExp(`^\\d{${CODE_DIGITS}}$`).test(digits) ? digits : null;
}

/** A first name for the header until the player tells us better: "ink.fish@…" is "Ink". */
export function nameFromEmail(email: string): string {
  const local = email.split('@')[0] ?? '';
  const word = local.split(/[._+\-\d]+/).find((w) => w.length > 0) ?? '';
  return word ? word[0]!.toUpperCase() + word.slice(1) : 'Player';
}

export const verifyLinkUrl = (origin: string, token: string): string => `${origin}${VERIFY_PATH}?t=${encodeURIComponent(token)}`;

export interface Mail {
  readonly subject: string;
  readonly text: string;
  readonly html: string;
}

const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/** The email: the code first (it shows in the notification), then the link. */
export function signInEmail(p: { readonly code: string; readonly link: string }): Mail {
  const minutes = EMAIL_SIGNIN_MAX_AGE_SEC / 60;
  const subject = `${p.code} is your 16bit.ink sign-in code`;
  const text = [
    `Your 16bit.ink sign-in code is ${p.code}`,
    '',
    'Type it on the page that asked for it, or open this link to sign in:',
    p.link,
    '',
    `The code and link work once, for ${minutes} minutes.`,
    "If you didn't ask to sign in, ignore this email. Nothing changes.",
  ].join('\n');
  const link = escapeHtml(p.link);
  const html = `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f4efe3;font-family:Georgia,serif;color:#2b2722">
  <div style="max-width:440px;margin:0 auto;background:#fffdf7;border:2px solid #2b2722;border-radius:6px;padding:28px">
    <p style="margin:0 0 8px;font-size:16px">Your 16bit.ink sign-in code:</p>
    <p style="margin:0 0 20px;font-size:34px;letter-spacing:6px;font-family:'Courier New',monospace;font-weight:bold">${escapeHtml(p.code)}</p>
    <p style="margin:0 0 20px;font-size:16px">Type it on the page that asked for it, or sign in with this button:</p>
    <p style="margin:0 0 24px"><a href="${link}" style="display:inline-block;background:#2b2722;color:#fffdf7;text-decoration:none;padding:12px 22px;border-radius:4px;font-size:16px">Sign in to 16bit.ink</a></p>
    <p style="margin:0;font-size:13px;color:#6b6457">The code and link work once, for ${minutes} minutes. If you didn't ask to sign in, ignore this email. Nothing changes.</p>
  </div>
</body></html>`;
  return { subject, text, html };
}
