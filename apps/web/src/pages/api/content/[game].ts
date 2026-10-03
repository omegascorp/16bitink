import type { APIRoute } from 'astro';
import { PAID_CONTENT } from '../../../games/content.server';
import { fail, json } from '../../../lib/http';
import { ownership } from '../../../lib/owner';

export const prerender = false;

/** A game's paid content, only for verified owners. */
export const GET: APIRoute = async ({ params, cookies }) => {
  const game = params.game ?? '';
  const content = Object.hasOwn(PAID_CONTENT, game) ? PAID_CONTENT[game] : undefined;
  if (content === undefined) return fail(404, 'Unknown game');
  try {
    if (!(await ownership(cookies, game))) return fail(403, 'Full game not unlocked');
    return json({ success: true, data: content }, 200, { 'cache-control': 'private, no-store' });
  } catch (err) {
    console.error('[content] failed', { game, err });
    return fail(500, 'Could not load content');
  }
};
