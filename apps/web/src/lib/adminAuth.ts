import type { AstroCookies } from 'astro';
import { db } from './db';
import { findRole } from './db/userRepo';
import { currentUser } from './owner';
import type { UserSession } from './session';

/**
 * The signed-in user if they are an admin right now. The role is read from
 * the database on every call, so removing someone from ADMIN_EMAILS takes
 * effect on the next deploy without waiting for their cookie to expire.
 */
export async function currentAdmin(cookies: AstroCookies): Promise<UserSession | null> {
  const user = await currentUser(cookies);
  if (!user) return null;
  await db();
  return (await findRole(user.userId)) === 'admin' ? user : null;
}
