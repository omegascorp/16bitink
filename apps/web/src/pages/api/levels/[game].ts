import type { APIRoute } from 'astro';
import { fail, json } from '../../../lib/http';
import { INKFISH_FULL_CHAPTERS } from '../../../lib/levels/inkfish-full';
import { ownership } from '../../../lib/owner';

export const prerender = false;

const FULL_CONTENT: Record<string, unknown> = { inkfish: INKFISH_FULL_CHAPTERS };

/** Paid level data, only for verified owners. */
export const GET: APIRoute = async ({ params, cookies }) => {
  const game = params.game ?? '';
  const content = FULL_CONTENT[game];
  if (!content) return fail(404, 'Unknown game');
  try {
    if (!(await ownership(cookies, game))) return fail(403, 'Full game not unlocked');
    return json({ success: true, data: content });
  } catch (err) {
    console.error('[levels] failed', { game, err });
    return fail(500, 'Could not load levels');
  }
};
