import type { APIRoute } from 'astro';
import { fail, json } from '../../lib/http';
import { currentUser } from '../../lib/owner';

export const prerender = false;

/** Who is signed in: for the header, and the id keeps each account's local game saves apart. Never the session itself. */
export const GET: APIRoute = async ({ cookies }) => {
  try {
    const user = await currentUser(cookies);
    return json({ success: true, data: user ? { signedIn: true, id: user.userId, name: user.name, email: user.email } : { signedIn: false } });
  } catch (err) {
    console.error('[me] check failed', err);
    return fail(500, 'Could not check sign-in');
  }
};
