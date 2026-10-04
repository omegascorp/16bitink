import type { APIRoute } from 'astro';
import { findGame } from '../../../data/games';
import { db } from '../../../lib/db';
import { findProgress, writeProgress } from '../../../lib/db/progressRepo';
import { fail, isSameOrigin, json } from '../../../lib/http';
import { currentUser } from '../../../lib/owner';
import { parseProgressWrite, toProgressView } from '../../../lib/progress';

export const prerender = false;

const isPlayable = (game: string): boolean => findGame(game)?.status === 'playable';

/** The signed-in player's progress in a game: `{ data, rev }`, data null when none is saved yet. */
export const GET: APIRoute = async ({ params, cookies }) => {
  const game = params.game ?? '';
  if (!isPlayable(game)) return fail(404, 'Unknown game');
  try {
    const user = await currentUser(cookies);
    if (!user) return fail(401, 'Not signed in');
    await db();
    return json({ success: true, data: toProgressView(await findProgress(user.userId, game)) });
  } catch (err) {
    console.error('[progress] load failed', { game, err });
    return fail(500, 'Could not load progress');
  }
};

/**
 * Saves progress based on revision `rev`. If another device saved since,
 * answers 409 with that newer `{ data, rev }` for the client to merge and retry.
 */
export const PUT: APIRoute = async ({ params, cookies, request }) => {
  if (!isSameOrigin(request)) return fail(403, 'Cross-origin request rejected');
  const game = params.game ?? '';
  if (!isPlayable(game)) return fail(404, 'Unknown game');
  const write = parseProgressWrite(await request.text().catch(() => ''));
  if (!write) return fail(400, 'Invalid progress');
  try {
    const user = await currentUser(cookies);
    if (!user) return fail(401, 'Not signed in');
    await db();
    const res = await writeProgress(user.userId, game, write);
    if (res.ok) return json({ success: true, data: { rev: res.rev } });
    return json({ success: false, error: 'Saved from another device', data: toProgressView(res.current) }, 409);
  } catch (err) {
    console.error('[progress] save failed', { game, err });
    return fail(500, 'Could not save progress');
  }
};
