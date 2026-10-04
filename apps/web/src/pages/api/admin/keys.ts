import type { APIRoute } from 'astro';
import { z } from 'zod';
import { findGame } from '../../../data/games';
import { currentAdmin } from '../../../lib/adminAuth';
import { createKeys, deleteUnusedKey } from '../../../lib/db/keyRepo';
import { fail, isSameOrigin } from '../../../lib/http';
import { MAX_KEYS_PER_BATCH, normalizeKey } from '../../../lib/keys';

export const prerender = false;

const Form = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('create'),
    game: z.string().regex(/^[a-z0-9-]{1,40}$/),
    count: z.coerce.number().int().min(1).max(MAX_KEYS_PER_BATCH),
    note: z.string().trim().max(80).default(''),
  }),
  z.object({ action: z.literal('delete'), code: z.string().max(64) }),
]);

/** An admin creates activation keys, or deletes an unused one. A plain form post: answers with a redirect to the keys page. */
export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  if (!isSameOrigin(request)) return fail(403, 'Cross-origin request rejected');
  try {
    const admin = await currentAdmin(cookies);
    // Not found rather than forbidden: the admin area doesn't advertise itself.
    if (!admin) return fail(404, 'Not found');
    const form = Form.safeParse(Object.fromEntries(await request.formData().catch(() => new FormData())));
    if (!form.success) return fail(400, 'Invalid request');
    if (form.data.action === 'create') {
      const { game, count, note } = form.data;
      if (findGame(game)?.status !== 'playable') return fail(404, 'Unknown game');
      await createKeys({ game, count, note, createdBy: admin.userId });
      console.info(`[admin] ${admin.email} created ${count} key(s) for ${game}${note ? ` (${note})` : ''}`);
      return redirect(`/admin/keys?created=${count}`, 303);
    }
    const code = normalizeKey(form.data.code);
    if (!code) return fail(400, 'Invalid key');
    const deleted = await deleteUnusedKey(code);
    if (deleted) console.info(`[admin] ${admin.email} deleted unused key ${code.slice(0, 4)}…`);
    return redirect('/admin/keys', 303);
  } catch (err) {
    console.error('[admin/keys] failed', err);
    return fail(500, 'Could not update keys');
  }
};
