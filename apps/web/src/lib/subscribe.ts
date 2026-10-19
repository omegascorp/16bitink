/**
 * The Sunday email list: players leave an address to hear when the week's
 * new game is out. Pure rules only; storage is in db/subscriberRepo.ts.
 */

import { z } from 'zod';
import { safeReturnPath } from './google';

const Email = z.email().max(254);

/** The address as stored (trimmed, lower-cased), or null when it can't be one. */
export function normalizeEmail(input: unknown): string | null {
  if (typeof input !== 'string' || input.length > 320) return null;
  const parsed = Email.safeParse(input.trim().toLowerCase());
  return parsed.success ? parsed.data : null;
}

export type SignupOutcome = 'done' | 'invalid' | 'error';

/** Back to the page the form was on (never off the site), saying how it went, scrolled to the form. */
export function signupReturnPath(from: string | null, outcome: SignupOutcome): string {
  const path = safeReturnPath(from).split(/[?#]/)[0] || '/';
  return `${path}?sunday=${outcome}#sunday`;
}

/** The page a form was on, as stored with the address: a path on this site, at most 60 characters. */
export const signupSource = (from: string | null): string => safeReturnPath(from).split(/[?#]/)[0]!.slice(0, 60) || '/';

export interface SubscriberRow {
  readonly email: string;
  readonly source: string;
  readonly token: string;
  readonly createdAt: Date;
}

/** One CSV cell: quoted when needed, and never read as a formula by a spreadsheet. */
function cell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export const unsubscribeUrl = (origin: string, token: string): string => `${origin}/unsubscribe?t=${encodeURIComponent(token)}`;

/** The list for an email tool: one row per address, with the link each email must carry. */
export function subscribersCsv(rows: readonly SubscriberRow[], origin: string): string {
  const lines = rows.map((r) => [r.email, r.createdAt.toISOString().slice(0, 10), r.source, unsubscribeUrl(origin, r.token)].map(cell).join(','));
  return ['email,joined,source,unsubscribe_url', ...lines, ''].join('\r\n');
}
