import { db } from './db';
import { isSubscribed } from './db/subscriberRepo';
import { normalizeEmail } from './subscribe';

/** A signed-in player as the Sunday sign-up sees them: their address, and whether it's on the list already. */
export interface SundayReader {
  readonly email: string;
  readonly subscribed: boolean;
}

/**
 * The signed-in player's place on the Sunday list, so the sign-up can be one
 * tap (or stay hidden once they're on it). Null when nobody is signed in.
 * If the list can't be read, they're offered the sign-up: signing up twice is harmless.
 */
export async function sundayReader(user: { readonly email: string } | null | undefined): Promise<SundayReader | null> {
  const email = user ? normalizeEmail(user.email) : null;
  if (!email) return null;
  try {
    await db();
    return { email, subscribed: await isSubscribed(email) };
  } catch (err) {
    console.error('[sunday] could not check the list', err);
    return { email, subscribed: false };
  }
}
