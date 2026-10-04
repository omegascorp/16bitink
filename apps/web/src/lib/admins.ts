/**
 * Who administers the site: the ADMIN_EMAILS environment variable, a
 * comma-separated list of emails. It is the source of truth: listed users
 * get role "admin" and everyone else "user", so removing an email takes
 * admin away again.
 */
export type Role = 'user' | 'admin';

export const ROLES: readonly Role[] = ['user', 'admin'];

/** The emails in ADMIN_EMAILS, trimmed and lower-cased; blanks and non-emails dropped. */
export function parseAdminEmails(raw: string | undefined): ReadonlySet<string> {
  const emails = (raw ?? '').split(',').map((e) => e.trim().toLowerCase()).filter((e) => /^[^\s@]+@[^\s@]+$/.test(e));
  return new Set(emails);
}

export const roleFor = (email: string, admins: ReadonlySet<string>): Role => (admins.has(email.toLowerCase()) ? 'admin' : 'user');

/** Where an admin form returns to: an /admin page on this site, never elsewhere. */
export function adminReturnPath(raw: unknown): string {
  if (typeof raw !== 'string' || raw.startsWith('//') || raw.includes('\\')) return '/admin';
  return raw === '/admin' || raw.startsWith('/admin?') ? raw : '/admin';
}
