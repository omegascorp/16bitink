import type { APIRoute } from 'astro';
import { z } from 'zod';
import { findGame } from '../../../data/games';
import { currentAdmin } from '../../../lib/adminAuth';
import { adminReturnPath } from '../../../lib/admins';
import { grantGame, revokeGame } from '../../../lib/db/grantRepo';
import { findRole } from '../../../lib/db/userRepo';
import { fail, isSameOrigin } from '../../../lib/http';
import { isUserId } from '../../../lib/userId';

export const prerender = false;

const Form = z.object({
  action: z.enum(['grant', 'revoke']),
  userId: z.string().refine(isUserId),
  game: z.string().regex(/^[a-z0-9-]{1,40}$/),
  return: z.string().max(500).optional(),
});

/** An admin unlocks a game for a user, or takes a granted one back. A plain form post: answers with a redirect to the admin page. */
export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  if (!isSameOrigin(request)) return fail(403, 'Cross-origin request rejected');
  try {
    const admin = await currentAdmin(cookies);
    // Not found rather than forbidden: the admin area doesn't advertise itself.
    if (!admin) return fail(404, 'Not found');
    const form = Form.safeParse(Object.fromEntries(await request.formData().catch(() => new FormData())));
    if (!form.success) return fail(400, 'Invalid request');
    const { action, userId, game } = form.data;
    if (findGame(game)?.status !== 'playable') return fail(404, 'Unknown game');
    if ((await findRole(userId)) === null) return fail(404, 'Unknown user');
    if (action === 'grant') await grantGame(userId, game, admin.userId);
    else await revokeGame(userId, game);
    console.info(`[admin] ${admin.email} ${action === 'grant' ? 'granted' : 'revoked'} ${game} for user ${userId}`);
    return redirect(adminReturnPath(form.data.return), 303);
  } catch (err) {
    console.error('[admin/grants] failed', err);
    return fail(500, 'Could not update the grant');
  }
};
