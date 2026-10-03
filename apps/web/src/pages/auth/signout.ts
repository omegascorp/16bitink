import type { APIRoute } from 'astro';
import { fail, isSameOrigin, json } from '../../lib/http';
import { SESSION_COOKIE } from '../../lib/session';

export const prerender = false;

/** Signs out of this browser. Games bought here stay unlocked; ones restored by signing in lock again. */
export const POST: APIRoute = ({ request, cookies }) => {
  if (!isSameOrigin(request)) return fail(403, 'Cross-origin request rejected');
  cookies.delete(SESSION_COOKIE, { path: '/' });
  return json({ success: true, data: {} });
};
